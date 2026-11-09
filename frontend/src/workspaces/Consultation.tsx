import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { query, onSyncChange, create } from '../offline/data';
import PatientHeader from './PatientHeader';
import { Card, EmptyBox, Table } from '../components/ui';

type Encounter = {
  id: number;
  patient: number;
  encounter_type: string;
  status: string;
  notes?: string;
  diagnosis?: string;
  treatment_plan?: string;
  created_at: string;
};

type VitalSign = {
  id: number;
  patient: number;
  temperature_c?: number;
  blood_pressure?: string;
  pulse_bpm?: number;
  oxygen_saturation?: number;
  respiratory_rate?: number;
  recorded_at: string;
};

type Prescription = {
  id: number;
  patient: number;
  medication: string;
  dosage: string;
  frequency: string;
  status: string;
  created_at: string;
};

type Patient = {
  id: number;
  full_name: string;
  patient_id: string;
  sex?: string;
  date_of_birth?: string;
  allergies?: string;
  insurance_type?: string;
};

export default function Consultation() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [patient, setPatient] = useState<Patient | null>(null);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [vitals, setVitals] = useState<VitalSign[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [saving, setSaving] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  const [chiefComplaint, setChiefComplaint] = useState('');
  const [history, setHistory] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [followUp, setFollowUp] = useState('');

  function load() {
    if (!patientId) return;
    setLoading(true);
    setError('');
    Promise.all([
      query('patients'),
      query('encounters'),
      query('vitals'),
      query('prescriptions'),
    ])
      .then(([p, enc, vit, rx]) => {
        const allPatients = Array.isArray(p) ? p : [];
        const found = allPatients.find((pt: Patient) => pt.id === Number(patientId));
        setPatient(found || null);
        setEncounters((Array.isArray(enc) ? enc : []).filter((e: Encounter) => e.patient === Number(patientId)));
        setVitals((Array.isArray(vit) ? vit : []).filter((v: VitalSign) => v.patient === Number(patientId)));
        setPrescriptions((Array.isArray(rx) ? rx : []).filter((r: Prescription) => r.patient === Number(patientId)));
      })
      .catch((e) => setError(e.message || 'Failed to load patient data.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    const off = onSyncChange(load);
    return off;
  }, [patientId]);

  async function handleSaveEncounter() {
    if (!patientId) return;
    setSaving(true);
    setActionMsg('');
    try {
      await create('encounters', {
        patient: Number(patientId),
        encounter_type: 'consultation',
        status: 'completed',
        notes: `${chiefComplaint}\n\n${history}`.trim(),
        diagnosis,
        treatment_plan: treatmentPlan,
        follow_up_instructions: followUp,
      });
      setActionMsg('Encounter saved successfully.');
      setChiefComplaint('');
      setHistory('');
      setDiagnosis('');
      setTreatmentPlan('');
      setFollowUp('');
      load();
    } catch (err) {
      setActionMsg((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleCreatePrescription() {
    if (!patientId) return;
    const medication = prompt('Medication name:');
    if (!medication) return;
    const dosage = prompt('Dosage:');
    if (!dosage) return;
    try {
      await create('prescriptions', {
        patient: Number(patientId),
        medication,
        dosage,
        frequency: prompt('Frequency:') || '',
        duration: prompt('Duration:') || '',
        status: 'active',
      });
      setActionMsg('Prescription created.');
      load();
    } catch (err) {
      setActionMsg((err as Error).message);
    }
  }

  async function handleRequestLab() {
    if (!patientId) return;
    const testName = prompt('Test name:');
    if (!testName) return;
    const priority = prompt('Priority (routine/urgent/emergency):') || 'routine';
    try {
      await create('lab-requests', {
        patient: Number(patientId),
        test_name: testName,
        priority,
        status: 'pending',
      });
      setActionMsg('Lab request created.');
      load();
    } catch (err) {
      setActionMsg((err as Error).message);
    }
  }

  async function handleCreateReferral() {
    if (!patientId) return;
    navigate(`/referrals?patient=${patientId}`);
  }

  async function handleHandover() {
    if (!patientId) return;
    navigate(`/handovers?patient=${patientId}`);
  }

  if (loading) return <EmptyBox message="Loading consultation..." />;
  if (error) return <div className="text-red-400">{error}</div>;
  if (!patient) return <EmptyBox message="Patient not found." />;

  const latestVitals = vitals[0];

  return (
    <div>
      <PatientHeader
        patient={patient}
        alerts={patient.allergies ? [`Allergies: ${patient.allergies}`] : undefined}
      />

      {actionMsg && <div className="mb-4 rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm text-cyan-300">{actionMsg}</div>}

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-semibold">CHIEF COMPLAINT & HISTORY</h3>
          <div className="grid gap-3">
            <div>
              <label className="block text-sm text-slate-400">Chief Complaint</label>
              <textarea
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
                rows={3}
                placeholder="Patient's main complaint..."
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400">History</label>
              <textarea
                value={history}
                onChange={(e) => setHistory(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
                rows={4}
                placeholder="History of present illness..."
              />
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="mb-3 font-semibold">CURRENT VITALS</h3>
          {latestVitals ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <div><strong>Temperature:</strong> {latestVitals.temperature_c ?? '—'}°C</div>
              <div><strong>BP:</strong> {latestVitals.blood_pressure || '—'}</div>
              <div><strong>Pulse:</strong> {latestVitals.pulse_bpm ?? '—'} bpm</div>
              <div><strong>O2:</strong> {latestVitals.oxygen_saturation ?? '—'}%</div>
              <div><strong>Resp Rate:</strong> {latestVitals.respiratory_rate ?? '—'}</div>
              <div><strong>Recorded:</strong> {(latestVitals.recorded_at || '').slice(0, 16)}</div>
            </div>
          ) : (
            <EmptyBox message="No vitals recorded." />
          )}
          <div className="mt-3">
            <button
              onClick={() => navigate(`/vitals?patient=${patient.id}`)}
              className="rounded-full border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800"
            >
              Record Vitals
            </button>
          </div>
        </Card>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-semibold">DIAGNOSIS & TREATMENT PLAN</h3>
          <div className="grid gap-3">
            <div>
              <label className="block text-sm text-slate-400">Diagnosis</label>
              <textarea
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
                rows={3}
                placeholder="Working diagnosis..."
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400">Treatment Plan</label>
              <textarea
                value={treatmentPlan}
                onChange={(e) => setTreatmentPlan(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
                rows={4}
                placeholder="Treatment plan..."
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400">Follow-up Instructions</label>
              <textarea
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
                rows={2}
                placeholder="Follow-up instructions..."
              />
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="mb-3 font-semibold">ACTIONS</h3>
          <div className="grid gap-2">
            <button
              onClick={handleSaveEncounter}
              disabled={saving}
              className="rounded-full bg-cyan-500 px-4 py-2 font-medium text-slate-950 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Encounter'}
            </button>
            <button
              onClick={handleCreatePrescription}
              className="rounded-full border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
            >
              Create Prescription
            </button>
            <button
              onClick={handleRequestLab}
              className="rounded-full border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
            >
              Request Lab Test
            </button>
            <button
              onClick={handleCreateReferral}
              className="rounded-full border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
            >
              Create Referral
            </button>
            <button
              onClick={handleHandover}
              className="rounded-full border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
            >
              Handover Patient
            </button>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-semibold">RECENT ENCOUNTERS</h3>
          {encounters.length === 0 ? (
            <EmptyBox message="No previous encounters." />
          ) : (
            <Table columns={['Type', 'Status', 'Date']}>
              {encounters.slice(0, 5).map((e) => (
                <tr key={e.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3">{e.encounter_type}</td>
                  <td className="px-4 py-3">{e.status}</td>
                  <td className="px-4 py-3">{(e.created_at || '').slice(0, 10)}</td>
                </tr>
              ))}
            </Table>
          )}
        </Card>

        <Card>
          <h3 className="mb-3 font-semibold">ACTIVE PRESCRIPTIONS</h3>
          {prescriptions.length === 0 ? (
            <EmptyBox message="No active prescriptions." />
          ) : (
            <Table columns={['Medication', 'Dosage', 'Frequency', 'Status']}>
              {prescriptions.slice(0, 5).map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3">{p.medication}</td>
                  <td className="px-4 py-3">{p.dosage}</td>
                  <td className="px-4 py-3">{p.frequency || '—'}</td>
                  <td className="px-4 py-3">{p.status}</td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}
