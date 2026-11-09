import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { query, create, update, action, onSyncChange } from '../offline/data';
import { ResourceList } from '../components/ResourceList';
import { Card, ErrorBox, LoadingBox, EmptyBox, Table, PageHeader } from '../components/ui';

type RoleUser = { id: number; username: string; role: string };
type Patient = { id: number; full_name: string; patient_id: string };
type LabRequest = {
  id: number;
  patient: number;
  patient_full_name?: string;
  patient_patient_id?: string;
  requested_by: number;
  requested_by_username?: string;
  department: string;
  test_name: string;
  clinical_notes: string;
  priority: string;
  status: string;
  lab_number: string;
  sample_collected_at: string;
  completed_at: string;
  result: string;
  result_files: string[];
  created_at: string;
  detailed_results: LabResult[];
};
type LabResult = {
  id: number;
  lab_request: number;
  test_name: string;
  result_value: string;
  units: string;
  reference_range: string;
  interpretation: string;
  status: string;
  technician_name: string;
  reviewing_officer: string;
  completed_at: string;
  comments: string;
  attachments: string[];
};

const statusColors: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
  sample_collected: 'bg-blue-500/15 text-blue-300 border border-blue-500/30',
  processing: 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30',
  completed: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
  cancelled: 'bg-slate-500/15 text-slate-300 border border-slate-500/30',
};

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-sm text-slate-300">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
      />
    </div>
  );
}

function TextArea({ label, value, onChange, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <div>
      <label className="block text-sm text-slate-300">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
      />
    </div>
  );
}

export default function Labs() {
  const [view, setView] = useState<'list' | 'request' | 'result'>('list');
  const [, setRequests] = useState<LabRequest[]>([]);
  const [, setUsers] = useState<RoleUser[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const [requestForm, setRequestForm] = useState({ patient: '', department: '', test_name: '', clinical_notes: '', priority: 'routine', status: 'pending' });
  const [resultsForm, setResultsForm] = useState<{ test_name: string; result_value: string; units: string; reference_range: string; interpretation: string; status: 'normal' | 'abnormal' | 'critical'; technician_name: string; reviewing_officer: string; comments: string; attachments: string[] }>({
    test_name: '', result_value: '', units: '', reference_range: '', interpretation: '', status: 'normal', technician_name: '', reviewing_officer: '', comments: '', attachments: [],
  });
  const [requestId, setRequestId] = useState<number | null>(null);
  const [active, setActive] = useState<LabRequest | null>(null);

  const role = localStorage.getItem('medlink_user_role') || '';

  useEffect(() => {
    load();
    const unsub = onSyncChange(() => load());
    return unsub;
  }, []);

  function load() {
    setLoading(true);
    setError('');
    Promise.all([
      query('lab-requests'),
      query('users'),
      query('patients'),
    ])
      .then(([r, u, p]) => {
        setRequests(Array.isArray(r) ? r : r.results || []);
        setUsers(Array.isArray(u) ? u : u.results || []);
        setPatients(Array.isArray(p) ? p : p.results || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  function openRequest() {
    setRequestForm({ patient: '', department: '', test_name: '', clinical_notes: '', priority: 'routine', status: 'pending' });
    setActionMsg('');
    setView('request');
  }

  async function submitRequest(e: FormEvent) {
    e.preventDefault();
    setActionMsg('');
    setSaving(true);
    try {
      await create('lab-requests', {
        ...requestForm,
        patient: Number(requestForm.patient),
      });
      load();
      setView('list');
    } catch (err) {
      setActionMsg((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function openResultPage(req: LabRequest) {
    setRequestId(req.id);
    setActive(req);
    setResultsForm({
      test_name: req.test_name,
      result_value: '',
      units: '',
      reference_range: '',
      interpretation: '',
      status: 'normal',
      technician_name: '',
      reviewing_officer: '',
      comments: '',
      attachments: [],
    });
    setActionMsg('');
    setView('result');
  }

  async function submitResult(e: FormEvent) {
    e.preventDefault();
    setActionMsg('');
    setSaving(true);
    try {
      await create('lab-results', { ...resultsForm, lab_request: requestId });
      load();
      setView('list');
    } catch (err) {
      setActionMsg((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function transitionStatus(req: LabRequest, newStatus: string) {
    setActionMsg('');
    try {
      if (newStatus === 'sample_collected') {
        await action('lab-requests', req.id, { status: newStatus });
      } else if (newStatus === 'processing') {
        await action('lab-requests', req.id, { status: newStatus });
      } else if (newStatus === 'completed') {
        if (!req.result) {
          setActionMsg('A result summary is required to complete the request.');
          setSaving(false);
          return;
        }
        await action('lab-requests', req.id, { status: newStatus });
      }
      load();
    } catch (err) {
      setActionMsg((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function completeWithSummary(req: LabRequest, summary: string) {
    setActionMsg('');
    setSaving(true);
    try {
      await update('lab-requests', req.id, { result: summary });
      await action('lab-requests', req.id, { status: 'completed' });
      load();
      setView('list');
    } catch (err) {
      setActionMsg((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function renderList() {
    return (
      <div>
        <PageHeader title="Laboratory" action={
          <button onClick={openRequest} className="rounded-full bg-cyan-500 px-4 py-2 font-medium text-slate-950">Request Test</button>
        } />
        <ResourceList
          resource="lab-requests"
          columns={['Patient', 'Test', 'Priority', 'Status', 'Lab Number', 'Date']}
          emptyText="No lab requests yet."
          renderRow={(r: LabRequest) => (
            <tr key={r.id} className="cursor-pointer hover:bg-slate-800/40" onClick={() => openResultPage(r)}>
              <td className="px-4 py-3">{r.patient_full_name || r.patient || r.id}</td>
              <td className="px-4 py-3">{r.test_name}</td>
              <td className="px-4 py-3 capitalize">{r.priority}</td>
              <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs ${statusColors[r.status] || 'bg-slate-700 text-slate-200'}`}>{r.status.replace('_', ' ')}</span></td>
              <td className="px-4 py-3">{r.lab_number || r.id}</td>
              <td className="px-4 py-3">{(r.created_at || '').slice(0, 16) || '—'}</td>
            </tr>
          )}
        />
      </div>
    );
  }

  function renderRequestForm() {
    return (
      <div>
        <PageHeader title="Request Laboratory Test" action={<button onClick={() => setView('list')} className="rounded-lg border border-slate-700 px-3 py-1.5 hover:bg-slate-800">Back to list</button>} />
        <Card>
          {actionMsg && <ErrorBox message={actionMsg} />}
          <form onSubmit={submitRequest} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-sm text-slate-300">Patient</label>
              <select
                value={requestForm.patient}
                onChange={(e) => setRequestForm((f) => ({ ...f, patient: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
              >
                <option value="">Select patient</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>{p.full_name} ({p.patient_id})</option>
                ))}
              </select>
            </div>
            <Field label="Department" value={requestForm.department} onChange={(v) => setRequestForm((f) => ({ ...f, department: v }))} />
            <Field label="Requested Tests" value={requestForm.test_name} onChange={(v) => setRequestForm((f) => ({ ...f, test_name: v }))} />
            <div>
              <label className="block text-sm text-slate-300">Priority</label>
              <select
                value={requestForm.priority}
                onChange={(e) => setRequestForm((f) => ({ ...f, priority: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
              >
                <option value="routine">Routine</option>
                <option value="urgent">Urgent</option>
                <option value="emergency">Emergency</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <TextArea label="Clinical Notes" value={requestForm.clinical_notes} onChange={(v) => setRequestForm((f) => ({ ...f, clinical_notes: v }))} />
            <div className="flex items-end">
              <button type="submit" disabled={saving} className="rounded-full bg-cyan-500 px-4 py-2 font-medium text-slate-950 disabled:opacity-60">{saving ? 'Submitting…' : 'Submit Request'}</button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  function renderResultPage() {
    if (!active) return <EmptyBox message="Select a request from the list." />;
    const isTech = role === 'lab_technician' || role === 'administrator';
    const isDoctor = role === 'doctor' || role === 'administrator';
    const showActions = active.status !== 'completed' && active.status !== 'cancelled';

    return (
      <div>
        <PageHeader title={active.lab_number ? `Lab Result - ${active.lab_number}` : 'Lab Result'} action={
          <button onClick={() => setView('list')} className="rounded-lg border border-slate-700 px-3 py-1.5 hover:bg-slate-800">Back to list</button>
        } />
        <Card className="mb-6">
          <h2 className="mb-3 text-lg font-semibold">Request Summary</h2>
          <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div><span className="text-slate-400">Patient:</span> <span className="ml-2">{active.patient_full_name || active.patient}</span></div>
            <div><span className="text-slate-400">Test:</span> <span className="ml-2">{active.test_name}</span></div>
            <div><span className="text-slate-400">Priority:</span> <span className="ml-2 capitalize">{active.priority}</span></div>
            <div><span className="text-slate-400">Status:</span> <span className="ml-2 capitalize">{active.status.replace('_', ' ')}</span></div>
            {active.clinical_notes && <div className="sm:col-span-2 lg:col-span-3"><span className="text-slate-400">Notes:</span> <span className="ml-2">{active.clinical_notes}</span></div>}
          </div>
          {isTech && showActions && (
            <div className="mt-4 flex flex-wrap gap-2">
              {active.status === 'pending' && (
                <button onClick={() => transitionStatus(active, 'sample_collected')} disabled={saving} className="rounded-full bg-blue-500 px-3 py-1.5 font-medium text-slate-950 disabled:opacity-60">Mark Sample Collected</button>
              )}
              {active.status === 'sample_collected' && (
                <button onClick={() => transitionStatus(active, 'processing')} disabled={saving} className="rounded-full bg-indigo-500 px-3 py-1.5 font-medium text-slate-950 disabled:opacity-60">Start Processing</button>
              )}
            </div>
          )}
        </Card>

        {active.detailed_results?.length > 0 && (
          <Card className="mb-6">
            <h2 className="mb-3 text-lg font-semibold">Results</h2>
            <Table columns={['Test', 'Result', 'Units', 'Reference', 'Status', 'Tech']}>
              {active.detailed_results.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3">{r.test_name}</td>
                  <td className="px-4 py-3">{r.result_value}</td>
                  <td className="px-4 py-3">{r.units || '—'}</td>
                  <td className="px-4 py-3">{r.reference_range || '—'}</td>
                  <td className="px-4 py-3 capitalize">{r.status}</td>
                  <td className="px-4 py-3">{r.technician_name || '—'}</td>
                </tr>
              ))}
            </Table>
          </Card>
        )}

        {active.status !== 'completed' && (isTech || isDoctor) && (
          <Card>
            <h2 className="mb-3 text-lg font-semibold">{isTech ? 'Enter Results' : 'Review & Complete'}</h2>
      {actionMsg && <ErrorBox message={actionMsg} />}
            <form onSubmit={submitResult} className="grid gap-4 sm:grid-cols-2">
              <Field label="Test Name" value={resultsForm.test_name} onChange={(v) => setResultsForm((f) => ({ ...f, test_name: v }))} />
              <Field label="Result Value" value={resultsForm.result_value} onChange={(v) => setResultsForm((f) => ({ ...f, result_value: v }))} />
              <Field label="Units" value={resultsForm.units} onChange={(v) => setResultsForm((f) => ({ ...f, units: v }))} />
              <Field label="Reference Range" value={resultsForm.reference_range} onChange={(v) => setResultsForm((f) => ({ ...f, reference_range: v }))} />
              <div>
                <label className="block text-sm text-slate-300">Status</label>
                <select
                  value={resultsForm.status}
                  onChange={(e) => setResultsForm((f) => ({ ...f, status: e.target.value as any }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
                >
                  <option value="normal">Normal</option>
                  <option value="abnormal">Abnormal</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <Field label="Technician" value={resultsForm.technician_name} onChange={(v) => setResultsForm((f) => ({ ...f, technician_name: v }))} />
              <Field label="Reviewing Officer" value={resultsForm.reviewing_officer} onChange={(v) => setResultsForm((f) => ({ ...f, reviewing_officer: v }))} />
              <TextArea label="Interpretation" value={resultsForm.interpretation} onChange={(v) => setResultsForm((f) => ({ ...f, interpretation: v }))} rows={2} />
              <TextArea label="Comments" value={resultsForm.comments} onChange={(v) => setResultsForm((f) => ({ ...f, comments: v }))} rows={2} />
              <div className="sm:col-span-2">
                <label className="block text-sm text-slate-300">Result Summary (for request completion)</label>
                <input
                  type="text"
                  value={active.result}
                  onChange={(e) => setActive((prev) => prev ? ({ ...prev, result: e.target.value }) : prev)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
                />
              </div>
              <div className="sm:col-span-2 flex flex-wrap gap-2">
                <button type="submit" disabled={saving} className="rounded-full bg-cyan-500 px-4 py-2 font-medium text-slate-950 disabled:opacity-60">{saving ? 'Saving…' : 'Save Result Details'}</button>
                {isTech && (
                  <button type="button" onClick={() => active && completeWithSummary(active, active.result)} disabled={saving} className="rounded-full bg-emerald-500 px-4 py-2 font-medium text-slate-950 disabled:opacity-60">Complete Request</button>
                )}
              </div>
            </form>
          </Card>
        )}
      </div>
    );
  }

  if (loading) return <LoadingBox />;
  if (error) return <ErrorBox message={error} />;

  return view === 'list' ? renderList() : view === 'request' ? renderRequestForm() : renderResultPage();
}
