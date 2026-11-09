import { useEffect, useState } from 'react';
import { useAuth, loadStoredUser } from '../auth';
import { LoadingBox } from '../components/ui';
import {
  DoctorWorkspace,
  NurseWorkspace,
  LabWorkspace,
  PharmacyWorkspace,
  ReceptionWorkspace,
  MidwifeWorkspace,
  AdministratorWorkspace,
  MedicalRecordsWorkspace,
} from './index';

export default function RoleWorkspace() {
  const { user, loading } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!loading) setReady(true);
  }, [loading]);

  if (loading || !ready || !user) {
    const storedRole = loadStoredUser()?.role;
    const isDarkWorkspace = storedRole === 'administrator';
    return <LoadingBox variant={isDarkWorkspace ? 'dark' : 'light'} />;
  }

  switch (user.role) {
    case 'doctor':
      return <DoctorWorkspace />;
    case 'nurse':
      return <NurseWorkspace />;
    case 'lab_technician':
      return <LabWorkspace />;
    case 'pharmacist':
      return <PharmacyWorkspace />;
    case 'receptionist':
      return <ReceptionWorkspace />;
    case 'midwife':
      return <MidwifeWorkspace />;
    case 'administrator':
      return <AdministratorWorkspace />;
    default:
      return <MedicalRecordsWorkspace />;
  }
}
