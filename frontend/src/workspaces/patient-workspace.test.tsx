import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

describe('PatientWorkspace role-based tabs', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  async function renderPatientWorkspaceForRole(role: string) {
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

    vi.doMock('react-router-dom', async () => {
      const actual = await vi.importActual('react-router-dom');
      return {
        ...actual,
        useParams: () => ({ id: '1' }),
      };
    });

    vi.doMock('../offline/data', () => ({
      query: vi.fn().mockImplementation((resource: string) => {
        if (resource === 'patients') {
          return Promise.resolve([{ id: 1, full_name: 'Test Patient', patient_id: 'P001', sex: 'M', date_of_birth: '1990-01-01', phone: '123-456-7890', address: '123 Main St', insurance_type: 'self_pay', created_at: '2024-01-01' }]);
        }
        return Promise.resolve([]);
      }),
      onSyncChange: vi.fn().mockReturnValue(() => {}),
    }));

    const PatientWorkspace = (await import('./PatientWorkspace')).default;
    render(
      <BrowserRouter>
        <PatientWorkspace />
      </BrowserRouter>
    );

    return { PatientWorkspace: (await import('./PatientWorkspace')).default };
  }

  it('administrator sees all patient tabs', async () => {
    await renderPatientWorkspaceForRole('administrator');
    await waitFor(() => expect(screen.getByText('Overview')).toBeDefined());
    expect(screen.getAllByRole('button', { name: 'EMR' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: 'Vitals' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: 'Laboratory' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: 'Prescriptions' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: 'Timeline' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: 'Handovers' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: 'Referrals' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: 'Inpatient' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: 'Insurance' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: 'Billing' }).length).toBeGreaterThanOrEqual(1);
  });

  it('doctor sees clinical and billing tabs', async () => {
    await renderPatientWorkspaceForRole('doctor');
    await waitFor(() => expect(screen.getByText('Overview')).toBeDefined());
    expect(screen.getAllByRole('button', { name: 'EMR' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: 'Vitals' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: 'Laboratory' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: 'Prescriptions' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: 'Billing' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: 'Insurance' }).length).toBeGreaterThanOrEqual(1);
  });

  it('nurse sees nursing-relevant tabs only', async () => {
    await renderPatientWorkspaceForRole('nurse');
    await waitFor(() => expect(screen.getByText('Overview')).toBeDefined());
    expect(screen.getAllByRole('button', { name: 'Vitals' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: 'Laboratory' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: 'Inpatient' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: 'Handovers' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: 'Timeline' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByRole('button', { name: 'Billing' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Referrals' })).toBeNull();
  });

  it('lab_technician sees lab and timeline tabs only', async () => {
    await renderPatientWorkspaceForRole('lab_technician');
    await waitFor(() => expect(screen.getByText('Overview')).toBeDefined());
    expect(screen.getAllByRole('button', { name: 'Laboratory' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: 'Timeline' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByRole('button', { name: 'Billing' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Prescriptions' })).toBeNull();
  });

  it('pharmacist sees prescription-relevant tabs', async () => {
    await renderPatientWorkspaceForRole('pharmacist');
    await waitFor(() => expect(screen.getByText('Overview')).toBeDefined());
    expect(screen.getAllByRole('button', { name: 'Prescriptions' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: 'Inpatient' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByRole('button', { name: 'Billing' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'EMR' })).toBeNull();
  });

  it('receptionist sees overview, EMR, and billing tabs', async () => {
    await renderPatientWorkspaceForRole('receptionist');
    await waitFor(() => expect(screen.getByText('Overview')).toBeDefined());
    expect(screen.getAllByRole('button', { name: 'EMR' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: 'Billing' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByRole('button', { name: 'Laboratory' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Prescriptions' })).toBeNull();
  });

  it('midwife sees maternity-specific tabs', async () => {
    await renderPatientWorkspaceForRole('midwife');
    await waitFor(() => expect(screen.getByText('Overview')).toBeDefined());
    expect(screen.getAllByRole('button', { name: 'Antenatal' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: 'Pregnancy' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: 'Maternal Vitals' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: 'Fetal Assessment' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: 'Risk Assessment' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: 'Labour' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: 'Delivery' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: 'Postnatal' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: 'Newborn' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByRole('button', { name: 'Insurance' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Billing' })).toBeNull();
  });

  it('midwife can click antenatal tab and see content', async () => {
    vi.doMock('../auth', () => ({
      useAuth: () => ({
        user: { id: 1, username: 'testuser', role: 'midwife' },
        token: 'fake-token',
        loading: false,
        login: vi.fn(),
        logout: vi.fn(),
      }),
      AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    }));

    vi.doMock('react-router-dom', async () => {
      const actual = await vi.importActual('react-router-dom');
      return {
        ...actual,
        useParams: () => ({ id: '1' }),
      };
    });

    vi.doMock('../offline/data', () => ({
      query: vi.fn().mockImplementation((resource: string) => {
        if (resource === 'patients') {
          return Promise.resolve([{ id: 1, full_name: 'Test Patient', patient_id: 'P001', sex: 'M', date_of_birth: '1990-01-01', phone: '123-456-7890', address: '123 Main St', insurance_type: 'self_pay', created_at: '2024-01-01' }]);
        }
        if (resource === 'antenatal-records') {
          return Promise.resolve([
            { id: 1, patient: 1, gravida: 2, para: 1, edd: '2025-02-15', lmp: '2024-05-08', risk_classification: 'low_risk', current_status: 'active', current_gestational_age: 28, previous_pregnancy_history: 'Previous vaginal delivery', created_at: '2024-01-01', updated_at: '2024-01-01' },
          ]);
        }
        return Promise.resolve([]);
      }),
      onSyncChange: vi.fn().mockReturnValue(() => {}),
    }));

    const PatientWorkspace = (await import('./PatientWorkspace')).default;
    render(
      <BrowserRouter>
        <PatientWorkspace />
      </BrowserRouter>
    );

    await waitFor(() => expect(screen.getByText('Overview')).toBeDefined());

    const antenatalTab = screen.getByRole('button', { name: 'Antenatal' });
    await act(async () => {
      antenatalTab.click();
    });

    await waitFor(() => expect(screen.getByText(/Antenatal Records/)).toBeDefined());
    expect(screen.getByTestId('antenatal-section')).toBeDefined();
  });
});
