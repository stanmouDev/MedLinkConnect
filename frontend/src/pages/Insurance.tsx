import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { query, create, update, onSyncChange } from '../offline/data';
import { ResourceList } from '../components/ResourceList';
import { Card, ErrorBox, LoadingBox, PageHeader } from '../components/ui';

type Patient = { id: number; full_name: string; patient_id: string };
type Company = {
  id: number;
  name: string;
  code: string;
  type: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
};
type PatientInsurance = {
  id: number;
  patient: number;
  patient_full_name?: string;
  patient_patient_id?: string;
  company: number;
  company_name?: string;
  membership_number: string;
  expiry_date: string;
  employer: string;
  coverage_details: string;
};
type CoverageRule = {
  id: number;
  company: number;
  company_name?: string;
  service: string;
  covered: boolean;
  notes: string;
};

const tabs = [
  { key: 'companies', label: 'Insurance Companies' },
  { key: 'patient', label: 'Patient Insurance' },
  { key: 'coverage', label: 'Coverage Rules' },
] as const;

type TabKey = (typeof tabs)[number]['key'];

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

function TextArea({ label, value, onChange, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
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

export default function Insurance() {
  const role = localStorage.getItem('medlink_user_role') || '';
  const canManage = ['administrator', 'receptionist'].includes(role);

  const [tab, setTab] = useState<TabKey>('companies');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const [companyForm, setCompanyForm] = useState<Company>({
    id: 0, name: '', code: '', type: '', contact: '', phone: '', email: '', address: '',
  });
  const [memberForm, setMemberForm] = useState({
    id: 0, patient: '', company: '', membership_number: '', expiry_date: '', employer: '', coverage_details: '',
  });
  const [ruleForm, setRuleForm] = useState({ id: 0, company: '', service: '', covered: true, notes: '' });

  useEffect(() => {
    let active = true;
    Promise.all([query('patients'), query('insurance-companies')])
      .then(([p, c]) => {
        if (!active) return;
        setPatients(Array.isArray(p) ? p : p.results || []);
        setCompanies(Array.isArray(c) ? c : c.results || []);
      })
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    const unsub = onSyncChange(() => {
      query('insurance-companies')
        .then((c: any) => setCompanies(Array.isArray(c) ? c : c.results || []))
        .catch(() => {});
    });
    return () => {
      active = false;
      unsub();
    };
  }, []);

  function resetCompanyForm() {
    setCompanyForm({ id: 0, name: '', code: '', type: '', contact: '', phone: '', email: '', address: '' });
  }
  function resetMemberForm() {
    setMemberForm({ id: 0, patient: '', company: '', membership_number: '', expiry_date: '', employer: '', coverage_details: '' });
  }
  function resetRuleForm() {
    setRuleForm({ id: 0, company: '', service: '', covered: true, notes: '' });
  }

  async function submitCompany(e: FormEvent) {
    e.preventDefault();
    setActionMsg('');
    setSaving(true);
    try {
      const { id, ...data } = companyForm;
      if (id) await update('insurance-companies', id, data);
      else await create('insurance-companies', data);
      resetCompanyForm();
    } catch (err) {
      setActionMsg((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function submitMember(e: FormEvent) {
    e.preventDefault();
    setActionMsg('');
    setSaving(true);
    try {
      const { id, ...data } = memberForm;
      if (id) await update('private-insurance-records', id, { ...data, patient: Number(data.patient), company: Number(data.company) });
      else await create('private-insurance-records', { ...data, patient: Number(data.patient), company: Number(data.company) });
      resetMemberForm();
    } catch (err) {
      setActionMsg((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function submitRule(e: FormEvent) {
    e.preventDefault();
    setActionMsg('');
    setSaving(true);
    try {
      const { id, ...data } = ruleForm;
      if (id) await update('insurance-coverage-rules', id, { ...data, company: Number(data.company) });
      else await create('insurance-coverage-rules', { ...data, company: Number(data.company) });
      resetRuleForm();
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
      <PageHeader title="Private Insurance" subtitle={canManage ? 'Manage insurers, patient policies and coverage' : 'View insurance information'} />

      {!canManage && (
        <ErrorBox message="Only administrators and receptionists can manage insurance records." />
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setActionMsg(''); }}
            className={`rounded-full px-4 py-2 font-medium ${
              tab === t.key ? 'bg-cyan-500 text-slate-950' : 'border border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {actionMsg && <ErrorBox message={actionMsg} />}

      {tab === 'companies' && (
        <div>
          {canManage && (
            <Card className="mb-8">
              <h2 className="mb-4 text-lg font-semibold">{companyForm.id ? 'Edit Insurance Company' : 'New Insurance Company'}</h2>
              <form onSubmit={submitCompany} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Name" value={companyForm.name} onChange={(v) => setCompanyForm((f) => ({ ...f, name: v }))} />
                <Field label="Code" value={companyForm.code} onChange={(v) => setCompanyForm((f) => ({ ...f, code: v }))} />
                <Field label="Type" value={companyForm.type} onChange={(v) => setCompanyForm((f) => ({ ...f, type: v }))} />
                <Field label="Contact Person" value={companyForm.contact} onChange={(v) => setCompanyForm((f) => ({ ...f, contact: v }))} />
                <Field label="Phone" value={companyForm.phone} onChange={(v) => setCompanyForm((f) => ({ ...f, phone: v }))} />
                <Field label="Email" value={companyForm.email} onChange={(v) => setCompanyForm((f) => ({ ...f, email: v }))} />
                <div className="sm:col-span-2 lg:col-span-3">
                  <Field label="Address" value={companyForm.address} onChange={(v) => setCompanyForm((f) => ({ ...f, address: v }))} />
                </div>
                <div className="flex items-end gap-2">
                  <button type="submit" disabled={saving} className="rounded-full bg-cyan-500 px-4 py-2 font-medium text-slate-950 disabled:opacity-60">{saving ? 'Saving…' : companyForm.id ? 'Save Changes' : 'Create Company'}</button>
                  {companyForm.id > 0 && (
                    <button type="button" onClick={resetCompanyForm} className="rounded-lg border border-slate-700 px-3 py-1.5 hover:bg-slate-800">Cancel</button>
                  )}
                </div>
              </form>
            </Card>
          )}

          <ResourceList
            resource="insurance-companies"
            columns={['Name', 'Code', 'Type', 'Phone', 'Email']}
            emptyText="No insurance companies yet."
            renderRow={(c: Company) => (
              <tr
                key={c.id}
                className={`hover:bg-slate-800/40 ${canManage ? 'cursor-pointer' : ''}`}
                onClick={() => canManage && setCompanyForm(c)}
              >
                <td className="px-4 py-3">{c.name}</td>
                <td className="px-4 py-3">{c.code || '—'}</td>
                <td className="px-4 py-3">{c.type || '—'}</td>
                <td className="px-4 py-3">{c.phone || '—'}</td>
                <td className="px-4 py-3">{c.email || '—'}</td>
              </tr>
            )}
          />
        </div>
      )}

      {tab === 'patient' && (
        <div>
          {canManage && (
            <Card className="mb-8">
              <h2 className="mb-4 text-lg font-semibold">{memberForm.id ? 'Edit Patient Insurance' : 'New Patient Insurance'}</h2>
              <form onSubmit={submitMember} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="block text-sm text-slate-300">Patient</label>
                  <select
                    value={memberForm.patient}
                    onChange={(e) => setMemberForm((f) => ({ ...f, patient: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
                  >
                    <option value="">Select patient</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>{p.full_name} ({p.patient_id})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-300">Insurance Company</label>
                  <select
                    value={memberForm.company}
                    onChange={(e) => setMemberForm((f) => ({ ...f, company: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
                  >
                    <option value="">Select company</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <Field label="Membership Number" value={memberForm.membership_number} onChange={(v) => setMemberForm((f) => ({ ...f, membership_number: v }))} />
                <Field label="Expiry Date" type="date" value={memberForm.expiry_date} onChange={(v) => setMemberForm((f) => ({ ...f, expiry_date: v }))} />
                <Field label="Employer" value={memberForm.employer} onChange={(v) => setMemberForm((f) => ({ ...f, employer: v }))} />
                <div className="sm:col-span-2 lg:col-span-3">
                  <TextArea label="Coverage Details" value={memberForm.coverage_details} onChange={(v) => setMemberForm((f) => ({ ...f, coverage_details: v }))} />
                </div>
                <div className="flex items-end gap-2">
                  <button type="submit" disabled={saving} className="rounded-full bg-cyan-500 px-4 py-2 font-medium text-slate-950 disabled:opacity-60">{saving ? 'Saving…' : memberForm.id ? 'Save Changes' : 'Add Insurance'}</button>
                  {memberForm.id > 0 && (
                    <button type="button" onClick={resetMemberForm} className="rounded-lg border border-slate-700 px-3 py-1.5 hover:bg-slate-800">Cancel</button>
                  )}
                </div>
              </form>
            </Card>
          )}

          <ResourceList
            resource="private-insurance-records"
            columns={['Patient', 'Company', 'Membership #', 'Expiry', 'Employer']}
            emptyText="No patient insurance records yet."
            renderRow={(r: PatientInsurance) => {
              const companyName = companies.find((c) => Number(c.id) === Number(r.company))?.name || r.company_name || '—';
              const expired = r.expiry_date && new Date(r.expiry_date) < new Date();
              return (
                <tr
                  key={r.id}
                  className={`hover:bg-slate-800/40 ${canManage ? 'cursor-pointer' : ''}`}
                  onClick={() => canManage && setMemberForm({
                    id: r.id,
                    patient: String(r.patient),
                    company: String(r.company),
                    membership_number: r.membership_number,
                    expiry_date: r.expiry_date,
                    employer: r.employer,
                    coverage_details: r.coverage_details,
                  })}
                >
                  <td className="px-4 py-3">{r.patient_full_name || r.patient_patient_id || r.patient || r.id}</td>
                  <td className="px-4 py-3">{companyName}</td>
                  <td className="px-4 py-3">{r.membership_number || '—'}</td>
                  <td className={`px-4 py-3 ${expired ? 'text-red-300' : ''}`}>{r.expiry_date || '—'}</td>
                  <td className="px-4 py-3">{r.employer || '—'}</td>
                </tr>
              );
            }}
          />
        </div>
      )}

      {tab === 'coverage' && (
        <div>
          {canManage && (
            <Card className="mb-8">
              <h2 className="mb-4 text-lg font-semibold">{ruleForm.id ? 'Edit Coverage Rule' : 'New Coverage Rule'}</h2>
              <form onSubmit={submitRule} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="block text-sm text-slate-300">Insurance Company</label>
                  <select
                    value={ruleForm.company}
                    onChange={(e) => setRuleForm((f) => ({ ...f, company: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
                  >
                    <option value="">Select company</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <Field label="Service" value={ruleForm.service} onChange={(v) => setRuleForm((f) => ({ ...f, service: v }))} />
                <div>
                  <label className="block text-sm text-slate-300">Covered</label>
                  <select
                    value={ruleForm.covered ? 'true' : 'false'}
                    onChange={(e) => setRuleForm((f) => ({ ...f, covered: e.target.value === 'true' }))}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
                  >
                    <option value="true">Covered</option>
                    <option value="false">Not Covered</option>
                  </select>
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <TextArea label="Notes" value={ruleForm.notes} onChange={(v) => setRuleForm((f) => ({ ...f, notes: v }))} />
                </div>
                <div className="flex items-end gap-2">
                  <button type="submit" disabled={saving} className="rounded-full bg-cyan-500 px-4 py-2 font-medium text-slate-950 disabled:opacity-60">{saving ? 'Saving…' : ruleForm.id ? 'Save Changes' : 'Add Rule'}</button>
                  {ruleForm.id > 0 && (
                    <button type="button" onClick={resetRuleForm} className="rounded-lg border border-slate-700 px-3 py-1.5 hover:bg-slate-800">Cancel</button>
                  )}
                </div>
              </form>
            </Card>
          )}

          <ResourceList
            resource="insurance-coverage-rules"
            columns={['Company', 'Service', 'Status', 'Notes']}
            emptyText="No coverage rules defined yet."
            renderRow={(r: CoverageRule) => {
              const companyName = companies.find((c) => Number(c.id) === Number(r.company))?.name || r.company_name || '—';
              return (
                <tr
                  key={r.id}
                  className={`hover:bg-slate-800/40 ${canManage ? 'cursor-pointer' : ''}`}
                  onClick={() => canManage && setRuleForm({
                    id: r.id,
                    company: String(r.company),
                    service: r.service,
                    covered: Boolean(r.covered),
                    notes: r.notes,
                  })}
                >
                  <td className="px-4 py-3">{companyName}</td>
                  <td className="px-4 py-3">{r.service}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs ${r.covered ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/15 text-red-300 border border-red-500/30'}`}>{r.covered ? 'Covered' : 'Not Covered'}</span>
                  </td>
                  <td className="px-4 py-3">{r.notes || '—'}</td>
                </tr>
              );
            }}
          />
        </div>
      )}
    </div>
  );
}
