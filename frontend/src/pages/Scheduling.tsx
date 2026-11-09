import { ResourceList } from '../components/ResourceList';

export default function Scheduling() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Scheduling</h1>
      <ResourceList
        resource="appointments"
        columns={['Patient', 'Doctor', 'Scheduled', 'Status']}
        emptyText="No appointments scheduled yet."
        renderRow={(a: any) => (
          <tr key={a.id}>
            <td className="px-4 py-3">
              {a.patient_full_name || a.patient || a.id}
            </td>
            <td className="px-4 py-3">{a.doctor || '—'}</td>
            <td className="px-4 py-3">{a.scheduled_at?.slice(0, 16) || '—'}</td>
            <td className="px-4 py-3">{a.status}</td>
          </tr>
        )}
      />
    </div>
  );
}
