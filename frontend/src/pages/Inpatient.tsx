import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { query, onSyncChange, create, update } from '../offline/data';
import { api, ensureOnline } from '../api';
import {
  Card, ErrorBox, LoadingBox, EmptyBox, Table, PageHeader,
} from '../components/ui';

type Patient = { id: number; full_name: string; patient_id: string };
type Ward = { id: number; name: string; code: string; department: string; is_active?: boolean };
type Room = { id: number; room_number: string };
type Bed = {
  id: number;
  bed_number: string;
  status: string;
  room: number;
  room_number?: string;
  ward_name?: string;
  patient_full_name?: string;
  current_patient: number | null;
};
type Admission = {
  id: number;
  patient: number;
  patient_full_name?: string;
  doctor?: number;
  doctor_name?: string;
  ward?: number;
  ward_name?: string;
  room?: number;
  room_number?: string;
  bed?: number;
  bed_number?: string;
  encounter?: number;
  admission_type: string;
  is_emergency: boolean;
  primary_diagnosis: string;
  status: string;
  admission_date: string;
  admission_reason?: string;
  assigned_nurses?: string;
  insurance_type?: string;
  insurance_coverage?: string;
  length_of_stay?: number;
  discharge_status?: string;
  discharge_date?: string;
  discharge_diagnosis?: string;
  treatment_provided?: string;
  procedures_performed?: string;
  discharge_medications?: string;
  condition_at_discharge?: string;
  follow_up_instructions?: string;
  follow_up_appointment?: string;
  discharge_notes?: string;
  created_at: string;
};
type InpatientNote = {
  id: number;
  admission: number;
  patient: number;
  note_type: string;
  title: string;
  content: string;
  recorded_by_username?: string;
  recorded_at: string;
  is_critical: boolean;
};
type InpatientLabRequest = {
  id: number;
  patient: number;
  admission: number | null;
  test_name: string;
  priority: string;
  status: string;
  lab_number: string;
};
type InpatientPrescription = {
  id: number;
  patient: number;
  admission: number | null;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  status: string;
};

const NOTE_TYPE_LABELS: Record<string, string> = {
  clinical: 'Clinical Note',
  nursing: 'Nursing Note',
  observation: 'Observation',
  treatment: 'Treatment Change',
  diagnosis: 'New Diagnosis',
  doctor_review: 'Doctor Review',
};

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

export default function Inpatient() {
  const [tab, setTab] = useState<'dashboard' | 'beds' | 'admit' | 'patient' | 'admitted'>('dashboard');
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [notes, setNotes] = useState<InpatientNote[]>([]);
  const [labRequests, setLabRequests] = useState<InpatientLabRequest[]>([]);
  const [prescriptions, setPrescriptions] = useState<InpatientPrescription[]>([]);
  const [selectedAdmission, setSelectedAdmission] = useState<number | null>(null);
  const [patientTab, setPatientTab] = useState<string>('overview');
  const [vitals, setVitals] = useState<any[]>([]);
  const [encountersList, setEncountersList] = useState<any[]>([]);
  const [medAdmins, setMedAdmins] = useState<any[]>([]);
  const [handoversList, setHandoversList] = useState<any[]>([]);
  const [transfersList, setTransfersList] = useState<any[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [billsList, setBillsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const role = localStorage.getItem('medlink_user_role') || '';
  const canAdmit = role === 'doctor' || role === 'administrator';

  const [form, setForm] = useState({
    patient: '',
    doctor: '',
    admission_type: 'emergency',
    admission_reason: '',
    primary_diagnosis: '',
    secondary_diagnoses: '',
    ward: '',
    room: '',
    bed: '',
    insurance_type: 'self_pay',
    clinical_notes: '',
  });

  function loadDashboard() {
    setLoading(true);
    setError('');
    Promise.all([
      query('admissions'),
      query('patients'),
      query('wards'),
      query('rooms'),
      query('beds'),
    ])
      .then(([a, p, w, r, b]) => {
        setAdmissions(a || []);
        setPatients(p || []);
        setWards(w || []);
        setRooms(r || []);
        setBeds(b || []);
      })
      .catch((e) => setError(e.message || 'Failed to load data.'))
      .finally(() => setLoading(false));
  }

  function loadPatientDetail(admissionId: number) {
    setLoading(true);
    setError('');
    Promise.all([
      query('inpatient-notes'),
      query('inpatient-lab-requests'),
      query('inpatient-prescriptions'),
      query('vitals'),
      query('encounters'),
      query('med-admins'),
      query('handovers'),
      query('bed-transfers'),
      query('timeline'),
      query('bills'),
    ])
      .then(([n, l, p, v, e, m, h, t, tl, b]) => {
        const admissionNotes = (Array.isArray(n) ? n : []).filter((note: InpatientNote) => note.admission === admissionId);
        const admissionLabs = (Array.isArray(l) ? l : []).filter((lab: InpatientLabRequest) => lab.admission === admissionId);
        const admissionRxs = (Array.isArray(p) ? p : []).filter((rx: InpatientPrescription) => rx.admission === admissionId);
        const admissionVitals = (Array.isArray(v) ? v : []).filter((vt: any) => String(vt.encounter) === String(admissions.find((a) => a.id === admissionId)?.encounter || '') || String(vt.patient) === String(admissions.find((a) => a.id === admissionId)?.patient || ''));
        const admissionEnc = (Array.isArray(e) ? e : []).filter((enc: any) => String(enc.patient) === String(admissions.find((a) => a.id === admissionId)?.patient || ''));
        const admissionMedAdmins = (Array.isArray(m) ? m : []).filter((ma: any) => String(ma.patient) === String(admissions.find((a) => a.id === admissionId)?.patient || ''));
        const admissionHandovers = (Array.isArray(h) ? h : []).filter((ho: any) => (ho.patients || []).some((hp: any) => String(hp.patient) === String(admissions.find((a) => a.id === admissionId)?.patient || '')));
        const admissionTransfers = (Array.isArray(t) ? t : []).filter((tr: any) => String(tr.admission) === String(admissionId) || String(tr.patient) === String(admissions.find((a) => a.id === admissionId)?.patient || ''));
        const admissionTimeline = (Array.isArray(tl) ? tl : []).filter((ev: any) => String(ev.patient) === String(admissions.find((a) => a.id === admissionId)?.patient || ''));
        const admissionBills = (Array.isArray(b) ? b : []).filter((bi: any) => String(bi.patient) === String(admissions.find((a) => a.id === admissionId)?.patient || ''));

        setNotes(admissionNotes);
        setLabRequests(admissionLabs);
        setPrescriptions(admissionRxs);
        setVitals(admissionVitals);
        setEncountersList(admissionEnc);
        setMedAdmins(admissionMedAdmins);
        setHandoversList(admissionHandovers);
        setTransfersList(admissionTransfers);
        setTimelineEvents(admissionTimeline);
        setBillsList(admissionBills);
      })
      .catch((e) => setError(e.message || 'Failed to load patient data.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (tab === 'dashboard') loadDashboard();
    if (tab === 'patient') loadPatientDetail(selectedAdmission || 0);
    const off = onSyncChange(() => {
      if (tab === 'dashboard') loadDashboard();
      if (tab === 'patient') loadPatientDetail(selectedAdmission || 0);
    });
    return off;
  }, [tab, selectedAdmission]);

  async function handleAdmit(e: FormEvent) {
    e.preventDefault();
    setActionMsg('');
    if (!canAdmit) {
      setActionMsg('You do not have permission to admit patients.');
      return;
    }
    if (!form.patient) {
      setActionMsg('Select a patient.');
      return;
    }
    setSaving(true);
    try {
      await create('admissions', {
        patient: Number(form.patient),
        doctor: form.doctor ? Number(form.doctor) : null,
        admission_type: form.admission_type,
        admission_reason: form.admission_reason,
        primary_diagnosis: form.primary_diagnosis,
        secondary_diagnoses: form.secondary_diagnoses ? JSON.stringify([form.secondary_diagnoses]) : [],
        ward: form.ward ? Number(form.ward) : null,
        room: form.room ? Number(form.room) : null,
        bed: form.bed ? Number(form.bed) : null,
        insurance_type: form.insurance_type,
        clinical_notes: form.clinical_notes,
        is_emergency: form.admission_type === 'emergency',
      });
      setForm({
        patient: '', doctor: '', admission_type: 'emergency',
        admission_reason: '', primary_diagnosis: '', secondary_diagnoses: '',
        ward: '', room: '', bed: '', insurance_type: 'self_pay', clinical_notes: '',
      });
      loadDashboard();
      setTab('dashboard');
    } catch (err) {
      setActionMsg((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDischarge(admissionId: number | string) {
    setActionMsg('');
    const dischargeForm = {
      discharge_diagnosis: prompt('Discharge diagnosis:') || '',
      condition_at_discharge: prompt('Condition at discharge:') || 'Stable',
      discharge_status: 'discharged',
      discharge_date: new Date().toISOString(),
    };
    try {
      await update('admissions', admissionId, dischargeForm);
      loadDashboard();
      if (selectedAdmission === admissionId) loadPatientDetail(Number(admissionId));
    } catch (err) {
      setActionMsg((err as Error).message);
    }
  }

  async function handleTransfer(admissionId: number | string) {
    setActionMsg('');
    const toWardId = prompt('Enter destination Ward ID:');
    if (!toWardId) return;
    try {
      ensureOnline();
      await api.post('admissions', `${admissionId}/transfer`, {
        to_ward: Number(toWardId),
        to_room: '',
        to_bed: '',
        reason: prompt('Reason for transfer:') || '',
      });
      loadDashboard();
    } catch (err) {
      setActionMsg((err as Error).message);
    }
  }

  function openPatient(admission: Admission) {
    setSelectedAdmission(admission.id);
    setTab('patient');
    setPatientTab('overview');
    setActionMsg('');
  }

  function bedsForRoom(roomId: string): Bed[] {
    return beds.filter((b) => b.room === Number(roomId));
  }

  const availableBeds = beds.filter((b) => b.status === 'available');

  if (loading && (admissions.length === 0 && beds.length === 0)) return <LoadingBox />;
  if (error) return <ErrorBox message={error} />;

  const activeAdmissions = admissions.filter((a) => a.status === 'admitted' || a.status === 'transferred');
  const discharged = admissions.filter((a) => a.status === 'discharged');

  return (
    <div>
      <PageHeader
        title="Inpatient"
        subtitle="Admit, manage, and care for inpatients"
        action={
          <div className="flex gap-2">
            <button
              onClick={() => setTab('admitted')}
              className={`rounded-full px-4 py-2 font-medium ${tab === 'admitted' ? 'bg-cyan-500 text-slate-950' : 'border border-slate-700 text-slate-300 hover:bg-slate-800'}`}
            >
              Admitted Patients
            </button>
            {canAdmit && (
              <button
                onClick={() => setTab('admit')}
                className="rounded-full bg-cyan-500 px-4 py-2 font-medium text-slate-950"
              >
                Admit Patient
              </button>
            )}
            <button
              onClick={() => setTab('beds')}
              className={`rounded-full px-4 py-2 font-medium ${tab === 'beds' ? 'bg-cyan-500 text-slate-950' : 'border border-slate-700 text-slate-300 hover:bg-slate-800'}`}
            >
              Ward & Beds
            </button>
          </div>
        }
      />

      {actionMsg && <ErrorBox message={actionMsg} />}

      {tab === 'dashboard' ? (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <Card>
              <p className="text-sm text-slate-400">Active Admissions</p>
              <p className="mt-2 text-3xl font-semibold text-cyan-300">{activeAdmissions.length}</p>
            </Card>
            <Card>
              <p className="text-sm text-slate-400">Available Beds</p>
              <p className="mt-2 text-3xl font-semibold text-emerald-300">{availableBeds.length}</p>
            </Card>
            <Card>
              <p className="text-sm text-slate-400">Discharged</p>
              <p className="mt-2 text-3xl font-semibold text-slate-300">{discharged.length}</p>
            </Card>
          </div>

          <Card className="mb-6">
            <h2 className="mb-4 text-lg font-semibold">Currently Admitted</h2>
            {activeAdmissions.length === 0 ? (
              <EmptyBox message="No active inpatient admissions." />
            ) : (
              <Table columns={['Patient', 'Ward', 'Bed', 'Doctor', 'Type', 'Admitted', 'LOS', 'Actions']}>
                {activeAdmissions.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-800/40">
                    <td className="px-4 py-3">{a.patient_full_name || `Patient #${a.patient}`}</td>
                    <td className="px-4 py-3">{a.ward_name || '—'}</td>
                    <td className="px-4 py-3">{a.bed_number || '—'}</td>
                    <td className="px-4 py-3">{a.doctor_name || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={a.is_emergency ? 'text-red-300' : 'text-slate-300'}>
                        {a.admission_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">{(a.admission_date || a.created_at || '').slice(0, 10)}</td>
                    <td className="px-4 py-3">{a.length_of_stay ?? '—'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openPatient(a)}
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

          {discharged.length > 0 && (
            <Card>
              <h2 className="mb-4 text-lg font-semibold">Recently Discharged</h2>
              <Table columns={['Patient', 'Date', 'Diagnosis', 'Status']}>
                {discharged.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-800/40">
                    <td className="px-4 py-3">{a.patient_full_name || `#${a.patient}`}</td>
                    <td className="px-4 py-3">{(a.discharge_date || '').slice(0, 10)}</td>
                    <td className="px-4 py-3">{a.primary_diagnosis || '—'}</td>
                    <td className="px-4 py-3">{a.discharge_status || '—'}</td>
                  </tr>
                ))}
              </Table>
            </Card>
          )}
        </>
      ) : tab === 'beds' ? (
        <div>
          <Card className="mb-6">
            <h2 className="mb-4 text-lg font-semibold">Bed Availability</h2>
            <Table columns={['Ward', 'Room', 'Bed', 'Status', 'Patient']}>
              {beds.map((b) => (
                <tr key={b.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3">{b.ward_name || '—'}</td>
                  <td className="px-4 py-3">{b.room_number || '—'}</td>
                  <td className="px-4 py-3">{b.bed_number}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        b.status === 'available' ? 'text-emerald-300' :
                        b.status === 'occupied' ? 'text-red-300' :
                        b.status === 'reserved' ? 'text-amber-300' : 'text-slate-400'
                      }
                    >
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{b.patient_full_name || '—'}</td>
                </tr>
              ))}
            </Table>
          </Card>
          {wards.length > 0 && (
            <Card>
              <h2 className="mb-4 text-lg font-semibold">Wards</h2>
              <Table columns={['Name', 'Code', 'Department', 'Active']}>
                {wards.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-800/40">
                    <td className="px-4 py-3">{w.name}</td>
                    <td className="px-4 py-3">{w.code || '—'}</td>
                    <td className="px-4 py-3">{w.department || '—'}</td>
                    <td className="px-4 py-3">{w.is_active ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </Table>
            </Card>
          )}
        </div>
      ) : tab === 'admit' ? (
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Admit Patient</h2>
          <form onSubmit={handleAdmit} className="grid gap-4 sm:grid-cols-2">
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
              <label className="block text-sm text-slate-300">Attending Doctor</label>
              <select
                value={form.doctor}
                onChange={(e) => setForm((f) => ({ ...f, doctor: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
              >
                <option value="">Select doctor (default: you)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-300">Admission Type</label>
              <select
                value={form.admission_type}
                onChange={(e) => setForm((f) => ({ ...f, admission_type: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
              >
                <option value="emergency">Emergency</option>
                <option value="elective">Elective</option>
                <option value="transfer">Transfer</option>
                <option value="observation">Observation</option>
              </select>
            </div>
            <Field
              label="Admission Reason"
              value={form.admission_reason}
              onChange={(v) => setForm((f) => ({ ...f, admission_reason: v }))}
            />
            <Field
              label="Primary Diagnosis *"
              value={form.primary_diagnosis}
              onChange={(v) => setForm((f) => ({ ...f, primary_diagnosis: v }))}
              required
            />
            <Field
              label="Secondary Diagnoses"
              value={form.secondary_diagnoses}
              onChange={(v) => setForm((f) => ({ ...f, secondary_diagnoses: v }))}
            />
            <div>
              <label className="block text-sm text-slate-300">Ward</label>
              <select
                value={form.ward}
                onChange={(e) => setForm((f) => ({ ...f, ward: e.target.value, room: '', bed: '' }))}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
              >
                <option value="">Select ward</option>
                {wards.map((w) => (
                  <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-300">Room</label>
              <select
                value={form.room}
                onChange={(e) => setForm((f) => ({ ...f, room: e.target.value, bed: '' }))}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
                disabled={!form.ward}
              >
                <option value="">Select room</option>
                {rooms
                  .filter((r) => beds.some((b) => b.room === r.id && (!form.ward || true)))
                  .map((r) => (
                    <option key={r.id} value={r.id}>{r.room_number}</option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-300">Bed</label>
              <select
                value={form.bed}
                onChange={(e) => setForm((f) => ({ ...f, bed: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
                disabled={!form.room}
              >
                <option value="">Select bed</option>
                {bedsForRoom(form.room).filter((b) => b.status === 'available').map((b) => (
                  <option key={b.id} value={b.id}>{b.bed_number}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-300">Insurance Type</label>
              <select
                value={form.insurance_type}
                onChange={(e) => setForm((f) => ({ ...f, insurance_type: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
              >
                <option value="nhis">NHIS</option>
                <option value="private">Private Insurance</option>
                <option value="self_pay">Self-Pay</option>
              </select>
            </div>
            <Field
              label="Clinical Notes"
              value={form.clinical_notes}
              onChange={(v) => setForm((f) => ({ ...f, clinical_notes: v }))}
              multiline
            />
            <div className="sm:col-span-2 flex gap-2">
              <button type="submit" disabled={saving} className="rounded-full bg-cyan-500 px-4 py-2 font-medium text-slate-950 disabled:opacity-60">
                {saving ? 'Admitting…' : 'Admit Patient'}
              </button>
              <button
                type="button"
                onClick={() => setTab('dashboard')}
                className="rounded-lg border border-slate-700 px-3 py-1.5 hover:bg-slate-800"
              >
                Cancel
              </button>
            </div>
          </form>
        </Card>
      ) : tab === 'patient' && selectedAdmission ? (
        <div>
          {(() => {
            const adm = admissions.find((a) => a.id === selectedAdmission);
            if (!adm) return <EmptyBox message="Admission not found." />;
            return (
              <>
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">{adm.patient_full_name || `Patient #${adm.patient}`}</h2>
                    <p className="text-sm text-slate-400">
                      {adm.ward_name && `Ward: ${adm.ward_name}`}
                      {adm.bed_number && ` • Bed: ${adm.bed_number}`}
                      {` • LOS: ${adm.length_of_stay ?? '—'} days`}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (adm.status !== 'discharged') handleDischarge(adm.id);
                    }}
                    disabled={adm.status === 'discharged' || !canAdmit}
                    className="rounded-full bg-red-500 px-4 py-2 font-medium text-slate-100 disabled:opacity-50"
                  >
                    Discharge
                  </button>
                  <button
                    onClick={() => handleTransfer(adm.id)}
                    disabled={adm.status === 'discharged' || !canAdmit}
                    className="rounded-full border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800"
                  >
                    Transfer
                  </button>
                </div>

                <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-800 pb-2">
                  {[
                    { id: 'overview', label: 'Overview' },
                    { id: 'vitals', label: 'Vital Signs' },
                    { id: 'clinical', label: 'Clinical Notes' },
                    { id: 'nursing', label: 'Nursing Notes' },
                    { id: 'encounters', label: 'Encounters' },
                    { id: 'lab', label: 'Laboratory' },
                    { id: 'prescriptions', label: 'Prescriptions' },
                    { id: 'med_admin', label: 'Medication Admin' },
                    { id: 'handovers', label: 'Handovers' },
                    { id: 'billing', label: 'Billing' },
                    { id: 'insurance', label: 'Insurance' },
                    { id: 'timeline', label: 'Timeline' },
                    { id: 'transfers', label: 'Transfers' },
                    { id: 'discharge', label: 'Discharge Summary' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setPatientTab(t.id)}
                      className={`rounded-md px-3 py-1 text-sm ${patientTab === t.id ? 'bg-cyan-500 text-slate-950' : 'bg-cyan-500/10 text-cyan-300'}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <div className="mb-6 grid gap-4 sm:grid-cols-3">
                  <Card>
                    <p className="text-sm text-slate-400">Admission Date</p>
                    <p className="mt-1 text-lg">{(adm.admission_date || adm.created_at || '').slice(0, 19)}</p>
                  </Card>
                  <Card>
                    <p className="text-sm text-slate-400">Attending Doctor</p>
                    <p className="mt-1 text-lg">{adm.doctor_name || '—'}</p>
                  </Card>
                  <Card>
                    <p className="text-sm text-slate-400">Primary Diagnosis</p>
                    <p className="mt-1 text-lg">{adm.primary_diagnosis || '—'}</p>
                  </Card>
                </div>
                {/* Patient tab content */}
                {patientTab === 'overview' && (
                  <>
                    <Card className="mb-6">
                      <h3 className="mb-2 text-md font-semibold">Overview</h3>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div><strong>Current ward:</strong> {adm.ward_name || '—'}</div>
                        <div><strong>Room:</strong> {adm.room_number || '—'}</div>
                        <div><strong>Bed:</strong> {adm.bed_number || '—'}</div>
                        <div><strong>Assigned nurses:</strong> {adm.assigned_nurses || '—'}</div>
                        <div><strong>Admission reason:</strong> {adm.admission_reason || '—'}</div>
                        <div><strong>Status:</strong> {adm.status}</div>
                      </div>
                    </Card>
                  </>
                )}

                {patientTab === 'vitals' && (
                  <Card className="mb-6">
                    <h3 className="mb-3 text-md font-semibold">Vital Signs</h3>
                    {vitals.length === 0 ? <EmptyBox message="No vitals recorded." /> : (
                      <Table columns={['Time', 'Temp (°C)', 'BP', 'Pulse', 'O2', 'Resp']}>
                        {vitals.map((v) => (
                          <tr key={v.id} className="hover:bg-slate-800/40">
                            <td className="px-4 py-3">{(v.recorded_at || '').slice(0, 19)}</td>
                            <td className="px-4 py-3">{v.temperature_c ?? '—'}</td>
                            <td className="px-4 py-3">{v.blood_pressure || '—'}</td>
                            <td className="px-4 py-3">{v.pulse_bpm ?? '—'}</td>
                            <td className="px-4 py-3">{v.oxygen_saturation ?? '—'}</td>
                            <td className="px-4 py-3">{v.respiratory_rate ?? '—'}</td>
                          </tr>
                        ))}
                      </Table>
                    )}
                    <div className="mt-3">
                      <button onClick={() => window.location.assign(`/vitals?patient=${adm.patient}`)} className="rounded-full bg-cyan-500 px-3 py-1.5 font-medium text-slate-950">Record Vital Signs</button>
                    </div>
                  </Card>
                )}

                {patientTab === 'clinical' && (
                  <Card className="mb-6">
                    <h3 className="mb-3 text-md font-semibold">Clinical Notes</h3>
                    {notes.filter((n) => n.note_type !== 'nursing').length === 0 ? <EmptyBox message="No clinical notes." /> : (
                      <Table columns={['Type', 'Title', 'Content', 'By', 'Time', 'Critical']}>
                        {notes.filter((n) => n.note_type !== 'nursing').map((n) => (
                          <tr key={n.id} className="hover:bg-slate-800/40">
                            <td className="px-4 py-3">{NOTE_TYPE_LABELS[n.note_type] || n.note_type}</td>
                            <td className="px-4 py-3">{n.title || '—'}</td>
                            <td className="px-4 py-3 max-w-xs truncate">{n.content}</td>
                            <td className="px-4 py-3">{n.recorded_by_username || '—'}</td>
                            <td className="px-4 py-3">{(n.recorded_at || '').slice(0, 19)}</td>
                            <td className="px-4 py-3">{n.is_critical ? 'Yes' : 'No'}</td>
                          </tr>
                        ))}
                      </Table>
                    )}
                    <div className="mt-3">
                      <button onClick={() => window.scrollTo(0, document.body.scrollHeight)} className="rounded-full bg-cyan-500 px-3 py-1.5 font-medium text-slate-950">Add Clinical Note</button>
                    </div>
                  </Card>
                )}

                {patientTab === 'nursing' && (
                  <Card className="mb-6">
                    <h3 className="mb-3 text-md font-semibold">Nursing Notes</h3>
                    {notes.filter((n) => n.note_type === 'nursing').length === 0 ? <EmptyBox message="No nursing notes." /> : (
                      <Table columns={['Title', 'Content', 'By', 'Time']}>
                        {notes.filter((n) => n.note_type === 'nursing').map((n) => (
                          <tr key={n.id} className="hover:bg-slate-800/40">
                            <td className="px-4 py-3">{n.title || '—'}</td>
                            <td className="px-4 py-3 max-w-xs truncate">{n.content}</td>
                            <td className="px-4 py-3">{n.recorded_by_username || '—'}</td>
                            <td className="px-4 py-3">{(n.recorded_at || '').slice(0, 19)}</td>
                          </tr>
                        ))}
                      </Table>
                    )}
                  </Card>
                )}

                {patientTab === 'encounters' && (
                  <Card className="mb-6">
                    <h3 className="mb-3 text-md font-semibold">Encounters</h3>
                    {encountersList.length === 0 ? <EmptyBox message="No encounters." /> : (
                      <Table columns={['Type', 'Doctor', 'Nurse', 'Status', 'Started']}>
                        {encountersList.map((en) => (
                          <tr key={en.id} className="hover:bg-slate-800/40">
                            <td className="px-4 py-3">{en.encounter_type}</td>
                            <td className="px-4 py-3">{en.doctor_name || '—'}</td>
                            <td className="px-4 py-3">{en.nurse_name || '—'}</td>
                            <td className="px-4 py-3">{en.status}</td>
                            <td className="px-4 py-3">{(en.created_at || '').slice(0, 19)}</td>
                          </tr>
                        ))}
                      </Table>
                    )}
                  </Card>
                )}

                {patientTab === 'lab' && (
                  <Card className="mb-6">
                    <h3 className="mb-3 text-md font-semibold">Laboratory</h3>
                    {labRequests.length === 0 ? <EmptyBox message="No lab requests." /> : (
                      <Table columns={['Test', 'Priority', 'Status', 'Lab #']}>
                        {labRequests.map((l) => (
                          <tr key={l.id} className="hover:bg-slate-800/40">
                            <td className="px-4 py-3">{l.test_name}</td>
                            <td className="px-4 py-3">{l.priority}</td>
                            <td className="px-4 py-3">{l.status}</td>
                            <td className="px-4 py-3">{l.lab_number || '—'}</td>
                          </tr>
                        ))}
                      </Table>
                    )}
                  </Card>
                )}

                {patientTab === 'prescriptions' && (
                  <Card>
                    <h3 className="mb-3 text-md font-semibold">Prescriptions</h3>
                    {prescriptions.length === 0 ? <EmptyBox message="No prescriptions." /> : (
                      <Table columns={['Medication', 'Dosage', 'Frequency', 'Duration', 'Status']}>
                        {prescriptions.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-800/40">
                            <td className="px-4 py-3">{p.medication}</td>
                            <td className="px-4 py-3">{p.dosage}</td>
                            <td className="px-4 py-3">{p.frequency || '—'}</td>
                            <td className="px-4 py-3">{p.duration || '—'}</td>
                            <td className="px-4 py-3">{p.status}</td>
                          </tr>
                        ))}
                      </Table>
                    )}
                  </Card>
                )}

                {patientTab === 'med_admin' && (
                  <Card className="mb-6">
                    <h3 className="mb-3 text-md font-semibold">Medication Administration</h3>
                    {medAdmins.length === 0 ? <EmptyBox message="No medication administration records." /> : (
                      <Table columns={['Medication', 'Dose', 'Time', 'By', 'Notes']}>
                        {medAdmins.map((m) => (
                          <tr key={m.id} className="hover:bg-slate-800/40">
                            <td className="px-4 py-3">{m.medication}</td>
                            <td className="px-4 py-3">{m.dosage}</td>
                            <td className="px-4 py-3">{(m.administered_at || m.created_at || '').slice(0, 19)}</td>
                            <td className="px-4 py-3">{m.administered_by_username || '—'}</td>
                            <td className="px-4 py-3">{m.notes || '—'}</td>
                          </tr>
                        ))}
                      </Table>
                    )}
                    <div className="mt-3">
                      <button onClick={() => window.location.assign(`/pharmacy?patient=${adm.patient}`)} className="rounded-full bg-cyan-500 px-3 py-1.5 font-medium text-slate-950">Record Medication Administration</button>
                    </div>
                  </Card>
                )}

                {patientTab === 'handovers' && (
                  <Card className="mb-6">
                    <h3 className="mb-3 text-md font-semibold">Handovers</h3>
                    {handoversList.length === 0 ? <EmptyBox message="No handovers." /> : (
                      <Table columns={['From', 'To', 'Priority', 'Status', 'Time']}>
                        {handoversList.map((h) => (
                          <tr key={h.id} className="hover:bg-slate-800/40">
                            <td className="px-4 py-3">{h.sender_name || '—'}</td>
                            <td className="px-4 py-3">{h.receiver_name || '—'}</td>
                            <td className="px-4 py-3">{h.priority || '—'}</td>
                            <td className="px-4 py-3">{h.status}</td>
                            <td className="px-4 py-3">{(h.created_at || '').slice(0, 19)}</td>
                          </tr>
                        ))}
                      </Table>
                    )}
                  </Card>
                )}

                {patientTab === 'billing' && (
                  <Card className="mb-6">
                    <h3 className="mb-3 text-md font-semibold">Billing</h3>
                    {billsList.length === 0 ? <EmptyBox message="No bills." /> : (
                      <Table columns={['Type', 'Total', 'Status', 'Created']}>
                        {billsList.map((bi) => (
                          <tr key={bi.id} className="hover:bg-slate-800/40">
                            <td className="px-4 py-3">{bi.bill_type}</td>
                            <td className="px-4 py-3">{bi.total_amount}</td>
                            <td className="px-4 py-3">{bi.status}</td>
                            <td className="px-4 py-3">{(bi.created_at || '').slice(0, 19)}</td>
                          </tr>
                        ))}
                      </Table>
                    )}
                  </Card>
                )}

                {patientTab === 'insurance' && (
                  <Card className="mb-6">
                    <h3 className="mb-3 text-md font-semibold">Insurance</h3>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div><strong>Insurance Type:</strong> {adm.insurance_type || '—'}</div>
                      <div><strong>Coverage:</strong> {adm.insurance_coverage || '—'}</div>
                    </div>
                  </Card>
                )}

                {patientTab === 'timeline' && (
                  <Card className="mb-6">
                    <h3 className="mb-3 text-md font-semibold">Timeline</h3>
                    {timelineEvents.length === 0 ? <EmptyBox message="No timeline events." /> : (
                      <Table columns={['Time', 'Event', 'Details']}>
                        {timelineEvents.map((ev) => (
                          <tr key={ev.id} className="hover:bg-slate-800/40">
                            <td className="px-4 py-3">{(ev.occurred_at || ev.created_at || '').slice(0, 19)}</td>
                            <td className="px-4 py-3">{ev.title}</td>
                            <td className="px-4 py-3">{ev.description || ''}</td>
                          </tr>
                        ))}
                      </Table>
                    )}
                  </Card>
                )}

                {patientTab === 'transfers' && (
                  <Card className="mb-6">
                    <h3 className="mb-3 text-md font-semibold">Transfers</h3>
                    {transfersList.length === 0 ? <EmptyBox message="No transfers." /> : (
                      <Table columns={['From', 'To', 'Reason', 'By', 'Time']}>
                        {transfersList.map((tr) => (
                          <tr key={tr.id} className="hover:bg-slate-800/40">
                            <td className="px-4 py-3">{tr.from_ward_name || '—'}</td>
                            <td className="px-4 py-3">{tr.to_ward_name || '—'}</td>
                            <td className="px-4 py-3">{tr.reason || '—'}</td>
                            <td className="px-4 py-3">{tr.transferred_by_name || '—'}</td>
                            <td className="px-4 py-3">{(tr.created_at || tr.transferred_at || '').slice(0, 19)}</td>
                          </tr>
                        ))}
                      </Table>
                    )}
                  </Card>
                )}

                {patientTab === 'discharge' && (
                  <Card className="mb-6">
                    <h3 className="mb-3 text-md font-semibold">Discharge Summary</h3>
                    <div className="grid gap-2">
                      <div><strong>Diagnosis at discharge:</strong> {adm.discharge_diagnosis || '—'}</div>
                      <div><strong>Treatment provided:</strong> {adm.treatment_provided || '—'}</div>
                      <div><strong>Procedures:</strong> {adm.procedures_performed || '—'}</div>
                      <div><strong>Medications at discharge:</strong> {adm.discharge_medications || '—'}</div>
                      <div><strong>Condition at discharge:</strong> {adm.condition_at_discharge || '—'}</div>
                      <div><strong>Follow-up instructions:</strong> {adm.follow_up_instructions || '—'}</div>
                      <div><strong>Follow-up appointment:</strong> {adm.follow_up_appointment || '—'}</div>
                      <div><strong>Notes:</strong> {adm.discharge_notes || '—'}</div>
                    </div>
                  </Card>
                )}
              </>
            );
          })()}
        </div>
      ) : (
        <EmptyBox message="Select an admission to view details." />
      )}
    </div>
  );
}
