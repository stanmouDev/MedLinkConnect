import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

describe('Layout role-based navigation', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  async function renderLayoutForRole(role: string) {
    vi.doMock('../auth', () => ({
      useAuth: () => ({
        user: { id: 1, username: 'testuser', role },
        token: 'fake-token',
        loading: false,
        login: vi.fn(),
        logout: vi.fn(),
      }),
      AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    }));

    const Layout = (await import('../components/Layout')).default;
    return render(
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    );
  }

  it('administrator sees all navigation items', async () => {
    await renderLayoutForRole('administrator');
    expect(screen.getByText('Workspace')).toBeDefined();
    expect(screen.getByText('Dashboard')).toBeDefined();
    expect(screen.getByText('Security')).toBeDefined();
    expect(screen.getByText('Messaging')).toBeDefined();
  });

  it('doctor sees clinical navigation items', async () => {
    await renderLayoutForRole('doctor');
    expect(screen.getByText('Workspace')).toBeDefined();
    expect(screen.getByText('Encounters')).toBeDefined();
    expect(screen.getByText('Labs')).toBeDefined();
    expect(screen.getByText('Referrals')).toBeDefined();
  });

  it('nurse sees nursing navigation items', async () => {
    await renderLayoutForRole('nurse');
    expect(screen.getByText('Workspace')).toBeDefined();
    expect(screen.getByText('Vitals')).toBeDefined();
    expect(screen.getByText('Inpatient')).toBeDefined();
  });

  it('lab_technician sees laboratory navigation items', async () => {
    await renderLayoutForRole('lab_technician');
    expect(screen.getByText('Workspace')).toBeDefined();
    expect(screen.getByText('Labs')).toBeDefined();
    expect(screen.getByText('Patients')).toBeDefined();
  });

  it('pharmacist sees pharmacy navigation items', async () => {
    await renderLayoutForRole('pharmacist');
    expect(screen.getByText('Workspace')).toBeDefined();
    expect(screen.getByText('Pharmacy')).toBeDefined();
    expect(screen.getByText('Stock')).toBeDefined();
  });

  it('receptionist sees reception navigation items', async () => {
    await renderLayoutForRole('receptionist');
    expect(screen.getByText('Workspace')).toBeDefined();
    expect(screen.getByText('Billing')).toBeDefined();
    expect(screen.getByText('Insurance')).toBeDefined();
  });

  it('midwife sees maternity navigation items', async () => {
    await renderLayoutForRole('midwife');
    expect(screen.getByText('Workspace')).toBeDefined();
    expect(screen.getByText('Antenatal Visits')).toBeDefined();
    expect(screen.getByText('Maternal Vitals')).toBeDefined();
    expect(screen.getByText('Referrals')).toBeDefined();
    expect(screen.getByText('Handovers')).toBeDefined();
    expect(screen.getByText('Timeline')).toBeDefined();
  });
});
