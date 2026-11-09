import { useState } from 'react';
import { useSyncStatus } from './useSyncStatus';
import { listConflicts, resolveConflict } from './sync';

export function SyncStatusBar() {
  const { online, pending, conflicts, syncing, lastSync, syncNow } = useSyncStatus();
  const [showConflicts, setShowConflicts] = useState(false);
  const [conflictList, setConflictList] = useState<{ resource: string; id: number | string }[]>([]);

  async function toggleConflicts() {
    if (!showConflicts) {
      const c = await listConflicts();
      setConflictList(c.map((x) => ({ resource: x.resource, id: x.id })));
    }
    setShowConflicts((v) => !v);
  }

  async function acceptServer(resource: string, id: number | string) {
    await resolveConflict(resource, id);
    const c = await listConflicts();
    setConflictList(c.map((x) => ({ resource: x.resource, id: x.id })));
  }

  const dot = online ? 'bg-emerald-400' : 'bg-amber-400';
  const label = !online ? 'Offline' : syncing ? 'Syncing…' : pending > 0 ? 'Pending sync' : 'Synced';

  return (
    <div className="border-b border-slate-800 bg-slate-900/60 text-xs">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-6 py-1.5 text-slate-300">
        <span className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${dot}`} />
          {label}
        </span>
        {pending > 0 && <span className="text-slate-400">{pending} change{pending === 1 ? '' : 's'} queued</span>}
        {lastSync && online && (
          <span className="text-slate-500">last sync {new Date(lastSync).toLocaleTimeString()}</span>
        )}
        {conflicts > 0 && (
          <button
            onClick={toggleConflicts}
            className="rounded-full bg-red-500/20 px-2 py-0.5 text-red-300 hover:bg-red-500/30"
          >
            {conflicts} conflict{conflicts === 1 ? '' : 's'}
          </button>
        )}
        <button
          onClick={() => syncNow()}
          disabled={syncing || !online}
          className="ml-auto rounded-full border border-slate-700 px-2.5 py-0.5 hover:bg-slate-800 disabled:opacity-50"
        >
          {syncing ? 'Working…' : 'Sync now'}
        </button>
      </div>
      {showConflicts && conflictList.length > 0 && (
        <div className="mx-auto max-w-7xl px-6 pb-2">
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
            <p className="mb-2 font-medium text-red-300">Sync conflicts — another device changed these records.</p>
            <ul className="space-y-1">
              {conflictList.map((c) => (
                <li key={`${c.resource}:${c.id}`} className="flex items-center justify-between gap-2">
                  <span className="text-slate-300">
                    {c.resource} #{c.id}
                  </span>
                  <button
                    onClick={() => acceptServer(c.resource, c.id)}
                    className="rounded-full bg-slate-700 px-2 py-0.5 text-slate-100 hover:bg-slate-600"
                  >
                    Keep server version
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
