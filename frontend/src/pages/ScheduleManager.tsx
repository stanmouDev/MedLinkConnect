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

type ReportSchedule = {
  id: number;
  report_template?: number;
  report_template_name?: string;
  frequency?: string;
  cron_expression?: string;
  recipients?: string[];
  email_subject?: string;
  email_body?: string;
  active?: boolean;
  next_run?: string;
  last_run?: string;
  updated_at?: string;
};

type ReportTemplate = {
  id: number;
  name: string;
  category?: string;
};

type FormState = {
  report_template: string;
  frequency: string;
  cron_expression: string;
  recipients: string;
  email_subject: string;
  email_body: string;
  active: boolean;
};

const INITIAL_FORM: FormState = {
  report_template: '',
  frequency: 'weekly',
  cron_expression: '0 8 * * 1',
  recipients: '',
  email_subject: 'Weekly Report',
  email_body: 'Please find the attached report.',
  active: true,
};

const FREQUENCIES = [
  'daily',
  'weekly',
  'monthly',
  'quarterly',
  'yearly',
  'custom',
] as const;

const CRON_PRESETS: Record<string, string> = {
  daily: '0 8 * * *',
  weekly: '0 8 * * 1',
  monthly: '0 8 1 * *',
  quarterly: '0 8 1 1,4,7,10 *',
  yearly: '0 8 1 1 *',
  custom: '0 0 * * *',
};

export default function ScheduleManager() {
  const role = localStorage.getItem('medlink_user_role') || '';
  const isAdmin = role === 'administrator';

  const [schedules, setSchedules] = useState<ReportSchedule[]>([]);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  function updateForm(field: keyof FormState, value: string | boolean) {
    setForm((f) => {
      const updated = { ...f, [field]: value };
      if (field === 'frequency' && typeof value === 'string' && value in CRON_PRESETS) {
        updated.cron_expression = CRON_PRESETS[value as keyof typeof CRON_PRESETS];
      }
      return updated;
    });
  }

  function resetForm() {
    setForm(INITIAL_FORM);
    setEditingId(null);
  }

  function startCreate() {
    resetForm();
    setShowForm(true);
  }

  function startEdit(schedule: ReportSchedule) {
    setForm({
      report_template: schedule.report_template ? String(schedule.report_template) : '',
      frequency: schedule.frequency || 'weekly',
      cron_expression: schedule.cron_expression || CRON_PRESETS.weekly,
      recipients: Array.isArray(schedule.recipients) ? schedule.recipients.join(', ') : (schedule.recipients || ''),
      email_subject: schedule.email_subject || 'Scheduled Report',
      email_body: schedule.email_body || '',
      active: schedule.active ?? true,
    });
    setEditingId(schedule.id);
    setShowForm(true);
  }

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [schedulesData, templatesData] = await Promise.all([
        query('report-schedules'),
        query('report-templates'),
      ]);
      setSchedules(Array.isArray(schedulesData) ? schedulesData : schedulesData.results || []);
      setTemplates(Array.isArray(templatesData) ? templatesData : templatesData.results || []);
    } catch (e) {
      setError((e as Error).message || 'Could not load schedules.');
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
      const recipientsList = form.recipients
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean);
      const payload = {
        ...form,
        report_template: Number(form.report_template),
        recipients: recipientsList,
      };
      if (editingId) {
        ensureOnline();
        await api.update('report-schedules', editingId, payload);
      } else {
        await create('report-schedules', payload);
      }
      resetForm();
      setShowForm(false);
      load();
    } catch (err) {
      setError((err as Error).message || 'Could not save schedule.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    setError('');
    try {
      ensureOnline();
      await api.remove('report-schedules', id);
      setConfirmDeleteId(null);
      load();
    } catch (err) {
      setError((err as Error).message || 'Could not delete schedule.');
    }
  }

  function fmtNextRun(nextRun?: string): string {
    if (!nextRun) return '—';
    const d = new Date(nextRun);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString();
  }

  if (loading) return <LoadingBox />;
  if (error) return <ErrorBox message={error} />;

  return (
    <div>
      <PageHeader
        title="Report Schedules"
        subtitle="Manage automated report generation and email delivery"
        action={
          isAdmin && !showForm ? (
            <button
              onClick={startCreate}
              className="rounded-full bg-cyan-500 px-4 py-2 font-medium text-slate-950"
            >
              New Schedule
            </button>
          ) : undefined
        }
      />

      {!isAdmin && (
        <Card className="mb-6">
          <p className="text-sm text-slate-400">
            Schedule management is restricted to administrators.
          </p>
        </Card>
      )}

      {error && <ErrorBox message={error} className="mb-4" />}

      {showForm && isAdmin && (
        <Card className="mb-6">
          <h2 className="mb-4 text-lg font-semibold">
            {editingId ? 'Edit Schedule' : 'New Schedule'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm text-slate-300">Report Template</label>
                <select
                  required
                  value={form.report_template}
                  onChange={(e) => updateForm('report_template', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
                >
                  <option value="">Select template…</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-300">Frequency</label>
                <select
                  value={form.frequency}
                  onChange={(e) => updateForm('frequency', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
                >
                  {FREQUENCIES.map((freq) => (
                    <option key={freq} value={freq} className="capitalize">{freq}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-300">Cron Expression</label>
              <input
                value={form.cron_expression}
                onChange={(e) => updateForm('cron_expression', e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300">Recipients (comma-separated emails)</label>
              <textarea
                value={form.recipients}
                onChange={(e) => updateForm('recipients', e.target.value)}
                rows={2}
                placeholder="user@example.com, manager@example.com"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm text-slate-300">Email Subject</label>
                <input
                  value={form.email_subject}
                  onChange={(e) => updateForm('email_subject', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300">Active</label>
                <label className="mt-3 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => updateForm('active', e.target.checked)}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-400 focus:border-cyan-400"
                  />
                  <span className="text-sm text-slate-300">Enabled</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-300">Email Body</label>
              <textarea
                value={form.email_body}
                onChange={(e) => updateForm('email_body', e.target.value)}
                rows={4}
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

      {schedules.length === 0 ? (
        <EmptyBox message="No report schedules configured yet." />
      ) : (
        <div className="space-y-4">
          {schedules.map((schedule) => (
            <Card key={schedule.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-cyan-300">
                    {schedule.report_template_name || `Schedule #${schedule.id}`}
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
                    <span className="rounded-full border border-slate-700 px-2 py-0.5 capitalize">{schedule.frequency}</span>
                    <span className={`rounded-full px-2 py-0.5 ${
                      schedule.active ? 'text-emerald-300' : 'text-slate-500'
                    }`}>{schedule.active ? 'Active' : 'Inactive'}</span>
                    <span className="rounded-full border border-slate-700 px-2 py-0.5 font-mono">{schedule.cron_expression}</span>
                  </div>
                  {schedule.recipients && schedule.recipients.length > 0 && (
                    <p className="mt-2 text-xs text-slate-500">
                      Recipients: {schedule.recipients.join(', ')}
                    </p>
                  )}
                  <div className="mt-2 text-xs text-slate-500">
                    Next run: {fmtNextRun(schedule.next_run)}
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => startEdit(schedule)}
                      className="rounded-full border border-cyan-400 px-3 py-1 text-xs font-medium text-cyan-300"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(schedule.id)}
                      className="rounded-full border border-red-500/40 px-3 py-1 text-xs font-medium text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                )}
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
              Are you sure you want to delete this schedule? This action cannot be undone.
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
