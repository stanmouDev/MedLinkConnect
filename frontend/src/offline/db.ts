// Low-level IndexedDB access for offline storage.
// Three stores: `records` (encrypted entity mirror), `outbox` (pending mutations),
// and `meta` (device key, sync watermark, conflict log).

const DB_NAME = 'medlink_offline';
const DB_VERSION = 1;

export interface StoredRecord {
  resource: string;
  id: number | string;
  enc: { iv: number[]; data: number[] };
  updated_at: string;
  base_updated_at: string | null;
  dirty: boolean;
  deleted: boolean;
  client_ref?: string;
}

export interface OutboxItem {
  oid?: number;
  resource: string;
  id: number | string;
  op: 'create' | 'update' | 'delete' | 'action';
  entity_type: string;
  entity_id: number | string;
  data: unknown;
  client_ref?: string;
  base_updated_at?: string | null;
  retry_count?: number;
  next_retry_at?: string | null;
}

export interface ConflictEntry {
  resource: string;
  id: number | string;
  server_updated_at: string;
  serverData: unknown;
  at: string;
}

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('records')) {
        const s = db.createObjectStore('records', { keyPath: ['resource', 'id'] });
        s.createIndex('resource', 'resource', { unique: false });
      }
      if (!db.objectStoreNames.contains('outbox')) {
        db.createObjectStore('outbox', { keyPath: 'oid', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function reqAsync<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

function txDone(t: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export async function getRecord(resource: string, id: number | string): Promise<StoredRecord | undefined> {
  const db = await openDB();
  const t = db.transaction('records', 'readonly');
  return reqAsync(t.objectStore('records').get([resource, id]));
}

export async function getAllRecords(resource: string): Promise<StoredRecord[]> {
  const db = await openDB();
  const t = db.transaction('records', 'readonly');
  return reqAsync(t.objectStore('records').index('resource').getAll(resource));
}

export async function putRecord(rec: StoredRecord): Promise<void> {
  const db = await openDB();
  const t = db.transaction('records', 'readwrite');
  t.objectStore('records').put(rec);
  await txDone(t);
}

export async function deleteRecord(resource: string, id: number | string): Promise<void> {
  const db = await openDB();
  const t = db.transaction('records', 'readwrite');
  t.objectStore('records').delete([resource, id]);
  await txDone(t);
}

export async function getMeta<T = unknown>(key: string): Promise<T | undefined> {
  const db = await openDB();
  const t = db.transaction('meta', 'readonly');
  const rec = await reqAsync(t.objectStore('meta').get(key));
  return rec?.value as T | undefined;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  const db = await openDB();
  const t = db.transaction('meta', 'readwrite');
  t.objectStore('meta').put({ key, value });
  await txDone(t);
}

export async function addOutbox(item: OutboxItem): Promise<number> {
  const db = await openDB();
  const t = db.transaction('outbox', 'readwrite');
  const oid = await reqAsync<IDBValidKey>(t.objectStore('outbox').add(item));
  await txDone(t);
  return oid as number;
}

export async function putOutbox(item: OutboxItem): Promise<void> {
  const db = await openDB();
  const t = db.transaction('outbox', 'readwrite');
  t.objectStore('outbox').put(item);
  await txDone(t);
}

export async function getAllOutbox(): Promise<OutboxItem[]> {
  const db = await openDB();
  const t = db.transaction('outbox', 'readonly');
  return reqAsync(t.objectStore('outbox').getAll());
}

export async function removeOutbox(oid: number): Promise<void> {
  const db = await openDB();
  const t = db.transaction('outbox', 'readwrite');
  t.objectStore('outbox').delete(oid);
  await txDone(t);
}
