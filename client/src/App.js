import React, { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TourProvider, useTour } from './context/TourContext';
import { TOUR_STEPS } from './utils/tourSteps';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MemoInbox from './pages/MemoInbox';
import MemoView from './pages/MemoView';
import MemoCompose from './pages/MemoCompose';
import MemoTracking from './pages/MemoTracking';
import MemoRegistry from './pages/MemoRegistry';
import Notices from './pages/Notices';
import Directory from './pages/Directory';
import OrgChart from './pages/OrgChart';
import ChangePassword from './pages/ChangePassword';
import AdminStaff from './pages/AdminStaff';
import Workflows from './pages/Workflows';
import WorkflowDetail from './pages/WorkflowDetail';
import Tasks from './pages/Tasks';
import TaskDetail from './pages/TaskDetail';
import Leave from './pages/Leave';
import Reports from './pages/Reports';
import Assets from './pages/Assets';
import AssetDetail from './pages/AssetDetail';
import Meetings from './pages/Meetings';
import MeetingDetail from './pages/MeetingDetail';
import Contracts from './pages/Contracts';
import Tickets from './pages/Tickets';
import TicketDetail from './pages/TicketDetail';
import Documents from './pages/Documents';
import DocumentDetail from './pages/DocumentDetail';
import DemoLanding from './pages/DemoLanding';
import GlobalSearch from './components/GlobalSearch';
import NotificationBell from './components/NotificationBell';
import SwitchRole from './components/SwitchRole';
import TourOverlay from './components/TourOverlay';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#586069' }}>Loading...</div>;
  return user ? children : <Navigate to="/login" />;
}

function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isDemoMode = !!localStorage.getItem('dgos_demo_role');
  const canCompose = ['supervisor', 'hod', 'director', 'system_admin'].includes(user?.role);
  const canReport = ['hod', 'director', 'auditor', 'system_admin'].includes(user?.role);
  const isAdmin = user?.role === 'system_admin';

  const navItem = (to, icon, label, tourId) => (
    <NavLink to={to} data-tour={tourId || undefined}
      style={({ isActive }) => ({ ...styles.navItem, ...(isActive ? styles.navItemActive : {}) })}>
      <span style={styles.navIcon}>{icon}</span>
      <span>{label}</span>
    </NavLink>
  );

  return (
    <div style={styles.sidebar}>
      <div style={styles.sidebarHeader}>
        <div style={styles.logo}>🦁</div>
        <div>
          <div style={styles.logoText}>MOT&W Kenya</div>
          <div style={styles.logoSub}>Digital Govt Operations System</div>
        </div>
      </div>
      <nav style={styles.nav}>
        <div style={styles.navSection}>MAIN</div>
        {navItem('/', '⊞', 'Dashboard')}
        {navItem('/memos/inbox', '📨', 'Inbox')}
        {canCompose && navItem('/memos/sent', '📤', 'Sent Memos')}
        {navItem('/notices', '📢', 'Notice Board')}
        {navItem('/registry', '📨', 'Memo Archive')}
        {navItem('/documents', '📄', 'Document Registry')}

        <div style={styles.navSection}>OPERATIONS</div>
        {navItem('/workflows', '🔁', 'Workflows')}
        {navItem('/tasks', '✔', 'Tasks')}
        {navItem('/leave', '🗓', 'Leave')}
        {navItem('/meetings', '🗣', 'Meetings')}
        {navItem('/tickets', '🎫', 'ICT Helpdesk')}

        <div style={styles.navSection}>RECORDS</div>
        {navItem('/assets', '🗂', 'Asset Registry')}
        {navItem('/contracts', '📑', 'Contracts & Vendors')}

        <div style={styles.navSection}>ORGANISATION</div>
        {navItem('/directory', '👥', 'Staff Directory')}
        {navItem('/org-chart', '🏛', 'Org Chart')}

        {canReport && (
          <>
            <div style={styles.navSection}>INTELLIGENCE</div>
            {navItem('/reports', '📊', 'Reports & Audit')}
          </>
        )}
        {isAdmin && (
          <>
            <div style={styles.navSection}>ADMINISTRATION</div>
            {navItem('/admin/staff', '⚙', 'Manage Staff')}
          </>
        )}
      </nav>
      <div style={styles.sidebarFooter}>
        <div style={styles.userInfo}>
          <div style={styles.userAvatar}>{user?.full_name?.[0]}</div>
          <div>
            <div style={styles.userName}>{user?.full_name?.split(' ').slice(0,2).join(' ')}</div>
            <div style={styles.userRole}>{user?.role?.replace('_',' ')}</div>
          </div>
        </div>
        {isDemoMode && <SwitchRole />}
        <button onClick={() => { logout(); navigate('/login'); }} style={styles.logoutBtn}>Sign out</button>
      </div>
    </div>
  );
}

function TourStarter() {
  const { startTour, active } = useTour();
  const navigate = useNavigate();
  const started = useRef(false);
  const startTourRef = useRef(startTour);
  const navigateRef = useRef(navigate);
  startTourRef.current = startTour;
  navigateRef.current = navigate;

  useEffect(() => {
    if (active || started.current) return;
    const roleId = localStorage.getItem('dgos_start_tour');
    if (!roleId) return;
    started.current = true;
    localStorage.removeItem('dgos_start_tour');
    const steps = TOUR_STEPS[roleId];
    if (!steps) return;
    const t = setTimeout(() => startTourRef.current(steps, roleId, navigateRef.current), 1200);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return null;
}

function Layout({ children }) {
  return (
    <div style={styles.layout}>
      <Sidebar />
      <div style={styles.mainWrap}>
        <div style={styles.topBar}>
          <GlobalSearch />
          <div data-tour="notification-bell">
            <NotificationBell />
          </div>
        </div>
        <main style={styles.main}>{children}</main>
      </div>
      <TourStarter />
      <TourOverlay />
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/demo" element={<DemoLanding />} />
      <Route path="/login" element={<Login />} />
      <Route path="/change-password" element={<PrivateRoute><ChangePassword /></PrivateRoute>} />
      <Route path="/" element={<PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>} />
      <Route path="/memos/inbox" element={<PrivateRoute><Layout><MemoInbox /></Layout></PrivateRoute>} />
      <Route path="/memos/sent" element={<PrivateRoute><Layout><MemoInbox sent /></Layout></PrivateRoute>} />
      <Route path="/memos/compose" element={<PrivateRoute><Layout><MemoCompose /></Layout></PrivateRoute>} />
      <Route path="/memos/:id" element={<PrivateRoute><Layout><MemoView /></Layout></PrivateRoute>} />
      <Route path="/memos/:id/tracking" element={<PrivateRoute><Layout><MemoTracking /></Layout></PrivateRoute>} />
      <Route path="/registry" element={<PrivateRoute><Layout><MemoRegistry /></Layout></PrivateRoute>} />
      <Route path="/notices" element={<PrivateRoute><Layout><Notices /></Layout></PrivateRoute>} />
      <Route path="/directory" element={<PrivateRoute><Layout><Directory /></Layout></PrivateRoute>} />
      <Route path="/org-chart" element={<PrivateRoute><Layout><OrgChart /></Layout></PrivateRoute>} />
      <Route path="/workflows" element={<PrivateRoute><Layout><Workflows /></Layout></PrivateRoute>} />
      <Route path="/workflows/:id" element={<PrivateRoute><Layout><WorkflowDetail /></Layout></PrivateRoute>} />
      <Route path="/tasks" element={<PrivateRoute><Layout><Tasks /></Layout></PrivateRoute>} />
      <Route path="/tasks/:id" element={<PrivateRoute><Layout><TaskDetail /></Layout></PrivateRoute>} />
      <Route path="/leave" element={<PrivateRoute><Layout><Leave /></Layout></PrivateRoute>} />
      <Route path="/reports" element={<PrivateRoute><Layout><Reports /></Layout></PrivateRoute>} />
      <Route path="/assets" element={<PrivateRoute><Layout><Assets /></Layout></PrivateRoute>} />
      <Route path="/assets/:id" element={<PrivateRoute><Layout><AssetDetail /></Layout></PrivateRoute>} />
      <Route path="/meetings" element={<PrivateRoute><Layout><Meetings /></Layout></PrivateRoute>} />
      <Route path="/meetings/:id" element={<PrivateRoute><Layout><MeetingDetail /></Layout></PrivateRoute>} />
      <Route path="/contracts" element={<PrivateRoute><Layout><Contracts /></Layout></PrivateRoute>} />
      <Route path="/tickets" element={<PrivateRoute><Layout><Tickets /></Layout></PrivateRoute>} />
      <Route path="/tickets/:id" element={<PrivateRoute><Layout><TicketDetail /></Layout></PrivateRoute>} />
      <Route path="/documents" element={<PrivateRoute><Layout><Documents /></Layout></PrivateRoute>} />
      <Route path="/documents/:id" element={<PrivateRoute><Layout><DocumentDetail /></Layout></PrivateRoute>} />
      <Route path="/admin/staff" element={<PrivateRoute><Layout><AdminStaff /></Layout></PrivateRoute>} />
    </Routes>
  );
}

const styles = {
  layout: { display: 'flex', minHeight: '100vh' },
  sidebar: { width: '240px', background: '#0D1117', color: '#fff', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, height: '100vh', overflowY: 'auto' },
  sidebarHeader: { display: 'flex', alignItems: 'center', gap: 10, padding: '16px 14px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)' },
  logo: { fontSize: 26 },
  logoText: { fontSize: 12, fontWeight: 700, color: '#fff' },
  logoSub: { fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 1 },
  nav: { flex: 1, padding: '10px 8px' },
  navSection: { fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', padding: '12px 8px 4px', textTransform: 'uppercase' },
  navItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 6, color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: 500, marginBottom: 2, transition: 'all 0.15s', textDecoration: 'none' },
  navItemActive: { background: 'rgba(0,107,60,0.35)', color: '#4ADE80' },
  navIcon: { fontSize: 14, width: 18, textAlign: 'center' },
  sidebarFooter: { padding: '12px 12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: 8 },
  userInfo: { display: 'flex', alignItems: 'center', gap: 10 },
  userAvatar: { width: 32, height: 32, borderRadius: '50%', background: '#006B3C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 },
  userName: { fontSize: 12, fontWeight: 600, color: '#fff' },
  userRole: { fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'capitalize' },
  logoutBtn: { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', borderRadius: 5, padding: '7px', fontSize: 12, cursor: 'pointer' },
  mainWrap: { marginLeft: '240px', flex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column' },
  topBar: { background: '#fff', borderBottom: '1px solid #E2E6EA', padding: '12px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  main: { flex: 1, background: '#F7F8FA' },
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TourProvider>
          <AppRoutes />
        </TourProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
