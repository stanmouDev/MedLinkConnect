import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { query, onSyncChange } from '../offline/data';
import { Card, EmptyBox } from '../components/ui';
import { useAuth } from '../auth';
import {
  Activity, Users, FlaskConical, Bed, ClipboardList, FileText, Pill,
  HeartPulse, AlertTriangle, Plus, ChevronDown, User, MapPin, Shield,
} from 'lucide-react';

type Encounter = {
  id: number;
  patient: number;
  patient_full_name?: string;
  encounter_type: string;
  status: string;
  triage_level?: string;
  reason_for_visit?: string;
  created_at: string;
  nurse?: number;
};

type VitalSign = {
  id: number;
  patient: number;
  patient_full_name?: string;
  temperature_c?: number;
  blood_pressure?: string;
  pulse_bpm?: number;
  oxygen_saturation?: number;
  recorded_at: string;
};

type Admission = {
  id: number;
  patient: number;
  patient_full_name?: string;
  ward_name?: string;
  bed_number?: string;
  status: string;
  admission_date: string;
  primary_diagnosis?: string;
  assigned_nurses?: string;
};

type Handover = {
  id: number;
  patient?: number;
  patient_full_name?: string;
  sender_name?: string;
  receiver_name?: string;
  status: string;
  priority: string;
  created_at: string;
};

type MedicationAdministration = {
  id: number;
  patient: number;
  patient_full_name?: string;
  medication: string;
  dosage: string;
  administered_at: string;
};

type Patient = {
  id: number;
  full_name: string;
  patient_id: string;
  sex?: string;
  date_of_birth?: string;
  allergies?: string;
  insurance_type?: string;
};

type Ward = { id: number; name: string; code: string; department?: string };
type Room = { id: number; room_number: string; ward_id?: number };
type Bed = { id: number; bed_number: string; status: string; room: number; ward_name?: string; patient_full_name?: string; current_patient: number | null };

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

type Prescription = {
  id: number;
  patient: number;
  patient_full_name?: string;
  medication: string;
  dosage: string;
  frequency: string;
  status: string;
  created_at: string;
};

type InpatientNote = {
  id: number;
  patient: number;
  patient_full_name?: string;
  note_type: string;
  title: string;
  content: string;
  recorded_by_username?: string;
  recorded_at: string;
  is_critical: boolean;
};

function calculateAge(dob?: string): string | null {
  if (!dob) return null;
  const diff = Date.now() - new Date(dob).getTime();
  const age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  return `${age}y`;
}

function priorityBadge(priority?: string) {
  switch (priority) {
    case 'emergency': case 'urgent': return 'bg-red-100 text-red-700 border-red-200';
    case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'routine': case 'low': return 'bg-slate-100 text-slate-600 border-slate-200';
    default: return 'bg-slate-100 text-slate-600 border-slate-200';
  }
}

function statusBadge(status?: string) {
  const s = (status || '').toLowerCase();
  if (s.includes('completed') || s.includes('paid') || s.includes('accepted')) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (s.includes('progress') || s.includes('processing') || s.includes('pending')) return 'bg-blue-100 text-blue-700 border-blue-200';
  if (s.includes('wait') || s.includes('submitted')) return 'bg-amber-100 text-amber-700 border-amber-200';
  if (s.includes('cancel') || s.includes('reject')) return 'bg-red-100 text-red-700 border-red-200';
  return 'bg-slate-100 text-slate-600 border-slate-200';
}

function isCriticalVital(v: VitalSign): boolean {
  if (v.temperature_c && v.temperature_c >= 38) return true;
  if (v.oxygen_saturation && v.oxygen_saturation < 95) return true;
  if (v.pulse_bpm && (v.pulse_bpm > 100 || v.pulse_bpm < 60)) return true;
  return false;
}

export default function NurseWorkspace() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showConsultMenu, setShowConsultMenu] = useState(false);

  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [vitals, setVitals] = useState<VitalSign[]>([]);
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [handovers, setHandovers] = useState<Handover[]>([]);
  const [medAdmins, setMedAdmins] = useState<MedicationAdministration[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [labRequests, setLabRequests] = useState<LabRequest[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [inpatientNotes, setInpatientNotes] = useState<InpatientNote[]>([]);

  function load() {
    setLoading(true);
    setError('');
    Promise.all([
      query('encounters'),
      query('vitals'),
      query('admissions'),
      query('handovers'),
      query('med-admins'),
      query('patients'),
      query('wards'),
      query('rooms'),
      query('beds'),
      query('lab-requests'),
      query('prescriptions'),
      query('inpatient-notes'),
    ])
      .then(([enc, vit, adm, hand, med, pts, w, r, b, lab, rx, notes]) => {
        setEncounters(Array.isArray(enc) ? enc : []);
        setVitals(Array.isArray(vit) ? vit : []);
        setAdmissions(Array.isArray(adm) ? adm : []);
        setHandovers(Array.isArray(hand) ? hand : []);
        setMedAdmins(Array.isArray(med) ? med : []);
        setPatients(Array.isArray(pts) ? pts : []);
        setWards(Array.isArray(w) ? w : []);
        setRooms(Array.isArray(r) ? r : []);
        setBeds(Array.isArray(b) ? b : []);
        setLabRequests(Array.isArray(lab) ? lab : []);
        setPrescriptions(Array.isArray(rx) ? rx : []);
        setInpatientNotes(Array.isArray(notes) ? notes : []);
      })
      .catch((e) => setError(e.message || 'Failed to load data.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    const off = onSyncChange(load);
    return off;
  }, []);

  const currentUserId = user?.id;

  const myEncounters = useMemo(
    () => encounters.filter((e) => e.nurse === currentUserId),
    [encounters, currentUserId],
  );

  const myPatients = useMemo(() => {
    const patientIds = new Set<number>();
    myEncounters.forEach((e) => { if (e.patient) patientIds.add(e.patient); });
    admissions.forEach((a) => {
      if (a.assigned_nurses && currentUserId && a.assigned_nurses.includes(String(currentUserId))) {
        if (a.patient) patientIds.add(a.patient);
      }
    });
    return patients.filter((p) => patientIds.has(p.id));
  }, [myEncounters, admissions, patients, currentUserId]);

  const awaitingTriage = useMemo(() => encounters.filter((e) => e.status === 'waiting'), [encounters]);
  const activeAdmissions = useMemo(() => admissions.filter((a) => a.status === 'admitted' || a.status === 'transferred'), [admissions]);
  const pendingMedAdmins = useMemo(() => medAdmins.filter((m) => !m.administered_at), [medAdmins]);
  const pendingHandovers = useMemo(() => handovers.filter((h) => h.status === 'pending'), [handovers]);
  const criticalVitals = useMemo(() => vitals.filter((v) => isCriticalVital(v)), [vitals]);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const admissionsToday = useMemo(() => admissions.filter((a) => (a.admission_date || '').slice(0, 10) === today), [admissions, today]);

  const getPatient = (patientId: number) => patients.find((p) => p.id === patientId);

  const recentVitals = useMemo(
    () => [...vitals].sort((a, b) => (b.recorded_at || '').localeCompare(a.recorded_at || '')).slice(0, 8),
    [vitals],
  );

  const nursingTasks = useMemo(() => {
    const tasks: { id: number; patient: number; patient_full_name?: string; type: string; title: string; time: string; status: string }[] = [];
    inpatientNotes.filter((n) => n.note_type === 'nursing' || n.note_type === 'observation').slice(0, 10).forEach((n) => {
      tasks.push({ id: n.id, patient: n.patient, patient_full_name: n.patient_full_name, type: 'Note', title: n.title || n.note_type, time: (n.recorded_at || '').slice(0, 16), status: n.is_critical ? 'Critical' : 'Pending' });
    });
    pendingMedAdmins.slice(0, 5).forEach((m) => {
      tasks.push({ id: m.id, patient: m.patient, patient_full_name: m.patient_full_name, type: 'Medication', title: `${m.medication} ${m.dosage}`, time: (m.administered_at || '').slice(0, 16) || 'Due', status: 'Due' });
    });
    return tasks.sort((a, b) => (b.time || '').localeCompare(a.time || ''));
  }, [inpatientNotes, pendingMedAdmins]);

  const wardStats = useMemo(() => {
    const stats: { wardId: number; wardName: string; wardCode: string; total: number; occupied: number }[] = [];
    const roomMap = new Map<number, { ward_id?: number }>();
    rooms.forEach((r) => roomMap.set(r.id, { ward_id: r.ward_id }));
    const wardBedMap = new Map<number, number>();
    beds.forEach((b) => {
      const wardId = roomMap.get(b.room)?.ward_id;
      if (wardId) wardBedMap.set(wardId, (wardBedMap.get(wardId) || 0) + 1);
    });
    wards.forEach((w) => {
      const total = wardBedMap.get(w.id) || 0;
      const occupied = beds.filter((b) => { const room = rooms.find((r) => r.id === b.room); return room && room.ward_id === w.id && b.status === 'occupied'; }).length;
      stats.push({ wardId: w.id, wardName: w.name, wardCode: w.code, total, occupied });
    });
    return stats;
  }, [wards, rooms, beds]);

  const doctorOrders = useMemo(() => {
    const orders: { id: number; patient: number; patient_full_name?: string; type: string; order: string; dueTime: string; status: string }[] = [];
    labRequests.slice(0, 5).forEach((l) => {
      orders.push({ id: l.id, patient: l.patient, patient_full_name: l.patient_full_name, type: 'Lab', order: l.test_name, dueTime: (l.created_at || '').slice(0, 16), status: l.status });
    });
    prescriptions.slice(0, 5).forEach((p) => {
      orders.push({ id: p.id, patient: p.patient, patient_full_name: p.patient_full_name, type: 'Prescription', order: `${p.medication} ${p.dosage}`, dueTime: (p.created_at || '').slice(0, 16), status: p.status });
    });
    return orders.sort((a, b) => (b.dueTime || '').localeCompare(a.dueTime || ''));
  }, [labRequests, prescriptions]);

  const alertItems = useMemo(() => {
    const items: { id: number; title: string; message: string; priority: string; type: string }[] = [];
    criticalVitals.forEach((v) => {
      items.push({ id: v.id, title: 'Critical Vital Signs', message: `Abnormal vitals for ${v.patient_full_name || `#${v.patient}`}`, priority: 'high', type: 'vitals' });
    });
    labRequests.filter((l) => l.priority === 'emergency' || l.priority === 'urgent').forEach((l) => {
      items.push({ id: l.id, title: 'Critical Lab Result', message: `${l.test_name} for ${l.patient_full_name || `#${l.patient}`}`, priority: l.priority, type: 'lab' });
    });
    pendingHandovers.forEach((h) => {
      items.push({ id: h.id, title: 'Pending Handover', message: `From ${h.sender_name || '—'} to ${h.receiver_name || '—'}`, priority: h.priority, type: 'handover' });
    });
    pendingMedAdmins.forEach((m) => {
      items.push({ id: m.id, title: 'Medication Due', message: `${m.medication} for ${m.patient_full_name || `#${m.patient}`}`, priority: 'medium', type: 'medication' });
    });
    return items.sort((a, b) => {
      const order: Record<string, number> = { emergency: 0, urgent: 1, high: 2, medium: 3, low: 4, routine: 5 };
      return (order[a.priority] ?? 5) - (order[b.priority] ?? 5);
    });
  }, [criticalVitals, labRequests, pendingHandovers, pendingMedAdmins]);

  const currentEncounter = useMemo(() => encounters.find((e) => e.status === 'in_progress'), [encounters]);
  const currentPatient = useMemo(() => (currentEncounter ? getPatient(currentEncounter.patient) : null), [currentEncounter, patients]);

  if (loading && encounters.length === 0) return <EmptyBox variant="light" message="Loading workspace..." />;
  if (error) return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Nurse Workspace</h1>
          <p className="mt-1 text-sm text-slate-500">Patient care, monitoring and nursing tasks</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button onClick={() => navigate('/consultation/new')} className="inline-flex items-center gap-2 rounded-full bg-cyan-600 px-4 py-2 font-medium text-white hover:bg-cyan-700">
              <Plus size={18} /> Start Consultation
            </button>
            <button onClick={() => setShowConsultMenu(!showConsultMenu)} className="rounded-full border border-slate-300 p-2 hover:bg-slate-50">
              <ChevronDown size={16} />
            </button>
            {showConsultMenu && (
              <div className="absolute right-0 top-full z-10 mt-2 w-48 rounded-lg border border-slate-200 bg-white py-2 shadow-lg">
                <QuickMenuItem icon={<HeartPulse size={16} />} label="Record Vital Signs" onClick={() => { navigate('/vitals'); setShowConsultMenu(false); }} />
                <QuickMenuItem icon={<Users size={16} />} label="Open Patient" onClick={() => { navigate('/patients'); setShowConsultMenu(false); }} />
                <QuickMenuItem icon={<FileText size={16} />} label="Start Triage" onClick={() => { navigate('/encounters'); setShowConsultMenu(false); }} />
                <QuickMenuItem icon={<Pill size={16} />} label="Medication Admin" onClick={() => { navigate('/pharmacy'); setShowConsultMenu(false); }} />
                <QuickMenuItem icon={<ClipboardList size={16} />} label="Nursing Note" onClick={() => { navigate('/inpatient'); setShowConsultMenu(false); }} />
                <QuickMenuItem icon={<Bed size={16} />} label="Admit Patient" onClick={() => { navigate('/inpatient'); setShowConsultMenu(false); }} />
                <QuickMenuItem icon={<ClipboardList size={16} />} label="Handover Patient" onClick={() => { navigate('/handovers'); setShowConsultMenu(false); }} />
                <QuickMenuItem icon={<FileText size={16} />} label="View Doctor Orders" onClick={() => { navigate('/encounters'); setShowConsultMenu(false); }} />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <SummaryCard title="Patients Assigned" value={myPatients.length} icon={<Users size={24} />} color="cyan" subtitle="Under your care" />
        <SummaryCard title="Waiting for Triage" value={awaitingTriage.length} icon={<ClipboardList size={24} />} color="amber" subtitle="Awaiting assessment" />
        <SummaryCard title="Requiring Attention" value={criticalVitals.length + pendingHandovers.length} icon={<AlertTriangle size={24} />} color="red" subtitle={criticalVitals.length > 0 ? `${criticalVitals.length} critical vitals` : undefined} />
        <SummaryCard title="Medications Due" value={pendingMedAdmins.length} icon={<Pill size={24} />} color="purple" subtitle="Pending administration" />
        <SummaryCard title="Critical Vitals" value={criticalVitals.length} icon={<HeartPulse size={24} />} color="orange" subtitle={criticalVitals.length > 0 ? 'Immediate review' : undefined} />
        <SummaryCard title="Admissions Today" value={admissionsToday.length} icon={<Bed size={24} />} color="emerald" subtitle="New admissions" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card variant="light" className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">My Patients</h3>
            <button onClick={() => navigate('/patients')} className="text-sm text-cyan-600 hover:text-cyan-700">View all</button>
          </div>
          {myPatients.length === 0 ? (
            <EmptyBox variant="light" message="No patients assigned to you." />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Patient</th>
                    <th className="px-4 py-3 font-medium">Room / Bed</th>
                    <th className="px-4 py-3 font-medium">Diagnosis</th>
                    <th className="px-4 py-3 font-medium">Priority</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Last Update</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {myPatients.slice(0, 10).map((p) => {
                    const admission = activeAdmissions.find((a) => a.patient === p.id);
                    const lastVital = vitals.find((v) => v.patient === p.id);
                    return (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <button onClick={() => navigate(`/patients/${p.id}`)} className="font-medium text-slate-900 hover:text-cyan-600">{p.full_name}</button>
                          <p className="text-xs text-slate-400">{p.patient_id}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{admission ? `${admission.ward_name || '—'} / ${admission.bed_number || '—'}` : '—'}</td>
                        <td className="px-4 py-3 text-slate-600 truncate max-w-[150px]">{admission?.primary_diagnosis || '—'}</td>
                        <td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${priorityBadge(admission ? 'routine' : 'low')}`}>{admission ? 'Admitted' : 'Outpatient'}</span></td>
                        <td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadge(admission?.status || 'stable')}`}>{admission ? (admission.status === 'admitted' ? 'In Care' : admission.status) : 'Stable'}</span></td>
                        <td className="px-4 py-3 text-slate-500">{lastVital ? (lastVital.recorded_at || '').slice(0, 16) : '—'}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => navigate(`/patients/${p.id}`)} className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">View</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card variant="light">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Latest Vital Signs</h3>
          {recentVitals.length === 0 ? (
            <EmptyBox variant="light" message="No recent vital signs recorded." />
          ) : (
            <div className="space-y-3">
              {recentVitals.slice(0, 6).map((v) => {
                const patient = getPatient(v.patient);
                const age = calculateAge(patient?.date_of_birth);
                return (
                  <div key={v.id} className={`flex items-center justify-between rounded-lg border p-3 ${isCriticalVital(v) ? 'border-red-200 bg-red-50' : 'border-slate-100 hover:bg-slate-50'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`rounded-full p-2 ${isCriticalVital(v) ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}><HeartPulse size={16} /></div>
                      <div>
                        <p className="text-sm font-medium text-slate-900"><button onClick={() => navigate(`/patients/${v.patient}`)} className="hover:text-cyan-600">{v.patient_full_name || `#${v.patient}`}</button></p>
                        <p className="text-xs text-slate-500">{age || '—'} / {patient?.sex || '—'}</p>
                      </div>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <div className={v.temperature_c && v.temperature_c >= 38 ? 'text-red-600 font-medium' : ''}>{v.temperature_c != null ? `${v.temperature_c}°C` : '—'}</div>
                      <div className={v.oxygen_saturation && v.oxygen_saturation < 95 ? 'text-red-600 font-medium' : ''}>{v.oxygen_saturation != null ? `${v.oxygen_saturation}%` : '—'}</div>
                      <div>{v.blood_pressure || '—'}</div>
                      <div>{v.pulse_bpm != null ? `${v.pulse_bpm}` : '—'}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card variant="light">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Nursing Tasks</h3>
          {nursingTasks.length === 0 ? (
            <EmptyBox variant="light" message="No pending nursing tasks." />
          ) : (
            <div className="space-y-3">
              {nursingTasks.slice(0, 8).map((t) => (
                <div key={`${t.type}-${t.id}`} className="flex items-center justify-between rounded-lg border border-slate-100 p-3 hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-full p-2 ${t.status === 'Critical' ? 'bg-red-100 text-red-600' : t.type === 'Medication' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                      {t.type === 'Medication' ? <Pill size={16} /> : <ClipboardList size={16} />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900"><button onClick={() => navigate(`/patients/${t.patient}`)} className="hover:text-cyan-600">{t.patient_full_name || `#${t.patient}`}</button></p>
                      <p className="text-xs text-slate-500">{t.title}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${t.status === 'Critical' ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>{t.status}</span>
                    <p className="mt-1 text-xs text-slate-400">{t.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card variant="light">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Ward & Beds</h3>
            <button onClick={() => navigate('/inpatient')} className="text-sm text-cyan-600 hover:text-cyan-700">View all wards</button>
          </div>
          {wardStats.length === 0 ? (
            <EmptyBox variant="light" message="No ward data available." />
          ) : (
            <div className="space-y-3">
              {wardStats.slice(0, 6).map((w) => (
                <div key={w.wardId} className="flex items-center justify-between rounded-lg border border-slate-100 p-3 hover:bg-slate-50">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{w.wardName}</p>
                    <p className="text-xs text-slate-500">{w.wardCode} • {wards.find((ward) => ward.id === w.wardId)?.department || '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-900">{w.occupied} / {w.total}</p>
                    <p className="text-xs text-slate-400">{w.total === 0 ? 'No beds' : `${Math.round((w.occupied / w.total) * 100)}% occupied`}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card variant="light">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Pending Handovers</h3>
          {pendingHandovers.length === 0 ? (
            <EmptyBox variant="light" message="No pending handovers." />
          ) : (
            <div className="space-y-3">
              {pendingHandovers.slice(0, 6).map((h) => (
                <div key={h.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-3 hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-full p-2 ${h.priority === 'urgent' || h.priority === 'critical' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}><ClipboardList size={16} /></div>
                    <div>
                      <p className="text-sm font-medium text-slate-900"><button onClick={() => navigate('/handovers')} className="hover:text-cyan-600">{h.patient_full_name || `#${h.patient}`}</button></p>
                      <p className="text-xs text-slate-500">From {h.sender_name || '—'} to {h.receiver_name || '—'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${priorityBadge(h.priority)}`}>{h.priority}</span>
                    <p className="mt-1 text-xs text-slate-400">{(h.created_at || '').slice(0, 16)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card variant="light" className="lg:col-span-2">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Doctor Orders</h3>
          {doctorOrders.length === 0 ? (
            <EmptyBox variant="light" message="No active doctor orders." />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Patient</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Order</th>
                    <th className="px-4 py-3 font-medium">Due Time</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {doctorOrders.slice(0, 8).map((o) => (
                    <tr key={`${o.type}-${o.id}`} className="hover:bg-slate-50">
                      <td className="px-4 py-3"><button onClick={() => navigate(`/patients/${o.patient}`)} className="font-medium text-slate-900 hover:text-cyan-600">{o.patient_full_name || `#${o.patient}`}</button></td>
                      <td className="px-4 py-3 text-slate-600">{o.type}</td>
                      <td className="px-4 py-3 text-slate-700">{o.order}</td>
                      <td className="px-4 py-3 text-slate-500">{(o.dueTime || '').slice(0, 16)}</td>
                      <td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadge(o.status)}`}>{(o.status || '').replace(/_/g, ' ')}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card variant="light">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Alerts & Notifications</h3>
          {alertItems.length === 0 ? (
            <EmptyBox variant="light" message="No active alerts." />
          ) : (
            <div className="space-y-3">
              {alertItems.slice(0, 8).map((a) => (
                <div key={`${a.type}-${a.id}`} className={`flex items-start gap-3 rounded-lg border p-3 ${a.priority === 'emergency' || a.priority === 'urgent' ? 'border-red-200 bg-red-50' : a.priority === 'high' ? 'border-orange-200 bg-orange-50' : 'border-slate-100 hover:bg-slate-50'}`}>
                  <div className={`mt-0.5 rounded-full p-1.5 ${a.priority === 'emergency' || a.priority === 'urgent' ? 'bg-red-100 text-red-600' : a.priority === 'high' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                    {a.type === 'vitals' && <HeartPulse size={16} />}
                    {a.type === 'lab' && <FlaskConical size={16} />}
                    {a.type === 'handover' && <ClipboardList size={16} />}
                    {a.type === 'medication' && <Pill size={16} />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{a.title}</p>
                    <p className="text-xs text-slate-500">{a.message}</p>
                  </div>
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${priorityBadge(a.priority)}`}>{a.priority}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {currentPatient && (
        <Card variant="light" className="border-l-4 border-l-cyan-400">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-cyan-100 text-cyan-700"><User size={28} /></div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{currentPatient.full_name}</h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                  <span>{calculateAge(currentPatient.date_of_birth)} / {currentPatient.sex || '—'}</span>
                  <span className="flex items-center gap-1"><Activity size={14} /> MRN: {currentPatient.patient_id}</span>
                  {currentPatient.insurance_type && <span className="flex items-center gap-1"><Shield size={14} />{currentPatient.insurance_type}</span>}
                  {currentPatient.allergies && <span className="flex items-center gap-1 text-red-600"><AlertTriangle size={14} />{currentPatient.allergies}</span>}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                  {currentEncounter && <span className="flex items-center gap-1"><Activity size={12} />In consultation: {currentEncounter.encounter_type}</span>}
                  {activeAdmissions.length > 0 && currentPatient.id === activeAdmissions[0].patient && (
                    <span className="flex items-center gap-1"><MapPin size={12} />{activeAdmissions[0].ward_name} {activeAdmissions[0].bed_number}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />In Consultation
              </span>
              <button onClick={() => navigate(`/patients/${currentPatient.id}`)} className="rounded-full bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700">Open Full Record</button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function QuickMenuItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
      {icon} {label}
    </button>
  );
}

function SummaryCard({ title, value, icon, color, subtitle }: { title: string; value: number; icon: React.ReactNode; color: string; subtitle?: string }) {
  const colorMap: Record<string, { bg: string; text: string }> = {
    cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
    red: { bg: 'bg-red-50', text: 'text-red-600' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  };
  const c = colorMap[color] || colorMap.cyan;
  return (
    <Card variant="light" className={`border-l-4 border-l-${color}-400`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
        </div>
        <div className={`rounded-full ${c.bg} p-3 ${c.text}`}>{icon}</div>
      </div>
      {subtitle && <p className="mt-2 text-xs text-slate-400">{subtitle}</p>}
    </Card>
  );
}