import { useEffect, useState, type FormEvent } from 'react';
import { query, onSyncChange, create } from '../offline/data';
import { api, ensureOnline } from '../api';
import {
  Card,
  ErrorBox,
  LoadingBox,
  EmptyBox,
  Table,
  PageHeader,
} from '../components/ui';

type FormulaDefinition = {
  id: number;
  name: string;
  formula_type?: string;
  data_source?: string;
  field?: string;
  aggregation?: string;
  filters?: string;
  group_by?: string;
  order_by?: string;
  updated_at?: string;
};

type FormulaResult = {
  value: number;
  details?: Record<string, any>;
};

const FORMULA_TYPES = [
  'count',
  'sum',
  'avg',
  'min',
  'max',
  'custom',
] as const;

type FormulaType = (typeof FORMULA_TYPES)[number];

type FormState = {
  name: string;
  formula_type: FormulaType;
  data_source: string;
  field: string;
  aggregation: string;
  filters: string;
  group_by: string;
  order_by: string;
};

const INITIAL_FORM: FormState = {
  name: '',
  formula_type: 'count',
  data_source: 'patients',
  field: 'id',
  aggregation: '',
  filters: '',
  group_by: '',
  order_by: '',
};

const DATA_SOURCES = [
  'patients', 'appointments', 'emr', 'admissions', 'discharges',
  'vital-signs', 'diagnoses', 'laboratory', 'pharmacy', 'billing',
  'nhis', 'private-insurance', 'doctors', 'nurses', 'departments',
  'beds', 'hospitals', 'referrals', 'handovers', 'audit-logs', 'inventory',
];

export default function FormulaBuilder() {
  const role = localStorage.getItem('medlink_user_role') || '';
  const isAdmin = role === 'administrator';

  const [formulas, setFormulas] = useState<FormulaDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [testResult, setTestResult] = useState<FormulaResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [testHospital, setTestHospital] = useState('');
  const [testStart, setTestStart] = useState('');
  const [testEnd, setTestEnd] = useState('');

  function updateForm(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function resetForm() {
    setForm(INITIAL_FORM);
    setEditingId(null);
    setTestResult(null);
  }

  function startCreate() {
    resetForm();
    setShowForm(true);
  }

  function startEdit(f: FormulaDefinition) {
    setForm({
      name: f.name || '',
      formula_type: (f.formula_type as FormulaType) || 'count',
      data_source: f.data_source || 'patients',
      field: f.field || '',
      aggregation: f.aggregation || '',
      filters: f.filters || '',
      group_by: f.group_by || '',
      order_by: f.order_by || '',
    });
    setEditingId(f.id);
    setShowForm(true);
  }

  function load() {
    setLoading(true);
    setError('');
    query('formula-definitions')
      .then((data: any) => {
        setFormulas(Array.isArray(data) ? data : data.results || []);
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = { ...form };
      if (editingId) {
        ensureOnline();
        await api.update('formula-definitions', editingId, payload);
      } else {
        await create('formula-definitions', payload);
      }
      resetForm();
      setShowForm(false);
      load();
    } catch (err) {
      setError((err as Error).message || 'Could not save formula.');
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setError('');
    setTesting(true);
    setTestResult(null);
    try {
      ensureOnline();
      const formulaId = editingId || Number(prompt('Formula ID to test:'));
      if (!formulaId) return;
      const result = await api.post('formulas', 'evaluate', {
        formula_id: formulaId,
        hospital: testHospital ? Number(testHospital) : undefined,
        start: testStart || undefined,
        end: testEnd || undefined,
      });
      setTestResult(result);
    } catch (err) {
      setError((err as Error).message || 'Could not evaluate formula.');
    } finally {
      setTesting(false);
    }
  }

  if (loading) return <LoadingBox />;
  if (error) return <ErrorBox message={error} />;

  return (
    <div>
      <PageHeader
        title="Formula Builder"
        subtitle="Create and test reusable calculated metrics"
        action={
          isAdmin && !showForm ? (
            <button
              onClick={startCreate}
              className="rounded-full bg-cyan-500 px-4 py-2 font-medium text-slate-950"
            >
              New Formula
            </button>
          ) : undefined
        }
      />

      {!isAdmin && (
        <Card className="mb-6">
          <p className="text-sm text-slate-400">
            Formula management is restricted to administrators.
          </p>
        </Card>
      )}

      {error && <ErrorBox message={error} className="mb-4" />}

      {showForm && isAdmin && (
        <Card className="mb-6">
          <h2 className="mb-4 text-lg font-semibold">
            {editingId ? 'Edit Formula' : 'New Formula'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm text-slate-300">Name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => updateForm('name', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300">Formula Type</label>
                <select
                  value={form.formula_type}
                  onChange={(e) => updateForm('formula_type', e.target.value as FormulaType)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
                >
                  {FORMULA_TYPES.map((ft) => (
                    <option key={ft} value={ft} className="capitalize">{ft}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm text-slate-300">Data Source</label>
                <select
                  value={form.data_source}
                  onChange={(e) => updateForm('data_source', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
                >
                  {DATA_SOURCES.map((src) => (
                    <option key={src} value={src} className="capitalize">{src.replace('-', ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-300">Field</label>
                <input
                  value={form.field}
                  onChange={(e) => updateForm('field', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm text-slate-300">Aggregation</label>
                <input
                  value={form.aggregation}
                  onChange={(e) => updateForm('aggregation', e.target.value)}
                  placeholder="sum(amount) or custom expression"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300">Group By</label>
                <input
                  value={form.group_by}
                  onChange={(e) => updateForm('group_by', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-300">Filters (JSON)</label>
              <textarea
                value={form.filters}
                onChange={(e) => updateForm('filters', e.target.value)}
                rows={4}
                placeholder='[{"field":"status","op":"eq","value":"active"}]'
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300">Order By</label>
              <input
                value={form.order_by}
                onChange={(e) => updateForm('order_by', e.target.value)}
                placeholder="created_at DESC"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-cyan-500 px-4 py-2 font-medium text-slate-950 disabled:opacity-60"
              >
                {saving ? 'Saving…' : editingId ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); resetForm(); }}
                className="rounded-full border border-slate-700 px-4 py-2 font-medium text-slate-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Existing Formulas</h2>
          {formulas.length === 0 ? (
            <EmptyBox message="No formulas defined yet." />
          ) : (
            <Table columns={['Name', 'Type', 'Data Source', 'Field', 'Aggregation']}>
              {formulas.map((f) => (
                <tr key={f.id}>
                  <td className="px-4 py-3 font-medium text-slate-100">{f.name}</td>
                  <td className="px-4 py-3 capitalize">{f.formula_type || '—'}</td>
                  <td className="px-4 py-3 capitalize">{f.data_source || '—'}</td>
                  <td className="px-4 py-3">{f.field || '—'}</td>
                  <td className="px-4 py-3">{f.aggregation || '—'}</td>
                </tr>
              ))}
            </Table>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold">Test Formula</h2>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm text-slate-300">Formula</label>
                <select
                  value={editingId || ''}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const found = formulas.find((f) => f.id === Number(e.target.value));
                    if (found) startEdit(found);
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
                >
                  <option value="">Select formula…</option>
                  {formulas.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-300">Hospital ID</label>
                <input
                  value={testHospital}
                  onChange={(e) => setTestHospital(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm text-slate-300">Start Date</label>
                <input
                  type="date"
                  value={testStart}
                  onChange={(e) => setTestStart(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300">End Date</label>
                <input
                  type="date"
                  value={testEnd}
                  onChange={(e) => setTestEnd(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
                />
              </div>
            </div>
            <button
              onClick={handleTest}
              disabled={testing || !editingId}
              className="rounded-full border border-cyan-400 px-4 py-2 font-medium text-cyan-300 disabled:opacity-60"
            >
              {testing ? 'Evaluating…' : 'Test Formula'}
            </button>
            {testResult && (
              <div className="rounded-2xl border border-cyan-400/40 bg-cyan-500/5 p-4">
                <p className="text-sm text-slate-300">
                  <span className="font-medium text-slate-100">Result:</span>{' '}
                  {testResult.value}
                </p>
                {testResult.details && (
                  <pre className="mt-2 max-h-48 overflow-auto rounded-xl bg-slate-900 p-3 text-xs text-slate-300">
                    {JSON.stringify(testResult.details, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
