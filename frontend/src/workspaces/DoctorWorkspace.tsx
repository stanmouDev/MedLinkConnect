import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { query, onSyncChange } from '../offline/data';
import { Card, EmptyBox } from '../components/ui';
import {
  Activity,
  Users,
  FlaskConical,
  Bed,
  ArrowRightLeft,
  Plus,
  ChevronDown,
  FileText,
  ClipboardList,
  HeartPulse,
  Clock,
  MapPin,
  AlertTriangle,
  User,
  Shield,
  Play,
  Calendar,
  Search,
} from 'lucide-react';

type Encounter = {
  id: number;
  patient: number;
  patient_full_name?: string;
  encounter_type: string;
  status: string;
  triage_level?: string;
  reason_for_visit?: string;
  diagnosis?: string;
  created_at: string;
};

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

type Handover = {
  id: number;
  patient?: number;
  patient_full_name?: string;
  sender_name?: string;
  receiver_name?: string;
  status: string;
  priority: string;
  reason?: string;
  created_at: string;
};

type Referral = {
  id: number;
  patient: number;
  patient_full_name?: string;
  referral_type: string;
  urgency_level: string;
  status: string;
  referral_date: string;
};

type Admission = {
  id: number;
  patient: number;
  patient_full_name?: string;
  ward_name?: string;
  room_number?: string;
  bed_number?: string;
  status: string;
  admission_date: string;
  primary_diagnosis?: string;
  doctor?: number;
  admitting_doctor?: number;
};

type Patient = {
  id: number;
  full_name: string;
  patient_id: string;
  gender?: string;
  sex?: string;
  date_of_birth?: string;
  phone?: string;
  address?: string;
  insurance_type?: string;
  allergies?: string;
  last_visit?: string;
  created_at: string;
};

type VitalSign = {
  id: number;
  patient: number;
  patient_full_name?: string;
  temperature_c?: number;
  blood_pressure?: string;
  pulse_bpm?: number;
  oxygen_saturation?: number;
  respiratory_rate?: number;
  recorded_at: string;
};

type Appointment = {
  id: number;
  patient: number;
  patient_full_name?: string;
  doctor?: string;
  scheduled_at: string;
  status: string;
  reason?: string;
};

function calculateAge(dob?: string): string | null {
  if (!dob) return null;
  const diff = Date.now() - new Date(dob).getTime();
  const age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  return `${age}y`;
}

function getWaitingMinutes(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

function priorityBadge(priority?: string) {
  switch (priority) {
    case 'emergency':
    case 'urgent':
      return 'bg-red-100 text-red-700 border-red-200';
    case 'high':
      return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'medium':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'routine':
    case 'low':
      return 'bg-slate-100 text-slate-600 border-slate-200';
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200';
  }
}

function statusBadge(status?: string) {
  const s = (status || '').toLowerCase();
  if (s.includes('completed') || s.includes('paid') || s.includes('accepted'))
    return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (s.includes('progress') || s.includes('processing') || s.includes('pending'))
    return 'bg-blue-100 text-blue-700 border-blue-200';
  if (s.includes('wait') || s.includes('submitted'))
    return 'bg-amber-100 text-amber-700 border-amber-200';
  if (s.includes('cancel') || s.includes('reject'))
    return 'bg-red-100 text-red-700 border-red-200';
  return 'bg-slate-100 text-slate-600 border-slate-200';
}

export default function DoctorWorkspace() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [queueTab, setQueueTab] = useState<'all' | 'new' | 'follow-up'>('new');
  const [showConsultMenu, setShowConsultMenu] = useState(false);

  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [labRequests, setLabRequests] = useState<LabRequest[]>([]);
  const [handovers, setHandovers] = useState<Handover[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [vitals, setVitals] = useState<VitalSign[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patientSearch, setPatientSearch] = useState('');

  function load() {
    setLoading(true);
    setError('');
    Promise.all([
      query('encounters'),
      query('lab-requests'),
      query('handovers'),
      query('referrals'),
      query('admissions'),
      query('patients'),
      query('vitals'),
      query('appointments'),
    ])
      .then(([enc, lab, hand, ref, adm, pts, vit, appt]) => {
        setEncounters(Array.isArray(enc) ? enc : []);
        setLabRequests(Array.isArray(lab) ? lab : []);
        setHandovers(Array.isArray(hand) ? hand : []);
        setReferrals(Array.isArray(ref) ? ref : []);
        setAdmissions(Array.isArray(adm) ? adm : []);
        setPatients(Array.isArray(pts) ? pts : []);
        setVitals(Array.isArray(vit) ? vit : []);
        setAppointments(Array.isArray(appt) ? appt : []);
      })
      .catch((e) => setError(e.message || 'Failed to load data.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    const off = onSyncChange(load);
    return off;
  }, []);

  const waitingQueue = useMemo(
    () => encounters.filter((e) => e.status === 'waiting'),
    [encounters],
  );

  const myPatientsToday = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return encounters.filter((e) => (e.created_at || '').startsWith(today));
  }, [encounters]);

  const pendingLabs = useMemo(
    () => labRequests.filter((l) => l.status === 'pending' || l.status === 'sample_collected'),
    [labRequests],
  );

  const pendingHandovers = useMemo(
    () => handovers.filter((h) => h.status === 'pending'),
    [handovers],
  );

  const activeAdmissions = useMemo(
    () => admissions.filter((a) => a.status === 'admitted' || a.status === 'transferred'),
    [admissions],
  );

  const pendingReferrals = useMemo(
    () => referrals.filter((r) => r.status === 'submitted' || r.status === 'in_transit' || r.status === 'under_review'),
    [referrals],
  );

  const criticalLabs = useMemo(
    () => labRequests.filter((l) => l.priority === 'emergency' || l.priority === 'urgent'),
    [labRequests],
  );

  const urgentReferrals = useMemo(
    () => referrals.filter((r) => r.urgency_level === 'emergency' || r.urgency_level === 'urgent'),
    [referrals],
  );

  const physiotherapyReferrals = useMemo(
    () => referrals.filter((r) => (r.referral_type || '').toLowerCase() === 'physiotherapy'),
    [referrals],
  );

  const { user } = useAuth();
  const myAdmissions = useMemo(
    () => activeAdmissions.filter((a) => a.doctor === user?.id || a.admitting_doctor === user?.id),
    [activeAdmissions, user],
  );

  const getPatient = (patientId: number) => patients.find((p) => p.id === patientId);

  const currentEncounter = useMemo(
    () => encounters.find((e) => e.status === 'in_progress'),
    [encounters],
  );

  const currentPatient = useMemo(
    () => (currentEncounter ? getPatient(currentEncounter.patient) : null),
    [currentEncounter, patients],
  );

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const todayAppointments = useMemo(() => {
    return appointments
      .filter((a) => (a.scheduled_at || '').slice(0, 10) === today)
      .sort((a, b) => (a.scheduled_at || '').localeCompare(b.scheduled_at || ''));
  }, [appointments, today]);

  const alertItems = useMemo(() => {
    const items: { id: number; title: string; message: string; priority: string; type: string }[] = [];
    criticalLabs.forEach((l) => {
      items.push({
        id: l.id,
        title: 'Critical Lab Result',
        message: `${l.test_name} for ${l.patient_full_name || `#${l.patient}`}`,
        priority: l.priority,
        type: 'lab',
      });
    });
    urgentReferrals.forEach((r) => {
      items.push({
        id: r.id,
        title: 'Urgent Referral',
        message: `${r.referral_type} for ${r.patient_full_name || `#${r.patient}`}`,
        priority: r.urgency_level,
        type: 'referral',
      });
    });
    pendingHandovers.forEach((h) => {
      items.push({
        id: h.id,
        title: 'Pending Handover',
        message: `From ${h.sender_name || '—'} to ${h.receiver_name || '—'}`,
        priority: h.priority,
        type: 'handover',
      });
    });
    const criticalVitals = vitals.filter((v) => {
      if (v.temperature_c && v.temperature_c >= 38) return true;
      if (v.oxygen_saturation && v.oxygen_saturation < 95) return true;
      if (v.pulse_bpm && (v.pulse_bpm > 100 || v.pulse_bpm < 60)) return true;
      return false;
    });
    if (criticalVitals.length > 0) {
      items.push({
        id: criticalVitals[0].id,
        title: 'Vital Alert',
        message: `Abnormal vitals detected for ${criticalVitals[0].patient_full_name || 'a patient'}`,
        priority: 'high',
        type: 'vitals',
      });
    }
    return items.sort((a, b) => {
      const order: Record<string, number> = { emergency: 0, urgent: 1, high: 2, medium: 3, low: 4, routine: 5 };
      return (order[a.priority] ?? 5) - (order[b.priority] ?? 5);
    });
  }, [criticalLabs, urgentReferrals, pendingHandovers, vitals]);

  const filteredQueue = useMemo(() => {
    switch (queueTab) {
      case 'new':
        return waitingQueue;
      case 'follow-up':
        return encounters.filter((e) => e.status !== 'waiting' && e.status !== 'in_progress');
      default:
        return encounters;
    }
  }, [queueTab, encounters, waitingQueue]);

  const recentVitals = useMemo(
    () =>
      [...vitals]
        .sort((a, b) => (b.recorded_at || '').localeCompare(a.recorded_at || ''))
        .slice(0, 8),
    [vitals],
  );

  if (loading && encounters.length === 0) return <EmptyBox variant="light" message="Loading workspace..." />;
  if (error) return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Doctor Workspace</h1>
          <p className="mt-1 text-sm text-slate-500">Consultation queue and clinical overview</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => navigate('/consultation/new')}
              className="inline-flex items-center gap-2 rounded-full bg-cyan-600 px-4 py-2 font-medium text-white hover:bg-cyan-700"
            >
              <Plus size={18} />
              Start Consultation
            </button>
            <button
              onClick={() => setShowConsultMenu(!showConsultMenu)}
              className="rounded-full border border-slate-300 p-2 hover:bg-slate-50"
            >
              <ChevronDown size={16} />
            </button>
            {showConsultMenu && (
              <div className="absolute right-0 top-full z-10 mt-2 w-48 rounded-lg border border-slate-200 bg-white py-2 shadow-lg">
                <button onClick={() => { navigate('/encounters'); setShowConsultMenu(false); }} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <FileText size={16} />
                  Record Encounter
                </button>
                <button onClick={() => { navigate('/vitals'); setShowConsultMenu(false); }} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <HeartPulse size={16} />
                  Record Vitals
                </button>
                <button onClick={() => { navigate('/labs'); setShowConsultMenu(false); }} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <FlaskConical size={16} />
                  Request Lab
                </button>
                <button onClick={() => { navigate('/referrals'); setShowConsultMenu(false); }} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <ArrowRightLeft size={16} />
                  Create Referral
                </button>
                <button onClick={() => { navigate('/handovers'); setShowConsultMenu(false); }} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <ClipboardList size={16} />
                  Handover Patient
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
        <Card variant="light" className="border-l-4 border-l-amber-400">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Waiting Patients</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{waitingQueue.length}</p>
            </div>
            <div className="rounded-full bg-amber-50 p-3 text-amber-600">
              <Clock size={24} />
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-400">Currently in queue</p>
        </Card>
        <Card variant="light" className="border-l-4 border-l-cyan-400">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Today's Consultations</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{myPatientsToday.length}</p>
            </div>
            <div className="rounded-full bg-cyan-50 p-3 text-cyan-600">
              <Activity size={24} />
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-400">Consultations today</p>
        </Card>
        <Card variant="light" className="border-l-4 border-l-red-400">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Lab Results Pending</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{pendingLabs.length}</p>
            </div>
            <div className="rounded-full bg-red-50 p-3 text-red-600">
              <FlaskConical size={24} />
            </div>
          </div>
          {criticalLabs.length > 0 && (
            <p className="mt-2 text-xs text-red-600 font-medium">{criticalLabs.length} critical</p>
          )}
        </Card>
        <Card variant="light" className="border-l-4 border-l-blue-400">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Inpatients</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{activeAdmissions.length}</p>
            </div>
            <div className="rounded-full bg-blue-50 p-3 text-blue-600">
              <Bed size={24} />
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            {myAdmissions.length > 0 ? `${myAdmissions.length} under your care` : 'Currently admitted'}
          </p>
        </Card>
        <Card variant="light" className="border-l-4 border-l-purple-400">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Referrals</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{pendingReferrals.length}</p>
            </div>
            <div className="rounded-full bg-purple-50 p-3 text-purple-600">
              <ArrowRightLeft size={24} />
            </div>
          </div>
          {urgentReferrals.length > 0 && (
            <p className="mt-2 text-xs text-red-600 font-medium">{urgentReferrals.length} urgent</p>
          )}
        </Card>
        <Card variant="light" className="border-l-4 border-l-green-400">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Physiotherapy</p>
               <p className="mt-2 text-3xl font-semibold text-slate-900">{physiotherapyReferrals.length}</p>
            </div>
            <div className="rounded-full bg-green-50 p-3 text-green-600">
              <Activity size={24} />
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-400">{physiotherapyReferrals.length > 0 ? `${physiotherapyReferrals.length} active` : 'No active referrals'}</p>
        </Card>
        <Card variant="light" className="border-l-4 border-l-red-400">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Critical Alerts</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{alertItems.filter((a) => a.priority === 'emergency' || a.priority === 'urgent').length}</p>
            </div>
            <div className="rounded-full bg-red-50 p-3 text-red-600">
              <AlertTriangle size={24} />
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-400">Requires action</p>
        </Card>
        <Card variant="light" className="border-l-4 border-l-indigo-400">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Today's Schedule</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{todayAppointments.length}</p>
            </div>
            <div className="rounded-full bg-indigo-50 p-3 text-indigo-600">
              <Calendar size={24} />
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-400">Appointments</p>
        </Card>
      </div>

      <Card variant="light">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">My Patients</h3>
            <p className="mt-1 text-sm text-slate-500">
              {patients.length} patient{patients.length === 1 ? '' : 's'} in system
            </p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search patients, records..."
              onChange={(e) => setPatientSearch(e.target.value)}
              className="w-64 rounded-lg border border-slate-200 pl-9 pr-4 py-2 text-sm focus:border-cyan-400 focus:outline-none"
            />
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Patient</th>
                <th className="px-4 py-3 font-medium">MRN</th>
                <th className="px-4 py-3 font-medium">Age/Sex</th>
                <th className="px-4 py-3 font-medium">Current Diagnosis</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Last Visit</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(() => {
                const search = (patientSearch || '').toLowerCase().trim();
                let list = patients;
                if (search) {
                  list = list.filter((p) => {
                    const age = calculateAge(p.date_of_birth);
                    const searchStr = [
                      p.full_name,
                      p.patient_id,
                      p.phone,
                      p.gender,
                      p.sex,
                      age,
                      p.allergies,
                      p.insurance_type,
                    ]
                      .filter(Boolean)
                      .join(' ')
                      .toLowerCase();
                    return searchStr.includes(search);
                  });
                }
                return list;
              })().length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    No patients found.
                  </td>
                </tr>
              ) : (
                (() => {
                  const search = (patientSearch || '').toLowerCase().trim();
                  let list = patients;
                  if (search) {
                    list = list.filter((p) => {
                      const age = calculateAge(p.date_of_birth);
                      const searchStr = [
                        p.full_name,
                        p.patient_id,
                        p.phone,
                        p.sex,
                        age,
                        p.allergies,
                        p.insurance_type,
                      ]
                        .filter(Boolean)
                        .join(' ')
                        .toLowerCase();
                      return searchStr.includes(search);
                    });
                  }
                  return list.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')).slice(0, 10).map((p) => {
                    const patientEncounters = encounters.filter((e) => e.patient === p.id);
                    const patientAdmissions = admissions.filter((a) => a.patient === p.id);
                    const patientReferrals = referrals.filter((r) => r.patient === p.id);

                    const hasWaiting = patientEncounters.some((e) => e.status === 'waiting');
                    const hasInProgress = patientEncounters.some((e) => e.status === 'in_progress');
                    const hasActiveAdmission = patientAdmissions.some((a) => a.status === 'admitted' || a.status === 'transferred');
                    const hasDischarged = patientAdmissions.some((a) => a.status === 'discharged');
                    const hasActiveReferral = patientReferrals.some((r) => ['submitted', 'in_transit', 'under_review'].includes(r.status));

                    let status = '—';
                    if (hasWaiting) status = 'Waiting';
                    else if (hasInProgress) status = 'In consultation';
                    else if (hasActiveAdmission) status = 'Admitted';
                    else if (hasDischarged) status = 'Discharged';
                    else if (hasActiveReferral) status = 'Referred';
                    else if (patientEncounters.some((e) => e.status === 'completed')) status = 'Follow-up';

                    const diagnosis = patientEncounters
                      .filter((e) => e.diagnosis)
                      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))[0]?.diagnosis || '—';

                    const activeAdmission = patientAdmissions.find((a) => a.status === 'admitted' || a.status === 'transferred');
                    const location = activeAdmission ? [activeAdmission.ward_name, activeAdmission.room_number, activeAdmission.bed_number].filter(Boolean).join(' / ') || '—' : '—';

                    const lastVisit = patientEncounters
                      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))[0]?.created_at?.slice(0, 10) || '—';

                    const age = calculateAge(p.date_of_birth);

                    const statusColor = status === 'Critical'
                      ? 'bg-red-100 text-red-700 border-red-200'
                      : status === 'In consultation'
                        ? 'bg-blue-100 text-blue-700 border-blue-200'
                        : status === 'Waiting'
                          ? 'bg-amber-100 text-amber-700 border-amber-200'
                          : status === 'Admitted'
                            ? 'bg-purple-100 text-purple-700 border-purple-200'
                            : status === 'Discharged'
                              ? 'bg-slate-100 text-slate-600 border-slate-200'
                              : 'bg-emerald-100 text-emerald-700 border-emerald-200';

                    return (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <button
                            onClick={() => navigate(`/patients/${p.id}`)}
                            className="font-medium text-slate-900 hover:text-cyan-600"
                          >
                            {p.full_name}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{p.patient_id}</td>
                        <td className="px-4 py-3 text-slate-600">{age || '—'} / {p.gender || p.sex || '—'}</td>
                        <td className="px-4 py-3 text-slate-600 truncate max-w-[200px]">{diagnosis}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusColor}`}>
                            {status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 truncate max-w-[150px]">{location}</td>
                        <td className="px-4 py-3 text-slate-500">{lastVisit}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => navigate(`/patients/${p.id}`)}
                            className="inline-flex items-center gap-1 rounded-full bg-cyan-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-cyan-700"
                          >
                            Open Record
                          </button>
                        </td>
                      </tr>
                    );
                  });
                })()
              )}
            </tbody>
          </table>
        </div>
        {patients.length > 10 && (
          <div className="mt-4 text-center">
            <button
              onClick={() => navigate('/patients')}
              className="text-sm text-cyan-600 hover:text-cyan-700 font-medium"
            >
              View all patients
            </button>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card variant="light" className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Consultation Queue</h3>
            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
              {(['new', 'follow-up', 'all'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setQueueTab(tab)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    queueTab === tab
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab === 'follow-up' ? 'Follow-up' : tab === 'new' ? 'New' : 'All'}
                </button>
              ))}
            </div>
          </div>
          {filteredQueue.length === 0 ? (
            <EmptyBox variant="light" message="No patients in queue." />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">#</th>
                    <th className="px-4 py-3 font-medium">Patient</th>
                    <th className="px-4 py-3 font-medium">MRN</th>
                    <th className="px-4 py-3 font-medium">Age/Sex</th>
                    <th className="px-4 py-3 font-medium">Reason</th>
                    <th className="px-4 py-3 font-medium">Diagnosis</th>
                    <th className="px-4 py-3 font-medium">Waiting</th>
                    <th className="px-4 py-3 font-medium">Priority</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredQueue.slice(0, 10).map((p, idx) => {
                    const patient = getPatient(p.patient);
                    const age = calculateAge(patient?.date_of_birth);
                    return (
                       <tr key={p.id} className="hover:bg-slate-50">
                         <td className="px-4 py-3 text-slate-500">{idx + 1}</td>
                         <td className="px-4 py-3 font-medium text-slate-900">
                           <button
                             onClick={() => navigate(`/patients/${p.patient}`)}
                             className="hover:text-cyan-600"
                           >
                             {p.patient_full_name || `#${p.patient}`}
                           </button>
                         </td>
                         <td className="px-4 py-3 text-slate-500">{patient?.patient_id || '—'}</td>
                         <td className="px-4 py-3 text-slate-600">{age || '—'} / {patient?.sex || '—'}</td>
                         <td className="px-4 py-3 text-slate-600 truncate max-w-[200px]">{p.reason_for_visit || '—'}</td>
                         <td className="px-4 py-3 text-slate-600 truncate max-w-[150px]">{p.diagnosis || '—'}</td>
                         <td className="px-4 py-3 text-slate-500">{getWaitingMinutes(p.created_at)}</td>
                         <td className="px-4 py-3">
                           <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${priorityBadge(p.triage_level)}`}>
                             {p.triage_level || 'routine'}
                           </span>
                         </td>
                         <td className="px-4 py-3">
                           <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadge(p.status)}`}>
                             {p.status.replace(/_/g, ' ')}
                           </span>
                         </td>
                         <td className="px-4 py-3">
                           {p.status === 'waiting' && (
                             <button
                               onClick={() => navigate(`/consultation/${p.patient}`)}
                               className="inline-flex items-center gap-1 rounded-full bg-cyan-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-cyan-700"
                             >
                               <Play size={12} />
                               Start
                             </button>
                           )}
                           {p.status !== 'waiting' && (
                             <button
                               onClick={() => navigate(`/patients/${p.patient}`)}
                               className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                             >
                               View
                             </button>
                           )}
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
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Today's Schedule</h3>
            <button
              onClick={() => navigate('/appointments')}
              className="text-sm text-cyan-600 hover:text-cyan-700"
            >
              View full schedule
            </button>
          </div>
          {todayAppointments.length === 0 ? (
            <EmptyBox variant="light" message="No appointments scheduled for today." />
          ) : (
            <div className="space-y-3">
              {todayAppointments.slice(0, 6).map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 p-3 hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-col items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                      <span className="text-xs font-medium">
                        {new Date(a.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        <button
                          onClick={() => navigate(`/patients/${a.patient}`)}
                          className="hover:text-cyan-600"
                        >
                          {a.patient_full_name || `#${a.patient}`}
                        </button>
                      </p>
                      <p className="text-xs text-slate-500 truncate max-w-[180px]">{a.reason || 'Appointment'}</p>
                    </div>
                  </div>
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadge(a.status)}`}>
                    {a.status.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card variant="light" className="lg:col-span-2">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Recent Vitals</h3>
          {recentVitals.length === 0 ? (
            <EmptyBox variant="light" message="No recent vital signs recorded." />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Patient</th>
                    <th className="px-4 py-3 font-medium">Age/Sex</th>
                    <th className="px-4 py-3 font-medium">BP</th>
                    <th className="px-4 py-3 font-medium">Temp</th>
                    <th className="px-4 py-3 font-medium">Pulse</th>
                    <th className="px-4 py-3 font-medium">RR</th>
                    <th className="px-4 py-3 font-medium">O2</th>
                    <th className="px-4 py-3 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentVitals.map((v) => {
                    const patient = getPatient(v.patient);
                    const age = calculateAge(patient?.date_of_birth);
                    return (
                      <tr key={v.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <button
                            onClick={() => navigate(`/patients/${v.patient}`)}
                            className="font-medium text-slate-900 hover:text-cyan-600"
                          >
                            {v.patient_full_name || `#${v.patient}`}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{age || '—'} / {patient?.sex || '—'}</td>
                        <td className="px-4 py-3 text-slate-700">{v.blood_pressure || '—'}</td>
                        <td className={`px-4 py-3 ${v.temperature_c && v.temperature_c >= 38 ? 'text-red-600 font-medium' : 'text-slate-700'}`}>
                          {v.temperature_c != null ? `${v.temperature_c}°C` : '—'}
                        </td>
                        <td className={`px-4 py-3 ${v.pulse_bpm && (v.pulse_bpm > 100 || v.pulse_bpm < 60) ? 'text-red-600 font-medium' : 'text-slate-700'}`}>
                          {v.pulse_bpm != null ? `${v.pulse_bpm}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{v.respiratory_rate != null ? v.respiratory_rate : '—'}</td>
                        <td className={`px-4 py-3 ${v.oxygen_saturation && v.oxygen_saturation < 95 ? 'text-red-600 font-medium' : 'text-slate-700'}`}>
                          {v.oxygen_saturation != null ? `${v.oxygen_saturation}%` : '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-500">{(v.recorded_at || '').slice(0, 16)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card variant="light">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Pending Lab Results</h3>
          {pendingLabs.length === 0 ? (
            <EmptyBox variant="light" message="No pending lab results." />
          ) : (
            <div className="space-y-3">
              {pendingLabs.slice(0, 6).map((l) => (
                <div
                  key={l.id}
                  className={`flex items-center justify-between rounded-lg border p-3 ${
                    l.priority === 'emergency' || l.priority === 'urgent'
                      ? 'border-red-200 bg-red-50'
                      : 'border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`rounded-full p-2 ${l.priority === 'emergency' || l.priority === 'urgent' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                      <FlaskConical size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        <button
                          onClick={() => navigate(`/patients/${l.patient}`)}
                          className="hover:text-cyan-600"
                        >
                          {l.patient_full_name || `#${l.patient}`}
                        </button>
                      </p>
                      <p className="text-xs text-slate-500">{l.test_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${priorityBadge(l.priority)}`}>
                      {l.priority}
                    </span>
                    <p className="mt-1 text-xs text-slate-400">{(l.created_at || '').slice(0, 16)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card variant="light" className="lg:col-span-2">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Alerts & Notifications</h3>
          {alertItems.length === 0 ? (
            <EmptyBox variant="light" message="No active alerts." />
          ) : (
            <div className="space-y-3">
              {alertItems.slice(0, 8).map((a) => (
                <div
                  key={`${a.type}-${a.id}`}
                  className={`flex items-start gap-3 rounded-lg border p-3 ${
                    a.priority === 'emergency' || a.priority === 'urgent'
                      ? 'border-red-200 bg-red-50'
                      : a.priority === 'high'
                        ? 'border-orange-200 bg-orange-50'
                        : 'border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  <div className={`mt-0.5 rounded-full p-1.5 ${
                    a.priority === 'emergency' || a.priority === 'urgent'
                      ? 'bg-red-100 text-red-600'
                      : a.priority === 'high'
                        ? 'bg-orange-100 text-orange-600'
                        : 'bg-blue-100 text-blue-600'
                  }`}>
                    {a.type === 'lab' && <FlaskConical size={16} />}
                    {a.type === 'referral' && <ArrowRightLeft size={16} />}
                    {a.type === 'handover' && <ClipboardList size={16} />}
                    {a.type === 'vitals' && <HeartPulse size={16} />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{a.title}</p>
                    <p className="text-xs text-slate-500">{a.message}</p>
                  </div>
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${priorityBadge(a.priority)}`}>
                    {a.priority}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card variant="light">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/patients')}
              className="flex flex-col items-center gap-2 rounded-lg border border-slate-200 p-4 hover:bg-slate-50"
            >
              <Users size={24} className="text-cyan-600" />
              <span className="text-sm font-medium text-slate-700">Open Patient</span>
            </button>
            <button
              onClick={() => navigate('/encounters')}
              className="flex flex-col items-center gap-2 rounded-lg border border-slate-200 p-4 hover:bg-slate-50"
            >
              <FileText size={24} className="text-emerald-600" />
              <span className="text-sm font-medium text-slate-700">Record Encounter</span>
            </button>
            <button
              onClick={() => navigate('/vitals')}
              className="flex flex-col items-center gap-2 rounded-lg border border-slate-200 p-4 hover:bg-slate-50"
            >
              <HeartPulse size={24} className="text-red-600" />
              <span className="text-sm font-medium text-slate-700">View Vitals</span>
            </button>
            <button
              onClick={() => navigate('/labs')}
              className="flex flex-col items-center gap-2 rounded-lg border border-slate-200 p-4 hover:bg-slate-50"
            >
              <FlaskConical size={24} className="text-purple-600" />
              <span className="text-sm font-medium text-slate-700">View Labs</span>
            </button>
            <button
              onClick={() => navigate('/referrals')}
              className="flex flex-col items-center gap-2 rounded-lg border border-slate-200 p-4 hover:bg-slate-50"
            >
              <ArrowRightLeft size={24} className="text-orange-600" />
              <span className="text-sm font-medium text-slate-700">Create Referral</span>
            </button>
            <button
              onClick={() => navigate('/handovers')}
              className="flex flex-col items-center gap-2 rounded-lg border border-slate-200 p-4 hover:bg-slate-50"
            >
              <ClipboardList size={24} className="text-blue-600" />
              <span className="text-sm font-medium text-slate-700">Handover Patient</span>
            </button>
            <button
              onClick={() => navigate('/inpatient')}
              className="flex flex-col items-center gap-2 rounded-lg border border-slate-200 p-4 hover:bg-slate-50"
            >
              <Bed size={24} className="text-rose-600" />
              <span className="text-sm font-medium text-slate-700">Admit Patient</span>
            </button>
            <button
              onClick={() => navigate('/appointments')}
              className="flex flex-col items-center gap-2 rounded-lg border border-slate-200 p-4 hover:bg-slate-50"
            >
              <Calendar size={24} className="text-indigo-600" />
              <span className="text-sm font-medium text-slate-700">Schedule</span>
            </button>
          </div>
        </Card>
      </div>

      {currentPatient && (
        <Card variant="light" className="border-l-4 border-l-cyan-400">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-cyan-100 text-cyan-700">
                <User size={28} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{currentPatient.full_name}</h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                  <span>{calculateAge(currentPatient.date_of_birth)} / {currentPatient.sex || '—'}</span>
                  <span className="flex items-center gap-1">
                    <Activity size={14} />
                    MRN: {currentPatient.patient_id}
                  </span>
                  {currentPatient.insurance_type && (
                    <span className="flex items-center gap-1">
                      <Shield size={14} />
                      {currentPatient.insurance_type}
                    </span>
                  )}
                  {currentPatient.last_visit && (
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      Last visit: {(currentPatient.last_visit || '').slice(0, 10)}
                    </span>
                  )}
                  {currentPatient.allergies && (
                    <span className="flex items-center gap-1 text-red-600">
                      <AlertTriangle size={14} />
                      {currentPatient.allergies}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                  {currentEncounter && (
                    <span className="flex items-center gap-1">
                      <Activity size={12} />
                      In consultation: {currentEncounter.encounter_type}
                    </span>
                  )}
                  {activeAdmissions.length > 0 && currentPatient.id === activeAdmissions[0].patient && (
                    <span className="flex items-center gap-1">
                      <MapPin size={12} />
                      {activeAdmissions[0].ward_name} {activeAdmissions[0].bed_number}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                In Consultation
              </span>
              <button
                onClick={() => navigate(`/patients/${currentPatient.id}`)}
                className="rounded-full bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
              >
                Open Full Record
              </button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
