import { useEffect, useState } from 'react';
import { query, onSyncChange } from '../offline/data';
import {
  Card,
  ErrorBox,
  LoadingBox,
  EmptyBox,
  PageHeader,
} from '../components/ui';

type Encounter = {
  id: number;
  status: string;
  triage_level?: string;
  patient_full_name?: string;
  encounter_type?: string;
  updated_at?: string;
};

type User = { id: number; role: string; username: string };
type Hospital = { id: number; name: string; bed_capacity?: number; beds?: number };
type LabRequest = { id: number; status: string };
type StockItem = { id: number; name: string; current_quantity: number; min_stock_level: number };
type TimelineEvent = {
  id: number;
  title: string;
  description: string;
  event_type: string;
  occurred_at: string;
  patient_full_name?: string;
  created_by_username?: string;
};
type Bill = { id: number; total_amount: number | string; status: string };
type Payment = { id: number; bill: number; amount: number | string; paid_at: string };

const BED_CAPACITY_FALLBACK = 50;

const TIMELINE_COLORS: Record<string, string> = {
  consultation: 'bg-cyan-400',
  vital_sign: 'bg-emerald-400',
  medication: 'bg-purple-400',
  lab_request: 'bg-amber-400',
  lab_result: 'bg-blue-400',
  handover: 'bg-orange-400',
  discharge: 'bg-slate-400',
};

function fmt(n: number | string | undefined): string {
  const v = Number(n || 0);
  return v.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function StatCard({
  label,
  value,
  accent,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  accent?: string;
  sub?: string;
}) {
  return (
    <Card>
      <p className="text-sm text-slate-400">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${accent || 'text-cyan-300'}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </Card>
  );
}

export default function Dashboard() {
  const [patients, setPatients] = useState<any[]>([]);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [labRequests, setLabRequests] = useState<LabRequest[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function load() {
    setLoading(true);
    setError('');
    Promise.all([
      query('patients'),
      query('encounters'),
      query('users'),
      query('hospitals'),
      query('lab-requests'),
      query('stock-items'),
      query('timeline'),
      query('bills'),
      query('payments'),
    ])
      .then(([p, en, u, h, lr, st, tl, b, pay]: [any, any, any, any, any, any, any, any, any]) => {
        setPatients(Array.isArray(p) ? p : p.results || []);
        setEncounters(Array.isArray(en) ? en : en.results || []);
        setUsers(Array.isArray(u) ? u : u.results || []);
        setHospitals(Array.isArray(h) ? h : h.results || []);
        setLabRequests(Array.isArray(lr) ? lr : lr.results || []);
        setStockItems(Array.isArray(st) ? st : st.results || []);
        setTimeline(Array.isArray(tl) ? tl : tl.results || []);
        setBills(Array.isArray(b) ? b : b.results || []);
        setPayments(Array.isArray(pay) ? pay : pay.results || []);
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

  if (loading) return <LoadingBox />;
  if (error) return <ErrorBox message={error} />;

  const waiting = encounters.filter((e) => e.status === 'waiting').length;
  const admitted = encounters.filter((e) => e.status === 'admitted').length;
  const emergencyCases = encounters.filter(
    (e) => e.triage_level === 'emergency' || e.status === 'emergency',
  ).length;

  const hospitalCap = hospitals.reduce(
    (s, h) => s + Number(h.bed_capacity || h.beds || 0),
    0,
  );
  const totalBeds = hospitalCap || (hospitals.length || 1) * BED_CAPACITY_FALLBACK;
  const availableBeds = Math.max(0, totalBeds - admitted);

  const doctorsOnDuty = users.filter((u) => u.role === 'doctor').length;
  const nursesOnDuty = users.filter((u) => u.role === 'nurse').length;

  const labWorkload = labRequests.filter(
    (r) => r.status !== 'completed' && r.status !== 'cancelled',
  ).length;
  const pharmacyWorkload = stockItems.filter(
    (s) => Number(s.current_quantity) <= Number(s.min_stock_level),
  ).length;

  const today = new Date().toISOString().slice(0, 10);
  const revenueToday = payments
    .filter((p) => (p.paid_at || '').slice(0, 10) === today)
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const recentEvents = [...timeline].slice(0, 8);

  return (
    <div>
      <PageHeader
        title="Hospital Overview"
        subtitle="Live operational summary across departments"
      />

      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">
        Ward & Staffing
      </h2>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Patients Waiting" value={waiting} accent="text-amber-300" />
        <StatCard label="Patients Admitted" value={admitted} accent="text-cyan-300" />
        <StatCard label="Available Beds" value={availableBeds} accent="text-emerald-300" sub={`of ${totalBeds} capacity`} />
        <StatCard label="Emergency Cases" value={emergencyCases} accent="text-red-300" />
        <StatCard label="Doctors on Duty" value={doctorsOnDuty} accent="text-blue-300" />
        <StatCard label="Nurses on Duty" value={nursesOnDuty} accent="text-purple-300" />
        <StatCard label="Lab Workload" value={labWorkload} accent="text-amber-300" sub="pending tests" />
        <StatCard label="Pharmacy Workload" value={pharmacyWorkload} accent="text-pink-300" sub="low-stock items" />
      </div>

      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">
        Quick Stats
      </h2>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Registered Patients" value={patients.length} />
        <StatCard label="Active Encounters" value={encounters.length} accent="text-cyan-300" />
        <StatCard label="Revenue Today" value={fmt(revenueToday)} accent="text-emerald-300" />
        <StatCard
          label="Outstanding"
          value={fmt(
            bills
              .filter((b) => b.status !== 'paid' && b.status !== 'cancelled')
              .reduce((s, b) => s + Number(b.total_amount || 0), 0),
          )}
          accent="text-red-300"
        />
      </div>

      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">
        Recent Timeline
      </h2>
      {recentEvents.length === 0 ? (
        <EmptyBox message="No recent activity." />
      ) : (
        <Card>
          <div className="relative ml-4 border-l border-slate-800 pl-6">
            {recentEvents.map((ev) => (
              <div key={ev.id} className="mb-6 last:mb-0">
                <div
                  className={`-ml-2 mb-2 h-2.5 w-2.5 rounded-full border-2 border-slate-900 ${
                    TIMELINE_COLORS[ev.event_type] || 'bg-slate-400'
                  }`}
                />
                <div className="text-sm">
                  <span className="font-medium text-slate-100">{ev.title}</span>
                  {ev.description && <p className="mt-1 text-slate-300">{ev.description}</p>}
                  <div className="mt-1 text-xs text-slate-400">
                    {(ev.occurred_at || '').slice(0, 16)} ·{' '}
                    {ev.patient_full_name || 'General'} · By {ev.created_by_username || '—'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
