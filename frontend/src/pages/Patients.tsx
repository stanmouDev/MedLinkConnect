import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { query, onSyncChange } from '../offline/data';
import { Card, EmptyBox } from '../components/ui';
import { Search } from 'lucide-react';

type Patient = {
  id: number;
  full_name: string;
  patient_id: string;
  sex?: string;
  date_of_birth?: string;
  phone?: string;
  allergies?: string;
  insurance_type?: string;
  last_visit?: string;
  created_at: string;
};

type Encounter = {
  id: number;
  patient: number;
  status: string;
  encounter_type: string;
  diagnosis?: string;
  reason_for_visit?: string;
  created_at: string;
};

type Admission = {
  id: number;
  patient: number;
  status: string;
  ward_name?: string;
  room_number?: string;
  bed_number?: string;
  admission_date: string;
  discharge_date?: string;
};

type Referral = {
  id: number;
  patient: number;
  status: string;
  referral_type: string;
  referral_date: string;
};

type ClinicalNote = {
  id: number;
  patient: number;
  clinical_status: string;
  assessment?: string;
  treatment_plan?: string;
  created_at: string;
};

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'waiting', label: 'Waiting' },
  { key: 'in_consultation', label: 'In consultation' },
  { key: 'admitted', label: 'Admitted' },
  { key: 'follow-up', label: 'Follow-up' },
  { key: 'discharged', label: 'Discharged' },
  { key: 'referred', label: 'Referred' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

function calculateAge(dob?: string): string {
  if (!dob) return '—';
  const diff = Date.now() - new Date(dob).getTime();
  const age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  return `${age}y`;
}

function getPatientStatus(
  patientId: number,
  encounters: Encounter[],
  admissions: Admission[],
  referrals: Referral[],
): string {
  const patientEncounters = encounters.filter((e) => e.patient === patientId);
  const patientAdmissions = admissions.filter((a) => a.patient === patientId);
  const patientReferrals = referrals.filter((r) => r.patient === patientId);

  const hasWaiting = patientEncounters.some((e) => e.status === 'waiting');
  const hasInProgress = patientEncounters.some((e) => e.status === 'in_progress');
  const hasActiveAdmission = patientAdmissions.some(
    (a) => a.status === 'admitted' || a.status === 'transferred',
  );
  const hasDischarged = patientAdmissions.some((a) => a.status === 'discharged');
  const hasActiveReferral = patientReferrals.some((r) =>
    ['submitted', 'in_transit', 'under_review'].includes(r.status),
  );

  if (hasWaiting) return 'Waiting';
  if (hasInProgress) return 'In consultation';
  if (hasActiveAdmission) return 'Admitted';
  if (hasDischarged) return 'Discharged';
  if (hasActiveReferral) return 'Referred';

  const hasCompleted = patientEncounters.some((e) => e.status === 'completed');
  if (hasCompleted) return 'Follow-up';

  return '—';
}

function getPatientDiagnosis(
  patientId: number,
  encounters: Encounter[],
  notes: ClinicalNote[],
): string {
  const patientEncounters = encounters
    .filter((e) => e.patient === patientId && e.diagnosis)
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  if (patientEncounters.length > 0) return patientEncounters[0].diagnosis || '—';

  const patientNotes = notes
    .filter((n) => n.patient === patientId && n.assessment)
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  if (patientNotes.length > 0) return patientNotes[0].assessment || '—';

  return '—';
}

function getPatientLocation(
  patientId: number,
  admissions: Admission[],
): string {
  const active = admissions.find(
    (a) => a.patient === patientId && (a.status === 'admitted' || a.status === 'transferred'),
  );
  if (!active) return '—';
  const parts = [active.ward_name, active.room_number, active.bed_number].filter(Boolean);
  return parts.join(' / ') || '—';
}

function getLastVisit(patientId: number, encounters: Encounter[]): string {
  const patientEncounters = encounters
    .filter((e) => e.patient === patientId)
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  if (patientEncounters.length > 0) return (patientEncounters[0].created_at || '').slice(0, 10);
  return '—';
}

export default function Patients() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      query('patients'),
      query('encounters'),
      query('admissions'),
      query('referrals'),
      query('clinical-progress-notes'),
    ])
      .then(([pts, enc, adm, ref, clinicalNotes]) => {
        setPatients(Array.isArray(pts) ? pts : []);
        setEncounters(Array.isArray(enc) ? enc : []);
        setAdmissions(Array.isArray(adm) ? adm : []);
        setReferrals(Array.isArray(ref) ? ref : []);
        setNotes(Array.isArray(clinicalNotes) ? clinicalNotes : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const refresh = () => {
    setLoading(true);
    Promise.all([
      query('patients'),
      query('encounters'),
      query('admissions'),
      query('referrals'),
      query('clinical-progress-notes'),
    ])
      .then(([pts, enc, adm, ref, clinicalNotes]) => {
        setPatients(Array.isArray(pts) ? pts : []);
        setEncounters(Array.isArray(enc) ? enc : []);
        setAdmissions(Array.isArray(adm) ? adm : []);
        setReferrals(Array.isArray(ref) ? ref : []);
        setNotes(Array.isArray(clinicalNotes) ? clinicalNotes : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const unsub = onSyncChange(refresh);
    return unsub;
  }, []);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    let list = patients;

    if (term) {
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
        return searchStr.includes(term);
      });
    }

    if (filter !== 'all') {
      list = list.filter((p) => {
        const status = getPatientStatus(p.id, encounters, admissions, referrals);
        if (filter === 'follow-up') return status === 'Follow-up';
        if (filter === 'in_consultation') return status === 'In consultation';
        return status.toLowerCase() === filter;
      });
    }

    return list.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  }, [patients, encounters, admissions, referrals, notes, search, filter]);

  if (loading && patients.length === 0) {
    return <EmptyBox message="Loading patients..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Patients</h1>
          <p className="mt-1 text-sm text-slate-500">
            {filtered.length} patient{filtered.length === 1 ? '' : 's'} found
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search patients, records..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 rounded-lg border border-slate-200 pl-9 pr-4 py-2 text-sm focus:border-cyan-400 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              filter === f.key
                ? 'bg-cyan-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card>
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
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    No patients match your search.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const status = getPatientStatus(p.id, encounters, admissions, referrals);
                  const diagnosis = getPatientDiagnosis(p.id, encounters, notes);
                  const location = getPatientLocation(p.id, admissions);
                  const lastVisit = getLastVisit(p.id, encounters);
                  const age = calculateAge(p.date_of_birth);

                  const statusColor =
                    status === 'Critical'
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
                      <td className="px-4 py-3 text-slate-600">{age} / {p.sex || '—'}</td>
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
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
