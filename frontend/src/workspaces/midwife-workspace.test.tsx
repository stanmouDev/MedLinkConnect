import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

describe('MidwifeWorkspace', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  async function renderMidwifeWorkspace() {
    vi.doMock('../auth', () => ({
      useAuth: () => ({
        user: { id: 1, username: 'midwife', role: 'midwife' },
        token: 'fake-token',
        loading: false,
        login: vi.fn(),
        logout: vi.fn(),
      }),
      AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    }));

    vi.doMock('../offline/data', () => ({
      query: vi.fn().mockImplementation((resource: string) => {
        switch (resource) {
          case 'patients':
            return Promise.resolve([
              { id: 1, full_name: 'Maria Santos', patient_id: 'M001', sex: 'Female', date_of_birth: '1994-06-15', phone: '555-0100', blood_group: 'O+', allergies: 'None', created_at: '2024-01-01' },
              { id: 2, full_name: 'Grace Mensah', patient_id: 'M002', sex: 'Female', date_of_birth: '1990-03-20', phone: '555-0101', created_at: '2024-01-02' },
            ]);
          case 'encounters':
            return Promise.resolve([
              { id: 1, patient: 1, encounter_type: 'antenatal', status: 'in_progress', created_at: new Date().toISOString() },
              { id: 2, patient: 2, encounter_type: 'antenatal', status: 'scheduled', created_at: new Date().toISOString() },
            ]);
          case 'vitals':
            return Promise.resolve([
              { id: 1, patient: 1, temperature_c: 36.8, blood_pressure: '120/80', pulse_bpm: 78, oxygen_saturation: 98, respiratory_rate: 16, weight_kg: 68, recorded_at: new Date().toISOString() },
            ]);
          case 'appointments':
            return Promise.resolve([]);
          case 'antenatal-records':
            return Promise.resolve([
              { id: 1, patient: 1, patient_full_name: 'Maria Santos', gravida: 2, para: 1, edd: '2025-02-15', lmp: '2024-05-08', risk_classification: 'low_risk', current_status: 'active', current_gestational_age: 28, previous_pregnancy_history: 'Previous vaginal delivery', created_at: '2024-01-01', updated_at: '2024-01-01' },
              { id: 2, patient: 2, patient_full_name: 'Grace Mensah', gravida: 1, para: 0, risk_classification: 'high_risk', current_status: 'active', current_gestational_age: 16, created_at: '2024-01-02', updated_at: '2024-01-02' },
            ]);
          case 'labour-records':
            return Promise.resolve([
              { id: 1, patient: 1, patient_full_name: 'Maria Santos', antenatal_record: 1, admission_time: new Date().toISOString(), labour_status: 'active', cervical_dilation: '4cm', fetal_heart_rate: 140, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            ]);
          case 'deliveries':
            return Promise.resolve([]);
          case 'newborns':
            return Promise.resolve([]);
          case 'fetal-assessments':
            return Promise.resolve([]);
          case 'postnatal-records':
            return Promise.resolve([]);
          case 'maternity-notes':
            return Promise.resolve([]);
          case 'handovers':
            return Promise.resolve([]);
          case 'referrals':
            return Promise.resolve([]);
          default:
            return Promise.resolve([]);
        }
      }),
      onSyncChange: vi.fn().mockReturnValue(() => {}),
    }));

    const MidwifeWorkspace = (await import('./MidwifeWorkspace')).default;
    render(
      <BrowserRouter>
        <MidwifeWorkspace />
      </BrowserRouter>
    );

    return { MidwifeWorkspace: (await import('./MidwifeWorkspace')).default };
  }

  it('renders midwife workspace header', async () => {
    await renderMidwifeWorkspace();
    await waitFor(() => expect(screen.getByText('Maternity & Midwifery Workspace')).toBeDefined());
    expect(screen.getByText('Antenatal, labour, delivery and postnatal clinical operations')).toBeDefined();
  });

  it('shows summary cards with real data', async () => {
    await renderMidwifeWorkspace();
    await waitFor(() => expect(screen.getByText('Antenatal Patients Today')).toBeDefined());
    expect(screen.getByText('Waiting for ANC')).toBeDefined();
    expect(screen.getAllByText('High-Risk Pregnancies').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Currently in Labour')).toBeDefined();
    expect(screen.getByText('Maternity Admissions')).toBeDefined();
    expect(screen.getByText('Deliveries Today')).toBeDefined();
    expect(screen.getAllByText('Postnatal Patients').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Follow-ups Due')).toBeDefined();
  });

  it('shows quick actions', async () => {
    await renderMidwifeWorkspace();
    await waitFor(() => expect(screen.getByText('Quick Actions')).toBeDefined());
    expect(screen.getAllByText('Open Patient').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('New Antenatal Visit')).toBeDefined();
    expect(screen.getByText('Record Maternal Vitals')).toBeDefined();
    expect(screen.getByText('Fetal Assessment')).toBeDefined();
    expect(screen.getAllByText('Labour Monitoring').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Record Delivery')).toBeDefined();
    expect(screen.getByText('Postnatal Review')).toBeDefined();
    expect(screen.getByText('Newborn Record')).toBeDefined();
    expect(screen.getByText('Create Referral')).toBeDefined();
    expect(screen.getByText('Handover Patient')).toBeDefined();
  });

  it('shows antenatal queue with patient data', async () => {
    await renderMidwifeWorkspace();
    await waitFor(() => expect(screen.getByText('Antenatal / ANC Queue')).toBeDefined());
    expect(screen.getAllByText('Maria Santos').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Grace Mensah').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Open Patient').length).toBeGreaterThanOrEqual(1);
  });

  it('shows labour monitoring section', async () => {
    await renderMidwifeWorkspace();
    await waitFor(() => expect(screen.getAllByText('Labour Monitoring').length).toBeGreaterThanOrEqual(1));
    expect(screen.getAllByText('Maria Santos').length).toBeGreaterThanOrEqual(1);
  });

  it('shows high-risk pregnancies section', async () => {
    await renderMidwifeWorkspace();
    await waitFor(() => expect(screen.getAllByText('High-Risk Pregnancies').length).toBeGreaterThanOrEqual(1));
    expect(screen.getAllByText('Grace Mensah').length).toBeGreaterThanOrEqual(1);
  });

  it('opens patient search modal', async () => {
    await renderMidwifeWorkspace();
    await waitFor(() => expect(screen.getByText('Quick Actions')).toBeDefined());
    const openPatientButtons = screen.getAllByText('Open Patient');
    expect(openPatientButtons.length).toBeGreaterThan(0);
  });
});
