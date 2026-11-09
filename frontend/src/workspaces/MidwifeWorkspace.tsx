import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { query, onSyncChange } from '../offline/data';
import { Card, EmptyBox } from '../components/ui';
import {
  Activity,
  Users,
  ArrowRightLeft,
  Plus,
  ClipboardList,
  HeartPulse,
  AlertTriangle,
  User,
  Play,
  Calendar,
  Search,
  Baby,
  Stethoscope,
  ChevronRight,
  X,
  Hourglass,
  ClipboardCheck,
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

type Patient = {
  id: number;
  full_name: string;
  patient_id: string;
  sex?: string;
  date_of_birth?: string;
  phone?: string;
  address?: string;
  insurance_type?: string;
  allergies?: string;
  blood_group?: string;
  emergency_contact?: string;
  last_visit?: string;
  created_at: string;
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

type AntenatalRecord = {
  id: number;
  patient: number;
  patient_full_name?: string;
  gravida: number;
  para: number;
  edd?: string;
  lmp?: string;
  risk_classification: string;
  current_status: string;
  current_gestational_age?: number;
  previous_pregnancy_history?: string;
  created_at: string;
  updated_at: string;
};

type LabourRecord = {
  id: number;
  patient: number;
  patient_full_name?: string;
  antenatal_record?: number;
  admission_time: string;
  labour_status: string;
  cervical_dilation?: string;
  contraction_frequency?: string;
  fetal_heart_rate?: number;
  maternal_observations?: string;
  clinical_notes?: string;
  assigned_midwife?: number;
  assigned_midwife_username?: string;
  created_at: string;
  updated_at: string;
};

type Delivery = {
  id: number;
  patient: number;
  patient_full_name?: string;
  antenatal_record?: number;
  labour_record?: number;
  delivery_time: string;
  delivery_type: string;
  delivery_outcome: string;
  maternal_outcome: string;
  complications?: string;
  delivered_by?: number;
  delivered_by_username?: string;
  created_at: string;
};



type PostnatalRecord = {
  id: number;
  patient: number;
  patient_full_name?: string;
  antenatal_record?: number;
  delivery?: number;
  postnatal_status: string;
  visit_date: string;
  maternal_observations?: string;
  newborn_observations?: string;
  feeding_status?: string;
  follow_up_plan?: string;
  next_appointment?: string;
  created_at: string;
};




function calculateAge(dob?: string): string | null {
  if (!dob) return null;
  const diff = Date.now() - new Date(dob).getTime();
  const age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  return `${age}y`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'Not recorded';
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatDateTime(dateStr?: string): string {
  if (!dateStr) return 'Not recorded';
  try {
    return new Date(dateStr).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function riskBadge(risk?: string) {
  const r = (risk || '').toLowerCase();
  if (r.includes('high')) return 'bg-red-100 text-red-700 border-red-200';
  if (r.includes('medium')) return 'bg-amber-100 text-amber-700 border-amber-200';
  if (r.includes('low')) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  return 'bg-slate-100 text-slate-600 border-slate-200';
}

function statusBadge(status?: string) {
  const s = (status || '').toLowerCase();
  if (s.includes('completed') || s.includes('paid') || s.includes('accepted') || s.includes('delivered'))
    return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (s.includes('progress') || s.includes('active') || s.includes('in_progress') || s.includes('in labour'))
    return 'bg-blue-100 text-blue-700 border-blue-200';
  if (s.includes('wait') || s.includes('pending') || s.includes('scheduled'))
    return 'bg-amber-100 text-amber-700 border-amber-200';
  if (s.includes('cancel') || s.includes('reject'))
    return 'bg-red-100 text-red-700 border-red-200';
  return 'bg-slate-100 text-slate-600 border-slate-200';
}

export default function MidwifeWorkspace() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPatientSearch, setShowPatientSearch] = useState(false);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [antenatalRecords, setAntenatalRecords] = useState<AntenatalRecord[]>([]);
  const [labourRecords, setLabourRecords] = useState<LabourRecord[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [postnatalRecords, setPostnatalRecords] = useState<PostnatalRecord[]>([]);
  const [patientSearch, setPatientSearch] = useState('');

  function load() {
    setLoading(true);
    setError('');
    Promise.all([
      query('patients'),
      query('encounters'),
      query('appointments'),
      query('antenatal-records'),
      query('labour-records'),
      query('deliveries'),
      query('postnatal-records'),
    ])
      .then(([pts, enc, appt, ant, lab, del, pn]) => {
        setPatients(Array.isArray(pts) ? pts : []);
        setEncounters(Array.isArray(enc) ? enc : []);
        setAppointments(Array.isArray(appt) ? appt : []);
        setAntenatalRecords(Array.isArray(ant) ? ant : []);
        setLabourRecords(Array.isArray(lab) ? lab : []);
        setDeliveries(Array.isArray(del) ? del : []);
        setPostnatalRecords(Array.isArray(pn) ? pn : []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    const off = onSyncChange(load);
    return off;
  }, []);

  const antenatalPatientIds = useMemo(() => {
    const encounterTypes = new Set(
      encounters
        .filter((e) => e.encounter_type === 'antenatal')
        .map((e) => e.patient),
    );
    const recordIds = new Set(antenatalRecords.map((r) => r.patient));
    return new Set([...encounterTypes, ...recordIds]);
  }, [encounters, antenatalRecords]);

  const today = useMemo(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }, [loading]);

  const stats = useMemo(() => {
    const todayEnc = encounters.filter((e) => e.created_at?.startsWith(today));
    const todayDel = deliveries.filter((d) => d.delivery_time?.startsWith(today));
    const waitingANC = todayEnc.filter((e) => e.encounter_type === 'antenatal' && e.status !== 'completed').length;
    const highRisk = antenatalRecords.filter((r) => r.risk_classification === 'high_risk').length;
    const inLabour = labourRecords.filter((r) => !['delivered', 'scheduled_csection'].includes(r.labour_status)).length;
    const maternityAdmissions = labourRecords.filter((r) => r.admission_time?.startsWith(today)).length;
    const postnatalPatients = postnatalRecords.filter((p) => {
      const d = new Date(p.visit_date);
      const now = new Date();
      const diffDays = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays <= 42;
    }).length;
    const followUpsDue = appointments.filter((a) => {
      const d = new Date(a.scheduled_at);
      const now = new Date();
      return d >= now && a.status !== 'completed';
    }).length;

    return {
      antenatalToday: antenatalPatientIds.size,
      waitingANC,
      highRisk,
      inLabour,
      maternityAdmissions,
      deliveriesToday: todayDel.length,
      postnatalPatients,
      followUpsDue,
    };
  }, [encounters, antenatalRecords, labourRecords, deliveries, postnatalRecords, appointments, today]);

  const antenatalQueue = useMemo(() => {
    const latestAntenatalByPatient = new Map<number, AntenatalRecord>();
    antenatalRecords.forEach((r) => {
      const existing = latestAntenatalByPatient.get(r.patient);
      if (!existing || new Date(r.created_at) > new Date(existing.created_at)) {
        latestAntenatalByPatient.set(r.patient, r);
      }
    });

    const latestEncounterByPatient = new Map<number, Encounter>();
    encounters
      .filter((e) => e.encounter_type === 'antenatal')
      .forEach((e) => {
        const existing = latestEncounterByPatient.get(e.patient);
        if (!existing || new Date(e.created_at) > new Date(existing.created_at)) {
          latestEncounterByPatient.set(e.patient, e);
        }
      });

    const latestAppointmentByPatient = new Map<number, Appointment>();
    appointments.forEach((a) => {
      const existing = latestAppointmentByPatient.get(a.patient);
      if (!existing || new Date(a.scheduled_at) > new Date(existing.scheduled_at)) {
        latestAppointmentByPatient.set(a.patient, a);
      }
    });

    return patients
      .filter((p) => antenatalPatientIds.has(p.id))
      .map((p) => {
        const antRecord = latestAntenatalByPatient.get(p.id);
        const lastEnc = latestEncounterByPatient.get(p.id);
        const nextAppt = latestAppointmentByPatient.get(p.id);
        return {
          patient: p,
          gestationalAge: antRecord?.current_gestational_age,
          edd: antRecord?.edd,
          riskStatus: antRecord?.risk_classification || 'Not recorded',
          lastANCVisit: lastEnc?.created_at,
          nextAppointment: nextAppt?.scheduled_at,
          status: lastEnc?.status || 'No visits',
        };
      })
      .sort((a, b) => {
        const riskOrder = { high_risk: 0, medium_risk: 1, low_risk: 2 };
        const ra = riskOrder[a.riskStatus as keyof typeof riskOrder] ?? 3;
        const rb = riskOrder[b.riskStatus as keyof typeof riskOrder] ?? 3;
        if (ra !== rb) return ra - rb;
        return (b.lastANCVisit || '').localeCompare(a.lastANCVisit || '');
      });
  }, [patients, encounters, antenatalRecords, appointments, antenatalPatientIds]);

  const filteredAntenatalQueue = useMemo(() => {
    if (!patientSearch.trim()) return antenatalQueue;
    const q = patientSearch.toLowerCase();
    return antenatalQueue.filter((item) => {
      const p = item.patient;
      return (
        p.full_name.toLowerCase().includes(q) ||
        p.patient_id.toLowerCase().includes(q) ||
        (p.phone && p.phone.includes(q)) ||
        (item.gestationalAge && String(item.gestationalAge).includes(q))
      );
    });
  }, [antenatalQueue, patientSearch]);

  const openPatient = (patientId: number) => {
    navigate(`/patients/${patientId}`);
  };

  if (loading) {
    return <EmptyBox message="Loading maternity workspace..." />;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Maternity & Midwifery Workspace</h1>
          <p className="text-sm text-slate-500">
            Antenatal, labour, delivery and postnatal clinical operations
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/patients')}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Users size={18} />
            Open Patient
          </button>
          <button
            onClick={() => navigate('/consultation/new')}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
          >
            <Plus size={18} />
            Register / Open Antenatal Visit
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Antenatal Patients Today</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{stats.antenatalToday}</p>
            </div>
            <div className="rounded-full bg-cyan-100 p-2 text-cyan-700">
              <Activity size={20} />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Waiting for ANC</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{stats.waitingANC}</p>
            </div>
            <div className="rounded-full bg-amber-100 p-2 text-amber-700">
              <Hourglass size={20} />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">High-Risk Pregnancies</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{stats.highRisk}</p>
            </div>
            <div className="rounded-full bg-red-100 p-2 text-red-700">
              <AlertTriangle size={20} />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Currently in Labour</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{stats.inLabour}</p>
            </div>
            <div className="rounded-full bg-blue-100 p-2 text-blue-700">
              <Play size={20} />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Maternity Admissions</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{stats.maternityAdmissions}</p>
            </div>
            <div className="rounded-full bg-indigo-100 p-2 text-indigo-700">
              <ClipboardCheck size={20} />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Deliveries Today</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{stats.deliveriesToday}</p>
            </div>
            <div className="rounded-full bg-emerald-100 p-2 text-emerald-700">
              <Baby size={20} />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Postnatal Patients</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{stats.postnatalPatients}</p>
            </div>
            <div className="rounded-full bg-purple-100 p-2 text-purple-700">
              <HeartPulse size={20} />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Follow-ups Due</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{stats.followUpsDue}</p>
            </div>
            <div className="rounded-full bg-teal-100 p-2 text-teal-700">
              <Calendar size={20} />
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
          {[
            { label: 'Open Patient', icon: Users, action: () => setShowPatientSearch(true) },
            { label: 'New Antenatal Visit', icon: Plus, action: () => navigate('/consultation/new') },
            { label: 'Record Maternal Vitals', icon: Stethoscope, action: () => navigate('/vitals') },
            { label: 'Fetal Assessment', icon: HeartPulse, action: () => setShowPatientSearch(true) },
            { label: 'Labour Monitoring', icon: Play, action: () => setShowPatientSearch(true) },
            { label: 'Record Delivery', icon: Baby, action: () => setShowPatientSearch(true) },
            { label: 'Postnatal Review', icon: ClipboardCheck, action: () => setShowPatientSearch(true) },
            { label: 'Newborn Record', icon: Baby, action: () => navigate('/consultation/new') },
            { label: 'Create Referral', icon: ArrowRightLeft, action: () => navigate('/referrals') },
            { label: 'Handover Patient', icon: ClipboardList, action: () => navigate('/handovers') },
          ].map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              className="flex flex-col items-center gap-2 rounded-lg border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700 hover:border-cyan-300 hover:bg-cyan-50"
            >
              <item.icon size={24} className="text-cyan-600" />
              {item.label}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Antenatal / ANC Queue</h2>
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search antenatal patients..."
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              className="w-64 rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
          </div>
        </div>
        {filteredAntenatalQueue.length === 0 ? (
          <EmptyBox message="No antenatal patients found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                  <th className="py-3 pr-4">Patient</th>
                  <th className="py-3 pr-4">MRN</th>
                  <th className="py-3 pr-4">Age</th>
                  <th className="py-3 pr-4">Gestational Age</th>
                  <th className="py-3 pr-4">EDD</th>
                  <th className="py-3 pr-4">Risk Status</th>
                  <th className="py-3 pr-4">Last ANC Visit</th>
                  <th className="py-3 pr-4">Next Appointment</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAntenatalQueue.map((item) => (
                  <tr
                    key={item.patient.id}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => openPatient(item.patient.id)}
                  >
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-100 text-cyan-700">
                          <User size={14} />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{item.patient.full_name}</p>
                          {item.patient.allergies && (
                            <p className="text-xs text-red-600">Allergies: {item.patient.allergies}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-slate-600">{item.patient.patient_id}</td>
                    <td className="py-3 pr-4 text-slate-600">{calculateAge(item.patient.date_of_birth) || 'Not recorded'}</td>
                    <td className="py-3 pr-4 text-slate-600">
                      {item.gestationalAge ? `${item.gestationalAge} weeks` : 'Not recorded'}
                    </td>
                    <td className="py-3 pr-4 text-slate-600">{formatDate(item.edd)}</td>
                    <td className="py-3 pr-4">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${riskBadge(item.riskStatus)}`}>
                        {item.riskStatus}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-slate-600">{formatDateTime(item.lastANCVisit)}</td>
                    <td className="py-3 pr-4 text-slate-600">{formatDateTime(item.nextAppointment)}</td>
                    <td className="py-3 pr-4">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadge(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openPatient(item.patient.id);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-cyan-700"
                      >
                        Open Patient
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Labour Monitoring</h2>
            <span className="text-xs text-slate-500">{labourRecords.length} records</span>
          </div>
          {labourRecords.length === 0 ? (
            <EmptyBox message="No active labour records" />
          ) : (
            <div className="space-y-3">
              {labourRecords.slice(0, 10).map((record) => (
                <div
                  key={record.id}
                  className="cursor-pointer rounded-lg border border-slate-200 p-3 hover:border-cyan-300"
                  onClick={() => openPatient(record.patient)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">
                        {record.patient_full_name || `Patient #${record.patient}`}
                      </p>
                      <p className="text-xs text-slate-500">
                        Admitted: {formatDateTime(record.admission_time)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadge(record.labour_status)}`}>
                        {record.labour_status.replace('_', ' ')}
                      </span>
                      {record.fetal_heart_rate && (
                        <p className="mt-1 text-xs text-slate-500">FHR: {record.fetal_heart_rate} bpm</p>
                      )}
                    </div>
                  </div>
                  {record.cervical_dilation && (
                    <p className="mt-1 text-xs text-slate-600">Cervical dilation: {record.cervical_dilation}</p>
                  )}
                  {record.clinical_notes && (
                    <p className="mt-1 text-xs text-slate-500 line-clamp-1">{record.clinical_notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Recent Deliveries</h2>
            <span className="text-xs text-slate-500">{deliveries.length} total</span>
          </div>
          {deliveries.length === 0 ? (
            <EmptyBox message="No deliveries recorded" />
          ) : (
            <div className="space-y-3">
              {deliveries.slice(0, 10).map((delivery) => (
                <div
                  key={delivery.id}
                  className="cursor-pointer rounded-lg border border-slate-200 p-3 hover:border-cyan-300"
                  onClick={() => openPatient(delivery.patient)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">
                        {delivery.patient_full_name || `Patient #${delivery.patient}`}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDateTime(delivery.delivery_time)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadge(delivery.delivery_outcome)}`}>
                        {delivery.delivery_outcome.replace('_', ' ')}
                      </span>
                      <p className="mt-1 text-xs text-slate-500">{delivery.delivery_type}</p>
                    </div>
                  </div>
                  {delivery.maternal_outcome && (
                    <p className="mt-1 text-xs text-slate-600">Maternal outcome: {delivery.maternal_outcome}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Postnatal Patients</h2>
            <span className="text-xs text-slate-500">{postnatalRecords.length} records</span>
          </div>
          {postnatalRecords.length === 0 ? (
            <EmptyBox message="No postnatal records" />
          ) : (
            <div className="space-y-3">
              {postnatalRecords.slice(0, 10).map((record) => (
                <div
                  key={record.id}
                  className="cursor-pointer rounded-lg border border-slate-200 p-3 hover:border-cyan-300"
                  onClick={() => openPatient(record.patient)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">
                        {record.patient_full_name || `Patient #${record.patient}`}
                      </p>
                      <p className="text-xs text-slate-500">
                        Visit: {formatDateTime(record.visit_date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadge(record.postnatal_status)}`}>
                        {record.postnatal_status}
                      </span>
                      {record.feeding_status && (
                        <p className="mt-1 text-xs text-slate-500">Feeding: {record.feeding_status}</p>
                      )}
                    </div>
                  </div>
                  {record.follow_up_plan && (
                    <p className="mt-1 text-xs text-slate-500 line-clamp-1">{record.follow_up_plan}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">High-Risk Pregnancies</h2>
            <span className="text-xs text-slate-500">{antenatalRecords.filter((r) => r.risk_classification === 'high_risk').length} patients</span>
          </div>
          {antenatalRecords.filter((r) => r.risk_classification === 'high_risk').length === 0 ? (
            <EmptyBox message="No high-risk pregnancies documented" />
          ) : (
            <div className="space-y-3">
              {antenatalRecords
                .filter((r) => r.risk_classification === 'high_risk')
                .slice(0, 10)
                .map((record) => {
                  const patient = patients.find((p) => p.id === record.patient);
                  return (
                    <div
                      key={record.id}
                      className="cursor-pointer rounded-lg border border-red-200 bg-red-50 p-3 hover:border-red-300"
                      onClick={() => openPatient(record.patient)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900">
                            {record.patient_full_name || patient?.full_name || `Patient #${record.patient}`}
                          </p>
                          <p className="text-xs text-slate-500">
                            GA: {record.current_gestational_age ? `${record.current_gestational_age} weeks` : 'Not recorded'}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="inline-flex rounded-full border border-red-200 bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                            High Risk
                          </span>
                          <p className="mt-1 text-xs text-slate-500">
                            Para: {record.para} | Gravida: {record.gravida}
                          </p>
                        </div>
                      </div>
                      {record.previous_pregnancy_history && (
                        <p className="mt-1 text-xs text-slate-600 line-clamp-1">
                          History: {record.previous_pregnancy_history}
                        </p>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </Card>
      </div>

      {showPatientSearch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Open Patient</h3>
              <button onClick={() => setShowPatientSearch(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <input
              type="text"
              placeholder="Search by name, MRN, or phone..."
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              autoFocus
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-4 text-sm outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
            <div className="mt-4 max-h-96 overflow-y-auto">
              {patients.filter((p) => {
                const q = patientSearch.toLowerCase();
                return (
                  p.full_name.toLowerCase().includes(q) ||
                  p.patient_id.toLowerCase().includes(q) ||
                  (p.phone && p.phone.includes(q))
                );
              }).length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-500">No patients found</p>
              ) : (
                <div className="space-y-1">
                  {patients
                    .filter((p) => {
                      const q = patientSearch.toLowerCase();
                      return (
                        p.full_name.toLowerCase().includes(q) ||
                        p.patient_id.toLowerCase().includes(q) ||
                        (p.phone && p.phone.includes(q))
                      );
                    })
                    .map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setShowPatientSearch(false);
                          openPatient(p.id);
                        }}
                        className="flex w-full items-center justify-between rounded-lg px-4 py-3 text-left hover:bg-cyan-50"
                      >
                        <div>
                          <p className="font-medium text-slate-900">{p.full_name}</p>
                          <p className="text-xs text-slate-500">{p.patient_id}</p>
                        </div>
                        <ChevronRight size={18} className="text-slate-400" />
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
