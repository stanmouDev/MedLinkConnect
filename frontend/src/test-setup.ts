import '@testing-library/jest-dom';

if (typeof indexedDB === 'undefined') {
  const stores: Record<string, Map<string, any>> = {
    records: new Map(),
    outbox: new Map(),
    meta: new Map(),
  };

  const createStore = (name: string) => ({
    put: (value: any) => {
      const key = name === 'meta' ? value.key : `${value.resource}_${value.id}`;
      stores[name].set(key, value);
      return { result: value };
    },
    get: (key: any) => {
      let searchKey: string;
      if (name === 'meta') searchKey = key;
      else if (typeof key === 'object') searchKey = `${key.resource}_${key.id}`;
      else searchKey = key;
      return { result: stores[name].get(searchKey) };
    },
    add: (value: any) => {
      const key = name === 'outbox' ? Date.now() + Math.random() : `${value.resource}_${value.id}`;
      if (name === 'outbox') value.oid = key;
      stores[name].set(String(key), value);
      return { result: key };
    },
    delete: (key: any) => {
      let searchKey: string;
      if (name === 'meta') searchKey = key;
      else if (typeof key === 'object') searchKey = `${key.resource}_${key.id}`;
      else searchKey = key;
      stores[name].delete(searchKey);
    },
    getAll: () => ({ result: Array.from(stores[name].values()) }),
    createIndex: () => ({}),
  });

  const mockIDB = {
    open: (_name: string, _version?: number) => {
      const db: any = {
        objectStoreNames: { contains: (s: string) => ['records', 'outbox', 'meta'].includes(s) },
        createObjectStore: (storeName: string) => createStore(storeName),
        transaction: (_storeNames: string) => {
          const tx: any = {
            objectStore: (name: string) => createStore(name),
            oncomplete: null,
            onerror: null,
            onabort: null,
          };
          setTimeout(() => {
            if (tx.oncomplete) tx.oncomplete({ target: tx });
          }, 0);
          return tx;
        },
      };
      const req: any = {
        result: db,
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
      };
      setTimeout(() => {
        if (req.onupgradeneeded) req.onupgradeneeded({});
        if (req.onsuccess) req.onsuccess({ target: { result: db } });
      }, 0);
      return req;
    },
  };

  (globalThis as any).indexedDB = mockIDB;
}
