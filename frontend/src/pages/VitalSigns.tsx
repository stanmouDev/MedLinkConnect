import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { query, create, onSyncChange } from '../offline/data';
import { Card, ErrorBox, LoadingBox, EmptyBox } from '../components/ui';
import { useAuth } from '../auth';

type VitalSign = {
  id: number | string;
  patient?: number;
  patient_full_name?: string;
  encounter?: number | null;
  temperature_c?: number | null;
  pulse_bpm?: number | null;
  blood_pressure?: string;
  oxygen_saturation?: number | null;
  respiratory_rate?: number | null;
  weight_kg?: number | null;
  height_cm?: number | null;
  blood_glucose?: number | null;
  pain_score?: number | null;
  level_of_consciousness?: string;
  additional_notes?: string;
  recorded_by?: number;
  recorded_by_username?: string;
  recorded_at?: string;
  updated_at?: string;
};

type Patient = {
  id: number;
  full_name: string;
  patient_id: string;
};

const ALERT_THRESHOLDS = {
  temperature_high: 38.0,
  temperature_low: 35.0,
  bp_systolic_high: 140,
  bp_systolic_low: 90,
  bp_diastolic_high: 90,
  bp_diastolic_low: 60,
  pulse_high: 100,
  pulse_low: 60,
  o2_low: 95,
  resp_high: 20,
  resp_low: 12,
  pain_high: 7,
};

function getAlerts(v: VitalSign): string[] {
  const alerts: string[] = [];
  if (v.temperature_c != null) {
    if (v.temperature_c >= ALERT_THRESHOLDS.temperature_high) alerts.push('High temperature');
    else if (v.temperature_c <= ALERT_THRESHOLDS.temperature_low) alerts.push('Low temperature');
  }
  if (v.blood_pressure) {
    const parts = v.blood_pressure.split('/');
    if (parts.length === 2) {
      const sys = parseInt(parts[0], 10);
      const dia = parseInt(parts[1], 10);
      if (!isNaN(sys)) {
        if (sys > ALERT_THRESHOLDS.bp_systolic_high) alerts.push('High systolic BP');
        else if (sys < ALERT_THRESHOLDS.bp_systolic_low) alerts.push('Low systolic BP');
      }
      if (!isNaN(dia)) {
        if (dia > ALERT_THRESHOLDS.bp_diastolic_high) alerts.push('High diastolic BP');
        else if (dia < ALERT_THRESHOLDS.bp_diastolic_low) alerts.push('Low diastolic BP');
      }
    }
  }
  if (v.pulse_bpm != null) {
    if (v.pulse_bpm > ALERT_THRESHOLDS.pulse_high) alerts.push('High pulse rate');
    else if (v.pulse_bpm < ALERT_THRESHOLDS.pulse_low) alerts.push('Low pulse rate');
  }
  if (v.oxygen_saturation != null && v.oxygen_saturation < ALERT_THRESHOLDS.o2_low) {
    alerts.push('Low oxygen saturation');
  }
  if (v.respiratory_rate != null) {
    if (v.respiratory_rate > ALERT_THRESHOLDS.resp_high) alerts.push('High respiratory rate');
    else if (v.respiratory_rate < ALERT_THRESHOLDS.resp_low) alerts.push('Low respiratory rate');
  }
  if (v.pain_score != null && v.pain_score >= ALERT_THRESHOLDS.pain_high) {
    alerts.push('High pain score');
  }
  return alerts;
}

export default function VitalSigns() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [history, setHistory] = useState<VitalSign[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    encounter: '',
    temperature_c: '',
    pulse_bpm: '',
    blood_pressure: '',
    oxygen_saturation: '',
    respiratory_rate: '',
    weight_kg: '',
    height_cm: '',
    blood_glucose: '',
    pain_score: '',
    level_of_consciousness: '',
    additional_notes: '',
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const patientId = params.get('patient');
    if (patientId) {
      setSelectedPatient(patientId);
    }
  }, []);

  useEffect(() => {
    query('patients')
      .then((data: any) => {
        const list = Array.isArray(data) ? data : data.results || [];
        setPatients(list);
        if (list.length && !selectedPatient) {
          setSelectedPatient(String(list[0].id));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const unsub = onSyncChange(() => {
      query('vitals')
        .then((data: any) => {
          const list = Array.isArray(data) ? data : data.results || [];
          const filtered = list
            .filter((v: any) => String(v.patient) === String(selectedPatient))
            .sort((a: any, b: any) => String(b.recorded_at || '').localeCompare(String(a.recorded_at || '')));
          setHistory(filtered);
        })
        .catch(() => {});
    });
    return unsub;
  }, [selectedPatient]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload: any = {
        patient: Number(selectedPatient),
        recorded_by: user?.id,
        recorded_at: new Date().toISOString(),
      };
      if (form.encounter) payload.encounter = Number(form.encounter);
      if (form.temperature_c) payload.temperature_c = Number(form.temperature_c);
      if (form.pulse_bpm) payload.pulse_bpm = Number(form.pulse_bpm);
      if (form.blood_pressure) payload.blood_pressure = form.blood_pressure;
      if (form.oxygen_saturation) payload.oxygen_saturation = Number(form.oxygen_saturation);
      if (form.respiratory_rate) payload.respiratory_rate = Number(form.respiratory_rate);
      if (form.weight_kg) payload.weight_kg = Number(form.weight_kg);
      if (form.height_cm) payload.height_cm = Number(form.height_cm);
      if (form.blood_glucose) payload.blood_glucose = Number(form.blood_glucose);
      if (form.pain_score) payload.pain_score = Number(form.pain_score);
      if (form.level_of_consciousness) payload.level_of_consciousness = form.level_of_consciousness;
      if (form.additional_notes) payload.additional_notes = form.additional_notes;

      await create('vitals', payload);
      setForm({
        encounter: '',
        temperature_c: '',
        pulse_bpm: '',
        blood_pressure: '',
        oxygen_saturation: '',
        respiratory_rate: '',
        weight_kg: '',
        height_cm: '',
        blood_glucose: '',
        pain_score: '',
        level_of_consciousness: '',
        additional_notes: '',
      });
    } catch (err) {
      setError((err as Error).message || 'Could not save vital signs.');
    } finally {
      setSaving(false);
    }
  }

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const selectedPatientObj = patients.find((p) => String(p.id) === String(selectedPatient));

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Vital Signs</h1>
          <p className="mt-1 text-sm text-slate-400">Record and review patient vital signs</p>
        </div>
      </div>

      {error && <ErrorBox message={error} className="mb-4" />}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <h2 className="mb-4 text-lg font-semibold">Record Vital Signs</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-300">Patient *</label>
              <select
                value={selectedPatient}
                onChange={(e) => setSelectedPatient(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
                required
              >
                <option value="">Select patient</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} ({p.patient_id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-300">Encounter (optional)</label>
              <input
                type="text"
                value={form.encounter}
                onChange={(e) => update('encounter', e.target.value)}
                placeholder="Encounter ID"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
              />
              <p className="mt-1 text-xs text-slate-500">Leave blank if not associated with an encounter</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-slate-300">Temperature (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.temperature_c}
                  onChange={(e) => update('temperature_c', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300">Pulse (bpm)</label>
                <input
                  type="number"
                  value={form.pulse_bpm}
                  onChange={(e) => update('pulse_bpm', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-slate-300">Blood Pressure</label>
                <input
                  type="text"
                  value={form.blood_pressure}
                  onChange={(e) => update('blood_pressure', e.target.value)}
                  placeholder="120/80"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300">O2 Sat (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.oxygen_saturation}
                  onChange={(e) => update('oxygen_saturation', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-slate-300">Respiratory Rate</label>
                <input
                  type="number"
                  value={form.respiratory_rate}
                  onChange={(e) => update('respiratory_rate', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300">Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.weight_kg}
                  onChange={(e) => update('weight_kg', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-slate-300">Height (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.height_cm}
                  onChange={(e) => update('height_cm', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300">Blood Glucose (mmol/L)</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.blood_glucose}
                  onChange={(e) => update('blood_glucose', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-slate-300">Pain Score (0-10)</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={form.pain_score}
                  onChange={(e) => update('pain_score', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300">Level of Consciousness</label>
                <select
                  value={form.level_of_consciousness}
                  onChange={(e) => update('level_of_consciousness', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
                >
                  <option value="">—</option>
                  <option value="Alert">Alert</option>
                  <option value="Verbal">Verbal (AVPU)</option>
                  <option value="Pain">Pain (AVPU)</option>
                  <option value="Unresponsive">Unresponsive (AVPU)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-300">Additional Notes</label>
              <textarea
                value={form.additional_notes}
                onChange={(e) => update('additional_notes', e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
              />
            </div>

            <button
              type="submit"
              disabled={saving || !selectedPatient}
              className="w-full rounded-full bg-cyan-500 px-4 py-2 font-medium text-slate-950 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save Vital Signs'}
            </button>
          </form>
        </Card>

        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                {selectedPatientObj ? `${selectedPatientObj.full_name}'s Vital Signs` : 'Vital Signs History'}
              </h2>
              <p className="text-xs text-slate-400">
                {selectedPatientObj ? `Patient ID: ${selectedPatientObj.patient_id}` : 'Select a patient to view history'}
              </p>
            </div>
          </div>

          {loading ? (
            <LoadingBox />
          ) : history.length === 0 ? (
            <EmptyBox message="No vital signs recorded yet." />
          ) : (
            <div className="space-y-4">
              {history.map((v) => {
                const alerts = getAlerts(v);
                return (
                  <div key={v.id} className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-slate-100">
                          {(v.recorded_at || '').slice(0, 19).replace('T', ' ')}
                        </div>
                        <div className="text-xs text-slate-400">
                          By {v.recorded_by_username || v.recorded_by || '—'}
                          {v.encounter ? ` · Encounter ${v.encounter}` : ''}
                        </div>
                      </div>
                      {alerts.length > 0 && (
                        <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs text-amber-300">
                          ⚠ {alerts.length} alert{alerts.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                      {v.temperature_c != null && (
                        <div>
                          <div className="text-xs text-slate-400">Temp</div>
                          <div className={`text-sm font-medium ${v.temperature_c >= ALERT_THRESHOLDS.temperature_high ? 'text-amber-300' : 'text-slate-100'}`}>
                            {v.temperature_c}°C
                          </div>
                        </div>
                      )}
                      {v.blood_pressure && (
                        <div>
                          <div className="text-xs text-slate-400">BP</div>
                          <div className="text-sm font-medium text-slate-100">{v.blood_pressure}</div>
                        </div>
                      )}
                      {v.pulse_bpm != null && (
                        <div>
                          <div className="text-xs text-slate-400">Pulse</div>
                          <div className={`text-sm font-medium ${v.pulse_bpm > ALERT_THRESHOLDS.pulse_high || v.pulse_bpm < ALERT_THRESHOLDS.pulse_low ? 'text-amber-300' : 'text-slate-100'}`}>
                            {v.pulse_bpm} bpm
                          </div>
                        </div>
                      )}
                      {v.oxygen_saturation != null && (
                        <div>
                          <div className="text-xs text-slate-400">O2 Sat</div>
                          <div className={`text-sm font-medium ${v.oxygen_saturation < ALERT_THRESHOLDS.o2_low ? 'text-amber-300' : 'text-slate-100'}`}>
                            {v.oxygen_saturation}%
                          </div>
                        </div>
                      )}
                      {v.respiratory_rate != null && (
                        <div>
                          <div className="text-xs text-slate-400">Resp Rate</div>
                          <div className="text-sm font-medium text-slate-100">{v.respiratory_rate}</div>
                        </div>
                      )}
                      {v.weight_kg != null && (
                        <div>
                          <div className="text-xs text-slate-400">Weight</div>
                          <div className="text-sm font-medium text-slate-100">{v.weight_kg} kg</div>
                        </div>
                      )}
                      {v.height_cm != null && (
                        <div>
                          <div className="text-xs text-slate-400">Height</div>
                          <div className="text-sm font-medium text-slate-100">{v.height_cm} cm</div>
                        </div>
                      )}
                      {v.blood_glucose != null && (
                        <div>
                          <div className="text-xs text-slate-400">Glucose</div>
                          <div className="text-sm font-medium text-slate-100">{v.blood_glucose} mmol/L</div>
                        </div>
                      )}
                      {v.pain_score != null && (
                        <div>
                          <div className="text-xs text-slate-400">Pain</div>
                          <div className={`text-sm font-medium ${v.pain_score >= ALERT_THRESHOLDS.pain_high ? 'text-amber-300' : 'text-slate-100'}`}>
                            {v.pain_score}/10
                          </div>
                        </div>
                      )}
                      {v.level_of_consciousness && (
                        <div>
                          <div className="text-xs text-slate-400">LOC</div>
                          <div className="text-sm font-medium text-slate-100">{v.level_of_consciousness}</div>
                        </div>
                      )}
                    </div>
                    {alerts.length > 0 && (
                      <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                        <div className="text-xs font-medium text-amber-300">Clinical Alerts (observations, not diagnoses)</div>
                        <ul className="mt-1 list-inside list-disc text-xs text-amber-200">
                          {alerts.map((a, i) => (
                            <li key={i}>{a}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {v.additional_notes && (
                      <div className="mt-3 text-xs text-slate-400">Notes: {v.additional_notes}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
