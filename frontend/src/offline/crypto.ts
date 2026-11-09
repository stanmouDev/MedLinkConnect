// Encrypted-at-rest for locally cached clinical data.
// A per-device AES-GCM key is generated once and stored in IndexedDB meta.
// Record payloads are encrypted before being written to the `records` store.

import { getMeta, setMeta } from './db';

async function getDeviceKey(): Promise<CryptoKey> {
  const raw = await getMeta<number[]>('deviceKey');
  if (raw) {
    return crypto.subtle.importKey(
      'raw',
      new Uint8Array(raw),
      'AES-GCM',
      false,
      ['encrypt', 'decrypt'],
    );
  }
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );
  const exported = new Uint8Array(await crypto.subtle.exportKey('raw', key));
  await setMeta('deviceKey', Array.from(exported));
  return key;
}

let keyCache: Promise<CryptoKey> | null = null;
function deviceKey(): Promise<CryptoKey> {
  if (!keyCache) keyCache = getDeviceKey();
  return keyCache;
}

export async function encryptJSON(obj: unknown): Promise<{ iv: number[]; data: number[] }> {
  const key = await deviceKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const buf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(JSON.stringify(obj)),
  );
  return { iv: Array.from(iv), data: Array.from(new Uint8Array(buf)) };
}

export async function decryptJSON(blob: { iv: number[]; data: number[] }): Promise<any> {
  const key = await deviceKey();
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(blob.iv) },
    key,
    new Uint8Array(blob.data),
  );
  return JSON.parse(new TextDecoder().decode(plain));
}

export function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'c-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}
