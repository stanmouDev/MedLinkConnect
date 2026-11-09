import { describe, it, expect, vi, beforeEach } from 'vitest';

const baseCrypto = {
  subtle: {
    generateKey: vi.fn(),
    exportKey: vi.fn(),
    importKey: vi.fn(),
    encrypt: vi.fn(),
    decrypt: vi.fn(),
  },
  getRandomValues: vi.fn((arr: any) => arr),
};

describe('offline/crypto', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    Object.defineProperty(globalThis, 'crypto', {
      value: baseCrypto,
      writable: true,
      configurable: true,
    });
  });

  it('uuid returns a string', async () => {
    const { uuid } = await import('./crypto');
    const id = uuid();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('encryptJSON returns iv and data arrays', async () => {
    vi.doMock('./db', () => ({
      getMeta: vi.fn().mockResolvedValue(undefined),
      setMeta: vi.fn().mockResolvedValue(undefined),
    }));

    const mockKey = { type: 'AES-GCM', extractable: false };
    (baseCrypto.subtle.generateKey as any).mockResolvedValue(mockKey);
    (baseCrypto.subtle.exportKey as any).mockResolvedValue(new ArrayBuffer(32));
    (baseCrypto.subtle.encrypt as any).mockResolvedValue(
      new ArrayBuffer(16),
    );

    const { encryptJSON } = await import('./crypto');
    const result = await encryptJSON({ name: 'Test' });
    expect(result).toHaveProperty('iv');
    expect(result).toHaveProperty('data');
    expect(Array.isArray(result.iv)).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  });

  it('decryptJSON returns original object', async () => {
    vi.doMock('./db', () => ({
      getMeta: vi.fn().mockResolvedValue(undefined),
      setMeta: vi.fn().mockResolvedValue(undefined),
    }));

    const mockKey = { type: 'AES-GCM', extractable: false };
    (baseCrypto.subtle.generateKey as any).mockResolvedValue(mockKey);
    (baseCrypto.subtle.exportKey as any).mockResolvedValue(new ArrayBuffer(32));
    const original = { name: 'Test', age: 30 };
    const encoded = new TextEncoder().encode(JSON.stringify(original));
    (baseCrypto.subtle.encrypt as any).mockResolvedValue(encoded.buffer);
    (baseCrypto.subtle.decrypt as any).mockResolvedValue(encoded.buffer);

    const { encryptJSON, decryptJSON } = await import('./crypto');
    const encrypted = await encryptJSON(original);
    const decrypted = await decryptJSON(encrypted);
    expect(decrypted).toEqual(original);
  });
});
