import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui';

const cards = [
  {
    title: 'Patient Registration',
    description: 'Capture identities, clinical history, and emergency contacts securely.',
    to: '/patients',
  },
  {
    title: 'Offline EMR',
    description: 'Continue diagnosis, notes, and vitals without connectivity.',
    to: '/encounters',
  },
  {
    title: 'Telemedicine',
    description: 'Launch voice or video consultation with adaptive quality.',
    to: '/dashboard',
  },
  {
    title: 'Lab & Pharmacy',
    description: 'Coordinate lab orders and prescriptions from one workspace.',
    to: '/labs',
  },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div>
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/15 to-slate-900 p-8 shadow-2xl">
          <p className="mb-3 inline-flex rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-300">
            Offline-first, resilient care
          </p>
          <h2 className="text-4xl font-semibold">
            Keep care delivery uninterrupted in low-connectivity regions.
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-slate-300">
            MedLink Connect supports clinicians with encrypted local records,
            real-time telemedicine, automated sync, and clinical decision
            support that is clearly advisory.
          </p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="rounded-full bg-cyan-500 px-4 py-2 font-medium text-slate-950"
            >
              Launch Clinician Console
            </button>
            <button
              onClick={() => navigate('/security')}
              className="rounded-full border border-slate-700 px-4 py-2 font-medium text-slate-100"
            >
              View Architecture
            </button>
          </div>
        </div>
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8">
          <h3 className="text-xl font-semibold">System highlights</h3>
          <ul className="mt-4 space-y-3 text-sm text-slate-300">
            <li>• End-to-end encryption and MFA</li>
            <li>• Role-based access and audit logging</li>
            <li>• Adaptive voice/video with automatic resync</li>
            <li>• Optional AI summarization with advisory disclaimer</li>
          </ul>
        </div>
      </section>

      <section className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <button
            key={card.title}
            onClick={() => navigate(card.to)}
            className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-left transition-colors hover:border-cyan-500/40"
          >
            <h3 className="text-lg font-semibold">{card.title}</h3>
            <p className="mt-3 text-sm text-slate-400">{card.description}</p>
          </button>
        ))}
      </section>

      <section className="mt-10">
        <Card>
          <h3 className="text-lg font-semibold">Getting started</h3>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-300">
            <li>Sign in with a demo account (admin / admin123).</li>
            <li>Open the Dashboard to see live clinical activity.</li>
            <li>Register a patient and create encounters, labs, and prescriptions.</li>
            <li>All data syncs through the secure backend API.</li>
          </ol>
        </Card>
      </section>
    </div>
  );
}
