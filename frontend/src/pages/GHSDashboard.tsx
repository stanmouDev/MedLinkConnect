import { useEffect, useState } from 'react';
import { query, onSyncChange } from '../offline/data';
import {
  Card,
  ErrorBox,
  LoadingBox,
  EmptyBox,
  Table,
  PageHeader,
} from '../components/ui';

type MonthlyStat = {
  id: number;
  month: string;
  total_patients: number;
  new_patients?: number;
  admissions: number;
  discharges: number;
};

type ReportInstance = {
  id: number;
  title?: string;
  report_type?: string;
  template?: number | string;
  template_name?: string;
  hospital?: number | string;
  hospital_name?: string;
  period_start?: string;
  period_end?: string;
  status: string;
  deadline?: string;
  submitted_at?: string;
  created_at?: string;
};

type DataQualityAlert = {
  id: number;
  severity?: string;
  alert_type?: string;
  description?: string;
  status?: string;
};

type PublicHealthAlert = {
  id: number;
  severity?: string;
  alert_type?: string;
  title?: string;
  status?: string;
};

const VIEW_ROLES = [
  'administrator',
  'doctor',
  'nurse',
  'lab_technician',
  'pharmacist',
  'receptionist',
];

function monthLabel(month?: string): string {
  if (!month) return '—';
  const [y, m] = month.split('-');
  const names = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const idx = Number(m) - 1;
  return `${names[idx] || m} ${y}`;
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

function SeverityPill({ level }: { level?: string }) {
  const lc = (level || '').toLowerCase();
  const cls =
    lc === 'critical' || lc === 'high'
      ? 'border-red-500/40 bg-red-500/10 text-red-300'
      : lc === 'medium'
      ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
      : 'border-slate-700 bg-slate-800 text-slate-300';
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs capitalize ${cls}`}>
      {level || '—'}
    </span>
  );
}

export default function GHSDashboard() {
  const role = localStorage.getItem('medlink_user_role') || '';
  const canView = VIEW_ROLES.includes(role);

  const [monthly, setMonthly] = useState<MonthlyStat[]>([]);
  const [reports, setReports] = useState<ReportInstance[]>([]);
  const [dqAlerts, setDqAlerts] = useState<DataQualityAlert[]>([]);
  const [phAlerts, setPhAlerts] = useState<PublicHealthAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function load() {
    setLoading(true);
    setError('');
    Promise.all([
      query('monthly-statistics'),
      query('report-instances'),
      query('data-quality-alerts'),
      query('public-health-alerts'),
    ])
      .then(([m, r, dq, ph]: [any, any, any, any]) => {
        setMonthly(Array.isArray(m) ? m : m.results || []);
        setReports(Array.isArray(r) ? r : r.results || []);
        setDqAlerts(Array.isArray(dq) ? dq : dq.results || []);
        setPhAlerts(Array.isArray(ph) ? ph : ph.results || []);
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

  if (!canView) {
    return (
      <div>
        <PageHeader title="GHS Reporting Dashboard" />
        <Card>
          <h2 className="mb-2 text-lg font-semibold text-red-300">Restricted</h2>
          <p className="text-sm text-slate-300">
            You do not have permission to view the GHS Reporting Dashboard. Access is
            limited to clinical and administrative staff.
          </p>
        </Card>
      </div>
    );
  }

  if (loading) return <LoadingBox />;
  if (error) return <ErrorBox message={error} />;

  const sortedMonthly = [...monthly].sort((a, b) =>
    String(b.month || '').localeCompare(String(a.month || '')),
  );
  const latest = sortedMonthly[0];
  const prev = sortedMonthly[1];

  const dailyAttendance = latest ? Math.round(Number(latest.total_patients) / 30) : 0;
  const weeklyAttendance = latest ? Math.round(Number(latest.total_patients) / 4) : 0;
  const monthlyAttendance = latest ? Number(latest.total_patients) : 0;
  const annualAttendance = sortedMonthly.reduce(
    (s, m) => s + Number(m.total_patients || 0),
    0,
  );

  const pendingReports = reports.filter(
    (r) => r.status === 'draft' || r.status === 'submitted',
  );
  const approvedReports = reports.filter((r) => r.status === 'approved').length;
  const rejectedReports = reports.filter((r) => r.status === 'rejected').length;

  const today = new Date().toISOString().slice(0, 10);
  const overdueReports = reports.filter(
    (r) =>
      r.deadline &&
      r.deadline.slice(0, 10) < today &&
      r.status !== 'approved' &&
      r.status !== 'rejected',
  ).length;

  const openDqAlerts = dqAlerts.filter((a) => (a.status || 'open') !== 'resolved').length;
  const openPhAlerts = phAlerts.filter((a) => (a.status || 'open') !== 'resolved').length;

  const totalPatients = latest ? Number(latest.total_patients) : 0;
  const newPatients = latest ? Number(latest.new_patients || 0) : 0;
  const admissions = latest ? Number(latest.admissions) : 0;
  const discharges = latest ? Number(latest.discharges) : 0;

  return (
    <div>
      <PageHeader
        title="GHS Reporting Dashboard"
        subtitle="National reporting, attendance and alert overview"
      />

      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">
        Patient Attendance
      </h2>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Daily (avg)" value={dailyAttendance} accent="text-cyan-300" sub="based on latest month" />
        <StatCard label="Weekly (avg)" value={weeklyAttendance} accent="text-cyan-300" sub="based on latest month" />
        <StatCard label="Monthly" value={monthlyAttendance} accent="text-emerald-300" sub={latest ? monthLabel(latest.month) : '—'} />
        <StatCard label="Annual (YTD)" value={annualAttendance} accent="text-emerald-300" sub={`${sortedMonthly.length} months`} />
      </div>

      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">
        Quick Stats
      </h2>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Patients" value={totalPatients} sub={latest ? monthLabel(latest.month) : '—'} />
        <StatCard label="New Patients" value={newPatients} accent="text-blue-300" sub={prev ? `prev ${monthLabel(prev.month)}` : '—'} />
        <StatCard label="Admissions" value={admissions} accent="text-emerald-300" />
        <StatCard label="Discharges" value={discharges} accent="text-purple-300" />
      </div>

      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">
        Reporting & Alerts
      </h2>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pending Reports" value={pendingReports.length} accent="text-amber-300" sub={`${overdueReports} overdue`} />
        <StatCard label="Approved Reports" value={approvedReports} accent="text-emerald-300" />
        <StatCard label="Data Quality Alerts" value={openDqAlerts} accent="text-red-300" sub="open" />
        <StatCard label="Public Health Alerts" value={openPhAlerts} accent="text-orange-300" sub="open" />
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Report Submission Status</h2>
          <Table columns={['Status', 'Count']}>
            {[
              ['Draft', reports.filter((r) => r.status === 'draft').length],
              ['Submitted', reports.filter((r) => r.status === 'submitted').length],
              ['Approved', approvedReports],
              ['Rejected', rejectedReports],
            ].map(([k, v]) => (
              <tr key={k as string}>
                <td className="px-4 py-3 capitalize">{(k as string).replace('_', ' ')}</td>
                <td className="px-4 py-3">{Number(v)}</td>
              </tr>
            ))}
          </Table>
        </Card>

        <Card className={overdueReports ? 'border-red-500/40 bg-red-500/5' : ''}>
          <h2 className="mb-4 text-lg font-semibold text-red-300">Report Deadlines</h2>
          {pendingReports.length === 0 ? (
            <EmptyBox message="No pending reports." />
          ) : (
            <Table columns={['Report', 'Type', 'Deadline', 'Status']}>
              {pendingReports.slice(0, 8).map((r) => {
                const overdue = r.deadline && r.deadline.slice(0, 10) < today;
                return (
                  <tr key={r.id}>
                    <td className="px-4 py-3">{r.title || r.template_name || `#${r.id}`}</td>
                    <td className="px-4 py-3 capitalize">{r.report_type || '—'}</td>
                    <td className={`px-4 py-3 ${overdue ? 'text-red-300' : 'text-slate-300'}`}>
                      {r.deadline ? r.deadline.slice(0, 10) : '—'}
                    </td>
                    <td className="px-4 py-3 capitalize">{r.status}</td>
                  </tr>
                );
              })}
            </Table>
          )}
        </Card>
      </div>

      {openPhAlerts > 0 && (
        <Card className="border-orange-500/40 bg-orange-500/5">
          <h2 className="mb-4 text-lg font-semibold text-orange-300">Public Health Alerts</h2>
          <Table columns={['Title', 'Type', 'Severity', 'Status']}>
            {phAlerts
              .filter((a) => (a.status || 'open') !== 'resolved')
              .slice(0, 8)
              .map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3">{a.title || `#${a.id}`}</td>
                  <td className="px-4 py-3 capitalize">{a.alert_type || '—'}</td>
                  <td className="px-4 py-3"><SeverityPill level={a.severity} /></td>
                  <td className="px-4 py-3 capitalize">{a.status || 'open'}</td>
                </tr>
              ))}
          </Table>
        </Card>
      )}
    </div>
  );
}
