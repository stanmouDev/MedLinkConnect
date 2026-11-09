import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { query, onSyncChange } from '../offline/data';
import WorkspaceShell from './WorkspaceShell';
import { Card, EmptyBox, Table } from '../components/ui';

type Bill = {
  id: number;
  patient: number;
  patient_full_name?: string;
  bill_type: string;
  total_amount: number | string;
  status: string;
  created_at: string;
};

type Payment = {
  id: number;
  bill: number;
  amount: number | string;
  payment_method: string;
  paid_at: string;
};

type InsuranceRecord = {
  id: number;
  patient: number;
  patient_full_name?: string;
  company_name?: string;
  membership_number: string;
  expiry_date: string;
};

export default function BillingWorkspace() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bills, setBills] = useState<Bill[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [insurance, setInsurance] = useState<InsuranceRecord[]>([]);

  function load() {
    setLoading(true);
    setError('');
    Promise.all([query('bills'), query('payments'), query('private-insurance-records')])
      .then(([b, p, ins]) => {
        setBills(Array.isArray(b) ? b : []);
        setPayments(Array.isArray(p) ? p : []);
        setInsurance(Array.isArray(ins) ? ins : []);
      })
      .catch((e) => setError(e.message || 'Failed to load data.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    const off = onSyncChange(load);
    return off;
  }, []);

  const outstanding = bills.filter((b) => b.status === 'pending' || b.status === 'partial');
  const today = new Date().toISOString().slice(0, 10);
  const todayPayments = payments.filter((p) => (p.paid_at || '').startsWith(today));
  const totalOutstanding = outstanding.reduce((sum, b) => sum + Number(b.total_amount || 0), 0);
  const totalCollected = todayPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  if (loading && bills.length === 0) return <EmptyBox message="Loading workspace..." />;
  if (error) return <div className="text-red-400">{error}</div>;

  return (
    <WorkspaceShell
      title="Billing Workspace"
      subtitle="Payments, bills, and insurance"
      actions={
        <div className="flex gap-2">
          <button onClick={() => navigate('/billing')} className="rounded-full bg-cyan-500 px-4 py-2 font-medium text-slate-950">
            Record Payment
          </button>
        </div>
      }
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-sm text-slate-400">Outstanding Bills</p>
          <p className="mt-2 text-3xl font-semibold text-amber-300">{outstanding.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-400">Total Outstanding</p>
          <p className="mt-2 text-3xl font-semibold text-red-300">{totalOutstanding.toFixed(2)}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-400">Today's Collections</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-300">{totalCollected.toFixed(2)}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-400">Insurance Records</p>
          <p className="mt-2 text-3xl font-semibold text-cyan-300">{insurance.length}</p>
        </Card>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-semibold">Outstanding Bills</h3>
          {outstanding.length === 0 ? (
            <EmptyBox message="No outstanding bills." />
          ) : (
            <Table columns={['Patient', 'Type', 'Total', 'Status']}>
              {outstanding.slice(0, 10).map((b) => (
                <tr key={b.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3">{b.patient_full_name || `#${b.patient}`}</td>
                  <td className="px-4 py-3 capitalize">{b.bill_type.replace('_', ' ')}</td>
                  <td className="px-4 py-3">{Number(b.total_amount).toFixed(2)}</td>
                  <td className="px-4 py-3">{b.status}</td>
                </tr>
              ))}
            </Table>
          )}
        </Card>

        <Card>
          <h3 className="mb-3 font-semibold">Today's Payments</h3>
          {todayPayments.length === 0 ? (
            <EmptyBox message="No payments today." />
          ) : (
            <Table columns={['Patient', 'Method', 'Amount', 'Time']}>
              {todayPayments.slice(0, 10).map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3">Bill #{p.bill}</td>
                  <td className="px-4 py-3">{p.payment_method}</td>
                  <td className="px-4 py-3">{Number(p.amount).toFixed(2)}</td>
                  <td className="px-4 py-3">{(p.paid_at || '').slice(0, 16)}</td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      </div>

      <Card>
        <h3 className="mb-3 font-semibold">Insurance Records</h3>
        {insurance.length === 0 ? (
          <EmptyBox message="No insurance records." />
        ) : (
          <Table columns={['Patient', 'Company', 'Membership #', 'Expiry']}>
            {insurance.slice(0, 10).map((ins) => (
              <tr key={ins.id} className="hover:bg-slate-800/40">
                <td className="px-4 py-3">{ins.patient_full_name || `#${ins.patient}`}</td>
                <td className="px-4 py-3">{ins.company_name || '—'}</td>
                <td className="px-4 py-3">{ins.membership_number}</td>
                <td className="px-4 py-3">{(ins.expiry_date || '').slice(0, 10)}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <div className="mt-6 flex flex-wrap gap-2">
        <button onClick={() => navigate('/billing')} className="rounded-full border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800">
          Add Bill Item
        </button>
        <button onClick={() => navigate('/insurance')} className="rounded-full border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800">
          View Insurance
        </button>
      </div>
    </WorkspaceShell>
  );
}
