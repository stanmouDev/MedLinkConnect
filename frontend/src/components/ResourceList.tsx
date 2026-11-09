import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { query, onSyncChange } from '../offline/data';
import { Table, LoadingBox, ErrorBox, EmptyBox } from './ui';

export function ResourceList({
  resource,
  columns,
  renderRow,
  emptyText = 'No records yet.',
  reloadKey,
}: {
  resource: string;
  columns: string[];
  renderRow: (row: any, index: number) => ReactNode;
  emptyText?: string;
  reloadKey?: unknown;
}) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = () => {
      setLoading(true);
      setError('');
      query(resource)
        .then((data: any) => {
          if (!active) return;
          setRows(Array.isArray(data) ? data : data.results || []);
        })
        .catch((err) => active && setError(err.message))
        .finally(() => active && setLoading(false));
    };
    load();
    const unsub = onSyncChange(load);
    return () => {
      active = false;
      unsub();
    };
  }, [resource, reloadKey]);

  if (loading) return <LoadingBox />;
  if (error) return <ErrorBox message={error} />;
  if (!rows.length) return <EmptyBox message={emptyText} />;

  return <Table columns={columns}>{rows.map(renderRow)}</Table>;
}
