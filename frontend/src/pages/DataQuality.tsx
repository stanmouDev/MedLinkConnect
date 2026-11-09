import { useEffect, useState } from 'react';
import { query, onSyncChange } from '../offline/data';
import { api, ensureOnline } from '../api';
import {
  Card,
  ErrorBox,
  LoadingBox,
  EmptyBox,
  Table,
  PageHeader,
} from '../components/ui';

type DataQualityAlert = {
  id: number;
  severity?: string;
  alert_type?: string;
  description?: string;
  status?: string;
  resolved_at?: string;
  notes?: string;
  created_at?: string;
};

const RESOLVE_ROLES = ['administrator'];

function SeverityPill({ level }: { level?: string }) {
  const lc = (level || '').toLowerCase();
  const cls =
    lc === 'critical' || lc === 'high'
      ? 'border-red-500/40 bg-red-500/10 text-red-300'
      : lc === 'medium'
      ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
      : 'border-slate-700 bg-slate-800 text-slate-300';
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs capitalize ${cls}`}>
      {level || '—'}
    </span>
  );
}

function statusAccent(status?: string): string {
  const s = (status || 'open').toLowerCase();
  if (s === 'resolved') return 'text-emerald-300';
  return 'text-amber-300';
}

export default function DataQuality() {
  const role = localStorage.getItem('medlink_user_role') || '';
  const canResolve = RESOLVE_ROLES.includes(role);

  const [alerts, setAlerts] = useState<DataQualityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notesFor, setNotesFor] = useState<Record<number, string>>({});
  const [actingId, setActingId] = useState<number | null>(null);

  function load() {
    setLoading(true);
    setError('');
    query('data-quality-alerts')
      .then((data: any) => {
        const list = Array.isArray(data) ? data : data.results || [];
        setAlerts(list);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    const unsub = onSyncChange(() => load());
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleResolve(id: number) {
    setActingId(id);
    setError('');
    try {
      ensureOnline();
      const notes = notesFor[id] || '';
      await api.post('data-quality-alerts', id, { notes, resolution: 'resolve' });
      setNotesFor((n) => ({ ...n, [id]: '' }));
      load();
    } catch (err) {
      setError((err as Error).message || 'Could not resolve alert.');
    } finally {
      setActingId(null);
    }
  }

  if (loading) return <LoadingBox />;
  if (error) return <ErrorBox message={error} />;

  const sortedAlerts = [...alerts].sort((a, b) =>
    String(b.created_at || '').localeCompare(String(a.created_at || '')),
  );
  const openAlerts = sortedAlerts.filter((a) => (a.status || 'open') !== 'resolved');
  const resolvedAlerts = sortedAlerts.filter(
    (a) => (a.status || 'open') === 'resolved',
  );

  return (
    <div>
      <PageHeader
        title="Data Quality Alerts"
        subtitle="Monitor and resolve data integrity issues"
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-sm text-slate-400">Total Alerts</p>
          <p className="mt-2 text-3xl font-semibold text-cyan-300">{sortedAlerts.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-400">Open Alerts</p>
          <p className="mt-2 text-3xl font-semibold text-amber-300">{openAlerts.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-400">Resolved</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-300">{resolvedAlerts.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-400">Critical / High</p>
          <p className="mt-2 text-3xl font-semibold text-red-300">
            {openAlerts.filter(
              (a) =>
                a.severity === 'critical' || a.severity === 'high',
            ).length}
          </p>
        </Card>
      </div>

      {!canResolve && (
        <Card className="mb-8 border-amber-500/40 bg-amber-500/5">
          <p className="text-sm text-amber-300">
            View-only mode. Only administrators can resolve data quality alerts.
          </p>
        </Card>
      )}

      <Card className="mb-8">
        <h2 className="mb-4 text-lg font-semibold">Open Alerts</h2>
        {openAlerts.length === 0 ? (
          <EmptyBox message="No open data quality alerts." />
        ) : (
          <Table columns={['Severity', 'Type', 'Description', 'Status', 'Actions']}>
            {openAlerts.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3"><SeverityPill level={a.severity} /></td>
                <td className="px-4 py-3 capitalize">{a.alert_type || '—'}</td>
                <td className="px-4 py-3 text-slate-300">{a.description || '—'}</td>
                <td className={`px-4 py-3 capitalize ${statusAccent(a.status)}`}>
                  {a.status || 'open'}
                </td>
                <td className="px-4 py-3">
                  {canResolve ? (
                    <div className="space-y-2">
                      <textarea
                        value={notesFor[a.id] || ''}
                        onChange={(e) =>
                          setNotesFor((n) => ({ ...n, [a.id]: e.target.value }))
                        }
                        placeholder="Resolution notes (optional)"
                        rows={2}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400"
                      />
                      <button
                        onClick={() => handleResolve(a.id)}
                        disabled={actingId === a.id}
                        className="rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-medium text-slate-950 disabled:opacity-60"
                      >
                        {actingId === a.id ? 'Resolving…' : 'Resolve'}
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500">View only</span>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">Resolved Alerts</h2>
        {resolvedAlerts.length === 0 ? (
          <EmptyBox message="No resolved alerts yet." />
        ) : (
          <Table columns={['Severity', 'Type', 'Description', 'Status', 'Notes']}>
            {resolvedAlerts.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3"><SeverityPill level={a.severity} /></td>
                <td className="px-4 py-3 capitalize">{a.alert_type || '—'}</td>
                <td className="px-4 py-3 text-slate-300">{a.description || '—'}</td>
                <td className={`px-4 py-3 capitalize ${statusAccent(a.status)}`}>
                  {a.status || 'resolved'}
                </td>
                <td className="px-4 py-3 text-slate-400">{a.notes || '—'}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
