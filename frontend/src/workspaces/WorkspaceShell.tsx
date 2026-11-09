import { type ReactNode } from 'react';
import { PageHeader } from '../components/ui';

interface WorkspaceShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
}

export default function WorkspaceShell({ title, subtitle, children, actions }: WorkspaceShellProps) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle || ''} action={actions} />
      {children}
    </div>
  );
}
