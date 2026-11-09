import { useEffect, useState, type DragEvent, type FormEvent } from 'react';
import { query, onSyncChange, create } from '../offline/data';
import { api, ensureOnline } from '../api';
import {
  Card,
  ErrorBox,
  LoadingBox,
  EmptyBox,
  PageHeader,
} from '../components/ui';

type ReportTemplate = {
  id: number;
  name: string;
  category?: string;
  status?: string;
};

type BuilderElement = {
  id: string;
  type: 'table' | 'bar-chart' | 'line-chart' | 'pie-chart' | 'summary-card' | 'pivot-table';
  title: string;
  dataSource: string;
  filters: string;
  sortBy: string;
  groupBy: string;
  xField: string;
  yField: string;
};

const DATA_SOURCES = [
  'patients', 'appointments', 'emr', 'admissions', 'discharges',
  'vital-signs', 'diagnoses', 'laboratory', 'pharmacy', 'billing',
  'nhis', 'private-insurance', 'doctors', 'nurses', 'departments',
  'beds', 'hospitals', 'referrals', 'handovers', 'audit-logs', 'inventory',
];

const ELEMENT_TYPES = [
  { type: 'table', label: 'Table' },
  { type: 'bar-chart', label: 'Bar Chart' },
  { type: 'line-chart', label: 'Line Chart' },
  { type: 'pie-chart', label: 'Pie Chart' },
  { type: 'summary-card', label: 'Summary Card' },
  { type: 'pivot-table', label: 'Pivot Table' },
] as const;

const INITIAL_ELEMENT: BuilderElement = {
  id: '',
  type: 'table',
  title: '',
  dataSource: 'patients',
  filters: '',
  sortBy: '',
  groupBy: '',
  xField: '',
  yField: '',
};

export default function ReportBuilder() {
  const role = localStorage.getItem('medlink_user_role') || '';
  const isAdmin = role === 'administrator';

  const [, setTemplates] = useState<ReportTemplate[]>([]);
  const [elements, setElements] = useState<BuilderElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);

  const selected = elements.find((el) => el.id === selectedId) || null;

  function load() {
    setLoading(true);
    setError('');
    query('report-templates')
      .then((data: any) => {
        setTemplates(Array.isArray(data) ? data : data.results || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    const unsub = onSyncChange(() => load());
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onDragStart(e: DragEvent<HTMLDivElement>, type: BuilderElement['type']) {
    e.dataTransfer.setData('application/report-element', type);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const type = e.dataTransfer.getData('application/report-element') as BuilderElement['type'];
    if (!type) return;
    const newEl: BuilderElement = {
      ...INITIAL_ELEMENT,
      id: `el_${Date.now()}`,
      type,
      title: ELEMENT_TYPES.find((et) => et.type === type)?.label || type,
    };
    setElements((prev) => [...prev, newEl]);
    setSelectedId(newEl.id);
  }

  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  function updateSelected(partial: Partial<BuilderElement>) {
    if (!selectedId) return;
    setElements((prev) =>
      prev.map((el) => (el.id === selectedId ? { ...el, ...partial } : el)),
    );
  }

  async function handlePreview() {
    setError('');
    setPreviewing(true);
    setPreviewResult(null);
    try {
      ensureOnline();
      const result = await api.post('report-templates', 'preview', {
        elements: elements,
      });
      setPreviewResult(result);
    } catch (err) {
      setError((err as Error).message || 'Could not preview report.');
    } finally {
      setPreviewing(false);
    }
  }

  async function handleSaveAsTemplate(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const name = prompt('Template name:');
      if (!name) return;
      await create('report-templates', {
        name,
        category: 'custom',
        frequency: 'custom',
        data_sources: Array.from(new Set(elements.map((el) => el.dataSource))),
        charts_tables: JSON.stringify(elements),
        status: 'active',
      });
      load();
    } catch (err) {
      setError((err as Error).message || 'Could not save template.');
    } finally {
      setSaving(false);
    }
  }

  function removeElement(id: string) {
    setElements((prev) => prev.filter((el) => el.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  if (loading) return <LoadingBox />;

  return (
    <div>
      <PageHeader
        title="Report Builder"
        subtitle="Drag elements onto the canvas to build reports"
        action={
          <div className="flex gap-2">
            <button
              onClick={handlePreview}
              disabled={previewing || elements.length === 0}
              className="rounded-full border border-cyan-400 px-4 py-2 font-medium text-cyan-300 disabled:opacity-60"
            >
              {previewing ? 'Previewing…' : 'Preview'}
            </button>
            {isAdmin && (
              <button
                onClick={handleSaveAsTemplate}
                disabled={saving || elements.length === 0}
                className="rounded-full bg-cyan-500 px-4 py-2 font-medium text-slate-950 disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save as Template'}
              </button>
            )}
          </div>
        }
      />

      {!isAdmin && (
        <Card className="mb-6">
          <p className="text-sm text-slate-400">
            The report builder is read-only for non-administrators.
          </p>
        </Card>
      )}

      {error && <ErrorBox message={error} className="mb-4" />}

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-3">
          <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">Data Fields</h3>
          <div className="space-y-3">
            {DATA_SOURCES.map((src) => (
              <div key={src}>
                <p className="mb-1 text-xs font-medium text-slate-300 capitalize">{src.replace('-', ' ')}</p>
                <div className="flex flex-wrap gap-1">
                  {['id', 'name', 'status', 'created_at', 'updated_at'].map((field) => (
                    <span
                      key={`${src}-${field}`}
                      className="rounded border border-slate-700 px-2 py-0.5 text-xs text-slate-400"
                    >
                      {field}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card
          className="lg:col-span-6 min-h-[500px]"
          onDrop={onDrop}
          onDragOver={onDragOver}
        >
          <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">Canvas</h3>
          {elements.length === 0 ? (
            <EmptyBox message="Drag elements from the left panel here." />
          ) : (
            <div className="space-y-4">
              {elements.map((el) => (
                <div
                  key={el.id}
                  onClick={() => isAdmin && setSelectedId(el.id)}
                  className={`rounded-2xl border p-4 ${
                    selectedId === el.id
                      ? 'border-cyan-400 bg-cyan-500/5'
                      : 'border-slate-800 bg-slate-900'
                  } ${isAdmin ? 'cursor-pointer' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-100">{el.title || el.type}</p>
                      <p className="text-xs text-slate-400">
                        {el.type} · {el.dataSource}
                      </p>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={(e) => { e.stopPropagation(); removeElement(el.id); }}
                        className="text-xs text-red-300"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="lg:col-span-3">
          <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">Properties</h3>
          {!selected ? (
            <p className="text-sm text-slate-500">Select an element on the canvas to configure it.</p>
          ) : (
            <div className="space-y-4">
              {isAdmin && (
                <>
                  <div>
                    <label className="block text-sm text-slate-300">Title</label>
                    <input
                      value={selected.title}
                      onChange={(e) => updateSelected({ title: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300">Data Source</label>
                    <select
                      value={selected.dataSource}
                      onChange={(e) => updateSelected({ dataSource: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
                    >
                      {DATA_SOURCES.map((src) => (
                        <option key={src} value={src} className="capitalize">{src.replace('-', ' ')}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300">Filters</label>
                    <textarea
                      value={selected.filters}
                      onChange={(e) => updateSelected({ filters: e.target.value })}
                      rows={3}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400 font-mono text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-slate-300">Sort By</label>
                      <input
                        value={selected.sortBy}
                        onChange={(e) => updateSelected({ sortBy: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-300">Group By</label>
                      <input
                        value={selected.groupBy}
                        onChange={(e) => updateSelected({ groupBy: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>
                  {(selected.type === 'bar-chart' || selected.type === 'line-chart' || selected.type === 'pie-chart') && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-slate-300">X Field</label>
                        <input
                          value={selected.xField}
                          onChange={(e) => updateSelected({ xField: e.target.value })}
                          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-300">Y Field</label>
                        <input
                          value={selected.yField}
                          onChange={(e) => updateSelected({ yField: e.target.value })}
                          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-xs text-slate-400">
                  <span className="font-medium text-slate-300">Type:</span> {selected.type}
                </p>
                <p className="text-xs text-slate-400">
                  <span className="font-medium text-slate-300">Source:</span> {selected.dataSource}
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">Element Palette</h3>
        <div className="flex flex-wrap gap-2">
          {ELEMENT_TYPES.map((et) => (
            <div
              key={et.type}
              draggable={isAdmin}
              onDragStart={(e) => onDragStart(e, et.type)}
              className={`rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 ${
                isAdmin ? 'cursor-grab active:cursor-grabbing' : 'opacity-60'
              }`}
            >
              <p className="text-sm font-medium text-slate-200">{et.label}</p>
              <p className="text-xs text-slate-500">{et.type}</p>
            </div>
          ))}
        </div>
      </div>

      {previewResult && (
        <Card className="mt-6">
          <h3 className="mb-3 text-lg font-semibold">Preview</h3>
          <pre className="max-h-96 overflow-auto rounded-2xl bg-slate-900 p-4 text-xs text-slate-300">
            {JSON.stringify(previewResult, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
}
