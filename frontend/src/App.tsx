import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, type ReactNode } from 'react';
import { AuthProvider, useAuth } from './auth';
import { initSync, fullSync } from './offline/sync';
import Layout from './components/Layout';
import Login from './pages/Login';
import {
  RoleWorkspace,
  PatientWorkspace,
  Consultation,
} from './workspaces';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import Encounters from './pages/Encounters';
import Handovers from './pages/Handovers';
import Labs from './pages/Labs';
import Timeline from './pages/Timeline';
import Insurance from './pages/Insurance';
import NHIS from './pages/NHIS';
import Billing from './pages/Billing';
import Pharmacy from './pages/Pharmacy';
import Stock from './pages/Stock';
import Reports from './pages/Reports';
import GHSDashboard from './pages/GHSDashboard';
import ReportBuilder from './pages/ReportBuilder';
import DataQuality from './pages/DataQuality';
import ReportTemplateManager from './pages/ReportTemplateManager';
import FormulaBuilder from './pages/FormulaBuilder';
import ScheduleManager from './pages/ScheduleManager';
import Messaging from './pages/Messaging';
import Security from './pages/Security';
import Scheduling from './pages/Scheduling';
import VitalSigns from './pages/VitalSigns';
import Referrals from './pages/Referrals';
import Inpatient from './pages/Inpatient';

function RequireAuth({ children }: { children: ReactNode }) {
  const { token, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        Loading…
      </div>
    );
  }
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function SyncBootstrap() {
  const { token } = useAuth();
  useEffect(() => {
    initSync();
  }, []);
  useEffect(() => {
    if (token) fullSync();
  }, [token]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SyncBootstrap />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route path="/" element={<RoleWorkspace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/patients" element={<Patients />} />
            <Route path="/patients/:id" element={<PatientWorkspace />} />
            <Route path="/consultation/:patientId" element={<Consultation />} />
            <Route path="/encounters" element={<Encounters />} />
            <Route path="/handovers" element={<Handovers />} />
            <Route path="/labs" element={<Labs />} />
            <Route path="/timeline" element={<Timeline />} />
            <Route path="/insurance" element={<Insurance />} />
            <Route path="/nhis" element={<NHIS />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/pharmacy" element={<Pharmacy />} />
            <Route path="/stock" element={<Stock />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/ghs-dashboard" element={<GHSDashboard />} />
            <Route path="/report-builder" element={<ReportBuilder />} />
            <Route path="/report-templates" element={<ReportTemplateManager />} />
            <Route path="/formula-builder" element={<FormulaBuilder />} />
            <Route path="/schedule-manager" element={<ScheduleManager />} />
            <Route path="/data-quality" element={<DataQuality />} />
            <Route path="/messaging" element={<Messaging />} />
            <Route path="/security" element={<Security />} />
            <Route path="/vitals" element={<VitalSigns />} />
            <Route path="/appointments" element={<Scheduling />} />
            <Route path="/referrals" element={<Referrals />} />
            <Route path="/inpatient" element={<Inpatient />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
