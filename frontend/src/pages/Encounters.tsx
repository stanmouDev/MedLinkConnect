import { ResourceList } from '../components/ResourceList';
import { useNavigate } from 'react-router-dom';

export default function Encounters() {
  const navigate = useNavigate();
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Encounters (EMR)</h1>
      <ResourceList
        resource="encounters"
        columns={['Patient', 'Type', 'Status', 'Triage', 'Updated']}
        emptyText="No encounters recorded yet."
        renderRow={(e: any) => (
          <tr key={e.id}>
            <td className="px-4 py-3">
              {e.patient_full_name || e.patient || e.id}
            </td>
            <td className="px-4 py-3">{e.encounter_type}</td>
            <td className="px-4 py-3">{e.status}</td>
            <td className="px-4 py-3">{e.triage_level}</td>
            <td className="px-4 py-3">{e.updated_at?.slice(0, 10) || '—'}</td>
            <td className="px-4 py-3">
              <button
                onClick={() => navigate(`/vitals?patient=${e.patient || e.patient_id || ''}`)}
                className="text-cyan-400 hover:text-cyan-300"
              >
                Vitals
              </button>
            </td>
          </tr>
        )}
      />
    </div>
  );
}
