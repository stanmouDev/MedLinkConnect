// Offline sync engine.
// push(): replays the queued outbox mutations through the live REST API,
//   reusing all server-side side effects (requested_by, handover sender,
//   notifications, timeline events). Offline-created records are remapped
//   from their temp id to the server-assigned id.
// pull(): fetches records changed since the last sync watermark and merges
//   them into IndexedDB, detecting conflicts on concurrently-edited rows.
// initSync(): wires online/offline listeners so reconnecting triggers a sync.

import {
  getAllOutbox,
  removeOutbox,
  putOutbox,
  getRecord,
  putRecord,
  deleteRecord,
  getAllRecords,
  getMeta,
  setMeta,
  type OutboxItem,
  type StoredRecord,
  type ConflictEntry,
} from './db';
import { encryptJSON, decryptJSON } from './crypto';
import { apiFetch, getToken } from '../api';

export interface SyncStatus {
  online: boolean;
  pending: number;
  conflicts: number;
  lastSync: string | null;
  syncing: boolean;
  error: string | null;
}

type StatusListener = (s: SyncStatus) => void;
const statusListeners = new Set<StatusListener>();
let status: SyncStatus = {
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  pending: 0,
  conflicts: 0,
  lastSync: null,
  syncing: false,
  error: null,
};

export function getStatus(): SyncStatus {
  return status;
}
export function onStatus(cb: StatusListener): () => void {
  statusListeners.add(cb);
  return () => statusListeners.delete(cb);
}
function setStatus(patch: Partial<SyncStatus>): void {
  status = { ...status, ...patch };
  statusListeners.forEach((l) => l(status));
}

async function recomputeCounts(): Promise<void> {
  const outbox = await getAllOutbox();
  const conflicts = (await getMeta<ConflictEntry[]>('conflicts')) || [];
  setStatus({ pending: outbox.length, conflicts: conflicts.length });
}

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;

export function nextRetryDelay(retryCount: number): number {
  return BASE_DELAY_MS * Math.pow(2, retryCount);
}

function shouldRetry(item: OutboxItem): boolean {
  if (!item.next_retry_at) return true;
  return new Date(item.next_retry_at) <= new Date();
}

// --- push: flush the outbox through the live API ---
export async function pushOutbox(): Promise<void> {
  const items = await getAllOutbox();
  if (!items.length) return;
  for (const item of items) {
    if (item.retry_count && item.retry_count >= MAX_RETRIES) {
      await removeOutbox(item.oid!);
      continue;
    }
    if (!shouldRetry(item)) {
      continue;
    }
    try {
      let res: any = null;
      const idempotencyKey = item.client_ref;
      if (item.op === 'create') {
        res = await apiFetch(`/${item.resource}/`, {
          method: 'POST',
          body: JSON.stringify(item.data),
          headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
        });
      } else if (item.op === 'update') {
        res = await apiFetch(`/${item.resource}/${item.entity_id}/`, {
          method: 'PUT',
          body: JSON.stringify(item.data),
          headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
        });
      } else if (item.op === 'delete') {
        await apiFetch(`/${item.resource}/${item.entity_id}/`, {
          method: 'DELETE',
          headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
        });
      } else if (item.op === 'action') {
        res = await apiFetch(`/${item.resource}/${item.entity_id}/`, {
          method: 'POST',
          body: JSON.stringify(item.data),
          headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
        });
      }
      await removeOutbox(item.oid!);
      await reconcileAfterPush(item, res);
    } catch (e) {
      const statusCode = (e as any)?.status;
      if (statusCode === 401) {
        setStatus({ error: 'Session expired. Please sign in again.' });
        return;
      }
      if (statusCode === 404 || statusCode === 403 || statusCode === 422 || statusCode === 409) {
        console.warn('[sync] permanent failure, dropping item', item.resource, item.id, statusCode, e);
        await removeOutbox(item.oid!);
        continue;
      }
      if (!navigator.onLine) {
        setStatus({ error: 'Offline. Will retry when connected.' });
        return;
      }
      const retryCount = (item.retry_count || 0) + 1;
      const delay = nextRetryDelay(retryCount);
      const updated: OutboxItem = {
        ...item,
        retry_count: retryCount,
        next_retry_at: new Date(Date.now() + delay).toISOString(),
      };
      await putOutbox(updated);
      console.warn('[sync] transient failure, will retry in', delay, 'ms', item.resource, item.id, e);
      continue;
    }
  }
  await recomputeCounts();
}

async function reconcileAfterPush(item: OutboxItem, res: any): Promise<void> {
  if (item.op === 'create' && res && res.id != null) {
    const rec = await getRecord(item.resource, item.id);
    if (rec) {
      await deleteRecord(item.resource, item.id);
      const plain = await decryptJSON(rec.enc);
      const merged = { ...plain, ...res };
      const updated: StoredRecord = {
        ...rec,
        id: res.id,
        enc: await encryptJSON(merged),
        dirty: false,
        base_updated_at: res.updated_at || rec.base_updated_at,
        updated_at: res.updated_at || rec.updated_at,
      };
      await putRecord(updated);
    }
    return;
  }
  if (item.op === 'update' || item.op === 'action') {
    const rec = await getRecord(item.resource, item.entity_id);
    if (rec) {
      rec.dirty = false;
      if (res && res.updated_at) {
        rec.base_updated_at = res.updated_at;
        rec.updated_at = res.updated_at;
        const plain = await decryptJSON(rec.enc);
        plain.updated_at = res.updated_at;
        rec.enc = await encryptJSON(plain);
      }
      await putRecord(rec);
    }
    return;
  }
  if (item.op === 'delete') {
    await deleteRecord(item.resource, item.entity_id);
  }
}

// --- pull: fetch changes since last sync watermark ---
export async function pullChanges(): Promise<void> {
  const since = (await getMeta<string>('lastSync')) || null;
  let url = '/sync/pull/';
  if (since) url += `?since=${encodeURIComponent(since)}`;
  const res: any = await apiFetch(url);
  const items: any[] = res.items || [];
  const conflicts = (await getMeta<ConflictEntry[]>('conflicts')) || [];

  const CHUNK = 50;
  for (let i = 0; i < items.length; i += CHUNK) {
    const chunk = items.slice(i, i + CHUNK);
    for (const it of chunk) {
      const rec = await getRecord(it.entity_type, it.entity_id);
      if (!rec) {
        await putRecord({
          resource: it.entity_type,
          id: it.entity_id,
          enc: await encryptJSON(it.payload),
          updated_at: it.updated_at,
          base_updated_at: it.updated_at,
          dirty: false,
          deleted: false,
        });
      } else if (rec.deleted) {
        continue;
      } else if (rec.dirty) {
        if (it.updated_at > (rec.base_updated_at || '')) {
          conflicts.push({
            resource: it.entity_type,
            id: it.entity_id,
            server_updated_at: it.updated_at,
            serverData: it.payload,
            at: new Date().toISOString(),
          });
        } else {
          rec.dirty = false;
          rec.base_updated_at = it.updated_at;
          rec.updated_at = it.updated_at;
          rec.enc = await encryptJSON(it.payload);
          await putRecord(rec);
        }
      } else {
        await putRecord({
          ...rec,
          enc: await encryptJSON(it.payload),
          updated_at: it.updated_at,
          base_updated_at: it.updated_at,
          dirty: false,
          deleted: false,
        });
      }
    }
  }

  await setMeta('conflicts', conflicts);
  await setMeta('lastSync', res.server_time || new Date().toISOString());
  await recomputeCounts();
}

// --- full sync cycle ---
export async function fullSync(): Promise<void> {
  if (!getToken()) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  setStatus({ syncing: true, error: null });
  try {
    await pushOutbox();
    await pullChanges();
    setStatus({ lastSync: new Date().toISOString(), online: true, error: null });
  } catch (e) {
    const statusCode = (e as any)?.status;
    setStatus({
      online: statusCode === 401 ? status.online : typeof navigator !== 'undefined' ? navigator.onLine : true,
      error: statusCode === 401 ? 'Session expired.' : 'Sync failed; will retry when online.',
    });
  } finally {
    setStatus({ syncing: false });
    await recomputeCounts();
  }
}

export async function syncNow(): Promise<void> {
  await fullSync();
}

// Resolve a conflict by accepting the server's version (local edit discarded).
export async function resolveConflict(resource: string, id: number | string): Promise<void> {
  const conflicts = (await getMeta<ConflictEntry[]>('conflicts')) || [];
  const idx = conflicts.findIndex((c) => c.resource === resource && String(c.id) === String(id));
  if (idx === -1) return;
  const c = conflicts[idx];
  const rec = await getRecord(resource, id);
  const plain = c.serverData;
  const updated: StoredRecord = {
    resource,
    id,
    enc: await encryptJSON(plain),
    updated_at: c.server_updated_at,
    base_updated_at: c.server_updated_at,
    dirty: false,
    deleted: false,
  };
  if (rec) await deleteRecord(resource, id);
  await putRecord(updated);
  conflicts.splice(idx, 1);
  await setMeta('conflicts', conflicts);
  await recomputeCounts();
}

export function listConflicts(): Promise<ConflictEntry[]> {
  return getMeta<ConflictEntry[]>('conflicts').then((c) => c || []);
}

let initialized = false;
export function initSync(): void {
  if (initialized) return;
  initialized = true;
  setStatus({ online: typeof navigator !== 'undefined' ? navigator.onLine : true });
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      setStatus({ online: true });
      fullSync();
    });
    window.addEventListener('offline', () => setStatus({ online: false }));
  }
  recomputeCounts();
}

export { getAllRecords };
