import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('offline/sync', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('module exports expected functions', async () => {
    const mod = await import('./sync');
    expect(typeof mod.pushOutbox).toBe('function');
    expect(typeof mod.pullChanges).toBe('function');
    expect(typeof mod.fullSync).toBe('function');
    expect(typeof mod.syncNow).toBe('function');
    expect(typeof mod.initSync).toBe('function');
    expect(typeof mod.getStatus).toBe('function');
    expect(typeof mod.onStatus).toBe('function');
  });

  it('getStatus returns initial status shape', async () => {
    const mod = await import('./sync');
    const status = mod.getStatus();
    expect(status).toHaveProperty('online');
    expect(status).toHaveProperty('pending');
    expect(status).toHaveProperty('conflicts');
    expect(status).toHaveProperty('lastSync');
    expect(status).toHaveProperty('syncing');
    expect(status).toHaveProperty('error');
  });
});
