import { Card } from '../components/ui';

export default function Security() {
  const items = [
    {
      title: 'Authentication & MFA',
      body: 'Clinician accounts require authentication. Multi-factor authentication can be enabled per user via the mfa_enabled flag.',
    },
    {
      title: 'Role-based access',
      body: 'Roles include administrator, doctor, nurse, lab technician, pharmacist, receptionist, and patient. API access is restricted to authenticated users.',
    },
    {
      title: 'Encrypted local storage',
      body: 'Records captured offline are encrypted on-device before they are queued for synchronization.',
    },
    {
      title: 'Audit logging',
      body: 'Sensitive actions are recorded in the audit log for traceability and compliance review.',
    },
    {
      title: 'Advisory AI only',
      body: 'Any AI-generated summaries or suggestions are advisory and must not replace professional medical judgment.',
    },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Security & Architecture</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <Card key={item.title}>
            <h3 className="text-lg font-semibold text-cyan-300">{item.title}</h3>
            <p className="mt-2 text-sm text-slate-300">{item.body}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
