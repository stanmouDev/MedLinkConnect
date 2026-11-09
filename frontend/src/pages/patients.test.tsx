import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

describe('Patients page', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  async function renderPatientsPage() {
    vi.doMock('../offline/data', () => ({
      query: vi.fn().mockImplementation((resource: string) => {
        if (resource === 'patients') {
          return Promise.resolve([
            { id: 1, full_name: 'John Doe', patient_id: 'P001', sex: 'M', date_of_birth: '1990-01-01', phone: '123-456-7890', created_at: '2024-01-01' },
            { id: 2, full_name: 'Jane Smith', patient_id: 'P002', sex: 'F', date_of_birth: '1985-05-15', phone: '098-765-4321', created_at: '2024-01-02' },
          ]);
        }
        if (resource === 'encounters') return Promise.resolve([]);
        if (resource === 'admissions') return Promise.resolve([]);
        if (resource === 'referrals') return Promise.resolve([]);
        if (resource === 'clinical-progress-notes') return Promise.resolve([]);
        return Promise.resolve([]);
      }),
      onSyncChange: vi.fn().mockReturnValue(() => {}),
    }));

    const Patients = (await import('./Patients')).default;
    render(
      <BrowserRouter>
        <Patients />
      </BrowserRouter>
    );

    return { Patients };
  }

  it('renders patient list from real data', async () => {
    await renderPatientsPage();

    await waitFor(() => expect(screen.getByText('John Doe')).toBeDefined());
    expect(screen.getByText('Jane Smith')).toBeDefined();
    expect(screen.getByText('2 patients found')).toBeDefined();
  });

  it('filters patients by search term', async () => {
    await renderPatientsPage();

    await waitFor(() => expect(screen.getByText('John Doe')).toBeDefined());

    const searchInput = screen.getByPlaceholderText('Search patients, records...');
    fireEvent.change(searchInput, { target: { value: 'Jane' } });

    await waitFor(() => expect(screen.queryByText('John Doe')).toBeNull());
    expect(screen.getByText('Jane Smith')).toBeDefined();
  });

  it('shows Open Record button for each patient', async () => {
    await renderPatientsPage();

    await waitFor(() => expect(screen.getByText('John Doe')).toBeDefined());
    const openButtons = screen.getAllByRole('button', { name: 'Open Record' });
    expect(openButtons.length).toBe(2);
  });

  it('filters by status when filter button is clicked', async () => {
    vi.doMock('../offline/data', () => ({
      query: vi.fn().mockImplementation((resource: string) => {
        if (resource === 'patients') {
          return Promise.resolve([
            { id: 1, full_name: 'John Doe', patient_id: 'P001', sex: 'M', date_of_birth: '1990-01-01', phone: '123-456-7890', created_at: '2024-01-01' },
          ]);
        }
        if (resource === 'encounters') {
          return Promise.resolve([
            { id: 1, patient: 1, status: 'waiting', encounter_type: 'consultation', created_at: '2024-01-01' },
          ]);
        }
        if (resource === 'admissions') return Promise.resolve([]);
        if (resource === 'referrals') return Promise.resolve([]);
        if (resource === 'clinical-progress-notes') return Promise.resolve([]);
        return Promise.resolve([]);
      }),
      onSyncChange: vi.fn().mockReturnValue(() => {}),
    }));

    const Patients = (await import('./Patients')).default;
    render(
      <BrowserRouter>
        <Patients />
      </BrowserRouter>
    );

    await waitFor(() => expect(screen.getByText('John Doe')).toBeDefined());

    const waitingButton = screen.getByRole('button', { name: 'Waiting' });
    waitingButton.click();

    await waitFor(() => expect(screen.getByText('John Doe')).toBeDefined());
  });
});
