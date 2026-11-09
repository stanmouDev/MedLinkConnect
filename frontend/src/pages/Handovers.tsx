import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { query, create, update, action, onSyncChange } from '../offline/data';
import { Card, ErrorBox, LoadingBox, EmptyBox, PageHeader } from '../components/ui';
import { ResourceList } from '../components/ResourceList';

type RoleUser = { id: number; username: string; role: string };
type Patient = { id: number; full_name: string; patient_id: string };
type Handover = {
  id: number;
  sender: number;
  sender_username?: string;
  receiver: number;
  receiver_username?: string;
  status: string;
  additional_notes: string;
  created_at: string;
  patients: HandoverPatient[];
};
type HandoverPatient = {
  id?: number;
  patient_id: number;
  patient_name: string;
  patient_code: string;
  ward: string;
  bed_number: string;
  diagnosis: string;
  current_condition: string;
  vital_signs: string;
  allergies: string;
  current_medications: string;
  treatments_given: string;
  procedures_performed: string;
  pending_lab_tests: string;
  available_lab_results: string;
  imaging_results: string;
  follow_up_instructions: string;
  risks_precautions: string;
  priority_level: string;
};

const statusColors: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
  accepted: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
  rejected: 'bg-red-500/15 text-red-300 border border-red-500/30',
  completed: 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30',
  cancelled: 'bg-slate-500/15 text-slate-300 border border-slate-500/30',
};

const priorityColors: Record<string, string> = {
  low: 'text-slate-300',
  medium: 'text-blue-300',
  high: 'text-amber-300',
  urgent: 'text-orange-300',
  critical: 'text-red-300',
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

export default function Handovers() {
  const [view, setView] = useState<'dashboard' | 'create' | 'detail'>('dashboard');
  const [handovers, setHandovers] = useState<Handover[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [users, setUsers] = useState<RoleUser[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatients, setSelectedPatients] = useState<Patient[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const emptyHandover = () => ({
    patient_name: '',
    patient_code: '',
    ward: '',
    bed_number: '',
    diagnosis: '',
    current_condition: '',
    vital_signs: '',
    allergies: '',
    current_medications: '',
    treatments_given: '',
    procedures_performed: '',
    pending_lab_tests: '',
    available_lab_results: '',
    imaging_results: '',
    follow_up_instructions: '',
    risks_precautions: '',
    priority_level: 'stable',
  });

  const [receiver, setReceiver] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [patientsData, setPatientsData] = useState<Record<number, HandoverPatient>>({});
  const [actionMsg, setActionMsg] = useState('');

  useEffect(() => {
    load();
    const unsub = onSyncChange(() => load());
    return unsub;
  }, []);

  function load() {
    setLoading(true);
    setError('');
    Promise.all([
      query('handovers'),
      query('users'),
      query('patients'),
    ])
      .then(([h, u, p]) => {
        const hData = Array.isArray(h) ? h : h.results || [];
        setHandovers(hData.map((x: any) => ({ ...x, sender_username: x.sender_username || '', receiver_username: x.receiver_username || '' })));
        setUsers(Array.isArray(u) ? u : u.results || []);
        setPatients(Array.isArray(p) ? p : p.results || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  function openCreate() {
    setReceiver('');
    setFormNotes('');
    setPatientsData({});
    setSelectedPatients([]);
    setActiveId(null);
    setView('create');
    setActionMsg('');
  }

  function addPatientRow(patient: Patient) {
    setSelectedPatients((prev) => {
      if (prev.find((p) => p.id === patient.id)) return prev;
      return [...prev, patient];
    });
    setPatientsData((prev) => ({ ...prev, [patient.id]: { ...emptyHandover(), patient_id: patient.id } }));
  }

  function removePatientRow(patientId: number) {
    setSelectedPatients((prev) => prev.filter((p) => p.id !== patientId));
    setPatientsData((prev) => {
      const next = { ...prev };
      delete next[patientId];
      return next;
    });
  }

  function updatePatientField(patientId: number, field: string, value: string) {
    setPatientsData((prev) => ({
      ...prev,
      [patientId]: {
        ...prev[patientId],
        [field]: value,
      },
    }));
  }

  async function submitCreate(e: FormEvent) {
    e.preventDefault();
    setActionMsg('');
    setSaving(true);
    try {
      const patientIds = selectedPatients.map((p) => p.id);
      const patientNotes = selectedPatients.map((p) => ({
        id: p.id,
        ...patientsData[p.id],
      }));
      const payload: any = { receiver: Number(receiver), additional_notes: formNotes, status: 'pending' };
      if (patientIds.length) {
        payload.patient_ids = patientIds;
        payload.patient_notes = patientNotes;
      }
      await create('handovers', payload);
      load();
      setView('dashboard');
    } catch (err) {
      setActionMsg((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function submitAcceptOrReject(id: number, status: 'accepted' | 'rejected') {
    setActionMsg('');
    try {
      await action('handovers', id, { status });
      load();
    } catch (err) {
      setActionMsg((err as Error).message);
    }
  }

  async function submitEdit() {
    if (!activeId) return;
    setActionMsg('');
    setSaving(true);
    try {
      const hp = handovers.find((h) => h.id === activeId);
      if (!hp) return;
      await update('handovers', activeId, {
        additional_notes: formNotes,
        status: hp.status,
      });
      load();
      setView('dashboard');
    } catch (err) {
      setActionMsg((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function openDetail(h: Handover) {
    setActiveId(h.id);
    setReceiver(String(h.receiver));
    setFormNotes(h.additional_notes || '');
    const pd: Record<number, HandoverPatient> = {};
    for (const p of h.patients) {
      pd[p.patient_id] = {
        id: p.id,
        patient_id: p.patient_id,
        patient_name: p.patient_name,
        patient_code: p.patient_code || '',
        ward: p.ward,
        bed_number: p.bed_number,
        diagnosis: p.diagnosis,
        current_condition: p.current_condition,
        vital_signs: p.vital_signs,
        allergies: p.allergies,
        current_medications: p.current_medications,
        treatments_given: p.treatments_given,
        procedures_performed: p.procedures_performed,
        pending_lab_tests: p.pending_lab_tests,
        available_lab_results: p.available_lab_results,
        imaging_results: p.imaging_results,
        follow_up_instructions: p.follow_up_instructions,
        risks_precautions: p.risks_precautions,
        priority_level: p.priority_level || 'stable',
      };
    }
    setPatientsData(pd);
    setSelectedPatients(h.patients.map((p) => ({ id: p.patient_id, full_name: p.patient_name, patient_id: p.patient_code })));
    setView('detail');
    setActionMsg('');
  }

  const current = handovers.find((h) => h.id === activeId);

  function renderDashboard() {
    const grouped = {
      incoming: handovers.filter((h) => Number(h.receiver) === Number(localStorage.getItem('medlink_user_id') || 0) && h.status === 'pending'),
      outgoing: handovers.filter((h) => Number(h.sender) === Number(localStorage.getItem('medlink_user_id') || 0)),
      pending: handovers.filter((h) => h.status === 'pending'),
      accepted: handovers.filter((h) => h.status === 'accepted'),
      completed: handovers.filter((h) => h.status === 'completed'),
    };

    return (
      <div>
        <PageHeader title="Handovers" action={
          <button onClick={openCreate} className="rounded-full bg-cyan-500 px-4 py-2 font-medium text-slate-950">New Handover</button>
        } />
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card><p className="text-sm text-slate-400">Pending</p><p className="mt-2 text-3xl font-semibold text-amber-300">{grouped.pending.length}</p></Card>
          <Card><p className="text-sm text-slate-400">Accepted</p><p className="mt-2 text-3xl font-semibold text-emerald-300">{grouped.accepted.length}</p></Card>
          <Card><p className="text-sm text-slate-400">Completed</p><p className="mt-2 text-3xl font-semibold text-cyan-300">{grouped.completed.length}</p></Card>
          <Card><p className="text-sm text-slate-400">Incoming</p><p className="mt-2 text-3xl font-semibold text-purple-300">{grouped.incoming.length}</p></Card>
        </div>
        <ResourceList
          resource="handovers"
          columns={['Sender', 'Receiver', 'Status', 'Patients', 'Date']}
          emptyText="No handovers yet."
          reloadKey={view === 'detail' ? 0 : 1}
          renderRow={(h: Handover) => (
            <tr key={h.id} className="cursor-pointer hover:bg-slate-800/40" onClick={() => openDetail(h)}>
              <td className="px-4 py-3">{h.sender_username || h.sender}</td>
              <td className="px-4 py-3">{h.receiver_username || h.receiver}</td>
              <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs ${statusColors[h.status] || 'bg-slate-700 text-slate-200'}`}>{h.status}</span></td>
              <td className="px-4 py-3">{h.patients?.length || 0}</td>
              <td className="px-4 py-3">{(h.created_at || '').slice(0, 16) || '—'}</td>
            </tr>
          )}
        />
      </div>
    );
  }

  function renderCreateOrDetail() {
    const isReadonly = view === 'detail' && current && current.status !== 'pending';
    const canAccept = view === 'detail' && current && current.status === 'pending';

    return (
      <div>
        <PageHeader title={view === 'create' ? 'New Handover' : 'Handover Detail'} subtitle={
          view === 'detail' && current ? `Status: ${current.status}` : ''
        } action={
          <div className="flex gap-2">
            <button onClick={() => setView('dashboard')} className="rounded-lg border border-slate-700 px-3 py-1.5 hover:bg-slate-800">Back</button>
            {view === 'create' && (
              <button onClick={submitCreate} disabled={saving} className="rounded-full bg-cyan-500 px-4 py-2 font-medium text-slate-950 disabled:opacity-60">{saving ? 'Saving…' : 'Create Handover'}</button>
            )}
            {view === 'detail' && !isReadonly && !canAccept && (
              <button onClick={submitEdit} disabled={saving} className="rounded-full bg-cyan-500 px-4 py-2 font-medium text-slate-950 disabled:opacity-60">{saving ? 'Saving…' : 'Save Changes'}</button>
            )}
          </div>
        } />

        {error && <ErrorBox message={error} />}
        {actionMsg && <ErrorBox message={actionMsg} />}

        <Card className="mb-6">
          <h2 className="mb-4 text-lg font-semibold">General Information</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm text-slate-300">Receiving Doctor</label>
              <select
                value={receiver}
                onChange={(e) => setReceiver(e.target.value)}
                disabled={isReadonly}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400 disabled:opacity-60"
              >
                <option value="">Select doctor</option>
                {users.filter((u) => u.role === 'doctor').map((u) => (
                  <option key={u.id} value={String(u.id)}>{u.username}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-300">Additional Notes</label>
              <input
                type="text"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                disabled={isReadonly}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400 disabled:opacity-60"
              />
            </div>
          </div>
        </Card>

        {view === 'create' && (
          <Card className="mb-6">
            <h2 className="mb-4 text-lg font-semibold">Add Patients</h2>
            <div className="mb-3 flex gap-2">
              <select
                onChange={(e) => {
                  const pid = Number(e.target.value);
                  if (!pid) return;
                  const p = patients.find((x) => x.id === pid);
                  if (p) addPatientRow(p);
                }}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
              >
                <option value="">Select patient to add</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>{p.full_name} ({p.patient_id})</option>
                ))}
              </select>
            </div>
            {selectedPatients.map((p) => (
              <div key={p.id} className="mb-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="font-medium text-slate-100">{p.full_name}</h4>
                  <button onClick={() => removePatientRow(p.id)} className="text-sm text-red-300 hover:text-red-200">Remove</button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Ward" value={patientsData[p.id]?.ward || ''} onChange={(v) => updatePatientField(p.id, 'ward', v)} />
                  <Field label="Bed Number" value={patientsData[p.id]?.bed_number || ''} onChange={(v) => updatePatientField(p.id, 'bed_number', v)} />
                  <Field label="Priority" value={patientsData[p.id]?.priority_level || 'stable'} onChange={(v) => updatePatientField(p.id, 'priority_level', v)} />
                  <TextArea label="Diagnosis" value={patientsData[p.id]?.diagnosis || ''} onChange={(v) => updatePatientField(p.id, 'diagnosis', v)} />
                  <TextArea label="Current Condition" value={patientsData[p.id]?.current_condition || ''} onChange={(v) => updatePatientField(p.id, 'current_condition', v)} rows={2} />
                  <TextArea label="Vital Signs" value={patientsData[p.id]?.vital_signs || ''} onChange={(v) => updatePatientField(p.id, 'vital_signs', v)} rows={2} />
                  <TextArea label="Allergies" value={patientsData[p.id]?.allergies || ''} onChange={(v) => updatePatientField(p.id, 'allergies', v)} rows={2} />
                  <TextArea label="Current Medications" value={patientsData[p.id]?.current_medications || ''} onChange={(v) => updatePatientField(p.id, 'current_medications', v)} rows={2} />
                  <TextArea label="Treatments Given" value={patientsData[p.id]?.treatments_given || ''} onChange={(v) => updatePatientField(p.id, 'treatments_given', v)} rows={2} />
                  <TextArea label="Procedures Performed" value={patientsData[p.id]?.procedures_performed || ''} onChange={(v) => updatePatientField(p.id, 'procedures_performed', v)} rows={2} />
                  <TextArea label="Pending Lab Tests" value={patientsData[p.id]?.pending_lab_tests || ''} onChange={(v) => updatePatientField(p.id, 'pending_lab_tests', v)} rows={2} />
                  <TextArea label="Available Lab Results" value={patientsData[p.id]?.available_lab_results || ''} onChange={(v) => updatePatientField(p.id, 'available_lab_results', v)} rows={2} />
                  <TextArea label="Imaging Results" value={patientsData[p.id]?.imaging_results || ''} onChange={(v) => updatePatientField(p.id, 'imaging_results', v)} rows={2} />
                  <TextArea label="Follow-up Instructions" value={patientsData[p.id]?.follow_up_instructions || ''} onChange={(v) => updatePatientField(p.id, 'follow_up_instructions', v)} rows={2} />
                  <TextArea label="Risks / Precautions" value={patientsData[p.id]?.risks_precautions || ''} onChange={(v) => updatePatientField(p.id, 'risks_precautions', v)} rows={2} />
                </div>
              </div>
            ))}
          </Card>
        )}

        {view === 'detail' && current && (
          <Card>
            <h2 className="mb-4 text-lg font-semibold">Patients</h2>
            {current.patients?.length === 0 ? <EmptyBox message="No patients attached." /> : (
              current.patients.map((p) => (
                <div key={p.id} className="mb-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="font-medium text-slate-100">{p.patient_name} <span className="ml-2 text-xs text-slate-400">({p.patient_code})</span></h4>
                    <span className={`text-xs ${priorityColors[p.priority_level] || 'text-slate-300'}`}>{p.priority_level}</span>
                  </div>
                  <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    {p.ward && <div><span className="text-slate-400">Ward:</span> <span className="ml-2">{p.ward}</span></div>}
                    {p.bed_number && <div><span className="text-slate-400">Bed:</span> <span className="ml-2">{p.bed_number}</span></div>}
                    {p.diagnosis && <div className="sm:col-span-2 lg:col-span-3"><span className="text-slate-400">Diagnosis:</span> <span className="ml-2">{p.diagnosis}</span></div>}
                    {p.current_condition && <div className="sm:col-span-2 lg:col-span-3"><span className="text-slate-400">Condition:</span> <span className="ml-2">{p.current_condition}</span></div>}
                    {p.allergies && <div className="sm:col-span-2 lg:col-span-3"><span className="text-slate-400">Allergies:</span> <span className="ml-2 text-red-300">{p.allergies}</span></div>}
                    {p.current_medications && <div className="sm:col-span-2 lg:col-span-3"><span className="text-slate-400">Medications:</span> <span className="ml-2">{p.current_medications}</span></div>}
                    {p.risks_precautions && <div className="sm:col-span-2 lg:col-span-3"><span className="text-slate-400">Risks:</span> <span className="ml-2 text-amber-300">{p.risks_precautions}</span></div>}
                  </div>
                </div>
              ))
            )}
            {canAccept && (
              <div className="mt-4 flex gap-2">
                <button onClick={() => submitAcceptOrReject(current.id, 'accepted')} className="rounded-full bg-emerald-500 px-4 py-2 font-medium text-slate-950">Accept</button>
                <button onClick={() => submitAcceptOrReject(current.id, 'rejected')} className="rounded-full bg-red-500 px-4 py-2 font-medium text-slate-950">Reject</button>
              </div>
            )}
          </Card>
        )}
      </div>
    );
  }

  if (loading) return <LoadingBox />;
  if (error) return <ErrorBox message={error} />;

  return view === 'dashboard' ? renderDashboard() : renderCreateOrDetail();
}
