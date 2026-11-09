import { useEffect, useState, type FormEvent } from 'react';
import { query, onSyncChange, create } from '../offline/data';
import { api, ensureOnline } from '../api';
import {
  Card,
  ErrorBox,
  LoadingBox,
  EmptyBox,
  PageHeader,
} from '../components/ui';

type ReportTemplate = {
  id: number;
  name: string;
  description?: string;
  category?: string;
  frequency?: string;
  data_sources?: string[];
  filters?: string;
  calculated_fields?: string;
  charts_tables?: string;
  export_formats?: string;
  approval_workflow?: string;
  status?: string;
  created_by?: number;
  updated_at?: string;
};

const DATA_SOURCES = [
  'patients', 'appointments', 'emr', 'admissions', 'discharges',
  'vital-signs', 'diagnoses', 'laboratory', 'pharmacy', 'billing',
  'nhis', 'private-insurance', 'doctors', 'nurses', 'departments',
  'beds', 'hospitals', 'referrals', 'handovers', 'audit-logs', 'inventory',
];

const EXPORT_FORMATS = ['PDF', 'Excel', 'CSV', 'Word', 'HTML'];

type FormState = {
  name: string;
  description: string;
  category: string;
  frequency: string;
  data_sources: string[];
  filters: string;
  calculated_fields: string;
  charts_tables: string;
  export_formats: string[];
  approval_workflow: string;
  status: string;
};

const INITIAL_FORM: FormState = {
  name: '',
  description: '',
  category: '',
  frequency: 'monthly',
  data_sources: [],
  filters: '',
  calculated_fields: '',
  charts_tables: '',
  export_formats: ['PDF'],
  approval_workflow: 'none',
  status: 'active',
};

export default function ReportTemplateManager() {
  const role = localStorage.getItem('medlink_user_role') || '';
  const isAdmin = role === 'administrator';

  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  function updateForm(field: keyof FormState, value: string | string[]) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function toggleDataSource(src: string) {
    setForm((f) => ({
      ...f,
      data_sources: f.data_sources.includes(src)
        ? f.data_sources.filter((s) => s !== src)
        : [...f.data_sources, src],
    }));
  }

  function toggleFormat(fmt: string) {
    setForm((f) => ({
      ...f,
      export_formats: f.export_formats.includes(fmt)
        ? f.export_formats.filter((x) => x !== fmt)
        : [...f.export_formats, fmt],
    }));
  }

  function resetForm() {
    setForm(INITIAL_FORM);
    setEditingId(null);
  }

  function startCreate() {
    resetForm();
    setShowForm(true);
  }

  function startEdit(tpl: ReportTemplate) {
    setForm({
      name: tpl.name || '',
      description: tpl.description || '',
      category: tpl.category || '',
      frequency: tpl.frequency || 'monthly',
      data_sources: Array.isArray(tpl.data_sources) ? tpl.data_sources : [],
      filters: tpl.filters || '',
      calculated_fields: tpl.calculated_fields || '',
      charts_tables: tpl.charts_tables || '',
      export_formats: Array.isArray(tpl.export_formats) ? tpl.export_formats : ['PDF'],
      approval_workflow: tpl.approval_workflow || 'none',
      status: tpl.status || 'active',
    });
    setEditingId(tpl.id);
    setShowForm(true);
  }

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await query('report-templates');
      setTemplates(Array.isArray(data) ? data : data.results || []);
    } catch (e) {
      setError((e as Error).message || 'Could not load templates.');
    } finally {
      setLoading(false);
    }
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
      const payload = {
        ...form,
        data_sources: form.data_sources,
        export_formats: form.export_formats,
      };
      if (editingId) {
        ensureOnline();
        await api.update('report-templates', editingId, payload);
      } else {
        await create('report-templates', payload);
      }
      resetForm();
      setShowForm(false);
      load();
    } catch (err) {
      setError((err as Error).message || 'Could not save template.');
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(id: number) {
    setError('');
    try {
      ensureOnline();
      await api.post('report-templates', id, { status: 'archived' });
      load();
    } catch (err) {
      setError((err as Error).message || 'Could not archive template.');
    }
  }

  async function handleDuplicate(id: number) {
    setError('');
    try {
      ensureOnline();
      await api.post('report-templates', `${id}/duplicate`, null);
      load();
    } catch (err) {
      setError((err as Error).message || 'Could not duplicate template.');
    }
  }

  async function handlePreview(id: number) {
    setError('');
    try {
      ensureOnline();
      await api.post('report-templates', `${id}/preview`, {});
    } catch (err) {
      setError((err as Error).message || 'Could not preview template.');
    }
  }

  async function handleDelete(id: number) {
    setError('');
    try {
      ensureOnline();
      await api.remove('report-templates', id);
      setConfirmDeleteId(null);
      load();
    } catch (err) {
      setError((err as Error).message || 'Could not delete template.');
    }
  }

  if (loading) return <LoadingBox />;
  if (error) return <ErrorBox message={error} />;

  return (
    <div>
      <PageHeader
        title="Report Template Manager"
        subtitle="Create and manage reusable report templates"
        action={
          isAdmin && !showForm ? (
            <button
              onClick={startCreate}
              className="rounded-full bg-cyan-500 px-4 py-2 font-medium text-slate-950"
            >
              New Template
            </button>
          ) : undefined
        }
      />

      {!isAdmin && (
        <Card className="mb-6">
          <p className="text-sm text-slate-400">
            Report template management is restricted to administrators.
          </p>
        </Card>
      )}

      {error && <ErrorBox message={error} className="mb-4" />}

      {showForm && isAdmin && (
        <Card className="mb-6">
          <h2 className="mb-4 text-lg font-semibold">
            {editingId ? 'Edit Template' : 'New Template'}
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
                <label className="block text-sm text-slate-300">Category</label>
                <input
                  value={form.category}
                  onChange={(e) => updateForm('category', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-300">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => updateForm('description', e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm text-slate-300">Frequency</label>
                <select
                  value={form.frequency}
                  onChange={(e) => updateForm('frequency', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-300">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => updateForm('status', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-2">Data Sources</label>
              <div className="flex flex-wrap gap-2">
                {DATA_SOURCES.map((src) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => toggleDataSource(src)}
                    className={`rounded-lg border px-3 py-1 text-xs ${
                      form.data_sources.includes(src)
                        ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300'
                        : 'border-slate-700 text-slate-400'
                    }`}
                  >
                    {src}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-300">Filters</label>
              <textarea
                value={form.filters}
                onChange={(e) => updateForm('filters', e.target.value)}
                rows={3}
                placeholder='[{"field":"status","op":"eq","value":"active"}]'
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300">Calculated Fields</label>
              <textarea
                value={form.calculated_fields}
                onChange={(e) => updateForm('calculated_fields', e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300">Charts / Tables</label>
              <textarea
                value={form.charts_tables}
                onChange={(e) => updateForm('charts_tables', e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-2">Export Formats</label>
              <div className="flex flex-wrap gap-2">
                {EXPORT_FORMATS.map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => toggleFormat(fmt)}
                    className={`rounded-lg border px-3 py-1 text-xs ${
                      form.export_formats.includes(fmt)
                        ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300'
                        : 'border-slate-700 text-slate-400'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm text-slate-300">Approval Workflow</label>
                <select
                  value={form.approval_workflow}
                  onChange={(e) => updateForm('approval_workflow', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
                >
                  <option value="none">None</option>
                  <option value="manager">Manager</option>
                  <option value="director">Director</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
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

      {templates.length === 0 ? (
        <EmptyBox message="No report templates created yet." />
      ) : (
        <div className="space-y-4">
          {templates.map((tpl) => (
            <Card key={tpl.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-cyan-300">{tpl.name}</h3>
                  {tpl.description && (
                    <p className="mt-1 text-sm text-slate-300">{tpl.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
                    {tpl.category && <span className="rounded-full border border-slate-700 px-2 py-0.5">{tpl.category}</span>}
                    {tpl.frequency && <span className="rounded-full border border-slate-700 px-2 py-0.5 capitalize">{tpl.frequency}</span>}
                    <span className={`rounded-full px-2 py-0.5 ${
                      tpl.status === 'active' ? 'text-emerald-300' : 'text-slate-500'
                    }`}>{tpl.status || 'active'}</span>
                  </div>
                  {tpl.data_sources && tpl.data_sources.length > 0 && (
                    <p className="mt-2 text-xs text-slate-500">Sources: {tpl.data_sources.join(', ')}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => startEdit(tpl)}
                        className="rounded-full border border-cyan-400 px-3 py-1 text-xs font-medium text-cyan-300"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDuplicate(tpl.id)}
                        className="rounded-full border border-slate-700 px-3 py-1 text-xs font-medium text-slate-300"
                      >
                        Duplicate
                      </button>
                      <button
                        onClick={() => handlePreview(tpl.id)}
                        className="rounded-full border border-slate-700 px-3 py-1 text-xs font-medium text-slate-300"
                      >
                        Preview
                      </button>
                      <button
                        onClick={() => handleArchive(tpl.id)}
                        className="rounded-full border border-slate-700 px-3 py-1 text-xs font-medium text-slate-300"
                      >
                        Archive
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(tpl.id)}
                        className="rounded-full border border-red-500/40 px-3 py-1 text-xs font-medium text-red-300"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {confirmDeleteId !== null && (
        <Card className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80">
          <div className="max-w-md rounded-2xl border border-red-500/40 bg-slate-900 p-6">
            <h3 className="text-lg font-semibold text-red-300">Confirm Deletion</h3>
            <p className="mt-2 text-sm text-slate-300">
              Are you sure you want to delete this template? This action cannot be undone.
            </p>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                className="rounded-full bg-red-500 px-4 py-2 font-medium text-slate-950"
              >
                Delete
              </button>
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="rounded-full border border-slate-700 px-4 py-2 font-medium text-slate-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
