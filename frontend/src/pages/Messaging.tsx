import { ResourceList } from '../components/ResourceList';

export default function Messaging() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Messaging</h1>
      <ResourceList
        resource="messages"
        columns={['From', 'To', 'Message', 'Sent']}
        emptyText="No messages yet."
        renderRow={(m: any) => (
          <tr key={m.id}>
            <td className="px-4 py-3">{m.sender || '—'}</td>
            <td className="px-4 py-3">{m.recipient || '—'}</td>
            <td className="px-4 py-3">{m.body}</td>
            <td className="px-4 py-3">{m.created_at?.slice(0, 16) || '—'}</td>
          </tr>
        )}
      />
    </div>
  );
}
