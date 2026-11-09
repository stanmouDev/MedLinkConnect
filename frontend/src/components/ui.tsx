import type { ReactNode } from 'react';

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({
  children,
  className = '',
  onDrop,
  onDragOver,
  variant = 'dark',
}: {
  children: ReactNode;
  className?: string;
  onDrop?: React.DragEventHandler<HTMLDivElement>;
  onDragOver?: React.DragEventHandler<HTMLDivElement>;
  variant?: 'dark' | 'light';
}) {
  const base = 'rounded-2xl border p-6';
  const styles = {
    dark: 'border-slate-800 bg-slate-900',
    light: 'border-slate-200 bg-white shadow-sm',
  };
  return (
    <div
      className={`${base} ${styles[variant]} ${className}`}
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      {children}
    </div>
  );
}

export function LoadingBox({ variant = 'dark' }: { variant?: 'dark' | 'light' }) {
  const styles = {
    dark: 'border-slate-800 bg-slate-900 text-slate-400',
    light: 'border-slate-200 bg-white text-slate-500',
  };
  return (
    <div className={`rounded-2xl border p-8 text-center ${styles[variant]}`}>
      Loading…
    </div>
  );
}

export function ErrorBox({ message, className = '' }: { message: string; className?: string }) {
  return (
    <div className={`rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300 ${className}`}>
      {message}
    </div>
  );
}

export function EmptyBox({ message, variant = 'dark' }: { message: string; variant?: 'dark' | 'light' }) {
  const styles = {
    dark: 'border-slate-800 bg-slate-900 text-slate-400',
    light: 'border-slate-200 bg-slate-50 text-slate-500',
  };
  return (
    <div className={`rounded-2xl border p-8 text-center ${styles[variant]}`}>
      {message}
    </div>
  );
}

export function Table({
  columns,
  children,
  variant = 'dark',
}: {
  columns: string[];
  children: ReactNode;
  variant?: 'dark' | 'light';
}) {
  const container = {
    dark: 'border-slate-800',
    light: 'border-slate-200',
  };
  const header = {
    dark: 'bg-slate-900 text-slate-400',
    light: 'bg-slate-50 text-slate-500',
  };
  const body = {
    dark: 'divide-slate-800',
    light: 'divide-slate-100',
  };
  return (
    <div className={`overflow-x-auto rounded-2xl border ${container[variant]}`}>
      <table className="w-full text-left text-sm">
        <thead className={header[variant]}>
          <tr>
            {columns.map((col) => (
              <th key={col} className="px-4 py-3 font-medium">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={`divide-y ${body[variant]}`}>{children}</tbody>
      </table>
    </div>
  );
}
