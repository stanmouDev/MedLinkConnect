import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { query, onSyncChange, create, update } from '../offline/data';
import { Card, ErrorBox, LoadingBox, EmptyBox, Table, PageHeader } from '../components/ui';

type StockItem = {
  id: number;
  name: string;
  code: string;
  category: string;
  unit: string;
  current_quantity: number;
  min_stock_level: number;
  unit_cost: number;
  expiry: string;
  supplier: string;
};

type Patient = { id: number; full_name: string; patient_id: string };

function isLowStock(item: StockItem): boolean {
  return Number(item.current_quantity) <= Number(item.min_stock_level);
}

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

export default function Pharmacy() {
  const [tab, setTab] = useState<'stock' | 'dispensing'>('stock');
  const [items, setItems] = useState<StockItem[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const role = localStorage.getItem('medlink_user_role') || '';
  const canManage = role === 'administrator' || role === 'pharmacist';

  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: '',
    code: '',
    category: '',
    unit: '',
    current_quantity: '',
    min_stock_level: '',
    unit_cost: '',
    expiry: '',
    supplier: '',
  });

  const [dispense, setDispense] = useState({
    stock_item: '',
    quantity: '',
    patient: '',
    prescription_ref: '',
  });

  function load() {
    setLoading(true);
    setError('');
    Promise.all([query('stock-items'), query('patients')])
      .then(([i, p]) => {
        const list = (Array.isArray(i) ? i : i.results || []) as StockItem[];
        const pats = (Array.isArray(p) ? p : p.results || []) as Patient[];
        setItems(list);
        setPatients(pats);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    const off = onSyncChange(() => load());
    return off;
  }, []);

  function resetForm() {
    setEditingId(null);
    setForm({
      name: '',
      code: '',
      category: '',
      unit: '',
      current_quantity: '',
      min_stock_level: '',
      unit_cost: '',
      expiry: '',
      supplier: '',
    });
  }

  function openEdit(item: StockItem) {
    setEditingId(item.id);
    setForm({
      name: item.name || '',
      code: item.code || '',
      category: item.category || '',
      unit: item.unit || '',
      current_quantity: String(item.current_quantity ?? ''),
      min_stock_level: String(item.min_stock_level ?? ''),
      unit_cost: String(item.unit_cost ?? ''),
      expiry: (item.expiry || '').slice(0, 10),
      supplier: item.supplier || '',
    });
    setTab('stock');
  }

  async function submitStock(e: FormEvent) {
    e.preventDefault();
    setActionMsg('');
    if (!canManage) {
      setActionMsg('You do not have permission to manage stock.');
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name,
      code: form.code,
      category: form.category,
      unit: form.unit,
      current_quantity: Number(form.current_quantity) || 0,
      min_stock_level: Number(form.min_stock_level) || 0,
      unit_cost: Number(form.unit_cost) || 0,
      expiry: form.expiry,
      supplier: form.supplier,
    };
    try {
      if (editingId) {
        await update('stock-items', editingId, payload);
      } else {
        await create('stock-items', payload);
      }
      resetForm();
      load();
    } catch (err) {
      setActionMsg((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function submitDispense(e: FormEvent) {
    e.preventDefault();
    setActionMsg('');
    if (!canManage) {
      setActionMsg('You do not have permission to dispense.');
      return;
    }
    const qty = Number(dispense.quantity) || 0;
    if (!dispense.stock_item || qty <= 0) {
      setActionMsg('Select a stock item and a valid quantity.');
      return;
    }
    const item = items.find((x) => String(x.id) === String(dispense.stock_item));
    if (!item) {
      setActionMsg('Selected stock item not found.');
      return;
    }
    if (qty > Number(item.current_quantity)) {
      setActionMsg(`Insufficient stock. Only ${item.current_quantity} ${item.unit || 'units'} available.`);
      return;
    }
    setSaving(true);
    try {
      await create('stock-movements', {
        stock_item: item.id,
        type: 'out',
        quantity: qty,
        reference: dispense.prescription_ref,
        notes: `Dispensed to patient ${dispense.patient || 'n/a'}`,
      });
      await update('stock-items', item.id, {
        current_quantity: Number(item.current_quantity) - qty,
      });
      setDispense({ stock_item: '', quantity: '', patient: '', prescription_ref: '' });
      load();
    } catch (err) {
      setActionMsg((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingBox />;
  if (error) return <ErrorBox message={error} />;

  const lowStockItems = items.filter(isLowStock);

  return (
    <div>
      <PageHeader
        title="Pharmacy"
        subtitle={canManage ? 'Manage stock and dispense medicines' : 'View pharmacy inventory'}
        action={
          !canManage ? (
            <span className="rounded-full bg-slate-800 px-3 py-1.5 text-xs text-slate-400">Read-only</span>
          ) : null
        }
      />

      {actionMsg && <ErrorBox message={actionMsg} />}

      {lowStockItems.length > 0 && (
        <div className="mb-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-300">
          <p className="font-medium">Low stock alert ({lowStockItems.length})</p>
          <ul className="mt-1 list-disc pl-5">
            {lowStockItems.map((i) => (
              <li key={i.id}>
                {i.name} ({i.code}) — {i.current_quantity} {i.unit || 'units'} left (min {i.min_stock_level})
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setTab('stock')}
          className={`rounded-full px-4 py-2 font-medium ${tab === 'stock' ? 'bg-cyan-500 text-slate-950' : 'border border-slate-700 text-slate-300'}`}
        >
          Stock Items
        </button>
        <button
          onClick={() => setTab('dispensing')}
          className={`rounded-full px-4 py-2 font-medium ${tab === 'dispensing' ? 'bg-cyan-500 text-slate-950' : 'border border-slate-700 text-slate-300'}`}
        >
          Dispensing
        </button>
      </div>

      {tab === 'stock' ? (
        <div>
          {canManage && (
            <Card className="mb-6">
              <h2 className="mb-4 text-lg font-semibold">
                {editingId ? 'Edit Stock Item' : 'Add Stock Item'}
              </h2>
              <form onSubmit={submitStock} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} required />
                <Field label="Code" value={form.code} onChange={(v) => setForm((f) => ({ ...f, code: v }))} required />
                <Field label="Category" value={form.category} onChange={(v) => setForm((f) => ({ ...f, category: v }))} />
                <Field label="Unit" value={form.unit} onChange={(v) => setForm((f) => ({ ...f, unit: v }))} />
                <Field label="Current Quantity" type="number" value={form.current_quantity} onChange={(v) => setForm((f) => ({ ...f, current_quantity: v }))} />
                <Field label="Min Stock Level" type="number" value={form.min_stock_level} onChange={(v) => setForm((f) => ({ ...f, min_stock_level: v }))} />
                <Field label="Unit Cost" type="number" value={form.unit_cost} onChange={(v) => setForm((f) => ({ ...f, unit_cost: v }))} />
                <Field label="Expiry" type="date" value={form.expiry} onChange={(v) => setForm((f) => ({ ...f, expiry: v }))} />
                <Field label="Supplier" value={form.supplier} onChange={(v) => setForm((f) => ({ ...f, supplier: v }))} />
                <div className="flex items-end gap-2">
                  <button type="submit" disabled={saving} className="rounded-full bg-cyan-500 px-4 py-2 font-medium text-slate-950 disabled:opacity-60">
                    {saving ? 'Saving…' : editingId ? 'Update' : 'Add Item'}
                  </button>
                  {editingId && (
                    <button type="button" onClick={resetForm} className="rounded-lg border border-slate-700 px-3 py-1.5 hover:bg-slate-800">Cancel</button>
                  )}
                </div>
              </form>
            </Card>
          )}

          <Card>
            <h2 className="mb-4 text-lg font-semibold">Stock Items</h2>
            {items.length === 0 ? (
              <EmptyBox message="No stock items yet." />
            ) : (
              <Table columns={['Name', 'Code', 'Category', 'Qty', 'Unit', 'Min', 'Unit Cost', 'Expiry', 'Supplier', 'Status', '']}>
                {items.map((i) => (
                  <tr key={i.id} className="hover:bg-slate-800/40">
                    <td className="px-4 py-3">{i.name}</td>
                    <td className="px-4 py-3">{i.code}</td>
                    <td className="px-4 py-3">{i.category || '—'}</td>
                    <td className="px-4 py-3">{i.current_quantity}</td>
                    <td className="px-4 py-3">{i.unit || '—'}</td>
                    <td className="px-4 py-3">{i.min_stock_level}</td>
                    <td className="px-4 py-3">{i.unit_cost ?? '—'}</td>
                    <td className="px-4 py-3">{(i.expiry || '').slice(0, 10) || '—'}</td>
                    <td className="px-4 py-3">{i.supplier || '—'}</td>
                    <td className="px-4 py-3">
                      {isLowStock(i) ? (
                        <span className="rounded-full bg-amber-500/15 px-2 py-1 text-xs text-amber-300">Low</span>
                      ) : (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs text-emerald-300">OK</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {canManage && (
                        <button onClick={() => openEdit(i)} className="text-sm text-cyan-300 hover:text-cyan-200">Edit</button>
                      )}
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        </div>
      ) : (
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Dispense Medicine</h2>
          {!canManage ? (
            <EmptyBox message="You do not have permission to dispense medicines." />
          ) : items.length === 0 ? (
            <EmptyBox message="Add stock items before dispensing." />
          ) : (
            <form onSubmit={submitDispense} className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm text-slate-300">Stock Item</label>
                <select
                  value={dispense.stock_item}
                  onChange={(e) => setDispense((d) => ({ ...d, stock_item: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
                >
                  <option value="">Select item</option>
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.code}) — {i.current_quantity} {i.unit || 'units'}
                    </option>
                  ))}
                </select>
              </div>
              <Field label="Quantity" type="number" value={dispense.quantity} onChange={(v) => setDispense((d) => ({ ...d, quantity: v }))} />
              <div>
                <label className="block text-sm text-slate-300">Patient</label>
                <select
                  value={dispense.patient}
                  onChange={(e) => setDispense((d) => ({ ...d, patient: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
                >
                  <option value="">Select patient (optional)</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>{p.full_name} ({p.patient_id})</option>
                  ))}
                </select>
              </div>
              <Field label="Prescription Reference" value={dispense.prescription_ref} onChange={(v) => setDispense((d) => ({ ...d, prescription_ref: v }))} />
              <div className="sm:col-span-2 flex items-end">
                <button type="submit" disabled={saving} className="rounded-full bg-cyan-500 px-4 py-2 font-medium text-slate-950 disabled:opacity-60">
                  {saving ? 'Dispensing…' : 'Dispense'}
                </button>
              </div>
            </form>
          )}
        </Card>
      )}
    </div>
  );
}
