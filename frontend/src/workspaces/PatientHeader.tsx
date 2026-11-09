import { useNavigate } from 'react-router-dom';

interface PatientHeaderProps {
  patient: {
    id: number;
    full_name: string;
    patient_id: string;
    gender?: string;
    sex?: string;
    date_of_birth?: string;
    phone?: string;
    address?: string;
    allergies?: string;
    insurance_type?: string;
    hospital?: number;
  };
  currentLocation?: string;
  currentEncounter?: string;
  currentStatus?: string;
  lastConsultation?: string;
  alerts?: string[];
}

function calculateAge(dob?: string): string | null {
  if (!dob) return null;
  const diff = Date.now() - new Date(dob).getTime();
  const age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  return `${age}y`;
}

export default function PatientHeader({ patient, currentLocation, currentEncounter, currentStatus, lastConsultation, alerts }: PatientHeaderProps) {
  const navigate = useNavigate();
  const age = calculateAge(patient.date_of_birth);
  const sex = patient.gender || patient.sex;

  return (
    <div className="mb-6 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-xl font-semibold">{patient.full_name}</h2>
            <p className="text-sm text-slate-400">
              ID: {patient.patient_id}
              {age && ` • ${age}`}
              {sex && ` • ${sex}`}
            </p>
            <p className="text-sm text-slate-400">
              {currentLocation && <span>Location: {currentLocation} • </span>}
              {currentEncounter && <span>Encounter: {currentEncounter} • </span>}
              {currentStatus && <span>Status: {currentStatus.replace(/_/g, ' ')}</span>}
            </p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
              {patient.phone && <span>Phone: {patient.phone}</span>}
              {patient.address && <span>Address: {patient.address}</span>}
              {lastConsultation && <span>Last consultation: {lastConsultation}</span>}
            </div>
            {patient.insurance_type && (
              <p className="text-sm text-slate-400">Insurance: {patient.insurance_type}</p>
            )}
            {patient.allergies && (
              <p className="mt-1 text-sm font-medium text-amber-300">Allergies: {patient.allergies}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/encounters?patient=${patient.id}`)}
            className="rounded-full bg-cyan-500 px-3 py-1.5 text-sm font-medium text-slate-950"
          >
            Open EMR
          </button>
          <button
            onClick={() => navigate(`/vitals?patient=${patient.id}`)}
            className="rounded-full border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800"
          >
            Vitals
          </button>
        </div>
      </div>
      {alerts && alerts.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {alerts.map((alert, i) => (
            <span key={i} className="rounded-full bg-red-500/15 px-2 py-1 text-xs text-red-300">
              {alert}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
