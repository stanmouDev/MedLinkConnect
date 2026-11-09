import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { query, onSyncChange } from '../offline/data';
import { useAuth } from '../auth';
import { SyncStatusBar } from '../offline/SyncStatusBar';
import { Card, EmptyBox, Table } from '../components/ui';

type LabRequest = {
  id: number;
  patient: number;
  patient_full_name?: string;
  test_name: string;
  priority: string;
  status: string;
  lab_number: string;
  created_at: string;
};

type LabResult = {
  id: number;
  lab_request: number;
  test_name: string;
  result_value: string;
  status: string;
  created_at: string;
};

export default function LabWorkspace() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requests, setRequests] = useState<LabRequest[]>([]);
  const [results, setResults] = useState<LabResult[]>([]);

  function load() {
    setLoading(true);
    setError('');
    Promise.all([query('lab-requests'), query('lab-results')])
      .then(([req, res]) => {
        setRequests(Array.isArray(req) ? req : []);
        setResults(Array.isArray(res) ? res : []);
      })
      .catch((e) => setError(e.message || 'Failed to load data.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    const off = onSyncChange(load);
    return off;
  }, []);

  const pending = requests.filter((r) => r.status === 'pending' || r.status === 'sample_collected');
  const samplesAwaiting = requests.filter((r) => r.status === 'pending');
  const inProgress = requests.filter((r) => r.status === 'processing');
  const awaitingVerification = results.filter((r) => r.status === 'pending_verification');
  const completed = results.filter((r) => r.status === 'verified' || r.status === 'completed');
  const critical = results.filter((r) => r.status === 'critical');
  const today = new Date().toISOString().slice(0, 10);
  const completedToday = completed.filter((r) => (r.created_at || '').startsWith(today));

  if (loading && requests.length === 0) return <EmptyBox message="Loading workspace..." />;
  if (error) return <div className="text-red-400">{error}</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">
          Good morning, {user?.username || 'Lab Tech'}
        </h1>
        <p className="text-sm text-slate-400">Laboratory Workspace — Lab requests and results management</p>
        <SyncStatusBar />
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <button onClick={() => navigate('/labs')} className="rounded-full bg-cyan-500 px-4 py-2 font-medium text-slate-950">
          View All Labs
        </button>
        <button onClick={() => navigate('/patients')} className="rounded-full border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800">
          View Patient
        </button>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <Card>
          <p className="text-sm text-slate-400">Pending Requests</p>
          <p className="mt-2 text-3xl font-semibold text-amber-300">{pending.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-400">Samples Awaiting</p>
          <p className="mt-2 text-3xl font-semibold text-cyan-300">{samplesAwaiting.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-400">In Progress</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-300">{inProgress.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-400">To Verify</p>
          <p className="mt-2 text-3xl font-semibold text-amber-300">{awaitingVerification.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-400">Completed Today</p>
          <p className="mt-2 text-3xl font-semibold text-slate-300">{completedToday.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-400">Critical</p>
          <p className="mt-2 text-3xl font-semibold text-red-300">{critical.length}</p>
        </Card>
      </div>

      {critical.length > 0 && (
        <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 p-4">
          <h3 className="mb-2 font-semibold text-red-300">CRITICAL RESULTS</h3>
          <Table columns={['Request', 'Test', 'Result', 'Status']}>
            {critical.slice(0, 5).map((r) => (
              <tr key={r.id} className="hover:bg-slate-800/40">
                <td className="px-4 py-3">#{r.lab_request}</td>
                <td className="px-4 py-3">{r.test_name}</td>
                <td className="px-4 py-3">{r.result_value}</td>
                <td className="px-4 py-3 text-red-300">{r.status}</td>
              </tr>
            ))}
          </Table>
        </div>
      )}

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-semibold">PENDING LAB REQUESTS</h3>
          {pending.length === 0 ? (
            <EmptyBox message="No pending requests." />
          ) : (
            <Table columns={['Patient', 'Test', 'Priority', 'Status', 'Requested']}>
              {pending.slice(0, 10).map((r) => (
                <tr key={r.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3">{r.patient_full_name || `#${r.patient}`}</td>
                  <td className="px-4 py-3">{r.test_name}</td>
                  <td className="px-4 py-3">{r.priority}</td>
                  <td className="px-4 py-3">{r.status}</td>
                  <td className="px-4 py-3">{(r.created_at || '').slice(0, 16)}</td>
                </tr>
              ))}
            </Table>
          )}
        </Card>

        <Card>
          <h3 className="mb-3 font-semibold">RESULTS AWAITING VERIFICATION</h3>
          {awaitingVerification.length === 0 ? (
            <EmptyBox message="No results awaiting verification." />
          ) : (
            <Table columns={['Test', 'Result', 'Status']}>
              {awaitingVerification.slice(0, 10).map((r) => (
                <tr key={r.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3">{r.test_name}</td>
                  <td className="px-4 py-3">{r.result_value}</td>
                  <td className="px-4 py-3">{r.status}</td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}
