import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { query, onSyncChange } from '../offline/data';
import { SyncStatusBar } from '../offline/SyncStatusBar';
import { Card, EmptyBox } from '../components/ui';
import {
  Users,
  Bed,
  Calendar,
  Shield,
  FileBarChart,
  Wallet,
  User,
  Plus,
  ChevronDown,
  AlertTriangle,
  FileText,
  ClipboardCheck,
  TestTube,
  Package,
  CreditCard,
  BarChart3,
} from 'lucide-react';

type User = {
  id: number;
  username: string;
  role: string;
  is_active: boolean;
};

type DataQualityAlert = {
  id: number;
  title: string;
  status: string;
  priority: string;
};

type AuditLog = {
  id: number;
  user_name?: string;
  action: string;
  details: string;
  timestamp: string;
};

type TimelineEvent = {
  id: number;
  title: string;
  description?: string;
  event_type: string;
  occurred_at: string;
  patient_full_name?: string;
  created_by_username?: string;
};

type Bed = {
  id: number;
  bed_number: string;
  status: string;
  room?: number;
  room_number?: string;
  ward_name?: string;
  patient_full_name?: string;
  current_patient: number | null;
};

type Admission = {
  id: number;
  patient: number;
  patient_full_name?: string;
  ward?: number;
  ward_name?: string;
  room?: number;
  room_number?: string;
  bed?: number;
  bed_number?: string;
  status: string;
  admission_date: string;
  discharge_date?: string;
};

type Bill = {
  id: number;
  patient: number;
  patient_name?: string;
  total_amount: number | string;
  status: string;
  bill_type: string;
  created_at: string;
};

type Payment = {
  id: number;
  bill: number;
  payment_method: string;
  amount: number | string;
  paid_at: string;
};

type InsuranceCompany = {
  id: number;
  name: string;
  code: string;
  type: string;
};

type NHISRecord = {
  id: number;
  patient: number;
  patient_full_name?: string;
  membership_number: string;
  expiry_date: string;
};

type PrivateInsuranceRecord = {
  id: number;
  patient: number;
  patient_full_name?: string;
  company: number;
  company_name?: string;
  membership_number: string;
  expiry_date: string;
};

type MonthlyStat = {
  id: number;
  month: string;
  label?: string;
  total_patients: number;
  male_patients: number;
  female_patients: number;
  other_patients?: number;
  admissions: number;
  discharges: number;
  referrals: number;
  lab_tests: number;
  prescriptions: number;
  total_revenue: number;
  nhis_revenue: number;
  private_insurance_revenue: number;
  cash_revenue: number;
  outstanding: number;
};

type Notification = {
  id: number;
  title: string;
  message: string;
  notification_type: string;
  priority: string;
  is_read: boolean;
  created_at: string;
};

const TIMELINE_COLORS: Record<string, string> = {
  consultation: 'bg-cyan-400',
  vital_sign: 'bg-emerald-400',
  medication: 'bg-purple-400',
  lab_request: 'bg-amber-400',
  lab_result: 'bg-blue-400',
  handover: 'bg-orange-400',
  discharge: 'bg-slate-400',
  admission: 'bg-rose-400',
  payment: 'bg-emerald-400',
  registration: 'bg-cyan-400',
};

function fmtGHS(n: number | string | undefined): string {
  const v = Number(n || 0);
  return `GHS ${v.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function priorityBadge(priority?: string) {
  const p = (priority || '').toLowerCase();
  if (p === 'emergency' || p === 'urgent') return 'bg-red-100 text-red-700 border-red-200';
  if (p === 'high') return 'bg-orange-100 text-orange-700 border-orange-200';
  if (p === 'medium') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  return 'bg-slate-100 text-slate-600 border-slate-200';
}

export default function AdministratorWorkspace() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'year'>('today');

  const [patients, setPatients] = useState<any[]>([]);
  const [encounters, setEncounters] = useState<any[]>([]);
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [labRequests, setLabRequests] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [alerts, setAlerts] = useState<DataQualityAlert[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [nhisRecords, setNHISRecords] = useState<NHISRecord[]>([]);
  const [privateInsurance, setPrivateInsurance] = useState<PrivateInsuranceRecord[]>([]);
  const [insuranceCompanies, setInsuranceCompanies] = useState<InsuranceCompany[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStat[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  function load() {
    setLoading(true);
    setError('');
    Promise.all([
      query('patients'),
      query('encounters'),
      query('admissions'),
      query('bills'),
      query('lab-requests'),
      query('referrals'),
      query('stock-items'),
      query('users'),
      query('data-quality-alerts'),
      query('audit-logs'),
      query('timeline'),
      query('payments'),
      query('beds'),
      query('nhis-records'),
      query('private-insurance-records'),
      query('insurance-companies'),
      query('monthly-statistics'),
      query('notifications'),
    ])
      .then(([
        p, enc, adm, b, lab, ref, stock, usr, dqa, audit, tl, pay, bedsData, nhis, privIns, insComp, monStats, notif,
      ]) => {
        setPatients(Array.isArray(p) ? p : []);
        setEncounters(Array.isArray(enc) ? enc : []);
        setAdmissions(Array.isArray(adm) ? adm : []);
        setBills(Array.isArray(b) ? b : []);
        setLabRequests(Array.isArray(lab) ? lab : []);
        setReferrals(Array.isArray(ref) ? ref : []);
        setStockItems(Array.isArray(stock) ? stock : []);
        setUsers(Array.isArray(usr) ? usr : []);
        setAlerts(Array.isArray(dqa) ? dqa : []);
        setAuditLogs(Array.isArray(audit) ? audit : []);
        setTimeline(Array.isArray(tl) ? tl : []);
        setPayments(Array.isArray(pay) ? pay : []);
        setBeds(Array.isArray(bedsData) ? bedsData : []);
        setNHISRecords(Array.isArray(nhis) ? nhis : []);
        setPrivateInsurance(Array.isArray(privIns) ? privIns : []);
        setInsuranceCompanies(Array.isArray(insComp) ? insComp : []);
        setMonthlyStats(Array.isArray(monStats) ? monStats : []);
        setNotifications(Array.isArray(notif) ? notif : []);
      })
      .catch((e) => setError(e.message || 'Failed to load data.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    const off = onSyncChange(load);
    return off;
  }, []);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const todayVisits = useMemo(() => encounters.filter((e) => (e.created_at || '').startsWith(today)).length, [encounters, today]);
  const waiting = useMemo(() => encounters.filter((e) => e.status === 'waiting').length, [encounters]);
  const activeAdmissions = useMemo(() => admissions.filter((a) => a.status === 'admitted' || a.status === 'transferred'), [admissions]);
  const dischargedToday = useMemo(() => admissions.filter((d) => (d.discharge_date || '').startsWith(today)).length, [admissions, today]);
  const labWorkload = useMemo(() => labRequests.filter((l: any) => l.status !== 'completed' && l.status !== 'cancelled').length, [labRequests]);
  const lowStock = useMemo(() => stockItems.filter((s: any) => Number(s.current_quantity) <= Number(s.min_stock_level)).length, [stockItems]);
  const unresolvedAlerts = useMemo(() => alerts.filter((a) => a.status === 'open').length, [alerts]);
  const pendingReferrals = useMemo(() => referrals.filter((r: any) => r.status === 'submitted' || r.status === 'in_transit').length, [referrals]);
  const pendingLabResults = useMemo(() => labRequests.filter((l: any) => l.status === 'pending' || l.status === 'processing').length, [labRequests]);
  const emergencyCases = useMemo(() => encounters.filter((e: any) => e.triage_level === 'emergency' || e.status === 'emergency').length, [encounters]);
  const activeDoctors = useMemo(() => users.filter((u) => u.role === 'doctor' && u.is_active).length, [users]);
  const activeNurses = useMemo(() => users.filter((u) => u.role === 'nurse' && u.is_active).length, [users]);
  const totalBeds = useMemo(() => beds.length, [beds]);
  const occupiedBeds = useMemo(() => beds.filter((b) => b.status === 'occupied').length, [beds]);
  const availableBeds = useMemo(() => beds.filter((b) => b.status === 'available').length, [beds]);
  const reservedBeds = useMemo(() => beds.filter((b) => b.status === 'reserved').length, [beds]);

  const todayPayments = useMemo(() => payments.filter((p) => (p.paid_at || '').startsWith(today)), [payments, today]);
  const todayRevenue = useMemo(() => todayPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0), [todayPayments]);
  const insuranceClaims = useMemo(() => nhisRecords.length + privateInsurance.length, [nhisRecords, privateInsurance]);
  const uninsuredPatients = useMemo(() => patients.filter((p: any) => !p.insurance_type || p.insurance_type === 'none').length, [patients]);

  const recentActivity = useMemo(() => {
    return [...timeline]
      .sort((a, b) => (b.occurred_at || '').localeCompare(a.occurred_at || ''))
      .slice(0, 10);
  }, [timeline]);

  const wardStats = useMemo(() => {
    const map: Record<string, { total: number; occupied: number; available: number }> = {};
    beds.forEach((b) => {
      const w = b.ward_name || 'Unknown';
      if (!map[w]) map[w] = { total: 0, occupied: 0, available: 0 };
      map[w].total++;
      if (b.status === 'occupied') map[w].occupied++;
      if (b.status === 'available') map[w].available++;
    });
    return Object.entries(map).map(([name, stats]) => ({ name, ...stats }));
  }, [beds]);

  const departmentStats = useMemo(() => {
    const pendingLabs = labRequests.filter((l: any) => l.status !== 'completed' && l.status !== 'cancelled').length;
    const completedLabsToday = labRequests.filter((l: any) => (l.created_at || '').startsWith(today) && l.status === 'completed').length;
    const criticalLabs = labRequests.filter((l: any) => l.priority === 'emergency' || l.priority === 'urgent').length;
    const prescriptions = encounters.filter((e: any) => e.encounter_type === 'consultation').length;
    const dispensed = 0;
    const lowStockItems = stockItems.filter((s: any) => Number(s.current_quantity) <= Number(s.min_stock_level)).length;

    return [
      { name: 'OPD / Consultation', pending: waiting, completed: todayVisits, critical: 0 },
      { name: 'Nursing', pending: activeAdmissions.length, completed: dischargedToday, critical: 0 },
      { name: 'Laboratory', pending: pendingLabs, completed: completedLabsToday, critical: criticalLabs },
      { name: 'Pharmacy', pending: prescriptions, completed: dispensed, critical: lowStockItems },
      { name: 'Inpatient', pending: activeAdmissions.length, completed: dischargedToday, critical: 0 },
      { name: 'Billing', pending: 0, completed: 0, critical: 0 },
      { name: 'Medical Records', pending: 0, completed: patients.length, critical: 0 },
      { name: 'Administration', pending: unresolvedAlerts, completed: users.filter((u) => u.is_active).length, critical: 0 },
    ];
  }, [
    labRequests, encounters, stockItems, admissions, waiting, todayVisits, dischargedToday,
    patients, users, unresolvedAlerts, activeAdmissions, today,
  ]);

  const clinicalStats = useMemo(() => {
    const totalPatients = patients.length;
    const newToday = patients.filter((p: any) => (p.created_at || '').startsWith(today)).length;
    const males = patients.filter((p: any) => p.sex === 'Male').length;
    const females = patients.filter((p: any) => p.sex === 'Female').length;
    const others = patients.filter((p: any) => p.sex && p.sex !== 'Male' && p.sex !== 'Female').length;

    const ageGroups = { '0-5': 0, '6-17': 0, '18-35': 0, '36-59': 0, '60+': 0 };
    patients.forEach((p: any) => {
      if (!p.date_of_birth) return;
      const age = Math.floor((Date.now() - new Date(p.date_of_birth).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
      if (age <= 5) ageGroups['0-5']++;
      else if (age <= 17) ageGroups['6-17']++;
      else if (age <= 35) ageGroups['18-35']++;
      else if (age <= 59) ageGroups['36-59']++;
      else ageGroups['60+']++;
    });

    return {
      total: totalPatients,
      newToday,
      males,
      females,
      others,
      ageGroups,
      consultations: todayVisits,
      admissions: activeAdmissions.length,
      discharges: dischargedToday,
      referrals: pendingReferrals,
      emergency: emergencyCases,
    };
  }, [patients, todayVisits, activeAdmissions, dischargedToday, pendingReferrals, emergencyCases, today]);

  const monthlyStatsData = useMemo(() => {
    if (monthlyStats.length === 0) return null;
    return monthlyStats[0];
  }, [monthlyStats]);

  const unreadNotifications = useMemo(() => notifications.filter((n) => !n.is_read).length, [notifications]);

  if (loading && patients.length === 0) return <EmptyBox message="Loading workspace..." />;
  if (error) return <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Administrator Workspace</h1>
          <p className="mt-1 text-sm text-slate-500">Hospital operations, clinical oversight and system administration</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowQuickActions(!showQuickActions)}
              className="inline-flex items-center gap-2 rounded-full bg-cyan-600 px-4 py-2 font-medium text-white hover:bg-cyan-700"
            >
              <Plus size={18} />
              Quick Action
              <ChevronDown size={16} />
            </button>
            {showQuickActions && (
              <div className="absolute right-0 top-full z-10 mt-2 w-56 rounded-lg border border-slate-200 bg-white py-2 shadow-lg">
                <button onClick={() => { navigate('/patients'); setShowQuickActions(false); }} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <User size={16} /> Register Patient
                </button>
                <button onClick={() => { navigate('/security'); setShowQuickActions(false); }} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <Users size={16} /> Create User
                </button>
                <button onClick={() => { navigate('/reports'); setShowQuickActions(false); }} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <FileBarChart size={16} /> View Reports
                </button>
                <button onClick={() => { navigate('/reports'); setShowQuickActions(false); }} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <BarChart3 size={16} /> Generate Monthly Report
                </button>
                <button onClick={() => { navigate('/insurance'); setShowQuickActions(false); }} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <Wallet size={16} /> Manage Insurance
                </button>
                <button onClick={() => { navigate('/billing'); setShowQuickActions(false); }} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <CreditCard size={16} /> View Billing
                </button>
                <button onClick={() => { navigate('/inpatient'); setShowQuickActions(false); }} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <Bed size={16} /> View Admissions
                </button>
                <button onClick={() => { navigate('/data-quality'); setShowQuickActions(false); }} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <ClipboardCheck size={16} /> Review Data Quality
                </button>
                <button onClick={() => { navigate('/security'); setShowQuickActions(false); }} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <Shield size={16} /> View Audit Logs
                </button>
                <button onClick={() => { navigate('/report-templates'); setShowQuickActions(false); }} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <FileText size={16} /> Manage Report Templates
                </button>
                <button onClick={() => { navigate('/schedule-manager'); setShowQuickActions(false); }} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <Calendar size={16} /> Schedule Report
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <button onClick={() => navigate('/patients')} className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-left hover:shadow-md transition-shadow">
          <p className="text-sm text-slate-400">Patients Today</p>
          <p className="mt-2 text-3xl font-semibold text-cyan-300">{patients.length}</p>
        </button>

        <button onClick={() => navigate('/inpatient')} className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-left hover:shadow-md transition-shadow">
          <p className="text-sm text-slate-400">Admissions Today</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-300">{activeAdmissions.filter((a) => (a.admission_date || '').startsWith(today)).length}</p>
        </button>

        <button onClick={() => navigate('/encounters')} className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-left hover:shadow-md transition-shadow">
          <p className="text-sm text-slate-400">Patients Waiting</p>
          <p className="mt-2 text-3xl font-semibold text-amber-300">{waiting}</p>
        </button>

        <button onClick={() => navigate('/encounters')} className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-left hover:shadow-md transition-shadow">
          <p className="text-sm text-slate-400">Emergency Cases</p>
          <p className="mt-2 text-3xl font-semibold text-red-300">{emergencyCases}</p>
        </button>

        <button onClick={() => navigate('/security')} className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-left hover:shadow-md transition-shadow">
          <p className="text-sm text-slate-400">Doctors on Duty</p>
          <p className="mt-2 text-3xl font-semibold text-blue-300">{activeDoctors}</p>
        </button>

        <button onClick={() => navigate('/security')} className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-left hover:shadow-md transition-shadow">
          <p className="text-sm text-slate-400">Nurses on Duty</p>
          <p className="mt-2 text-3xl font-semibold text-purple-300">{activeNurses}</p>
        </button>

        <button onClick={() => navigate('/labs')} className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-left hover:shadow-md transition-shadow">
          <p className="text-sm text-slate-400">Pending Lab Tests</p>
          <p className="mt-2 text-3xl font-semibold text-cyan-300">{labWorkload}</p>
        </button>

        <button onClick={() => navigate('/inpatient')} className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-left hover:shadow-md transition-shadow">
          <p className="text-sm text-slate-400">Available Beds</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-300">{availableBeds}</p>
        </button>

        <button onClick={() => navigate('/billing')} className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-left hover:shadow-md transition-shadow">
          <p className="text-sm text-slate-400">Outstanding Bills</p>
          <p className="mt-2 text-3xl font-semibold text-amber-300">{bills.filter((b: any) => b.status === 'pending' || b.status === 'partial').length}</p>
        </button>

        <button onClick={() => navigate('/billing')} className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-left hover:shadow-md transition-shadow">
          <p className="text-sm text-slate-400">Today's Payments</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-300">{fmtGHS(todayRevenue)}</p>
        </button>

        <button onClick={() => navigate('/insurance')} className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-left hover:shadow-md transition-shadow">
          <p className="text-sm text-slate-400">Insurance/NHIS Claims</p>
          <p className="mt-2 text-3xl font-semibold text-blue-300">{insuranceClaims}</p>
        </button>

        <button onClick={() => navigate('/stock')} className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-left hover:shadow-md transition-shadow">
          <p className="text-sm text-slate-400">Low Stock Items</p>
          <p className="mt-2 text-3xl font-semibold text-red-300">{lowStock}</p>
        </button>
      </div>

      {/* Hospital Operations */}
      <Card>
        <h3 className="mb-4 text-lg font-semibold text-slate-100">Hospital Operations</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">Patients Waiting</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100">{waiting}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">Under Consultation</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100">{encounters.filter((e: any) => e.status === 'in_progress').length}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">Admissions</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100">{activeAdmissions.length}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">Discharges Today</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100">{dischargedToday}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">Referrals</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100">{pendingReferrals}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">Pending Handovers</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100">{referrals.filter((r: any) => r.status === 'pending').length}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">Laboratory Workload</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100">{labWorkload}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">Pharmacy Workload</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100">{stockItems.length}</p>
          </div>
        </div>
      </Card>

      {/* Department Performance */}
      <Card>
        <h3 className="mb-4 text-lg font-semibold text-slate-100">Department Overview</h3>
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">Pending</th>
                <th className="px-4 py-3 font-medium">Completed Today</th>
                <th className="px-4 py-3 font-medium">Critical</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {departmentStats.map((dept) => (
                <tr key={dept.name} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-medium text-slate-100">{dept.name}</td>
                  <td className="px-4 py-3 text-slate-300">{dept.pending}</td>
                  <td className="px-4 py-3 text-slate-300">{dept.completed}</td>
                  <td className="px-4 py-3">
                    {dept.critical > 0 ? (
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${priorityBadge('emergency')}`}>
                        {dept.critical}
                      </span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Clinical Statistics */}
      <Card>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold text-slate-100">Clinical Statistics</h3>
          <div className="flex rounded-lg border border-slate-700 bg-slate-900 p-1">
            {(['today', 'week', 'month', 'year'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  period === p ? 'bg-slate-800 text-slate-100 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {p === 'today' ? 'Today' : p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : 'This Year'}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">Total Patients</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100">{clinicalStats.total}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">New This Period</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100">{clinicalStats.newToday}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">Male / Female</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100">{clinicalStats.males} / {clinicalStats.females}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">Consultations</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100">{clinicalStats.consultations}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">Admissions</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100">{clinicalStats.admissions}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">Age 0-5</p>
            <p className="mt-1 text-xl font-semibold text-slate-100">{clinicalStats.ageGroups['0-5']}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">Age 6-17</p>
            <p className="mt-1 text-xl font-semibold text-slate-100">{clinicalStats.ageGroups['6-17']}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">Age 18-35</p>
            <p className="mt-1 text-xl font-semibold text-slate-100">{clinicalStats.ageGroups['18-35']}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">Age 36-59</p>
            <p className="mt-1 text-xl font-semibold text-slate-100">{clinicalStats.ageGroups['36-59']}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">Age 60+</p>
            <p className="mt-1 text-xl font-semibold text-slate-100">{clinicalStats.ageGroups['60+']}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">Discharges</p>
            <p className="mt-1 text-xl font-semibold text-slate-100">{clinicalStats.discharges}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">Referrals</p>
            <p className="mt-1 text-xl font-semibold text-slate-100">{clinicalStats.referrals}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">Emergency</p>
            <p className="mt-1 text-xl font-semibold text-slate-100">{clinicalStats.emergency}</p>
          </div>
        </div>
      </Card>

      {/* Monthly Health Reporting */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-100">Monthly Statistics</h3>
          <button onClick={() => navigate('/reports')} className="text-sm text-cyan-400 hover:text-cyan-300">
            View Full Reports
          </button>
        </div>
        {monthlyStatsData ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
              <p className="text-sm text-slate-400">Patients Treated</p>
              <p className="mt-1 text-2xl font-semibold text-slate-100">{monthlyStatsData.total_patients}</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
              <p className="text-sm text-slate-400">Admissions</p>
              <p className="mt-1 text-2xl font-semibold text-slate-100">{monthlyStatsData.admissions}</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
              <p className="text-sm text-slate-400">Discharges</p>
              <p className="mt-1 text-2xl font-semibold text-slate-100">{monthlyStatsData.discharges}</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
              <p className="text-sm text-slate-400">Laboratory Tests</p>
              <p className="mt-1 text-2xl font-semibold text-slate-100">{monthlyStatsData.lab_tests}</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
              <p className="text-sm text-slate-400">Prescriptions</p>
              <p className="mt-1 text-2xl font-semibold text-slate-100">{monthlyStatsData.prescriptions}</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
              <p className="text-sm text-slate-400">Referrals</p>
              <p className="mt-1 text-2xl font-semibold text-slate-100">{monthlyStatsData.referrals}</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
              <p className="text-sm text-slate-400">NHIS Revenue</p>
              <p className="mt-1 text-2xl font-semibold text-slate-100">{fmtGHS(monthlyStatsData.nhis_revenue)}</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
              <p className="text-sm text-slate-400">Private Insurance</p>
              <p className="mt-1 text-2xl font-semibold text-slate-100">{fmtGHS(monthlyStatsData.private_insurance_revenue)}</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
              <p className="text-sm text-slate-400">Cash Revenue</p>
              <p className="mt-1 text-2xl font-semibold text-slate-100">{fmtGHS(monthlyStatsData.cash_revenue)}</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
              <p className="text-sm text-slate-400">Outstanding</p>
              <p className="mt-1 text-2xl font-semibold text-slate-100">{fmtGHS(monthlyStatsData.outstanding)}</p>
            </div>
          </div>
        ) : (
          <EmptyBox message="No monthly statistics available. Generate reports to see data here." />
        )}
      </Card>

      {/* Finance Overview */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-100">Financial Overview</h3>
          <button onClick={() => navigate('/billing')} className="text-sm text-cyan-400 hover:text-cyan-300">
            View Financial Reports
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">Today's Revenue</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-300">{fmtGHS(todayRevenue)}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">Outstanding Bills</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100">{bills.filter((b: any) => b.status === 'pending' || b.status === 'partial').length}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">Payments Received</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100">{todayPayments.length}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">Insurance Payments</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100">{nhisRecords.length + privateInsurance.length}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">NHIS Claims</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100">{nhisRecords.length}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">Private Insurance</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100">{privateInsurance.length}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">Uninsured Patients</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100">{uninsuredPatients}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">Pending Payments</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100">{bills.filter((b: any) => b.status === 'pending').length}</p>
          </div>
        </div>
      </Card>

      {/* Insurance & NHIS */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-100">Insurance Overview</h3>
          <button onClick={() => navigate('/insurance')} className="text-sm text-cyan-400 hover:text-cyan-300">
            Manage Insurance
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">Insured Patients</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100">{insuranceClaims}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">Uninsured Patients</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100">{uninsuredPatients}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">NHIS Patients</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100">{nhisRecords.length}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">Private Insurance</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100">{privateInsurance.length}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">Insurance Companies</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100">{insuranceCompanies.length}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">Pending Records</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100">{privateInsurance.filter((r: any) => new Date(r.expiry_date) < new Date()).length}</p>
          </div>
        </div>
      </Card>

      {/* Ward & Bed Status */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-100">Ward & Bed Status</h3>
          <button onClick={() => navigate('/inpatient')} className="text-sm text-cyan-400 hover:text-cyan-300">
            View Wards
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">Total Beds</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100">{totalBeds}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">Occupied</p>
            <p className="mt-1 text-2xl font-semibold text-red-300">{occupiedBeds}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">Available</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-300">{availableBeds}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">Reserved</p>
            <p className="mt-1 text-2xl font-semibold text-amber-300">{reservedBeds}</p>
          </div>
        </div>
        {wardStats.length > 0 && (
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900 text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Ward</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Occupied</th>
                  <th className="px-4 py-3 font-medium">Available</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {wardStats.map((w) => (
                  <tr key={w.name} className="hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-medium text-slate-100">{w.name}</td>
                    <td className="px-4 py-3 text-slate-300">{w.total}</td>
                    <td className="px-4 py-3 text-red-300">{w.occupied}</td>
                    <td className="px-4 py-3 text-emerald-300">{w.available}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Staff & Users */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-100">Staff & Users</h3>
          <button onClick={() => navigate('/security')} className="text-sm text-cyan-400 hover:text-cyan-300">
            Manage Users
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">Doctors</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100">{users.filter((u) => u.role === 'doctor').length}</p>
            <p className="text-xs text-slate-500">{users.filter((u) => u.role === 'doctor' && u.is_active).length} active</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">Nurses</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100">{users.filter((u) => u.role === 'nurse').length}</p>
            <p className="text-xs text-slate-500">{users.filter((u) => u.role === 'nurse' && u.is_active).length} active</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">Lab Technicians</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100">{users.filter((u) => u.role === 'lab_technician').length}</p>
            <p className="text-xs text-slate-500">{users.filter((u) => u.role === 'lab_technician' && u.is_active).length} active</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">Pharmacists</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100">{users.filter((u) => u.role === 'pharmacist').length}</p>
            <p className="text-xs text-slate-500">{users.filter((u) => u.role === 'pharmacist' && u.is_active).length} active</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">Receptionists</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100">{users.filter((u) => u.role === 'receptionist').length}</p>
            <p className="text-xs text-slate-500">{users.filter((u) => u.role === 'receptionist' && u.is_active).length} active</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">Administrators</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100">{users.filter((u) => u.role === 'administrator').length}</p>
            <p className="text-xs text-slate-500">{users.filter((u) => u.role === 'administrator' && u.is_active).length} active</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">Disabled Accounts</p>
            <p className="mt-1 text-2xl font-semibold text-red-300">{users.filter((u) => !u.is_active).length}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">Total Users</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100">{users.length}</p>
          </div>
        </div>
      </Card>

      {/* Alerts & Notifications */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-100">Alerts & Notifications</h3>
          <span className="text-sm text-slate-400">{unreadNotifications} unread</span>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <h4 className="mb-2 text-sm font-medium text-slate-500 uppercase tracking-wider">System Alerts</h4>
            <div className="space-y-2">
              {unresolvedAlerts > 0 && (
                <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                  <AlertTriangle size={20} className="text-amber-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-100">{unresolvedAlerts} unresolved data quality alerts</p>
                    <button onClick={() => navigate('/data-quality')} className="text-xs text-cyan-400 hover:text-cyan-300">Review</button>
                  </div>
                </div>
              )}
              {emergencyCases > 0 && (
                <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                  <AlertTriangle size={20} className="text-red-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-100">{emergencyCases} emergency case{emergencyCases !== 1 ? 's' : ''}</p>
                    <button onClick={() => navigate('/encounters')} className="text-xs text-cyan-400 hover:text-cyan-300">View</button>
                  </div>
                </div>
              )}
              {lowStock > 0 && (
                <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                  <Package size={20} className="text-red-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-100">{lowStock} low stock items</p>
                    <button onClick={() => navigate('/stock')} className="text-xs text-cyan-400 hover:text-cyan-300">Review Stock</button>
                  </div>
                </div>
              )}
              {pendingLabResults > 0 && (
                <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                  <TestTube size={20} className="text-amber-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-100">{pendingLabResults} pending lab results</p>
                    <button onClick={() => navigate('/labs')} className="text-xs text-cyan-400 hover:text-cyan-300">View Labs</button>
                  </div>
                </div>
              )}
              {unresolvedAlerts === 0 && emergencyCases === 0 && lowStock === 0 && pendingLabResults === 0 && (
                <EmptyBox message="No active alerts." />
              )}
            </div>
          </div>
          <div>
            <h4 className="mb-2 text-sm font-medium text-slate-500 uppercase tracking-wider">Recent Notifications</h4>
            <div className="space-y-2">
              {notifications.length === 0 ? (
                <EmptyBox message="No notifications." />
              ) : (
                notifications.slice(0, 5).map((n) => (
                  <div key={n.id} className={`flex items-start gap-3 rounded-lg border p-3 ${n.is_read ? 'border-slate-800 bg-slate-900/50' : 'border-cyan-500/30 bg-cyan-500/10'}`}>
                    <div className="rounded-full bg-slate-800 p-2 text-slate-400">
                      <AlertTriangle size={16} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-100">{n.title}</p>
                      <p className="text-xs text-slate-400">{n.message}</p>
                      <p className="text-xs text-slate-500">{(n.created_at || '').slice(0, 16)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Data Quality */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-100">Data Quality</h3>
          <button onClick={() => navigate('/data-quality')} className="text-sm text-cyan-400 hover:text-cyan-300">
            Review Data Quality
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">Missing Patient Info</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100">{alerts.filter((a) => a.title?.toLowerCase().includes('patient')).length}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">Duplicate Records</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100">{alerts.filter((a) => a.title?.toLowerCase().includes('duplicate')).length}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">Invalid Records</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100">{alerts.filter((a) => a.title?.toLowerCase().includes('invalid')).length}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">Unresolved Alerts</p>
            <p className="mt-1 text-2xl font-semibold text-amber-300">{unresolvedAlerts}</p>
          </div>
        </div>
      </Card>

      {/* Security & Audit */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-100">Security & Audit</h3>
          <button onClick={() => navigate('/security')} className="text-sm text-cyan-400 hover:text-cyan-300">
            View Audit Logs
          </button>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <h4 className="mb-2 text-sm font-medium text-slate-500 uppercase tracking-wider">Recent Audit Events</h4>
            {auditLogs.length === 0 ? (
              <EmptyBox message="No audit logs available." />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-900 text-slate-400">
                    <tr>
                      <th className="px-4 py-3 font-medium">User</th>
                      <th className="px-4 py-3 font-medium">Action</th>
                      <th className="px-4 py-3 font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {auditLogs.slice(0, 10).map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/40">
                        <td className="px-4 py-3 text-slate-300">{log.user_name || '—'}</td>
                        <td className="px-4 py-3 text-slate-300">{log.action}</td>
                        <td className="px-4 py-3 text-slate-500">{(log.timestamp || '').slice(0, 16)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div>
            <h4 className="mb-2 text-sm font-medium text-slate-500 uppercase tracking-wider">User Activity Summary</h4>
            <div className="space-y-2">
              <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
                <p className="text-sm text-slate-400">Active Users</p>
                <p className="text-xl font-semibold text-slate-100">{users.filter((u) => u.is_active).length}</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
                <p className="text-sm text-slate-400">Disabled Accounts</p>
                <p className="text-xl font-semibold text-red-300">{users.filter((u) => !u.is_active).length}</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
                <p className="text-sm text-slate-400">Total Roles</p>
                <p className="text-xl font-semibold text-slate-100">{new Set(users.map((u) => u.role)).size}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Recent Hospital Activity */}
      <Card>
        <h3 className="mb-4 text-lg font-semibold text-slate-100">Recent Hospital Activity</h3>
        {recentActivity.length === 0 ? (
          <EmptyBox message="No recent activity." />
        ) : (
          <div className="relative ml-4 border-l border-slate-800 pl-6">
            {recentActivity.map((ev) => (
              <div key={ev.id} className="mb-6 last:mb-0">
                <div
                  className={`-ml-2 mb-2 h-2.5 w-2.5 rounded-full border-2 border-slate-900 ${
                    TIMELINE_COLORS[ev.event_type] || 'bg-slate-400'
                  }`}
                />
                <div className="text-sm">
                  <span className="font-medium text-slate-100">{ev.title}</span>
                  {ev.description && <p className="mt-1 text-slate-300">{ev.description}</p>}
                  <div className="mt-1 text-xs text-slate-500">
                    {(ev.occurred_at || '').slice(0, 16)} · {ev.patient_full_name || 'General'} · By {ev.created_by_username || '—'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Quick Actions */}
      <Card>
        <h3 className="mb-4 text-lg font-semibold text-slate-100">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <button onClick={() => navigate('/patients')} className="flex flex-col items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 p-4 hover:bg-slate-800 transition-colors">
            <Users size={24} className="text-cyan-400" />
            <span className="text-sm font-medium text-slate-300">Register Patient</span>
          </button>
          <button onClick={() => navigate('/security')} className="flex flex-col items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 p-4 hover:bg-slate-800 transition-colors">
            <User size={24} className="text-blue-400" />
            <span className="text-sm font-medium text-slate-300">Create User</span>
          </button>
          <button onClick={() => navigate('/reports')} className="flex flex-col items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 p-4 hover:bg-slate-800 transition-colors">
            <FileBarChart size={24} className="text-emerald-400" />
            <span className="text-sm font-medium text-slate-300">View Reports</span>
          </button>
          <button onClick={() => navigate('/reports')} className="flex flex-col items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 p-4 hover:bg-slate-800 transition-colors">
            <BarChart3 size={24} className="text-purple-400" />
            <span className="text-sm font-medium text-slate-300">Generate Monthly Report</span>
          </button>
          <button onClick={() => navigate('/insurance')} className="flex flex-col items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 p-4 hover:bg-slate-800 transition-colors">
            <Wallet size={24} className="text-orange-400" />
            <span className="text-sm font-medium text-slate-300">Manage Insurance</span>
          </button>
          <button onClick={() => navigate('/billing')} className="flex flex-col items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 p-4 hover:bg-slate-800 transition-colors">
            <CreditCard size={24} className="text-green-400" />
            <span className="text-sm font-medium text-slate-300">View Billing</span>
          </button>
          <button onClick={() => navigate('/inpatient')} className="flex flex-col items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 p-4 hover:bg-slate-800 transition-colors">
            <Bed size={24} className="text-rose-400" />
            <span className="text-sm font-medium text-slate-300">View Admissions</span>
          </button>
          <button onClick={() => navigate('/data-quality')} className="flex flex-col items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 p-4 hover:bg-slate-800 transition-colors">
            <ClipboardCheck size={24} className="text-amber-400" />
            <span className="text-sm font-medium text-slate-300">Review Data Quality</span>
          </button>
          <button onClick={() => navigate('/security')} className="flex flex-col items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 p-4 hover:bg-slate-800 transition-colors">
            <Shield size={24} className="text-red-400" />
            <span className="text-sm font-medium text-slate-300">View Audit Logs</span>
          </button>
          <button onClick={() => navigate('/report-templates')} className="flex flex-col items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 p-4 hover:bg-slate-800 transition-colors">
            <FileText size={24} className="text-indigo-400" />
            <span className="text-sm font-medium text-slate-300">Manage Report Templates</span>
          </button>
          <button onClick={() => navigate('/schedule-manager')} className="flex flex-col items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 p-4 hover:bg-slate-800 transition-colors">
            <Calendar size={24} className="text-pink-400" />
            <span className="text-sm font-medium text-slate-300">Schedule Report</span>
          </button>
        </div>
      </Card>

      <SyncStatusBar />
    </div>
  );
}
