// Local-first data repository used by every page.
// Reads always serve from IndexedDB (so the UI works offline).
// Writes apply optimistically to IndexedDB and enqueue a mutation in the outbox,
// which the sync engine flushes when connectivity is available.

import {
  getRecord,
  getAllRecords,
  putRecord,
  deleteRecord,
  addOutbox,
  putOutbox,
  getAllOutbox,
  removeOutbox,
  type StoredRecord,
  type OutboxItem,
} from './db';
import { encryptJSON, decryptJSON, uuid } from './crypto';

export type Resource =
  | 'hospitals'
  | 'users'
  | 'patients'
  | 'encounters'
  | 'vitals'
  | 'appointments'
  | 'lab-orders'
  | 'prescriptions'
  | 'messages'
  | 'handovers'
  | 'notifications'
  | 'lab-requests'
  | 'lab-results'
  | 'timeline'
  | 'insurance-companies'
  | 'nhis-records'
  | 'private-insurance-records'
  | 'insurance-coverage-rules'
  | 'bills'
  | 'bill-items'
  | 'payments'
  | 'stock-items'
  | 'stock-movements'
  | 'monthly-statistics'
  | 'disease-outbreaks'
  | 'report-templates'
  | 'report-instances'
  | 'report-sections'
  | 'data-quality-alerts'
  | 'public-health-alerts'
  | 'performance-indicators'
  | 'report-exports'
  | 'report-template-versions'
  | 'report-elements'
  | 'formula-definitions'
  | 'report-schedules'
  | 'report-dashboard-pins'
  | 'report-export-formats'
  | 'referrals'
  | 'wards'
  | 'rooms'
  | 'beds'
  | 'admissions'
  | 'inpatient-notes'
  | 'bed-transfers'
  | 'med-admins'
  | 'inpatient-lab-requests'
  | 'inpatient-prescriptions'
  | 'clinical-progress-notes'
  | 'antenatal-records'
  | 'labour-records'
  | 'deliveries'
  | 'newborns'
  | 'fetal-assessments'
  | 'postnatal-records'
  | 'maternity-notes'
  | 'diagnoses'
  | 'diagnosis-terms'
  | 'medications';

function nowISO(): string {
  return new Date().toISOString();
}

async function readLocal(resource: string, id: number | string): Promise<any | undefined> {
  const rec = await getRecord(resource, id);
  if (!rec || rec.deleted) return undefined;
  return decryptJSON(rec.enc);
}

async function readAllLocal(resource: string): Promise<any[]> {
  const recs = await getAllRecords(resource);
  const out: any[] = [];
  for (const r of recs) {
    if (r.deleted) continue;
    try {
      out.push(await decryptJSON(r.enc));
    } catch {
      // skip undecryptable records
    }
  }
  // Latest first; temp offline ids sort after real numeric ids (acceptable).
  out.sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
  return out;
}

async function writeLocal(
  resource: string,
  id: number | string,
  data: any,
  opts: { dirty: boolean; base_updated_at?: string | null; deleted?: boolean; client_ref?: string },
): Promise<void> {
  const enc = await encryptJSON(data);
  const rec: StoredRecord = {
    resource,
    id,
    enc,
    updated_at: data.updated_at || nowISO(),
    base_updated_at: opts.base_updated_at ?? (data.updated_at ?? null),
    dirty: opts.dirty,
    deleted: opts.deleted ?? false,
    client_ref: opts.client_ref,
  };
  await putRecord(rec);
}

// Merge queued mutations so a record edited offline produces a single push.
// Uses deep merge for nested objects, preserves existing fields, and never
// overwrites valid fields with undefined.
export async function queueMutation(item: OutboxItem): Promise<void> {
  const all = await getAllOutbox();
  if (item.op === 'create' || item.op === 'update') {
    const createEntry = all.find((o) => o.op === 'create' && String(o.id) === String(item.id));
    if (createEntry) {
      createEntry.data = safeMerge(createEntry.data, item.data);
      await putOutbox(createEntry);
      emitChange();
      return;
    }
  }
  if (item.op === 'update') {
    const upd = all.find((o) => o.op === 'update' && String(o.id) === String(item.id));
    if (upd) {
      upd.data = safeMerge(upd.data, item.data);
      upd.base_updated_at = item.base_updated_at;
      await putOutbox(upd);
      emitChange();
      return;
    }
  }
  if (item.op === 'delete') {
    const delEntry = all.find((o) => o.op === 'delete' && String(o.id) === String(item.id));
    if (delEntry) {
      emitChange();
      return;
    }
  }
  await addOutbox(item);
  emitChange();
}

function safeMerge(existing: unknown, incoming: unknown): unknown {
  if (typeof incoming !== 'object' || incoming === null) return incoming;
  if (typeof existing !== 'object' || existing === null) return incoming;
  const existingObj = existing as Record<string, unknown>;
  const incomingObj = incoming as Record<string, unknown>;
  const result: Record<string, unknown> = { ...existingObj };
  for (const key of Object.keys(incomingObj)) {
    const value = (incomingObj as any)[key];
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

function actionSignature(data: unknown): string {
  return JSON.stringify(data);
}

// --- change emitter (lets lists refresh after local writes / remote pulls) ---
type Listener = () => void;
const listeners = new Set<Listener>();
export function onSyncChange(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function emitChange(): void {
  listeners.forEach((l) => l());
}
export { emitChange };

// --- public repository API ---
export async function query(resource: Resource | string): Promise<any> {
  return readAllLocal(resource);
}

export async function getOne(resource: Resource | string, id: number | string): Promise<any | undefined> {
  return readLocal(resource, id);
}

export async function create(resource: Resource | string, data: any): Promise<any> {
  const client_ref = uuid();
  const tempId = `tmp_${client_ref}`;
  const record = { ...data, id: tempId };
  await writeLocal(resource, tempId, record, { dirty: true, client_ref });
  await queueMutation({
    resource,
    id: tempId,
    op: 'create',
    entity_type: resource,
    entity_id: tempId,
    data,
    client_ref,
  });
  return record;
}

export async function update(
  resource: Resource | string,
  id: number | string,
  data: any,
): Promise<any> {
  const client_ref = uuid();
  const existing = await readLocal(resource, id);
  const merged = { ...(existing || {}), ...data, id };
  const rec = await getRecord(resource, id);
  const base = rec?.base_updated_at ?? null;
  await writeLocal(resource, id, merged, { dirty: true, base_updated_at: base });
  await queueMutation({
    resource,
    id,
    op: 'update',
    entity_type: resource,
    entity_id: id,
    data,
    base_updated_at: base,
    client_ref,
  });
  return merged;
}

export async function action(
  resource: Resource | string,
  id: number | string,
  data: any,
): Promise<any> {
  const client_ref = uuid();
  const existing = await getAllOutbox();
  const sig = actionSignature(data);
  const actionEntry = existing.find(
    (o) => o.op === 'action' && String(o.resource) === String(resource) && String(o.id) === String(id) && actionSignature(o.data) === sig,
  );
  if (actionEntry) {
    emitChange();
    return actionEntry.data;
  }
  const existingRec = await getRecord(resource, id);
  const base = existingRec?.base_updated_at ?? null;
  await writeLocal(resource, id, { ...(existingRec ? await decryptJSON(existingRec.enc) : { id }), ...data }, { dirty: true, base_updated_at: base });
  const item: OutboxItem = {
    resource,
    id,
    op: 'action',
    entity_type: resource,
    entity_id: id,
    data,
    base_updated_at: base,
    client_ref,
  };
  await addOutbox(item);
  emitChange();
  return data;
}

export async function remove(resource: Resource | string, id: number | string): Promise<void> {
  const client_ref = uuid();
  const rec = await getRecord(resource, id);
  if (!rec) return;
  const all = await getAllOutbox();
  const createEntry = all.find((o) => o.op === 'create' && String(o.id) === String(id));
  if (createEntry && rec.base_updated_at == null) {
    await removeOutbox(createEntry.oid!);
    await deleteRecord(resource, id);
    emitChange();
    return;
  }
  await writeLocal(resource, id, { id }, { dirty: true, deleted: true, base_updated_at: rec.base_updated_at });
  await queueMutation({
    resource,
    id,
    op: 'delete',
    entity_type: resource,
    entity_id: id,
    data: {},
    base_updated_at: rec.base_updated_at,
    client_ref,
  });
  emitChange();
}
