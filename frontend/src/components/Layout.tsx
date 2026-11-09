import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { SyncStatusBar } from '../offline/SyncStatusBar';
import { useSyncStatus } from '../offline/useSyncStatus';
import NotificationBell from './NotificationBell';
import {
  Menu,
  Search,
  LogOut,
  Stethoscope,
  Activity,
  Users,
  FileText,
  FlaskConical,
  Pill,
  ArrowRightLeft,
  Bed,
  ClipboardList,
  Calendar,
  Shield,
  FileBarChart,
  Wallet,
  Wifi,
  WifiOff,
  RefreshCw,
  User,
  MessageSquare,
  Database,
  X,
} from 'lucide-react';

const ADMIN_NAV = [
  { to: '/', label: 'Workspace', end: true },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/patients', label: 'Patients' },
  { to: '/encounters', label: 'EMR' },
  { to: '/vitals', label: 'Vitals' },
  { to: '/labs', label: 'Labs' },
  { to: '/pharmacy', label: 'Pharmacy' },
  { to: '/stock', label: 'Stock' },
  { to: '/billing', label: 'Billing' },
  { to: '/referrals', label: 'Referrals' },
  { to: '/inpatient', label: 'Inpatient' },
  { to: '/handovers', label: 'Handovers' },
  { to: '/reports', label: 'Reports' },
  { to: '/data-quality', label: 'Data Quality' },
  { to: '/security', label: 'Security' },
  { to: '/messaging', label: 'Messaging' },
  { to: '/timeline', label: 'Timeline' },
  { to: '/insurance', label: 'Insurance' },
  { to: '/nhis', label: 'NHIS' },
  { to: '/ghs-dashboard', label: 'GHS Dashboard' },
  { to: '/report-builder', label: 'Report Builder' },
  { to: '/report-templates', label: 'Templates' },
  { to: '/formula-builder', label: 'Formulas' },
  { to: '/schedule-manager', label: 'Schedules' },
];

const DOCTOR_NAV = [
  { to: '/', label: 'Workspace', end: true },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/patients', label: 'Patients' },
  { to: '/encounters', label: 'EMR' },
  { to: '/vitals', label: 'Vitals' },
  { to: '/labs', label: 'Labs' },
  { to: '/pharmacy', label: 'Pharmacy' },
  { to: '/billing', label: 'Billing' },
  { to: '/referrals', label: 'Referrals' },
  { to: '/inpatient', label: 'Inpatient' },
  { to: '/handovers', label: 'Handovers' },
  { to: '/reports', label: 'Reports' },
  { to: '/timeline', label: 'Timeline' },
  { to: '/insurance', label: 'Insurance' },
];

const NURSE_NAV = [
  { to: '/', label: 'Workspace', end: true },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/patients', label: 'Patients' },
  { to: '/vitals', label: 'Vitals' },
  { to: '/labs', label: 'Labs' },
  { to: '/pharmacy', label: 'Pharmacy' },
  { to: '/inpatient', label: 'Inpatient' },
  { to: '/handovers', label: 'Handovers' },
  { to: '/timeline', label: 'Timeline' },
];

const NURSE_CLINICAL_NAV = [
  { to: '/', label: 'Workspace', end: true, icon: Activity },
  { to: '/dashboard', label: 'Dashboard', icon: Activity },
  { to: '/patients', label: 'Patients', icon: Users },
  { to: '/vitals', label: 'Vitals', icon: Stethoscope },
  { to: '/pharmacy', label: 'Medication Admin', icon: Pill },
  { to: '/inpatient', label: 'Inpatient', icon: Bed },
  { to: '/labs', label: 'Laboratory', icon: FlaskConical },
  { to: '/handovers', label: 'Handovers', icon: ClipboardList },
  { to: '/timeline', label: 'Timeline', icon: Calendar },
];

const NURSE_ADMINISTRATION_NAV = [
  { to: '/reports', label: 'Reports', icon: FileBarChart },
  { to: '/stock', label: 'Inventory', icon: Pill },
];

const LAB_NAV = [
  { to: '/', label: 'Workspace', end: true },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/patients', label: 'Patients' },
  { to: '/labs', label: 'Labs' },
  { to: '/timeline', label: 'Timeline' },
];

const PHARMACIST_NAV = [
  { to: '/', label: 'Workspace', end: true },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/patients', label: 'Patients' },
  { to: '/pharmacy', label: 'Pharmacy' },
  { to: '/stock', label: 'Stock' },
  { to: '/inpatient', label: 'Inpatient' },
  { to: '/encounters', label: 'Prescriptions' },
];

const RECEPTIONIST_NAV = [
  { to: '/', label: 'Workspace', end: true },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/patients', label: 'Patients' },
  { to: '/billing', label: 'Billing' },
  { to: '/insurance', label: 'Insurance' },
  { to: '/nhis', label: 'NHIS' },
  { to: '/appointments', label: 'Appointments' },
];

const MIDWIFE_NAV = [
  { to: '/', label: 'Workspace', end: true, icon: Activity },
  { to: '/dashboard', label: 'Dashboard', icon: Activity },
  { to: '/patients', label: 'Patients', icon: Users },
  { to: '/encounters', label: 'Antenatal Visits', icon: FileText },
  { to: '/vitals', label: 'Maternal Vitals', icon: Stethoscope },
  { to: '/referrals', label: 'Referrals', icon: ArrowRightLeft },
  { to: '/handovers', label: 'Handovers', icon: ClipboardList },
  { to: '/timeline', label: 'Timeline', icon: Calendar },
  { to: '/reports', label: 'Reports', icon: FileBarChart },
];

const ADMINISTRATOR_SIDEBAR_NAV = [
  {
    title: 'Administration',
    items: [
      { to: '/', label: 'Workspace', end: true, icon: Activity },
      { to: '/dashboard', label: 'Dashboard', icon: Activity },
      { to: '/patients', label: 'Patients', icon: Users },
      { to: '/security', label: 'Users & Staff', icon: Users },
      { to: '/reports', label: 'Reports', icon: FileBarChart },
      { to: '/report-builder', label: 'Report Builder', icon: FileText },
      { to: '/report-templates', label: 'Report Templates', icon: FileText },
      { to: '/formula-builder', label: 'Formulas', icon: FileText },
      { to: '/schedule-manager', label: 'Report Schedules', icon: Calendar },
      { to: '/data-quality', label: 'Data Quality', icon: Shield },
      { to: '/security', label: 'Audit Logs', icon: Shield },
      { to: '/security', label: 'Security', icon: Shield },
    ],
  },
  {
    title: 'Clinical Operations',
    items: [
      { to: '/appointments', label: 'Appointments', icon: Calendar },
      { to: '/encounters', label: 'Encounters', icon: FileText },
      { to: '/inpatient', label: 'Inpatient', icon: Bed },
      { to: '/referrals', label: 'Referrals', icon: ArrowRightLeft },
      { to: '/handovers', label: 'Handovers', icon: ClipboardList },
      { to: '/labs', label: 'Laboratory', icon: FlaskConical },
      { to: '/pharmacy', label: 'Pharmacy', icon: Pill },
      { to: '/stock', label: 'Stock', icon: Pill },
      { to: '/vitals', label: 'Vital Signs', icon: Stethoscope },
    ],
  },
  {
    title: 'Finance & Insurance',
    items: [
      { to: '/billing', label: 'Billing', icon: Wallet },
      { to: '/insurance', label: 'Insurance', icon: Wallet },
      { to: '/nhis', label: 'NHIS', icon: Wallet },
    ],
  },
  {
    title: 'System',
    items: [
      { to: '/messaging', label: 'Notifications', icon: MessageSquare },
      { to: '/messaging', label: 'Messaging', icon: MessageSquare },
      { to: '/dashboard', label: 'Sync Status', icon: Database },
    ],
  },
];

const ROLE_NAV_MAP: Record<string, typeof ADMIN_NAV> = {
  administrator: ADMIN_NAV,
  doctor: DOCTOR_NAV,
  nurse: NURSE_NAV,
  lab_technician: LAB_NAV,
  pharmacist: PHARMACIST_NAV,
  receptionist: RECEPTIONIST_NAV,
  midwife: MIDWIFE_NAV,
};

const CLINICAL_NAV = [
  { to: '/', label: 'Workspace', end: true, icon: Activity },
  { to: '/dashboard', label: 'Dashboard', icon: Activity },
  { to: '/patients', label: 'Patients', icon: Users },
  { to: '/encounters', label: 'Encounters', icon: FileText },
  { to: '/vitals', label: 'Vitals', icon: Stethoscope },
  { to: '/labs', label: 'Labs', icon: FlaskConical },
  { to: '/pharmacy', label: 'Pharmacy', icon: Pill },
  { to: '/referrals', label: 'Referrals', icon: ArrowRightLeft },
  { to: '/inpatient', label: 'Inpatient', icon: Bed },
  { to: '/handovers', label: 'Handovers', icon: ClipboardList },
  { to: '/timeline', label: 'Timeline', icon: Calendar },
];

const ADMINISTRATION_NAV = [
  { to: '/reports', label: 'Reports', icon: FileBarChart },
  { to: '/insurance', label: 'Insurance', icon: Wallet },
  { to: '/billing', label: 'Billing', icon: Wallet },
  { to: '/security', label: 'Security', icon: Shield },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { online, pending, lastSync } = useSyncStatus();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = ROLE_NAV_MAP[user?.role || ''] || ADMIN_NAV;
  const isDoctor = user?.role === 'doctor';
  const isNurse = user?.role === 'nurse';
  const isMidwife = user?.role === 'midwife';
  const isAdmin = user?.role === 'administrator';

  function handleLogout() {
    logout();
    navigate('/login');
  }

  if (isDoctor || isNurse || isAdmin || isMidwife) {
    const sidebarTitle = isDoctor ? 'Doctor Workspace' : isNurse ? 'Nurse Workspace' : isMidwife ? 'Midwife / Maternity Workspace' : 'Administrator Workspace';
    const clinicalNav = isDoctor ? CLINICAL_NAV : isNurse ? NURSE_CLINICAL_NAV : isMidwife ? MIDWIFE_NAV : [];
    const adminNav = isDoctor ? ADMINISTRATION_NAV : isNurse ? NURSE_ADMINISTRATION_NAV : isMidwife ? [] : [];
    const sidebarSections = isAdmin ? ADMINISTRATOR_SIDEBAR_NAV : [];

    return (
      <div className="flex min-h-screen bg-slate-50 text-slate-900">
        <aside className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-slate-900 text-slate-100 transition-transform duration-200 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-4">
              <div>
                <h1 className="text-lg font-semibold text-cyan-400">MedLink Connect</h1>
                <p className="text-xs text-slate-400">{sidebarTitle}</p>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
              {isAdmin ? (
                sidebarSections.map((section) => (
                  <div key={section.title}>
                    <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-slate-500">{section.title}</p>
                    <div className="space-y-1">
                      {section.items.map((item) => (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          end={item.end ?? false}
                          onClick={() => setSidebarOpen(false)}
                          className={({ isActive }) =>
                            `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                              isActive
                                ? 'bg-cyan-500/20 text-cyan-300'
                                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                            }`
                          }
                        >
                          <item.icon size={18} />
                          {item.label}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <>
                  <div>
                    <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-slate-500">Clinical</p>
                    <div className="space-y-1">
                      {clinicalNav.map((item) => (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          end={item.end}
                          onClick={() => setSidebarOpen(false)}
                          className={({ isActive }) =>
                            `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                              isActive
                                ? 'bg-cyan-500/20 text-cyan-300'
                                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                            }`
                          }
                        >
                          <item.icon size={18} />
                          {item.label}
                        </NavLink>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-slate-500">Administration</p>
                    <div className="space-y-1">
                      {adminNav.map((item) => (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          onClick={() => setSidebarOpen(false)}
                          className={({ isActive }) =>
                            `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                              isActive
                                ? 'bg-cyan-500/20 text-cyan-300'
                                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                            }`
                          }
                        >
                          <item.icon size={18} />
                          {item.label}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </nav>

            <div className="border-t border-slate-800 p-3">
              <div className="rounded-lg bg-slate-800/50 p-3">
                <div className="flex items-center gap-2 text-xs">
                  {online ? <Wifi size={14} className="text-emerald-400" /> : <WifiOff size={14} className="text-amber-400" />}
                  <span className={online ? 'text-emerald-300' : 'text-amber-300'}>
                    {online ? 'Online' : 'Offline Mode'}
                  </span>
                </div>
                {pending > 0 && (
                  <p className="mt-1 text-xs text-slate-400">{pending} change{pending === 1 ? '' : 's'} queued</p>
                )}
                {lastSync && online && (
                  <p className="mt-1 text-xs text-slate-500">Last sync: {new Date(lastSync).toLocaleTimeString()}</p>
                )}
              </div>
            </div>
          </div>
        </aside>

        {sidebarOpen && (
          <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
            <div className="flex items-center justify-between px-4 py-3 md:px-6">
              <div className="flex items-center gap-4">
                <button onClick={() => setSidebarOpen(true)} className="md:hidden text-slate-600 hover:text-slate-900">
                  <Menu size={24} />
                </button>
                <div className="relative hidden md:block">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search patients, records..."
                    className="w-64 rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 md:gap-4">
                <div className="hidden md:flex items-center gap-2 text-sm">
                  {online ? (
                    <span className="flex items-center gap-1.5 text-emerald-600">
                      <Wifi size={16} />
                      Online
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-amber-600">
                      <WifiOff size={16} />
                      Offline
                    </span>
                  )}
                </div>

                <div className="hidden md:flex items-center gap-1 text-xs text-slate-500">
                  <RefreshCw size={14} className={pending > 0 ? 'animate-spin' : ''} />
                  {lastSync ? `Synced ${new Date(lastSync).toLocaleTimeString()}` : 'Not synced'}
                </div>

                <NotificationBell />

                <div className="flex items-center gap-3">
                  <div className="hidden text-right md:block">
                    <p className="text-sm font-medium text-slate-900">{user?.username || 'Nurse'}</p>
                    <p className="text-xs text-slate-500 capitalize">{user?.role?.replace('_', ' ')}</p>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-100 text-cyan-700">
                    <User size={18} />
                  </div>
                  <button onClick={handleLogout} className="hidden text-slate-400 hover:text-slate-600 md:block">
                    <LogOut size={18} />
                  </button>
                </div>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-sm uppercase tracking-[0.35em] text-cyan-400">
              MedLink Connect
            </span>
          </div>
          <nav className="flex flex-wrap gap-1 text-sm">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 transition-colors ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-sm">
            {user && (
              <span className="text-slate-400">
                {user.username}{' '}
                <span className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-slate-300">
                  {user.role}
                </span>
              </span>
            )}
            <button
              onClick={handleLogout}
              className="rounded-md border border-slate-700 px-3 py-1.5 hover:bg-slate-800"
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <SyncStatusBar />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
