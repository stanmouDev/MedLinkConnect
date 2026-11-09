import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { query, onSyncChange } from '../offline/data';
import { useAuth } from '../auth';
import { SyncStatusBar } from '../offline/SyncStatusBar';
import { Card, EmptyBox, Table } from '../components/ui';

type Prescription = {
  id: number;
  patient: number;
  patient_full_name?: string;
  medication: string;
  dosage: string;
  frequency: string;
  status: string;
  created_at: string;
};

type StockItem = {
  id: number;
  name: string;
  code: string;
  current_quantity: number;
  min_stock_level: number;
  unit_cost: number;
  expiry?: string;
};

type StockMovement = {
  id: number;
  stock_item: number;
  stock_item_name?: string;
  type: string;
  quantity: number;
  notes: string;
  created_at: string;
};

export default function PharmacyWorkspace() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);

  function load() {
    setLoading(true);
    setError('');
    Promise.all([query('prescriptions'), query('stock-items'), query('stock-movements')])
      .then(([rx, stock, moves]) => {
        setPrescriptions(Array.isArray(rx) ? rx : []);
        setStockItems(Array.isArray(stock) ? stock : []);
        setMovements(Array.isArray(moves) ? moves : []);
      })
      .catch((e) => setError(e.message || 'Failed to load data.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    const off = onSyncChange(load);
    return off;
  }, []);

  const awaitingDispensing = prescriptions.filter((p) => p.status === 'active' || p.status === 'pending');
  const lowStock = stockItems.filter((s) => Number(s.current_quantity) <= Number(s.min_stock_level) && Number(s.current_quantity) > 0);
  const outOfStock = stockItems.filter((s) => Number(s.current_quantity) === 0);
  const today = new Date().toISOString().slice(0, 10);
  const dispensingToday = movements.filter((m) => (m.created_at || '').startsWith(today) && m.type === 'out');
  const recentMovements = movements.slice(0, 10);

  if (loading && prescriptions.length === 0) return <EmptyBox message="Loading workspace..." />;
  if (error) return <div className="text-red-400">{error}</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">
          Good morning, {user?.username || 'Pharmacist'}
        </h1>
        <p className="text-sm text-slate-400">Pharmacy Workspace — Prescriptions and stock management</p>
        <SyncStatusBar />
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <button onClick={() => navigate('/pharmacy')} className="rounded-full bg-cyan-500 px-4 py-2 font-medium text-slate-950">
          + Dispense
        </button>
        <button onClick={() => navigate('/stock')} className="rounded-full border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800">
          View Stock
        </button>
        <button onClick={() => navigate('/stock')} className="rounded-full border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800">
          Record Stock Movement
        </button>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <p className="text-sm text-slate-400">Prescriptions Waiting</p>
          <p className="mt-2 text-3xl font-semibold text-amber-300">{awaitingDispensing.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-400">Dispensing Today</p>
          <p className="mt-2 text-3xl font-semibold text-cyan-300">{dispensingToday.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-400">Low Stock</p>
          <p className="mt-2 text-3xl font-semibold text-red-300">{lowStock.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-400">Out of Stock</p>
          <p className="mt-2 text-3xl font-semibold text-red-300">{outOfStock.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-400">Stock Items</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-300">{stockItems.length}</p>
        </Card>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-semibold">DISPENSING QUEUE</h3>
          {awaitingDispensing.length === 0 ? (
            <EmptyBox message="No prescriptions awaiting dispensing." />
          ) : (
            <Table columns={['Patient', 'Medication', 'Dosage', 'Frequency', 'Status']}>
              {awaitingDispensing.slice(0, 10).map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3">{p.patient_full_name || `#${p.patient}`}</td>
                  <td className="px-4 py-3">{p.medication}</td>
                  <td className="px-4 py-3">{p.dosage}</td>
                  <td className="px-4 py-3">{p.frequency || '—'}</td>
                  <td className="px-4 py-3">{p.status}</td>
                </tr>
              ))}
            </Table>
          )}
        </Card>

        <Card>
          <h3 className="mb-3 font-semibold">LOW STOCK ALERTS</h3>
          {lowStock.length === 0 ? (
            <EmptyBox message="No low stock items." />
          ) : (
            <Table columns={['Name', 'Code', 'Qty', 'Min', 'Expiry']}>
              {lowStock.slice(0, 10).map((s) => (
                <tr key={s.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3">{s.name}</td>
                  <td className="px-4 py-3">{s.code}</td>
                  <td className="px-4 py-3">{s.current_quantity}</td>
                  <td className="px-4 py-3">{s.min_stock_level}</td>
                  <td className="px-4 py-3">{(s.expiry || '').slice(0, 10)}</td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      </div>

      <Card>
        <h3 className="mb-3 font-semibold">RECENT STOCK MOVEMENTS</h3>
        {recentMovements.length === 0 ? (
          <EmptyBox message="No recent movements." />
        ) : (
          <Table columns={['Date', 'Item', 'Type', 'Qty', 'Notes']}>
            {recentMovements.map((m) => (
              <tr key={m.id} className="hover:bg-slate-800/40">
                <td className="px-4 py-3">{(m.created_at || '').slice(0, 16)}</td>
                <td className="px-4 py-3">{m.stock_item_name || `#${m.stock_item}`}</td>
                <td className="px-4 py-3">{m.type}</td>
                <td className="px-4 py-3">{m.quantity}</td>
                <td className="px-4 py-3">{m.notes || '—'}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
