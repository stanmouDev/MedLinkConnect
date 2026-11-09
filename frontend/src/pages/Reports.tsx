import { useEffect, useState } from 'react';
import { query, onSyncChange } from '../offline/data';
import { api, ensureOnline } from '../api';
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
  label?: string;
  total_patients: number;
  male_patients: number;
  female_patients: number;
  other_patients?: number;
  age_0_5?: number;
  age_6_17?: number;
  age_18_35?: number;
  age_36_59?: number;
  age_60_plus?: number;
  admissions: number;
  discharges: number;
  referrals: number;
  surgeries: number;
  deaths: number;
  deliveries: number;
  lab_tests: number;
  prescriptions: number;
  total_revenue: number;
  nhis_revenue: number;
  private_insurance_revenue: number;
  cash_revenue: number;
  outstanding: number;
};

type DiseaseOutbreak = {
  id: number;
  month: string;
  disease: string;
  cases: number;
  deaths?: number;
  status?: string;
  alert_level?: string;
};

type Bill = {
  id: number;
  total_amount: number | string;
  status: string;
};

type Payment = {
  id: number;
  bill: number;
  payment_method: string;
  amount: number | string;
  paid_at: string;
};

type NHISRecord = {
  id: number;
  patient_full_name?: string;
  patient_patient_id?: string;
  nhis_number: string;
  membership_status: string;
};

const DISEASES = [
  'malaria',
  'typhoid',
  'hypertension',
  'diabetes',
  'pneumonia',
  'tuberculosis',
  'pregnancy-related',
];

const TABS = [
  { key: 'monthly', label: 'Monthly Statistics' },
  { key: 'disease', label: 'Disease Surveillance' },
  { key: 'financial', label: 'Financial Summary' },
  { key: 'nhis', label: 'NHIS Claims' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

function fmt(n: number | string | undefined): string {
  const v = Number(n || 0);
  return v.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

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

function StatCard({ label, value, accent }: { label: string; value: React.ReactNode; accent?: string }) {
  return (
    <Card>
      <p className="text-sm text-slate-400">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${accent || 'text-cyan-300'}`}>{value}</p>
    </Card>
  );
}

export default function Reports() {
  const role = localStorage.getItem('medlink_user_role') || '';
  const canViewDetails = role === 'administrator';

  const [tab, setTab] = useState<TabKey>('monthly');
  const [monthly, setMonthly] = useState<MonthlyStat[]>([]);
  const [outbreaks, setOutbreaks] = useState<DiseaseOutbreak[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [nhis, setNhis] = useState<NHISRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function load() {
    setLoading(true);
    setError('');
    Promise.all([
      query('monthly-statistics'),
      query('disease-outbreaks'),
      query('bills'),
      query('payments'),
      query('nhis-records'),
    ])
      .then(([m, o, b, p, n]: [any, any, any, any, any]) => {
        setMonthly(Array.isArray(m) ? m : m.results || []);
        setOutbreaks(Array.isArray(o) ? o : o.results || []);
        setBills(Array.isArray(b) ? b : b.results || []);
        setPayments(Array.isArray(p) ? p : p.results || []);
        setNhis(Array.isArray(n) ? n : n.results || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  async function syncFromServer() {
    setError('');
    try {
      ensureOnline();
      await Promise.all([
        api.list('monthly-statistics'),
        api.list('disease-outbreaks'),
        api.list('bills'),
        api.list('payments'),
        api.list('nhis-records'),
      ]);
      load();
    } catch (e) {
      setError((e as Error).message || 'Could not sync reports from server.');
    }
  }

  useEffect(() => {
    load();
    const unsub = onSyncChange(() => load());
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sortedMonthly = [...monthly].sort((a, b) =>
    String(b.month || '').localeCompare(String(a.month || '')),
  );
  const latest = sortedMonthly[0];

  const diseaseTotals: Record<string, number> = {};
  DISEASES.forEach((d) => (diseaseTotals[d] = 0));
  outbreaks.forEach((o) => {
    const key = (o.disease || '').toLowerCase();
    if (key in diseaseTotals) diseaseTotals[key] += Number(o.cases || 0);
    else diseaseTotals[key] = (diseaseTotals[key] || 0) + Number(o.cases || 0);
  });
  const maxDisease = Math.max(1, ...DISEASES.map((d) => diseaseTotals[d]));

  const alertOutbreaks = outbreaks.filter(
    (o) =>
      o.status === 'ongoing' ||
      o.alert_level === 'high' ||
      o.alert_level === 'critical',
  );

  function paidFor(billId: number): number {
    return payments
      .filter((p) => p.bill === billId)
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }
  const totalOutstanding = bills
    .filter((b) => b.status !== 'paid' && b.status !== 'cancelled')
    .reduce((sum, b) => sum + Math.max(0, Number(b.total_amount || 0) - paidFor(b.id)), 0);

  const revenueByMethod: Record<string, number> = {};
  payments.forEach((p) => {
    const k = p.payment_method || 'other';
    revenueByMethod[k] = (revenueByMethod[k] || 0) + Number(p.amount || 0);
  });

  const revenueByDept: Record<string, number> = {};
  bills.forEach((b: any) => {
    const k = b.bill_type || 'other';
    revenueByDept[k] = (revenueByDept[k] || 0) + Number(b.total_amount || 0);
  });

  const totalNhisRevenue = sortedMonthly.reduce(
    (sum, m) => sum + Number(m.nhis_revenue || 0),
    0,
  );
  const nhisApproved = nhis.filter((r) => r.membership_status === 'active').length;
  const nhisPending = nhis.filter((r) => r.membership_status === 'pending').length;
  const nhisRejected = nhis.filter(
    (r) => r.membership_status === 'expired' || r.membership_status === 'inactive',
  ).length;

  if (loading) return <LoadingBox />;
  if (error) return <ErrorBox message={error} />;

  function Restricted() {
    return (
      <Card>
        <h2 className="mb-2 text-lg font-semibold text-red-300">Restricted</h2>
        <p className="text-sm text-slate-300">
          Detailed reports are restricted to administrators. Contact an administrator for
          full statistics, surveillance, and claims data.
        </p>
        {latest && (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <StatCard label="Total Patients (latest)" value={latest.total_patients} />
            <StatCard label="Admissions" value={latest.admissions} accent="text-emerald-300" />
            <StatCard label="NHIS Revenue" value={fmt(totalNhisRevenue)} accent="text-amber-300" />
          </div>
        )}
      </Card>
    );
  }

  function renderMonthly() {
    if (!latest) return <EmptyBox message="No monthly statistics available yet." />;
    return (
      <div className="space-y-6">
        <Card>
          <h2 className="mb-4 text-lg font-semibold">
            Patient Demographics — {monthLabel(latest.month)}
          </h2>
          <div className="mb-4 grid gap-4 sm:grid-cols-3">
            <StatCard label="Total Patients" value={latest.total_patients} />
            <StatCard label="Male" value={latest.male_patients} accent="text-blue-300" />
            <StatCard label="Female" value={latest.female_patients} accent="text-pink-300" />
          </div>
          <Table columns={['Age Group', 'Patients', 'Share']}>
            {[
              ['0–5', latest.age_0_5 || 0],
              ['6–17', latest.age_6_17 || 0],
              ['18–35', latest.age_18_35 || 0],
              ['36–59', latest.age_36_59 || 0],
              ['60+', latest.age_60_plus || 0],
            ].map(([grp, val]) => {
              const v = Number(val);
              const share = latest.total_patients
                ? ((v / Number(latest.total_patients)) * 100).toFixed(1)
                : '0.0';
              return (
                <tr key={grp}>
                  <td className="px-4 py-3">{grp}</td>
                  <td className="px-4 py-3">{v}</td>
                  <td className="px-4 py-3 text-slate-400">{share}%</td>
                </tr>
              );
            })}
          </Table>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold">Clinical Activity</h2>
          <Table columns={['Activity', 'Count']}>
            {[
              ['Admissions', latest.admissions],
              ['Discharges', latest.discharges],
              ['Referrals', latest.referrals],
              ['Surgeries', latest.surgeries],
              ['Deaths', latest.deaths],
              ['Deliveries', latest.deliveries],
              ['Lab Tests', latest.lab_tests],
              ['Prescriptions', latest.prescriptions],
            ].map(([k, v]) => (
              <tr key={k}>
                <td className="px-4 py-3 capitalize">{k}</td>
                <td className="px-4 py-3">{Number(v)}</td>
              </tr>
            ))}
          </Table>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold">Financial Summary</h2>
          <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard label="Total" value={fmt(latest.total_revenue)} />
            <StatCard label="NHIS" value={fmt(latest.nhis_revenue)} accent="text-amber-300" />
            <StatCard
              label="Private Insurance"
              value={fmt(latest.private_insurance_revenue)}
              accent="text-purple-300"
            />
            <StatCard label="Cash" value={fmt(latest.cash_revenue)} accent="text-emerald-300" />
            <StatCard label="Outstanding" value={fmt(latest.outstanding)} accent="text-red-300" />
          </div>
        </Card>

        {sortedMonthly.length > 1 && (
          <Card>
            <h2 className="mb-4 text-lg font-semibold">Historical Months</h2>
            <Table columns={['Month', 'Patients', 'Admissions', 'Revenue']}>
              {sortedMonthly.slice(1).map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-3">{monthLabel(m.month)}</td>
                  <td className="px-4 py-3">{m.total_patients}</td>
                  <td className="px-4 py-3">{m.admissions}</td>
                  <td className="px-4 py-3">{fmt(m.total_revenue)}</td>
                </tr>
              ))}
            </Table>
          </Card>
        )}
      </div>
    );
  }

  function renderDisease() {
    if (!outbreaks.length) return <EmptyBox message="No disease surveillance data available yet." />;
    return (
      <div className="space-y-6">
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Case Counts by Disease</h2>
          <div className="space-y-3">
            {DISEASES.map((d) => {
              const count = diseaseTotals[d] || 0;
              const pct = Math.round((count / maxDisease) * 100);
              return (
                <div key={d}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="capitalize text-slate-200">{d.replace('-', ' ')}</span>
                    <span className="text-slate-400">{count}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-800">
                    <div
                      className="h-2 rounded-full bg-cyan-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {alertOutbreaks.length > 0 && (
          <Card className="border-red-500/40 bg-red-500/5">
            <h2 className="mb-4 text-lg font-semibold text-red-300">Outbreak Alerts</h2>
            <Table columns={['Disease', 'Month', 'Cases', 'Deaths', 'Status', 'Alert']}>
              {alertOutbreaks.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-3 capitalize">{(o.disease || '').replace('-', ' ')}</td>
                  <td className="px-4 py-3">{monthLabel(o.month)}</td>
                  <td className="px-4 py-3">{o.cases}</td>
                  <td className="px-4 py-3 text-red-300">{o.deaths || 0}</td>
                  <td className="px-4 py-3 capitalize">{o.status || '—'}</td>
                  <td className="px-4 py-3 capitalize text-amber-300">{o.alert_level || '—'}</td>
                </tr>
              ))}
            </Table>
          </Card>
        )}

        <Card>
          <h2 className="mb-4 text-lg font-semibold">Reported Outbreaks</h2>
          <Table columns={['Disease', 'Month', 'Cases', 'Deaths', 'Status', 'Alert']}>
            {outbreaks.map((o) => (
              <tr key={o.id}>
                <td className="px-4 py-3 capitalize">{(o.disease || '').replace('-', ' ')}</td>
                <td className="px-4 py-3">{monthLabel(o.month)}</td>
                <td className="px-4 py-3">{o.cases}</td>
                <td className="px-4 py-3">{o.deaths || 0}</td>
                <td className="px-4 py-3 capitalize">{o.status || '—'}</td>
                <td className="px-4 py-3 capitalize">{o.alert_level || '—'}</td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
    );
  }

  function renderFinancial() {
    const monthRevenue = sortedMonthly.map((m) => ({
      month: monthLabel(m.month),
      revenue: Number(m.total_revenue || 0),
    }));
    const dayRevenue: Record<string, number> = {};
    payments.forEach((p) => {
      const day = (p.paid_at || '').slice(0, 10);
      if (day) dayRevenue[day] = (dayRevenue[day] || 0) + Number(p.amount || 0);
    });
    const recentDays = Object.entries(dayRevenue)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 7);

    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Billed" value={fmt(bills.reduce((s, b) => s + Number(b.total_amount || 0), 0))} />
          <StatCard
            label="Total Collected"
            value={fmt(payments.reduce((s, p) => s + Number(p.amount || 0), 0))}
            accent="text-emerald-300"
          />
          <StatCard label="Outstanding" value={fmt(totalOutstanding)} accent="text-red-300" />
          <StatCard label="NHIS Revenue" value={fmt(totalNhisRevenue)} accent="text-amber-300" />
        </div>

        <Card>
          <h2 className="mb-4 text-lg font-semibold">Daily Income (last 7 days)</h2>
          {recentDays.length === 0 ? (
            <EmptyBox message="No payments recorded yet." />
          ) : (
            <Table columns={['Date', 'Income']}>
              {recentDays.map(([day, amt]) => (
                <tr key={day}>
                  <td className="px-4 py-3">{day}</td>
                  <td className="px-4 py-3 text-emerald-300">{fmt(amt)}</td>
                </tr>
              ))}
            </Table>
          )}
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="mb-4 text-lg font-semibold">Revenue by Department</h2>
            {Object.keys(revenueByDept).length === 0 ? (
              <EmptyBox message="No billing data yet." />
            ) : (
              <Table columns={['Department', 'Revenue']}>
                {Object.entries(revenueByDept).map(([k, v]) => (
                  <tr key={k}>
                    <td className="px-4 py-3 capitalize">{k.replace('_', ' ')}</td>
                    <td className="px-4 py-3">{fmt(v)}</td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>

          <Card>
            <h2 className="mb-4 text-lg font-semibold">Revenue by Payment Method</h2>
            {Object.keys(revenueByMethod).length === 0 ? (
              <EmptyBox message="No payments recorded yet." />
            ) : (
              <Table columns={['Method', 'Amount']}>
                {Object.entries(revenueByMethod).map(([k, v]) => (
                  <tr key={k}>
                    <td className="px-4 py-3 capitalize">{k.replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-emerald-300">{fmt(v)}</td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        </div>

        {monthRevenue.length > 0 && (
          <Card>
            <h2 className="mb-4 text-lg font-semibold">Monthly Income</h2>
            <Table columns={['Month', 'Revenue']}>
              {monthRevenue.map((m, i) => (
                <tr key={i}>
                  <td className="px-4 py-3">{m.month}</td>
                  <td className="px-4 py-3">{fmt(m.revenue)}</td>
                </tr>
              ))}
            </Table>
          </Card>
        )}
      </div>
    );
  }

  function renderNHIS() {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Claims" value={nhis.length} />
          <StatCard label="Approved" value={nhisApproved} accent="text-emerald-300" />
          <StatCard label="Pending" value={nhisPending} accent="text-amber-300" />
          <StatCard label="Rejected" value={nhisRejected} accent="text-red-300" />
        </div>

        <Card>
          <h2 className="mb-4 text-lg font-semibold">Claims Summary</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard label="NHIS Revenue (all months)" value={fmt(totalNhisRevenue)} accent="text-amber-300" />
            <StatCard
              label="Approval Rate"
              value={nhis.length ? `${((nhisApproved / nhis.length) * 100).toFixed(0)}%` : '—'}
              accent="text-emerald-300"
            />
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold">NHIS Records</h2>
          {nhis.length === 0 ? (
            <EmptyBox message="No NHIS records available yet." />
          ) : (
            <Table columns={['Patient', 'NHIS Number', 'Status', 'Claim State']}>
              {nhis.map((r) => {
                const state =
                  r.membership_status === 'active'
                    ? 'Approved'
                    : r.membership_status === 'pending'
                    ? 'Pending'
                    : 'Rejected';
                const accent =
                  state === 'Approved'
                    ? 'text-emerald-300'
                    : state === 'Pending'
                    ? 'text-amber-300'
                    : 'text-red-300';
                return (
                  <tr key={r.id}>
                    <td className="px-4 py-3">{r.patient_full_name || r.patient_patient_id || r.id}</td>
                    <td className="px-4 py-3">{r.nhis_number || '—'}</td>
                    <td className="px-4 py-3 capitalize">{r.membership_status}</td>
                    <td className={`px-4 py-3 ${accent}`}>{state}</td>
                  </tr>
                );
              })}
            </Table>
          )}
        </Card>
      </div>
    );
  }

  function renderTab() {
    if (!canViewDetails) return <Restricted />;
    if (tab === 'monthly') return renderMonthly();
    if (tab === 'disease') return renderDisease();
    if (tab === 'financial') return renderFinancial();
    return renderNHIS();
  }

  return (
    <div>
      <PageHeader
        title="Reports & Statistics"
        subtitle="Hospital analytics and surveillance"
        action={
          <button
            onClick={syncFromServer}
            className="rounded-full border border-cyan-400 px-4 py-2 font-medium text-cyan-300"
          >
            Sync from Server
          </button>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-800">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium ${
              tab === t.key
                ? 'border-b-2 border-cyan-400 text-cyan-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {renderTab()}
    </div>
  );
}
