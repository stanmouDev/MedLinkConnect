import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { query, create, onSyncChange } from '../offline/data';
import { api, ensureOnline } from '../api';
import { ResourceList } from '../components/ResourceList';
import { Card, ErrorBox, LoadingBox, PageHeader } from '../components/ui';

type Patient = { id: number; full_name: string; patient_id: string };
type NHISRecord = {
  id: number;
  patient: number;
  patient_full_name?: string;
  patient_patient_id?: string;
  nhis_number: string;
  membership_status: string;
  expiry_date: string;
  scheme_type: string;
  verified: boolean;
  verified_at: string;
  created_at: string;
};

const statusColors: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
  expired: 'bg-red-500/15 text-red-300 border border-red-500/30',
  inactive: 'bg-slate-500/15 text-slate-300 border border-slate-500/30',
  pending: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
};

function Field({ label, value, onChange, type = 'text', required }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
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

export default function NHIS() {
  const role = localStorage.getItem('medlink_user_role') || '';
  const canManage = ['administrator', 'receptionist', 'doctor'].includes(role);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState('');

  const [form, setForm] = useState({
    patient: '',
    nhis_number: '',
    membership_status: 'active',
    expiry_date: '',
    scheme_type: 'standard',
  });

  useEffect(() => {
    let active = true;
    Promise.all([query('patients'), query('nhis-records')])
      .then(([p]) => {
        if (!active) return;
        setPatients(Array.isArray(p) ? p : p.results || []);
      })
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    const unsub = onSyncChange(() => {
      query('patients')
        .then((p: any) => setPatients(Array.isArray(p) ? p : p.results || []))
        .catch(() => {});
    });
    return () => {
      active = false;
      unsub();
    };
  }, []);

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleVerify() {
    if (!form.nhis_number) {
      setVerifyMsg('Enter an NHIS number to verify.');
      return;
    }
    setVerifying(true);
    setVerifyMsg('');
    try {
      ensureOnline();
      const res = await api.post('nhis-records', undefined, {
        action: 'verify',
        nhis_number: form.nhis_number,
      });
      const valid = res && (res.valid || res.verified);
      setVerifyMsg(valid ? `Verified: ${res.message || 'valid membership'}` : `Not verified: ${res.message || 'invalid number'}`);
    } catch (err) {
      setVerifyMsg((err as Error).message);
    } finally {
      setVerifying(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setActionMsg('');
    setSaving(true);
    try {
      await create('nhis-records', {
        ...form,
        patient: Number(form.patient),
        verified: Boolean(verifyMsg && verifyMsg.startsWith('Verified')),
      });
      setForm({
        patient: '',
        nhis_number: '',
        membership_status: 'active',
        expiry_date: '',
        scheme_type: 'standard',
      });
      setVerifyMsg('');
    } catch (err) {
      setActionMsg((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingBox />;
  if (error) return <ErrorBox message={error} />;

  return (
    <div>
      <PageHeader title="NHIS Management" subtitle={canManage ? 'Register and verify NHIS coverage' : 'View NHIS insurance status'} />

      {!canManage && (
        <ErrorBox message="Only administrators, receptionists, and doctors can register or edit NHIS records." />
      )}

      {canManage && (
        <Card className="mb-8">
          <h2 className="mb-4 text-lg font-semibold">Register NHIS Record</h2>
          {actionMsg && <ErrorBox message={actionMsg} />}
          {verifyMsg && (
            <div className="mb-4 rounded-2xl border border-cyan-500/40 bg-cyan-500/10 p-4 text-sm text-cyan-300">{verifyMsg}</div>
          )}
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-sm text-slate-300">Patient</label>
              <select
                value={form.patient}
                onChange={(e) => update('patient', e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
              >
                <option value="">Select patient</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>{p.full_name} ({p.patient_id})</option>
                ))}
              </select>
            </div>
            <Field label="NHIS Number" value={form.nhis_number} onChange={(v) => update('nhis_number', v)} required />
            <div>
              <label className="block text-sm text-slate-300">Membership Status</label>
              <select
                value={form.membership_status}
                onChange={(e) => update('membership_status', e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
              >
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <Field label="Expiry Date" type="date" value={form.expiry_date} onChange={(v) => update('expiry_date', v)} />
            <div>
              <label className="block text-sm text-slate-300">Scheme Type</label>
              <select
                value={form.scheme_type}
                onChange={(e) => update('scheme_type', e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
              >
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
                <option value="exemption">Exemption</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={handleVerify}
                disabled={verifying}
                className="rounded-full border border-cyan-400 px-4 py-2 font-medium text-cyan-300 disabled:opacity-60"
              >
                {verifying ? 'Verifying…' : 'Verify'}
              </button>
            </div>
            <div className="flex items-end sm:col-span-2 lg:col-span-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-cyan-500 px-4 py-2 font-medium text-slate-950 disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Register'}
              </button>
            </div>
          </form>
        </Card>
      )}

      <ResourceList
        resource="nhis-records"
        columns={['Patient', 'NHIS Number', 'Status', 'Scheme', 'Expiry', 'Insurance Status']}
        emptyText="No NHIS records yet."
        renderRow={(r: NHISRecord) => {
          const expired = r.expiry_date && new Date(r.expiry_date) < new Date();
          const status = expired && r.membership_status === 'active' ? 'expired' : r.membership_status;
          return (
            <tr key={r.id} className="hover:bg-slate-800/40">
              <td className="px-4 py-3">{r.patient_full_name || r.patient_patient_id || r.patient || r.id}</td>
              <td className="px-4 py-3">{r.nhis_number || '—'}</td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2 py-1 text-xs ${statusColors[status] || 'bg-slate-700 text-slate-200'}`}>{status}</span>
              </td>
              <td className="px-4 py-3 capitalize">{r.scheme_type || '—'}</td>
              <td className="px-4 py-3">{r.expiry_date || '—'}</td>
              <td className="px-4 py-3">
                {status === 'active' ? (
                  <span className="text-emerald-300">Covered</span>
                ) : status === 'pending' ? (
                  <span className="text-amber-300">Pending</span>
                ) : (
                  <span className="text-red-300">Not covered</span>
                )}
                {r.verified && <span className="ml-2 text-xs text-cyan-300">✓ verified</span>}
              </td>
            </tr>
          );
        }}
      />
    </div>
  );
}
