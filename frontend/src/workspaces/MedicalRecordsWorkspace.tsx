import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { query, onSyncChange } from '../offline/data';
import WorkspaceShell from './WorkspaceShell';
import { Card, EmptyBox, Table } from '../components/ui';

type Encounter = {
  id: number;
  patient: number;
  patient_full_name?: string;
  encounter_type: string;
  status: string;
  created_at: string;
};

type Referral = {
  id: number;
  patient: number;
  patient_full_name?: string;
  referral_type: string;
  status: string;
  referral_date: string;
};

type Admission = {
  id: number;
  patient: number;
  patient_full_name?: string;
  status: string;
  admission_date: string;
  discharge_date?: string;
};

type TimelineEvent = {
  id: number;
  patient: number;
  event_type: string;
  title: string;
  occurred_at: string;
};

export default function MedicalRecordsWorkspace() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);

  function load() {
    setLoading(true);
    setError('');
    Promise.all([query('encounters'), query('referrals'), query('admissions'), query('timeline')])
      .then(([enc, ref, adm, tl]) => {
        setEncounters(Array.isArray(enc) ? enc : []);
        setReferrals(Array.isArray(ref) ? ref : []);
        setAdmissions(Array.isArray(adm) ? adm : []);
        setTimeline(Array.isArray(tl) ? tl : []);
      })
      .catch((e) => setError(e.message || 'Failed to load data.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    const off = onSyncChange(load);
    return off;
  }, []);

  const activeAdmissions = admissions.filter((a) => a.status === 'admitted' || a.status === 'transferred');
  const recentDischarges = admissions.filter((a) => a.status === 'discharged').slice(0, 10);
  const recentTimeline = timeline.slice(0, 10);

  if (loading && encounters.length === 0) return <EmptyBox message="Loading workspace..." />;
  if (error) return <div className="text-red-400">{error}</div>;

  return (
    <WorkspaceShell
      title="Medical Records Workspace"
      subtitle="Patient records and clinical history"
      actions={
        <div className="flex gap-2">
          <button onClick={() => navigate('/encounters')} className="rounded-full bg-cyan-500 px-4 py-2 font-medium text-slate-950">
            View EMR
          </button>
          <button onClick={() => navigate('/patients')} className="rounded-full border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800">
            Patients
          </button>
        </div>
      }
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-sm text-slate-400">Total Encounters</p>
          <p className="mt-2 text-3xl font-semibold text-cyan-300">{encounters.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-400">Active Admissions</p>
          <p className="mt-2 text-3xl font-semibold text-amber-300">{activeAdmissions.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-400">Referrals</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-300">{referrals.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-400">Timeline Events</p>
          <p className="mt-2 text-3xl font-semibold text-slate-300">{timeline.length}</p>
        </Card>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-semibold">Recent Encounters</h3>
          {encounters.length === 0 ? (
            <EmptyBox message="No encounters." />
          ) : (
            <Table columns={['Patient', 'Type', 'Status', 'Date']}>
              {encounters.slice(0, 10).map((e) => (
                <tr key={e.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3">{e.patient_full_name || `#${e.patient}`}</td>
                  <td className="px-4 py-3">{e.encounter_type}</td>
                  <td className="px-4 py-3">{e.status}</td>
                  <td className="px-4 py-3">{(e.created_at || '').slice(0, 10)}</td>
                </tr>
              ))}
            </Table>
          )}
        </Card>

        <Card>
          <h3 className="mb-3 font-semibold">Recent Discharges</h3>
          {recentDischarges.length === 0 ? (
            <EmptyBox message="No recent discharges." />
          ) : (
            <Table columns={['Patient', 'Admitted', 'Discharged']}>
              {recentDischarges.map((a) => (
                <tr key={a.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3">{a.patient_full_name || `#${a.patient}`}</td>
                  <td className="px-4 py-3">{(a.admission_date || '').slice(0, 10)}</td>
                  <td className="px-4 py-3">{(a.discharge_date || '').slice(0, 10)}</td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      </div>

      <Card>
        <h3 className="mb-3 font-semibold">Recent Timeline</h3>
        {recentTimeline.length === 0 ? (
          <EmptyBox message="No timeline events." />
        ) : (
          <Table columns={['Time', 'Event', 'Details']}>
            {recentTimeline.map((ev) => (
              <tr key={ev.id} className="hover:bg-slate-800/40">
                <td className="px-4 py-3">{(ev.occurred_at || '').slice(0, 16)}</td>
                <td className="px-4 py-3">{ev.event_type}</td>
                <td className="px-4 py-3">{ev.title}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <div className="mt-6 flex flex-wrap gap-2">
        <button onClick={() => navigate('/referrals')} className="rounded-full border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800">
          Referrals
        </button>
        <button onClick={() => navigate('/inpatient')} className="rounded-full border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800">
          Admissions
        </button>
        <button onClick={() => navigate('/timeline')} className="rounded-full border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800">
          Full Timeline
        </button>
      </div>
    </WorkspaceShell>
  );
}
