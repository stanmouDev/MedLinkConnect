import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { query, onSyncChange } from '../offline/data';
import { useAuth } from '../auth';
import { SyncStatusBar } from '../offline/SyncStatusBar';
import { Card, EmptyBox, Table } from '../components/ui';

type Patient = {
  id: number;
  full_name: string;
  patient_id: string;
  sex?: string;
  date_of_birth?: string;
  phone?: string;
  address?: string;
  insurance_type?: string;
  created_at: string;
};

type Encounter = {
  id: number;
  patient: number;
  patient_full_name?: string;
  encounter_type: string;
  status: string;
  created_at: string;
};

type Appointment = {
  id: number;
  patient: number;
  patient_full_name?: string;
  appointment_date: string;
  status: string;
  reason?: string;
};

export default function ReceptionWorkspace() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  function load() {
    setLoading(true);
    setError('');
    Promise.all([query('patients'), query('encounters'), query('appointments')])
      .then(([p, enc, appt]) => {
        setPatients(Array.isArray(p) ? p : []);
        setEncounters(Array.isArray(enc) ? enc : []);
        setAppointments(Array.isArray(appt) ? appt : []);
      })
      .catch((e) => setError(e.message || 'Failed to load data.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    const off = onSyncChange(load);
    return off;
  }, []);

  const waitingPatients = encounters.filter((e) => e.status === 'waiting');
  const today = new Date().toISOString().slice(0, 10);
  const todayAppointments = appointments.filter((a) => (a.appointment_date || '').startsWith(today));
  const todayRegistrations = patients.filter((p) => (p.created_at || '').startsWith(today));
  const recentPatients = patients.slice(0, 10);

  if (loading && patients.length === 0) return <EmptyBox message="Loading workspace..." />;
  if (error) return <div className="text-red-400">{error}</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">
          Good morning, {user?.username || 'Receptionist'}
        </h1>
        <p className="text-sm text-slate-400">Reception Workspace — Patient registration and appointments</p>
        <SyncStatusBar />
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <button onClick={() => navigate('/patients')} className="rounded-full bg-cyan-500 px-4 py-2 font-medium text-slate-950">
          + Register Patient
        </button>
        <button onClick={() => navigate('/patients')} className="rounded-full border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800">
          Search Patient
        </button>
        <button onClick={() => navigate('/appointments')} className="rounded-full border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800">
          Create Appointment
        </button>
        <button onClick={() => navigate('/billing')} className="rounded-full border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800">
          Billing
        </button>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-sm text-slate-400">Today's Registrations</p>
          <p className="mt-2 text-3xl font-semibold text-cyan-300">{todayRegistrations.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-400">Waiting for Triage</p>
          <p className="mt-2 text-3xl font-semibold text-amber-300">{waitingPatients.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-400">Today's Appointments</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-300">{todayAppointments.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-400">Total Patients</p>
          <p className="mt-2 text-3xl font-semibold text-slate-300">{patients.length}</p>
        </Card>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-semibold">WAITING PATIENTS</h3>
          {waitingPatients.length === 0 ? (
            <EmptyBox message="No patients waiting." />
          ) : (
            <Table columns={['Patient', 'Type', 'Time']}>
              {waitingPatients.slice(0, 10).map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3">{p.patient_full_name || `#${p.patient}`}</td>
                  <td className="px-4 py-3">{p.encounter_type}</td>
                  <td className="px-4 py-3">{(p.created_at || '').slice(0, 16)}</td>
                </tr>
              ))}
            </Table>
          )}
        </Card>

        <Card>
          <h3 className="mb-3 font-semibold">TODAY'S APPOINTMENTS</h3>
          {todayAppointments.length === 0 ? (
            <EmptyBox message="No appointments today." />
          ) : (
            <Table columns={['Patient', 'Time', 'Status']}>
              {todayAppointments.slice(0, 10).map((a) => (
                <tr key={a.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3">{a.patient_full_name || `#${a.patient}`}</td>
                  <td className="px-4 py-3">{(a.appointment_date || '').slice(0, 16)}</td>
                  <td className="px-4 py-3">{a.status}</td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      </div>

      <Card>
        <h3 className="mb-3 font-semibold">RECENT PATIENTS</h3>
        {recentPatients.length === 0 ? (
          <EmptyBox message="No patients registered." />
        ) : (
          <Table columns={['Name', 'ID', 'Sex', 'Phone', 'Registered']}>
            {recentPatients.map((p) => (
              <tr key={p.id} className="hover:bg-slate-800/40">
                <td className="px-4 py-3">{p.full_name}</td>
                <td className="px-4 py-3">{p.patient_id}</td>
                <td className="px-4 py-3">{p.sex || '—'}</td>
                <td className="px-4 py-3">{p.phone || '—'}</td>
                <td className="px-4 py-3">{(p.created_at || '').slice(0, 10)}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
