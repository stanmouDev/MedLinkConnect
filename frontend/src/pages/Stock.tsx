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

type StockMovement = {
  id: number;
  stock_item: number;
  stock_item_name?: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reference: string;
  notes: string;
  created_at: string;
};

function isLowStock(item: StockItem): boolean {
  return Number(item.current_quantity) <= Number(item.min_stock_level);
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-sm text-slate-300">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
      />
    </div>
  );
}

const typeColors: Record<string, string> = {
  in: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
  out: 'bg-red-500/15 text-red-300 border border-red-500/30',
  adjustment: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
};

export default function Stock() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [itemMap, setItemMap] = useState<Record<number, StockItem>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const role = localStorage.getItem('medlink_user_role') || '';
  const canManage = role === 'administrator' || role === 'pharmacist';

  const [form, setForm] = useState({
    stock_item: '',
    type: 'in',
    quantity: '',
    reference: '',
    notes: '',
  });

  function load() {
    setLoading(true);
    setError('');
    Promise.all([query('stock-items'), query('stock-movements')])
      .then(([i, m]) => {
        const list = (Array.isArray(i) ? i : i.results || []) as StockItem[];
        const moves = (Array.isArray(m) ? m : m.results || []) as StockMovement[];
        const map: Record<number, StockItem> = {};
        list.forEach((x) => (map[x.id] = x));
        setItems(list);
        setItemMap(map);
        setMovements(
          moves
            .map((mv) => ({ ...mv, stock_item_name: map[mv.stock_item]?.name || `Item #${mv.stock_item}` }))
            .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || ''))),
        );
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    const off = onSyncChange(() => load());
    return off;
  }, []);

  async function submitMovement(e: FormEvent) {
    e.preventDefault();
    setActionMsg('');
    if (!canManage) {
      setActionMsg('You do not have permission to manage stock.');
      return;
    }
    const qty = Number(form.quantity) || 0;
    if (!form.stock_item || qty <= 0) {
      setActionMsg('Select a stock item and a valid quantity.');
      return;
    }
    setSaving(true);
    const item = itemMap[Number(form.stock_item)];
    try {
      await create('stock-movements', {
        stock_item: Number(form.stock_item),
        type: form.type,
        quantity: qty,
        reference: form.reference,
        notes: form.notes,
      });
      let newQty = Number(item.current_quantity);
      if (form.type === 'in') newQty += qty;
      else if (form.type === 'out') {
        if (qty > newQty) {
          setActionMsg('Cannot dispense more than available stock.');
          setSaving(false);
          return;
        }
        newQty -= qty;
      } else if (form.type === 'adjustment') newQty = qty;
      await update('stock-items', item.id, { current_quantity: newQty });
      setForm({ stock_item: '', type: 'in', quantity: '', reference: '', notes: '' });
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
  const totalValue = items.reduce((sum, i) => sum + Number(i.current_quantity) * Number(i.unit_cost || 0), 0);

  return (
    <div>
      <PageHeader
        title="Stock Management"
        subtitle={canManage ? 'Monitor stock levels and record movements' : 'View stock levels'}
        action={
          !canManage ? (
            <span className="rounded-full bg-slate-800 px-3 py-1.5 text-xs text-slate-400">Read-only</span>
          ) : null
        }
      />

      {actionMsg && <ErrorBox message={actionMsg} />}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card><p className="text-sm text-slate-400">Total Items</p><p className="mt-2 text-3xl font-semibold text-cyan-300">{items.length}</p></Card>
        <Card><p className="text-sm text-slate-400">Low Stock</p><p className="mt-2 text-3xl font-semibold text-amber-300">{lowStockItems.length}</p></Card>
        <Card><p className="text-sm text-slate-400">Total Value</p><p className="mt-2 text-3xl font-semibold text-emerald-300">{totalValue.toFixed(2)}</p></Card>
      </div>

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

      <Card className="mb-6">
        <h2 className="mb-4 text-lg font-semibold">Stock Items</h2>
        {items.length === 0 ? (
          <EmptyBox message="No stock items yet." />
        ) : (
          <Table columns={['Name', 'Code', 'Category', 'Qty', 'Unit', 'Min', 'Unit Cost', 'Expiry', 'Supplier', 'Status']}>
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
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Card className="mb-6">
        <h2 className="mb-4 text-lg font-semibold">Record Stock Movement</h2>
        {!canManage ? (
          <EmptyBox message="You do not have permission to record stock movements." />
        ) : items.length === 0 ? (
          <EmptyBox message="Add stock items before recording movements." />
        ) : (
          <form onSubmit={submitMovement} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-sm text-slate-300">Stock Item</label>
              <select
                value={form.stock_item}
                onChange={(e) => setForm((f) => ({ ...f, stock_item: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
              >
                <option value="">Select item</option>
                {items.map((i) => (
                  <option key={i.id} value={i.id}>{i.name} ({i.code})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-300">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
              >
                <option value="in">In (receive)</option>
                <option value="out">Out (dispense)</option>
                <option value="adjustment">Adjustment (set)</option>
              </select>
            </div>
            <Field label="Quantity" type="number" value={form.quantity} onChange={(v) => setForm((f) => ({ ...f, quantity: v }))} />
            <Field label="Reference" value={form.reference} onChange={(v) => setForm((f) => ({ ...f, reference: v }))} />
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-sm text-slate-300">Notes</label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
              />
            </div>
            <div className="flex items-end">
              <button type="submit" disabled={saving} className="rounded-full bg-cyan-500 px-4 py-2 font-medium text-slate-950 disabled:opacity-60">
                {saving ? 'Saving…' : 'Record Movement'}
              </button>
            </div>
          </form>
        )}
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">Movement History</h2>
        {movements.length === 0 ? (
          <EmptyBox message="No stock movements recorded yet." />
        ) : (
          <Table columns={['Date', 'Item', 'Type', 'Quantity', 'Reference', 'Notes']}>
            {movements.map((mv) => (
              <tr key={mv.id} className="hover:bg-slate-800/40">
                <td className="px-4 py-3">{(mv.created_at || '').slice(0, 16) || '—'}</td>
                <td className="px-4 py-3">{mv.stock_item_name}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs capitalize ${typeColors[mv.type] || 'bg-slate-700 text-slate-200'}`}>{mv.type}</span>
                </td>
                <td className="px-4 py-3">{mv.quantity}</td>
                <td className="px-4 py-3">{mv.reference || '—'}</td>
                <td className="px-4 py-3">{mv.notes || '—'}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
