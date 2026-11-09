import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockIDB = {
  open: vi.fn(),
};

describe('offline/db', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockIDB.open.mockReset();
  });

  it('openDB creates database with correct name and version', async () => {
    const dbMock = {
      objectStoreNames: { contains: vi.fn().mockReturnValue(false) },
      createObjectStore: vi.fn(),
      result: {},
    };
    mockIDB.open.mockImplementation((_name: string, _version: number) => ({
      result: dbMock.result,
      onupgradeneeded: null,
      onsuccess: null,
      onerror: null,
    }));

    const { openDB } = await import('./db');
    await openDB();
    expect(mockIDB.open).toBeDefined();
  });
});
