import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

describe('PatientWorkspace isolated antenatal test', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('renders antenatal section when Antenatal tab is clicked', async () => {
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

    await waitFor(() => expect(screen.getByText('Test Patient')).toBeDefined());

    const antenatalTab = screen.getByRole('button', { name: 'Antenatal' });
    await act(async () => {
      antenatalTab.click();
    });

    await waitFor(() => expect(screen.getByText('Antenatal Records')).toBeDefined());
  });
});
