import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { query, onSyncChange, create, action as offlineAction } from '../offline/data';
import {
  Card,
  ErrorBox,
  LoadingBox,
  EmptyBox,
  Table,
  PageHeader,
} from '../components/ui';

type Patient = { id: number; full_name: string; patient_id: string };
type Encounter = { id: number; patient: number; encounter_type: string; status: string };
type Hospital = { id: number; name: string };
type Bill = {
  id: number;
  patient: number;
  patient_name?: string;
  patient_patient_id?: string;
  encounter: number | null;
  hospital: number;
  hospital_name?: string;
  bill_type: string;
  total_amount: number | string;
  status: string;
  notes: string;
  created_at: string;
};
type BillItem = {
  id: number;
  bill: number;
  item_type: string;
  description: string;
  quantity: number;
  unit_price: number | string;
  total_price: number | string;
};
type Payment = {
  id: number;
  bill: number;
  payment_method: string;
  amount: number | string;
  reference_number: string;
  notes: string;
  paid_at: string;
};

const BILL_TYPE_CHOICES: [string, string][] = [
  ['consultation', 'Consultation'],
  ['laboratory', 'Laboratory'],
  ['pharmacy', 'Pharmacy'],
  ['imaging', 'Imaging'],
  ['procedure', 'Procedure'],
  ['admission', 'Admission'],
  ['surgery', 'Surgery'],
  ['emergency', 'Emergency Services'],
  ['other', 'Other'],
];

const PAYMENT_METHOD_CHOICES: [string, string][] = [
  ['cash', 'Cash'],
  ['mobile_money', 'Mobile Money'],
  ['bank_card', 'Bank Card'],
  ['bank_transfer', 'Bank Transfer'],
  ['insurance', 'Insurance'],
  ['mixed', 'Mixed Payment'],
];

const statusColors: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
  partial: 'bg-blue-500/15 text-blue-300 border border-blue-500/30',
  paid: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
  overdue: 'bg-red-500/15 text-red-300 border border-red-500/30',
  cancelled: 'bg-slate-500/15 text-slate-300 border border-slate-500/30',
};

const MANAGER_ROLES = ['administrator', 'receptionist', 'cashier'];

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm text-slate-300">
        {label}
        {required && <span className="text-cyan-400"> *</span>}
      </label>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
      />
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div>
      <label className="block text-sm text-slate-300">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
      />
    </div>
  );
}

function fmt(n: number | string | undefined): string {
  const v = Number(n || 0);
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Billing() {
  const [tab, setTab] = useState<'bills' | 'payments'>('bills');
  const [billsView, setBillsView] = useState<'list' | 'create' | 'detail'>('list');
  const [paymentsView, setPaymentsView] = useState<'list' | 'record'>('list');

  const [bills, setBills] = useState<Bill[]>([]);
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const [activeBillId, setActiveBillId] = useState<number | null>(null);

  const role = localStorage.getItem('medlink_user_role') || '';
  const canManage = MANAGER_ROLES.includes(role);

  function load() {
    setLoading(true);
    setError('');
    Promise.all([
      query('bills'),
      query('bill-items'),
      query('payments'),
      query('patients'),
      query('encounters'),
      query('hospitals'),
    ])
      .then(([b, bi, p, pt, en, h]: [any, any, any, any, any, any]) => {
        setBills(Array.isArray(b) ? b : b.results || []);
        setBillItems(Array.isArray(bi) ? bi : bi.results || []);
        setPayments(Array.isArray(p) ? p : p.results || []);
        setPatients(Array.isArray(pt) ? pt : pt.results || []);
        setEncounters(Array.isArray(en) ? en : en.results || []);
        setHospitals(Array.isArray(h) ? h : h.results || []);
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

  function patientName(id: number): string {
    const p = patients.find((x) => x.id === id);
    return p ? `${p.full_name} (${p.patient_id})` : String(id);
  }

  function paidFor(billId: number): number {
    return payments
      .filter((p) => p.bill === billId)
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }

  function outstandingFor(bill: Bill): number {
    return Math.max(0, Number(bill.total_amount || 0) - paidFor(bill.id));
  }

  const totalOutstanding = bills
    .filter((b) => b.status !== 'paid' && b.status !== 'cancelled')
    .reduce((sum, b) => sum + outstandingFor(b), 0);

  // ---------- Create Bill ----------
  const [billForm, setBillForm] = useState({
    patient: '',
    encounter: '',
    hospital: '',
    bill_type: 'consultation',
    notes: '',
  });
  const [items, setItems] = useState<
    { item_type: string; description: string; quantity: string; unit_price: string }[]
  >([{ item_type: 'consultation', description: '', quantity: '1', unit_price: '' }]);

  function resetBillForm() {
    setBillForm({
      patient: '',
      encounter: '',
      hospital: hospitals.length ? String(hospitals[0].id) : '',
      bill_type: 'consultation',
      notes: '',
    });
    setItems([{ item_type: 'consultation', description: '', quantity: '1', unit_price: '' }]);
  }

  function openCreateBill() {
    resetBillForm();
    setActionMsg('');
    setBillsView('create');
  }

  function updateItem(idx: number, field: string, value: string) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  }

  function addItemRow() {
    setItems((prev) => [...prev, { item_type: 'consultation', description: '', quantity: '1', unit_price: '' }]);
  }

  function removeItemRow(idx: number) {
    setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  }

  const billTotal = items.reduce(
    (sum, it) => sum + Number(it.quantity || 0) * Number(it.unit_price || 0),
    0,
  );

  async function submitCreateBill(e: FormEvent) {
    e.preventDefault();
    setActionMsg('');
    if (!canManage) {
      setActionMsg('You do not have permission to create bills.');
      return;
    }
    if (!billForm.patient) {
      setActionMsg('Please select a patient.');
      return;
    }
    const validItems = items.filter((it) => it.description.trim() && Number(it.unit_price) > 0);
    if (!validItems.length) {
      setActionMsg('Add at least one bill item with a description and unit price.');
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        patient: Number(billForm.patient),
        hospital: Number(billForm.hospital),
        bill_type: billForm.bill_type,
        total_amount: Number(billTotal.toFixed(2)),
        notes: billForm.notes,
      };
      if (billForm.encounter) payload.encounter = Number(billForm.encounter);
      const created: any = await create('bills', payload);

      for (const it of validItems) {
        const qty = Number(it.quantity || 1);
        const price = Number(it.unit_price);
        await create('bill-items', {
          bill: created.id,
          item_type: it.item_type,
          description: it.description,
          quantity: qty,
          unit_price: price,
          total_price: Number((qty * price).toFixed(2)),
        });
      }

      await load();
      setBillsView('list');
    } catch (err) {
      setActionMsg((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  // ---------- Mark as paid ----------
  async function markBillPaid(bill: Bill) {
    setActionMsg('');
    if (!canManage) {
      setActionMsg('You do not have permission to manage billing.');
      return;
    }
    setSaving(true);
    try {
      const outstanding = outstandingFor(bill);
      if (outstanding > 0) {
        await create('payments', {
          bill: bill.id,
          payment_method: 'cash',
          amount: Number(outstanding.toFixed(2)),
          reference_number: `WALKIN-${bill.id}`,
          notes: 'Marked as paid at cashier.',
        });
      }
      await offlineAction('bills', bill.id, { status: 'paid' });
      await load();
      setActionMsg('');
    } catch (err) {
      setActionMsg((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  // ---------- Record Payment ----------
  const [paymentForm, setPaymentForm] = useState({
    bill: '',
    amount: '',
    payment_method: 'cash',
    reference_number: '',
    notes: '',
  });

  function openRecordPayment() {
    setPaymentForm({ bill: '', amount: '', payment_method: 'cash', reference_number: '', notes: '' });
    setActionMsg('');
    setPaymentsView('record');
  }

  async function submitRecordPayment(e: FormEvent) {
    e.preventDefault();
    setActionMsg('');
    if (!canManage) {
      setActionMsg('You do not have permission to record payments.');
      return;
    }
    if (!paymentForm.bill) {
      setActionMsg('Please select a bill.');
      return;
    }
    if (!(Number(paymentForm.amount) > 0)) {
      setActionMsg('Enter a valid amount greater than zero.');
      return;
    }
    setSaving(true);
    try {
      await create('payments', {
        bill: Number(paymentForm.bill),
        amount: Number(Number(paymentForm.amount).toFixed(2)),
        payment_method: paymentForm.payment_method,
        reference_number: paymentForm.reference_number,
        notes: paymentForm.notes,
      });
      await load();
      setPaymentsView('list');
    } catch (err) {
      setActionMsg((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function openBillDetail(bill: Bill) {
    setActiveBillId(bill.id);
    setActionMsg('');
    setBillsView('detail');
  }

  const activeBill = bills.find((b) => b.id === activeBillId) || null;
  const activeItems = activeBill ? billItems.filter((i) => i.bill === activeBill.id) : [];
  const activePayments = activeBill ? payments.filter((p) => p.bill === activeBill.id) : [];

  if (loading) return <LoadingBox />;
  if (error) return <ErrorBox message={error} />;

  // ---------- Render: Bills list ----------
  function renderBillsList() {
    return (
      <div>
        <PageHeader
          title="Bills"
          subtitle={`${bills.length} bills · Outstanding: ${fmt(totalOutstanding)}`}
          action={
            canManage ? (
              <button
                onClick={openCreateBill}
                className="rounded-full bg-cyan-500 px-4 py-2 font-medium text-slate-950"
              >
                New Bill
              </button>
            ) : (
              <span className="text-sm text-slate-400">Read-only access</span>
            )
          }
        />

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Card>
            <p className="text-sm text-slate-400">Total Bills</p>
            <p className="mt-2 text-3xl font-semibold text-cyan-300">{bills.length}</p>
          </Card>
          <Card>
            <p className="text-sm text-slate-400">Unpaid / Partial</p>
            <p className="mt-2 text-3xl font-semibold text-amber-300">
              {bills.filter((b) => b.status !== 'paid' && b.status !== 'cancelled').length}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-slate-400">Outstanding Balance</p>
            <p className="mt-2 text-3xl font-semibold text-red-300">{fmt(totalOutstanding)}</p>
          </Card>
        </div>

        {bills.length === 0 ? (
          <EmptyBox message="No bills yet." />
        ) : (
          <Table columns={['Bill', 'Patient', 'Type', 'Total', 'Paid', 'Outstanding', 'Status']}>
            {bills.map((b) => {
              const outstanding = outstandingFor(b);
              return (
                <tr
                  key={b.id}
                  className="cursor-pointer hover:bg-slate-800/40"
                  onClick={() => openBillDetail(b)}
                >
                  <td className="px-4 py-3">#{b.id}</td>
                  <td className="px-4 py-3">{patientName(b.patient)}</td>
                  <td className="px-4 py-3 capitalize">{b.bill_type.replace('_', ' ')}</td>
                  <td className="px-4 py-3">{fmt(b.total_amount)}</td>
                  <td className="px-4 py-3">{fmt(paidFor(b.id))}</td>
                  <td className="px-4 py-3 text-red-300">{fmt(outstanding)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs ${statusColors[b.status] || 'bg-slate-700 text-slate-200'}`}>
                      {b.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
      </div>
    );
  }

  // ---------- Render: Create bill ----------
  function renderCreateBill() {
    const patientEncounters = encounters.filter(
      (en) => billForm.patient && en.patient === Number(billForm.patient),
    );
    return (
      <div>
        <PageHeader
          title="New Bill"
          action={
            <button
              onClick={() => setBillsView('list')}
              className="rounded-lg border border-slate-700 px-3 py-1.5 hover:bg-slate-800"
            >
              Back
            </button>
          }
        />
        {actionMsg && <ErrorBox message={actionMsg} />}
        <Card>
          <form onSubmit={submitCreateBill} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-sm text-slate-300">Patient *</label>
              <select
                value={billForm.patient}
                onChange={(e) =>
                  setBillForm((f) => ({ ...f, patient: e.target.value, encounter: '' }))
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
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
              <label className="block text-sm text-slate-300">Encounter</label>
              <select
                value={billForm.encounter}
                onChange={(e) => setBillForm((f) => ({ ...f, encounter: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
              >
                <option value="">None</option>
                {patientEncounters.map((en) => (
                  <option key={en.id} value={en.id}>
                    #{en.id} - {en.encounter_type} ({en.status})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-300">Hospital *</label>
              <select
                value={billForm.hospital}
                onChange={(e) => setBillForm((f) => ({ ...f, hospital: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
              >
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-300">Bill Type</label>
              <select
                value={billForm.bill_type}
                onChange={(e) => setBillForm((f) => ({ ...f, bill_type: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
              >
                {BILL_TYPE_CHOICES.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <TextArea
                label="Notes"
                value={billForm.notes}
                onChange={(v) => setBillForm((f) => ({ ...f, notes: v }))}
              />
            </div>
          </form>
        </Card>

        <Card className="mt-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Bill Items</h2>
            <button
              type="button"
              onClick={addItemRow}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800"
            >
              + Add item
            </button>
          </div>
          <div className="space-y-3">
            {items.map((it, idx) => (
              <div key={idx} className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3 sm:grid-cols-2 lg:grid-cols-5">
                <div>
                  <label className="block text-xs text-slate-400">Type</label>
                  <select
                    value={it.item_type}
                    onChange={(e) => updateItem(idx, 'item_type', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
                  >
                    {BILL_TYPE_CHOICES.map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-xs text-slate-400">Description</label>
                  <input
                    value={it.description}
                    onChange={(e) => updateItem(idx, 'description', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
                  />
                </div>
                <Field label="Qty" type="number" value={it.quantity} onChange={(v) => updateItem(idx, 'quantity', v)} />
                <Field label="Unit Price" type="number" value={it.unit_price} onChange={(v) => updateItem(idx, 'unit_price', v)} />
                <div className="flex items-end justify-between lg:col-span-5">
                  <span className="text-sm text-slate-300">
                    Line total: <span className="text-cyan-300">{fmt(Number(it.quantity || 0) * Number(it.unit_price || 0))}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeItemRow(idx)}
                    className="text-sm text-red-300 hover:text-red-200"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-4">
            <span className="text-sm text-slate-400">Grand Total</span>
            <span className="text-2xl font-semibold text-cyan-300">{fmt(billTotal)}</span>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={submitCreateBill}
              disabled={saving}
              className="rounded-full bg-cyan-500 px-4 py-2 font-medium text-slate-950 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Create Bill'}
            </button>
          </div>
        </Card>
      </div>
    );
  }

  // ---------- Render: Bill detail ----------
  function renderBillDetail() {
    if (!activeBill) return <EmptyBox message="Bill not found." />;
    const outstanding = outstandingFor(activeBill);
    return (
      <div>
        <PageHeader
          title={`Bill #${activeBill.id}`}
          subtitle={`${patientName(activeBill.patient)} · ${activeBill.bill_type.replace('_', ' ')}`}
          action={
            <div className="flex gap-2">
              <button
                onClick={() => setBillsView('list')}
                className="rounded-lg border border-slate-700 px-3 py-1.5 hover:bg-slate-800"
              >
                Back
              </button>
              {canManage && activeBill.status !== 'paid' && activeBill.status !== 'cancelled' && (
                <button
                  onClick={() => markBillPaid(activeBill)}
                  disabled={saving}
                  className="rounded-full bg-emerald-500 px-4 py-2 font-medium text-slate-950 disabled:opacity-60"
                >
                  {saving ? 'Processing…' : 'Mark as Paid'}
                </button>
              )}
            </div>
          }
        />
        {actionMsg && <ErrorBox message={actionMsg} />}

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Card>
            <p className="text-sm text-slate-400">Total</p>
            <p className="mt-2 text-3xl font-semibold text-cyan-300">{fmt(activeBill.total_amount)}</p>
          </Card>
          <Card>
            <p className="text-sm text-slate-400">Paid</p>
            <p className="mt-2 text-3xl font-semibold text-emerald-300">{fmt(paidFor(activeBill.id))}</p>
          </Card>
          <Card>
            <p className="text-sm text-slate-400">Outstanding</p>
            <p className="mt-2 text-3xl font-semibold text-red-300">{fmt(outstanding)}</p>
          </Card>
        </div>

        <Card className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Items</h2>
            <span className={`rounded-full px-2 py-1 text-xs ${statusColors[activeBill.status] || 'bg-slate-700 text-slate-200'}`}>
              {activeBill.status}
            </span>
          </div>
          {activeItems.length === 0 ? (
            <EmptyBox message="No items on this bill." />
          ) : (
            <Table columns={['Type', 'Description', 'Qty', 'Unit Price', 'Total']}>
              {activeItems.map((it) => (
                <tr key={it.id}>
                  <td className="px-4 py-3 capitalize">{it.item_type.replace('_', ' ')}</td>
                  <td className="px-4 py-3">{it.description}</td>
                  <td className="px-4 py-3">{it.quantity}</td>
                  <td className="px-4 py-3">{fmt(it.unit_price)}</td>
                  <td className="px-4 py-3">{fmt(it.total_price)}</td>
                </tr>
              ))}
            </Table>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-semibold">Payment History</h2>
          {activePayments.length === 0 ? (
            <EmptyBox message="No payments recorded yet." />
          ) : (
            <Table columns={['Method', 'Amount', 'Reference', 'Date']}>
              {activePayments.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 capitalize">{p.payment_method.replace('_', ' ')}</td>
                  <td className="px-4 py-3">{fmt(p.amount)}</td>
                  <td className="px-4 py-3">{p.reference_number || '—'}</td>
                  <td className="px-4 py-3">{(p.paid_at || '').slice(0, 16) || '—'}</td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      </div>
    );
  }

  // ---------- Render: Payments list ----------
  function renderPaymentsList() {
    return (
      <div>
        <PageHeader
          title="Payments"
          subtitle={`${payments.length} payments recorded`}
          action={
            canManage ? (
              <button
                onClick={openRecordPayment}
                className="rounded-full bg-cyan-500 px-4 py-2 font-medium text-slate-950"
              >
                Record Payment
              </button>
            ) : (
              <span className="text-sm text-slate-400">Read-only access</span>
            )
          }
        />
        {payments.length === 0 ? (
          <EmptyBox message="No payments recorded yet." />
        ) : (
          <Table columns={['Bill', 'Patient', 'Method', 'Amount', 'Reference', 'Date']}>
            {payments.map((p) => {
              const bill = bills.find((b) => b.id === p.bill);
              return (
                <tr key={p.id}>
                  <td className="px-4 py-3">#{p.bill}</td>
                  <td className="px-4 py-3">{bill ? patientName(bill.patient) : '—'}</td>
                  <td className="px-4 py-3 capitalize">{p.payment_method.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-emerald-300">{fmt(p.amount)}</td>
                  <td className="px-4 py-3">{p.reference_number || '—'}</td>
                  <td className="px-4 py-3">{(p.paid_at || '').slice(0, 16) || '—'}</td>
                </tr>
              );
            })}
          </Table>
        )}
      </div>
    );
  }

  // ---------- Render: Record payment ----------
  function renderRecordPayment() {
    const selectedBill = bills.find((b) => String(b.id) === paymentForm.bill);
    const suggestedMax = selectedBill ? outstandingFor(selectedBill) : 0;
    return (
      <div>
        <PageHeader
          title="Record Payment"
          action={
            <button
              onClick={() => setPaymentsView('list')}
              className="rounded-lg border border-slate-700 px-3 py-1.5 hover:bg-slate-800"
            >
              Back
            </button>
          }
        />
        {actionMsg && <ErrorBox message={actionMsg} />}
        <Card>
          <form onSubmit={submitRecordPayment} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm text-slate-300">Bill *</label>
              <select
                value={paymentForm.bill}
                onChange={(e) => setPaymentForm((f) => ({ ...f, bill: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
              >
                <option value="">Select bill</option>
                {bills
                  .filter((b) => b.status !== 'paid' && b.status !== 'cancelled')
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      #{b.id} - {patientName(b.patient)} (due {fmt(outstandingFor(b))})
                    </option>
                  ))}
              </select>
              {selectedBill && (
                <p className="mt-1 text-xs text-slate-400">
                  Outstanding: {fmt(suggestedMax)} — enter this amount to settle the bill.
                </p>
              )}
            </div>
            <Field
              label="Amount *"
              type="number"
              value={paymentForm.amount}
              onChange={(v) => setPaymentForm((f) => ({ ...f, amount: v }))}
            />
            <div>
              <label className="block text-sm text-slate-300">Payment Method</label>
              <select
                value={paymentForm.payment_method}
                onChange={(e) => setPaymentForm((f) => ({ ...f, payment_method: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
              >
                {PAYMENT_METHOD_CHOICES.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <Field
              label="Reference Number"
              value={paymentForm.reference_number}
              onChange={(v) => setPaymentForm((f) => ({ ...f, reference_number: v }))}
            />
            <div className="sm:col-span-2">
              <TextArea
                label="Notes"
                value={paymentForm.notes}
                onChange={(v) => setPaymentForm((f) => ({ ...f, notes: v }))}
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-cyan-500 px-4 py-2 font-medium text-slate-950 disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Record Payment'}
              </button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex gap-2 border-b border-slate-800">
        <button
          onClick={() => setTab('bills')}
          className={`px-4 py-2 text-sm font-medium ${
            tab === 'bills'
              ? 'border-b-2 border-cyan-400 text-cyan-300'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Bills
        </button>
        <button
          onClick={() => setTab('payments')}
          className={`px-4 py-2 text-sm font-medium ${
            tab === 'payments'
              ? 'border-b-2 border-cyan-400 text-cyan-300'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Payments
        </button>
      </div>

      {tab === 'bills'
        ? billsView === 'list'
          ? renderBillsList()
          : billsView === 'create'
            ? renderCreateBill()
            : renderBillDetail()
        : paymentsView === 'list'
          ? renderPaymentsList()
          : renderRecordPayment()}
    </div>
  );
}
