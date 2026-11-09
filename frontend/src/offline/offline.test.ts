import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('offline/data - action deduplication', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('does not merge accept and reject on the same referral', async () => {
    vi.doMock('./db', () => ({
      getAllOutbox: vi.fn().mockResolvedValue([]),
      addOutbox: vi.fn().mockImplementation((_item: any) => Promise.resolve(1)),
      putOutbox: vi.fn(),
      getRecord: vi.fn().mockResolvedValue(null),
      writeLocal: vi.fn(),
      putRecord: vi.fn(),
      decryptJSON: vi.fn().mockResolvedValue({ id: 'tmp_1' }),
      encryptJSON: vi.fn().mockResolvedValue({ iv: [1], data: [2] }),
      getMeta: vi.fn().mockResolvedValue(undefined),
      setMeta: vi.fn(),
      emitChange: vi.fn(),
    }));

    const { action } = await import('./data');
    await action('referrals', 123, { status: 'accepted' });
    await action('referrals', 123, { status: 'rejected' });

    const { addOutbox } = await import('./db');
    const calls = (addOutbox as any).mock.calls;
    expect(calls.length).toBe(2);
    expect(calls[0][0].data).toEqual({ status: 'accepted' });
    expect(calls[1][0].data).toEqual({ status: 'rejected' });
  });

  it('does not merge dispense and cancel on the same stock item', async () => {
    vi.doMock('./db', () => ({
      getAllOutbox: vi.fn().mockResolvedValue([]),
      addOutbox: vi.fn().mockImplementation((_item: any) => Promise.resolve(1)),
      putOutbox: vi.fn(),
      getRecord: vi.fn().mockResolvedValue(null),
      writeLocal: vi.fn(),
      putRecord: vi.fn(),
      decryptJSON: vi.fn().mockResolvedValue({ id: 'tmp_1' }),
      encryptJSON: vi.fn().mockResolvedValue({ iv: [1], data: [2] }),
      getMeta: vi.fn().mockResolvedValue(undefined),
      setMeta: vi.fn(),
      emitChange: vi.fn(),
    }));

    const { action } = await import('./data');
    await action('stock-items', 456, { status: 'dispensed' });
    await action('stock-items', 456, { status: 'cancelled' });

    const { addOutbox } = await import('./db');
    const calls = (addOutbox as any).mock.calls;
    expect(calls.length).toBe(2);
    expect(calls[0][0].data).toEqual({ status: 'dispensed' });
    expect(calls[1][0].data).toEqual({ status: 'cancelled' });
  });

  it('deduplicates identical actions on the same resource and id', async () => {
    vi.doMock('./db', () => ({
      getAllOutbox: vi.fn().mockResolvedValue([
        { op: 'action', resource: 'referrals', id: 123, data: { status: 'accepted' }, entity_type: 'referrals', entity_id: 123 },
      ]),
      addOutbox: vi.fn(),
      putOutbox: vi.fn(),
      getRecord: vi.fn().mockResolvedValue(null),
      writeLocal: vi.fn(),
      putRecord: vi.fn(),
      decryptJSON: vi.fn().mockResolvedValue({ id: 123 }),
      encryptJSON: vi.fn().mockResolvedValue({ iv: [1], data: [2] }),
      getMeta: vi.fn().mockResolvedValue(undefined),
      setMeta: vi.fn(),
      emitChange: vi.fn(),
    }));

    const { action } = await import('./data');
    await action('referrals', 123, { status: 'accepted' });

    const { addOutbox } = await import('./db');
    expect(addOutbox).not.toHaveBeenCalled();
  });
});

describe('offline/data - queueMutation merge logic', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('merges create then update without losing fields', async () => {
    vi.doMock('./db', () => ({
      getAllOutbox: vi.fn().mockResolvedValue([
        { op: 'create', id: 'tmp_1', data: { name: 'John', age: 30 } },
      ]),
      addOutbox: vi.fn(),
      putOutbox: vi.fn(),
      emitChange: vi.fn(),
    }));

    const { queueMutation } = await import('./data');
    await queueMutation({
      resource: 'patients',
      id: 'tmp_1',
      op: 'update',
      entity_type: 'patients',
      entity_id: 'tmp_1',
      data: { phone: '123-456' },
    });

    const { putOutbox } = await import('./db');
    expect(putOutbox).toHaveBeenCalledTimes(1);
    const merged = (putOutbox as any).mock.calls[0][0].data;
    expect(merged).toEqual({ name: 'John', age: 30, phone: '123-456' });
  });

  it('does not overwrite valid fields with undefined', async () => {
    vi.doMock('./db', () => ({
      getAllOutbox: vi.fn().mockResolvedValue([
        { op: 'create', id: 'tmp_1', data: { name: 'John', age: 30 } },
      ]),
      addOutbox: vi.fn(),
      putOutbox: vi.fn(),
      emitChange: vi.fn(),
    }));

    const { queueMutation } = await import('./data');
    await queueMutation({
      resource: 'patients',
      id: 'tmp_1',
      op: 'update',
      entity_type: 'patients',
      entity_id: 'tmp_1',
      data: { age: undefined, phone: '123-456' },
    });

    const { putOutbox } = await import('./db');
    const merged = (putOutbox as any).mock.calls[0][0].data;
    expect(merged).toEqual({ name: 'John', age: 30, phone: '123-456' });
  });

  it('deduplicates duplicate deletes', async () => {
    vi.doMock('./db', () => ({
      getAllOutbox: vi.fn().mockResolvedValue([
        { op: 'delete', id: 'tmp_1' },
      ]),
      addOutbox: vi.fn(),
      putOutbox: vi.fn(),
      emitChange: vi.fn(),
    }));

    const { queueMutation } = await import('./data');
    await queueMutation({
      resource: 'patients',
      id: 'tmp_1',
      op: 'delete',
      entity_type: 'patients',
      entity_id: 'tmp_1',
      data: {},
    });

    const { addOutbox } = await import('./db');
    expect(addOutbox).not.toHaveBeenCalled();
  });
});

describe('offline/sync - retry and backoff', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('drops items after max retries', async () => {
    const outboxItems: any[] = [
      { oid: 1, resource: 'patients', id: 'tmp_1', op: 'create', entity_type: 'patients', entity_id: 'tmp_1', data: {}, retry_count: 5, next_retry_at: new Date(Date.now() - 1000).toISOString() },
    ];
    vi.doMock('./db', () => ({
      getAllOutbox: vi.fn().mockResolvedValue([...outboxItems]),
      addOutbox: vi.fn(),
      putOutbox: vi.fn(),
      removeOutbox: vi.fn(),
      getMeta: vi.fn().mockResolvedValue(null),
      setMeta: vi.fn(),
      getRecord: vi.fn().mockResolvedValue(null),
      putRecord: vi.fn(),
      emitChange: vi.fn(),
    }));

    vi.doMock('../api', () => ({
      apiFetch: vi.fn().mockRejectedValue({ status: 503 }),
      getToken: vi.fn().mockReturnValue('token'),
    }));

    const { pushOutbox } = await import('./sync');
    await pushOutbox();

    const { removeOutbox } = await import('./db');
    expect(removeOutbox).toHaveBeenCalledWith(1);
  });

  it('computes exponential backoff delay', async () => {
    const mod = await import('./sync');
    const result0 = (mod as any).nextRetryDelay(0);
    const result1 = (mod as any).nextRetryDelay(1);
    const result2 = (mod as any).nextRetryDelay(2);
    expect(result0).toBe(1000);
    expect(result1).toBe(2000);
    expect(result2).toBe(4000);
  });
});

describe('offline/sync - pull pagination', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('processes items in chunks', async () => {
    vi.doMock('./db', async () => {
      const records: any[] = [];
      return {
        getAllOutbox: vi.fn().mockResolvedValue([]),
        addOutbox: vi.fn(),
        putOutbox: vi.fn(),
        removeOutbox: vi.fn(),
        getMeta: vi.fn().mockResolvedValue(null),
        setMeta: vi.fn(),
        getRecord: vi.fn().mockResolvedValue(undefined),
        putRecord: vi.fn().mockImplementation((rec: any) => { records.push(rec); return Promise.resolve(); }),
        getAllRecords: vi.fn().mockResolvedValue([]),
        emitChange: vi.fn(),
      };
    });

    const largeItems = Array.from({ length: 120 }, (_, i) => ({
      entity_type: 'patients',
      entity_id: i + 1,
      payload: { id: i + 1, name: `Patient ${i + 1}` },
      updated_at: new Date().toISOString(),
    }));

    vi.doMock('../api', () => ({
      apiFetch: vi.fn().mockResolvedValue({
        items: largeItems,
        server_time: new Date().toISOString(),
      }),
      getToken: vi.fn().mockReturnValue('token'),
    }));

    const { pullChanges } = await import('./sync');
    await pullChanges();

    const { putRecord } = await import('./db');
    expect(putRecord).toHaveBeenCalledTimes(120);
  });
});
