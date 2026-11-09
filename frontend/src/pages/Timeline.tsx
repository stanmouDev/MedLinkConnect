import { useEffect, useState } from 'react';
import { query, onSyncChange } from '../offline/data';
import { LoadingBox, ErrorBox, EmptyBox } from '../components/ui';
import { Card } from '../components/ui';

type Event = {
  id: number;
  patient: number;
  patient_full_name?: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  title: string;
  description: string;
  occurred_at: string;
  created_by?: number;
  created_by_username?: string;
};

const colors: Record<string, string> = {
  consultation: 'text-cyan-300',
  vital_sign: 'text-emerald-300',
  medication: 'text-purple-300',
  lab_request: 'text-amber-300',
  lab_result: 'text-blue-300',
  lab_result_entry: 'text-indigo-300',
  imaging: 'text-pink-300',
  handover: 'text-orange-300',
  discharge: 'text-slate-300',
};

export default function Timeline() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const patientId = new URLSearchParams(window.location.search).get('patient');
    let url = '/timeline/';
    if (patientId) url += `?patient=${patientId}`;
    query('timeline').then((data: any) => {
      const list = Array.isArray(data) ? data : data.results || [];
      setEvents(list);
    }).catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    const unsub = onSyncChange(() => {
      query('timeline').then((data: any) => {
        const list = Array.isArray(data) ? data : data.results || [];
        setEvents(list);
      }).catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    });
    return unsub;
  }, []);

  if (loading) return <LoadingBox />;
  if (error) return <ErrorBox message={error} />;
  if (!events.length) return <EmptyBox message="No timeline events yet." />;

  const grouped: Record<string, Event[]> = {};
  for (const e of events) {
    const key = e.patient_full_name || `Patient ${e.patient}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  }

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Patient Timeline</h1>
          <p className="mt-1 text-sm text-slate-400">Chronological clinical activities per patient</p>
        </div>
      </div>
      <div className="space-y-6">
        {Object.entries(grouped).map(([patient, items]) => (
          <Card key={patient}>
            <h2 className="mb-4 text-lg font-semibold">{patient}</h2>
            <div className="relative ml-4 border-l border-slate-800 pl-6">
              {items.map((ev) => (
                <div key={ev.id} className="mb-6 last:mb-0">
                  <div className={`-ml-2 mb-2 h-2.5 w-2.5 rounded-full border-2 border-slate-900 ${colors[ev.event_type] || 'bg-slate-400'}`}></div>
                  <div className="text-sm">
                    <span className="font-medium text-slate-100">{ev.title}</span>
                    {ev.description && <p className="mt-1 text-slate-300">{ev.description}</p>}
                    <div className="mt-1 text-xs text-slate-400">
                      {(ev.occurred_at || '').slice(0, 16)} · {ev.entity_type} {ev.entity_id} · By {ev.created_by_username || '—'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
