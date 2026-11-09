import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { query, onSyncChange, create, update } from '../offline/data';
import { Card, ErrorBox, LoadingBox, EmptyBox, Table, PageHeader } from '../components/ui';

type Referral = {
  id: number;
  patient: number;
  patient_full_name?: string;
  referring_doctor_name?: string;
  referring_facility_name?: string;
  receiving_department: string;
  referral_type: string;
  urgency_level: string;
  status: string;
  referral_date: string;
  reason: string;
  primary_diagnosis: string;
  clinical_summary: string;
  medical_history: string;
  current_treatment: string;
  current_medications: string;
  allergies: string;
  vital_signs: string;
  lab_results: string;
  imaging_results: string;
  additional_notes: string;
  is_emergency: boolean;
  created_at: string;
  timeline?: any[];
};

type Patient = { id: number; full_name: string; patient_id: string };
type Hospital = { id: number; name: string };

const REFERRAL_TYPE_LABELS: Record<string, string> = {
  internal: 'Internal',
  external: 'External',
  emergency: 'Emergency',
  specialist: 'Specialist',
  facility_to_facility: 'Facility-to-Facility',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  accepted: 'Accepted',
  rejected: 'Rejected',
  in_transit: 'In Transit',
  received: 'Received',
  under_review: 'Under Review',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function statusColor(status: string): string {
  switch (status) {
    case 'draft': return 'text-slate-400';
    case 'submitted':
    case 'received':
    case 'under_review': return 'text-amber-300';
    case 'accepted':
    case 'in_transit': return 'text-cyan-300';
    case 'rejected': return 'text-red-300';
    case 'completed': return 'text-emerald-300';
    case 'cancelled': return 'text-slate-500';
    default: return 'text-slate-300';
  }
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  multiline?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm text-slate-300">
        {label}
        {required && <span className="text-cyan-400"> *</span>}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
          rows={3}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
        />
      )}
    </div>
  );
}

export default function Referrals() {
  const [tab, setTab] = useState<'list' | 'create' | 'detail'>('list');
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const role = localStorage.getItem('medlink_user_role') || '';
  const canCreate = role === 'doctor' || role === 'administrator';
  const canAccept = role === 'doctor' || role === 'administrator';

  const [form, setForm] = useState({
    patient: '',
    receiving_facility: '',
    receiving_department: '',
    referral_type: 'specialist',
    urgency_level: 'routine',
    is_emergency: false,
    reason: '',
    primary_diagnosis: '',
    clinical_summary: '',
    medical_history: '',
    current_treatment: '',
    current_medications: '',
    allergies: '',
    vital_signs: '',
    lab_results: '',
    imaging_results: '',
    additional_notes: '',
  });

  function load() {
    setLoading(true);
    setError('');
    Promise.all([query('referrals'), query('patients'), query('hospitals')])
      .then(([r, p, h]) => {
        setReferrals(Array.isArray(r) ? r : []);
        setPatients(Array.isArray(p) ? p : []);
        setHospitals(Array.isArray(h) ? h : []);
      })
      .catch((e) => setError(e.message || 'Failed to load data.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    const off = onSyncChange(() => load());
    return off;
  }, []);

  function resetForm() {
    setSelectedId(null);
    setForm({
      patient: '',
      receiving_facility: '',
      receiving_department: '',
      referral_type: 'specialist',
      urgency_level: 'routine',
      is_emergency: false,
      reason: '',
      primary_diagnosis: '',
      clinical_summary: '',
      medical_history: '',
      current_treatment: '',
      current_medications: '',
      allergies: '',
      vital_signs: '',
      lab_results: '',
      imaging_results: '',
      additional_notes: '',
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setActionMsg('');
    if (!canCreate) {
      setActionMsg('You do not have permission to create referrals.');
      return;
    }
    if (!form.patient) {
      setActionMsg('Select a patient.');
      return;
    }
    setSaving(true);
    try {
      await create('referrals', {
        patient: Number(form.patient),
        receiving_facility: form.receiving_facility ? Number(form.receiving_facility) : null,
        receiving_department: form.receiving_department,
        referral_type: form.referral_type,
        urgency_level: form.urgency_level,
        is_emergency: form.is_emergency,
        reason: form.reason,
        primary_diagnosis: form.primary_diagnosis,
        clinical_summary: form.clinical_summary,
        medical_history: form.medical_history,
        current_treatment: form.current_treatment,
        current_medications: form.current_medications,
        allergies: form.allergies,
        vital_signs: form.vital_signs,
        lab_results: form.lab_results,
        imaging_results: form.imaging_results,
        additional_notes: form.additional_notes,
      });
      resetForm();
      load();
    } catch (err) {
      setActionMsg((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(id: number | string, newStatus: string) {
    setActionMsg('');
    try {
      await update('referrals', id, { status: newStatus });
      load();
    } catch (err) {
      setActionMsg((err as Error).message);
    }
  }

  async function handleResubmit(id: number | string) {
    await handleStatusChange(id, 'submitted');
  }

  async function handleAccept(id: number | string) {
    await handleStatusChange(id, 'accepted');
  }

  async function handleReject(id: number | string) {
    await handleStatusChange(id, 'rejected');
  }

  async function handleComplete(id: number | string) {
    await handleStatusChange(id, 'completed');
  }

  async function handleCancel(id: number | string) {
    await handleStatusChange(id, 'cancelled');
  }

  function openDetail(ref: Referral) {
    setSelectedId(ref.id);
    setTab('detail');
  }

function allowedActions(ref: Referral): string[] {
    const actions: string[] = [];
    if (ref.status === 'draft' && canCreate) actions.push('submit');
    if (ref.status === 'submitted' && canAccept) actions.push('accept', 'reject');
    if (ref.status === 'accepted' && canAccept) actions.push('complete');
    if (['draft', 'submitted', 'accepted', 'received', 'under_review'].includes(ref.status) && canCreate) actions.push('cancel');
    return actions;
  }

  const pending = referrals.filter((r) => ['submitted', 'in_transit', 'received', 'under_review', 'accepted'].includes(r.status));
  const accepted = referrals.filter((r) => r.status === 'accepted');
  const rejected = referrals.filter((r) => r.status === 'rejected');
  const completed = referrals.filter((r) => r.status === 'completed');
  const emergency = referrals.filter((r) => r.is_emergency);
  const [referralTab, setReferralTab] = useState<'all' | 'pending' | 'accepted' | 'rejected' | 'completed' | 'emergency'>('all');

  if (loading && referrals.length === 0) return <LoadingBox />;
  if (error) return <ErrorBox message={error} />;

  const selected = selectedId ? referrals.find((r) => r.id === selectedId) : null;

  return (
    <div>
      <PageHeader
        title="Referrals"
        subtitle="Manage patient referrals between facilities"
        action={
          !canCreate ? (
            <span className="rounded-full bg-slate-800 px-3 py-1.5 text-xs text-slate-400">Read-only</span>
          ) : (
            <button
              onClick={() => setTab('create')}
              className="rounded-full bg-cyan-500 px-4 py-2 font-medium text-slate-950"
            >
              New Referral
            </button>
          )
        }
      />

      {actionMsg && <ErrorBox message={actionMsg} />}

      {tab === 'list' ? (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-4">
            <Card>
              <p className="text-sm text-slate-400">Pending</p>
              <p className="mt-2 text-3xl font-semibold text-amber-300">{pending.length}</p>
            </Card>
            <Card>
              <p className="text-sm text-slate-400">Accepted</p>
              <p className="mt-2 text-3xl font-semibold text-cyan-300">{accepted.length}</p>
            </Card>
            <Card>
              <p className="text-sm text-slate-400">Rejected</p>
              <p className="mt-2 text-3xl font-semibold text-red-300">{rejected.length}</p>
            </Card>
            <Card>
              <p className="text-sm text-slate-400">Completed</p>
              <p className="mt-2 text-3xl font-semibold text-emerald-300">{completed.length}</p>
            </Card>
          </div>

          {emergency.length > 0 && (
            <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
              {emergency.length} emergency referral(s) require attention
            </div>
          )}

          <Card>
            <h2 className="mb-4 text-lg font-semibold">Referrals</h2>
            <div className="mb-3 flex gap-2">
              {['all', 'pending', 'accepted', 'rejected', 'completed', 'emergency'].map((k) => (
                <button key={k} onClick={() => setReferralTab(k as any)} className={`px-3 py-1 rounded ${referralTab === k ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800'}`}>{k.charAt(0).toUpperCase()+k.slice(1)}</button>
              ))}
            </div>
            {referrals.length === 0 ? (
              <EmptyBox message="No referrals yet." />
            ) : (
              <Table columns={['Patient', 'Type', 'Urgency', 'Status', 'Department', 'Date', 'Actions']}>
                {referrals.filter((r) => {
                  if (referralTab === 'all') return true;
                  if (referralTab === 'pending') return ['submitted','in_transit','received','under_review','accepted'].includes(r.status);
                  if (referralTab === 'emergency') return r.is_emergency;
                  return r.status === referralTab;
                }).map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/40">
                    <td className="px-4 py-3">{r.patient_full_name || `Patient #${r.patient}`}</td>
                    <td className="px-4 py-3">{REFERRAL_TYPE_LABELS[r.referral_type] || r.referral_type}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          r.urgency_level === 'emergency' ? 'text-red-300' :
                          r.urgency_level === 'urgent' ? 'text-amber-300' : 'text-slate-300'
                        }
                      >
                        {r.urgency_level}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={statusColor(r.status)}>
                        {STATUS_LABELS[r.status] || r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">{r.receiving_department || '—'}</td>
                    <td className="px-4 py-3">{(r.referral_date || r.created_at || '').slice(0, 10)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openDetail(r)}
                        className="text-sm text-cyan-300 hover:text-cyan-200"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        </>
      ) : tab === 'create' ? (
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Create Referral</h2>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm text-slate-300">Patient *</label>
              <select
                value={form.patient}
                onChange={(e) => setForm((f) => ({ ...f, patient: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
                required
              >
                <option value="">Select patient</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} ({p.patient_id})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-300">Receiving Facility</label>
              <select
                value={form.receiving_facility}
                onChange={(e) => setForm((f) => ({ ...f, receiving_facility: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
              >
                <option value="">Select facility (optional)</option>
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
            <Field
              label="Receiving Department"
              value={form.receiving_department}
              onChange={(v) => setForm((f) => ({ ...f, receiving_department: v }))}
            />
            <div>
              <label className="block text-sm text-slate-300">Referral Type</label>
              <select
                value={form.referral_type}
                onChange={(e) => setForm((f) => ({ ...f, referral_type: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
              >
                {Object.entries(REFERRAL_TYPE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-300">Urgency Level</label>
              <select
                value={form.urgency_level}
                onChange={(e) => setForm((f) => ({ ...f, urgency_level: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
              >
                <option value="routine">Routine</option>
                <option value="urgent">Urgent</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={form.is_emergency}
                  onChange={(e) => setForm((f) => ({ ...f, is_emergency: e.target.checked }))}
                />
                Emergency referral
              </label>
            </div>
            <Field label="Reason for Referral" value={form.reason} onChange={(v) => setForm((f) => ({ ...f, reason: v }))} required />
            <Field label="Primary Diagnosis" value={form.primary_diagnosis} onChange={(v) => setForm((f) => ({ ...f, primary_diagnosis: v }))} />
            <Field label="Clinical Summary" value={form.clinical_summary} onChange={(v) => setForm((f) => ({ ...f, clinical_summary: v }))} multiline />
            <Field label="Medical History" value={form.medical_history} onChange={(v) => setForm((f) => ({ ...f, medical_history: v }))} multiline />
            <Field label="Current Treatment" value={form.current_treatment} onChange={(v) => setForm((f) => ({ ...f, current_treatment: v }))} multiline />
            <Field label="Current Medications" value={form.current_medications} onChange={(v) => setForm((f) => ({ ...f, current_medications: v }))} multiline />
            <Field label="Allergies" value={form.allergies} onChange={(v) => setForm((f) => ({ ...f, allergies: v }))} />
            <Field label="Vital Signs" value={form.vital_signs} onChange={(v) => setForm((f) => ({ ...f, vital_signs: v }))} />
            <Field label="Lab Results" value={form.lab_results} onChange={(v) => setForm((f) => ({ ...f, lab_results: v }))} multiline />
            <Field label="Imaging Results" value={form.imaging_results} onChange={(v) => setForm((f) => ({ ...f, imaging_results: v }))} multiline />
            <Field label="Additional Notes" value={form.additional_notes} onChange={(v) => setForm((f) => ({ ...f, additional_notes: v }))} multiline />
            <div className="sm:col-span-2 flex gap-2">
              <button type="submit" disabled={saving} className="rounded-full bg-cyan-500 px-4 py-2 font-medium text-slate-950 disabled:opacity-60">
                {saving ? 'Saving…' : 'Create Referral (Draft)'}
              </button>
              <button type="button" onClick={() => { resetForm(); setTab('list'); }} className="rounded-lg border border-slate-700 px-3 py-1.5 hover:bg-slate-800">
                Cancel
              </button>
            </div>
          </form>
        </Card>
      ) : tab === 'detail' && selected ? (
        <Card>
          <div className="flex justify-between items-start">
            <h2 className="text-lg font-semibold">Referral #{selected.id}</h2>
            <span className={`text-sm ${statusColor(selected.status)}`}>
              {STATUS_LABELS[selected.status] || selected.status}
            </span>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div><span className="text-sm text-slate-400">Patient:</span> {selected.patient_full_name || `#${selected.patient}`}</div>
            <div><span className="text-sm text-slate-400">Referring Doctor:</span> {selected.referring_doctor_name || '—'}</div>
            <div><span className="text-sm text-slate-400">Referring Facility:</span> {selected.referring_facility_name || '—'}</div>
            <div><span className="text-sm text-slate-400">Department:</span> {selected.receiving_department || '—'}</div>
            <div><span className="text-sm text-slate-400">Type:</span> {REFERRAL_TYPE_LABELS[selected.referral_type] || selected.referral_type}</div>
            <div><span className="text-sm text-slate-400">Urgency:</span> {selected.urgency_level}</div>
            <div className="sm:col-span-2"><span className="text-sm text-slate-400">Reason:</span> {selected.reason}</div>
            <div className="sm:col-span-2"><span className="text-sm text-slate-400">Primary Diagnosis:</span> {selected.primary_diagnosis || '—'}</div>
            <div className="sm:col-span-2"><span className="text-sm text-slate-400">Clinical Summary:</span> {selected.clinical_summary || '—'}</div>
            <div className="sm:col-span-2"><span className="text-sm text-slate-400">Additional Notes:</span> {selected.additional_notes || '—'}</div>
          </div>

          <div className="mt-4 flex gap-2">
            {allowedActions(selected).map((a) => (
              <button
                key={a}
                onClick={() => {
                  if (a === 'submit') handleResubmit(selected.id);
                  if (a === 'accept') handleAccept(selected.id);
                  if (a === 'reject') handleReject(selected.id);
                  if (a === 'complete') handleComplete(selected.id);
                  if (a === 'cancel') handleCancel(selected.id);
                }}
                className="rounded-full border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800"
              >
                {a.charAt(0).toUpperCase() + a.slice(1)}
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Card>
              <p className="text-sm text-slate-400">Vital Signs Snapshot</p>
              <p className="mt-1 text-lg">{selected.vital_signs ? 'Available' : '—'}</p>
            </Card>
            <Card>
              <p className="text-sm text-slate-400">Recent Labs</p>
              <p className="mt-1 text-lg">{selected.lab_results ? 'Available' : '—'}</p>
            </Card>
            <Card>
              <p className="text-sm text-slate-400">Current Medications</p>
              <p className="mt-1 text-lg">{selected.current_medications ? selected.current_medications.split('\n')[0] : '—'}</p>
            </Card>
          </div>

          <Card className="mt-4">
            <h3 className="mb-3 text-md font-semibold">Referral Timeline & Receiving Response</h3>
            <div className="grid gap-2">
              <div><strong>Timeline:</strong></div>
              {(selected.timeline || []).length === 0 ? <EmptyBox message="No timeline items." /> : (
                <Table columns={['Time', 'Event', 'Details']}>
                  {(selected.timeline || []).map((ev: any) => (
                    <tr key={ev.id} className="hover:bg-slate-800/40">
                      <td className="px-4 py-3">{(ev.occurred_at || '').slice(0,19)}</td>
                      <td className="px-4 py-3">{ev.title}</td>
                      <td className="px-4 py-3">{ev.description || ''}</td>
                    </tr>
                  ))}
                </Table>
              )}
            </div>
          </Card>
        </Card>
      ) : (
        <EmptyBox message="Select a referral to view details." />
      )}
    </div>
  );
}
