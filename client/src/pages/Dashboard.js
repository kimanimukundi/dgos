import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTour } from '../context/TourContext';
import { TOUR_STEPS } from '../utils/tourSteps';
import api from '../utils/api';
import { formatDistanceToNow } from 'date-fns';
import DemoTooltip from '../components/DemoTooltip';

const urgencyColors = { urgent: '#D73A49', priority: '#E36209', routine: '#0366D6', confidential: '#6F42C1' };

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { startTour } = useTour();

  const handleStartTour = () => {
    const roleId = localStorage.getItem('dgos_demo_role');
    if (!roleId) return;
    const steps = TOUR_STEPS[roleId];
    if (!steps) return;
    localStorage.removeItem(`dgos_tour_done_${roleId}`);
    startTour(steps, roleId, navigate);
  };

  const isDemoMode = !!localStorage.getItem('dgos_demo_role');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  const canCompose = ['supervisor', 'hod', 'director', 'system_admin'].includes(user?.role);
  const today = new Date().toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  if (loading) return <div style={styles.loading}>Loading dashboard...</div>;

  const stats = data?.stats || {};

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <div>
          <h1 style={styles.greeting}>Welcome, {user?.full_name?.split(' ')[0]}</h1>
          <div style={styles.meta}>{user?.job_title} &nbsp;·&nbsp; {user?.department_name} &nbsp;·&nbsp; {today}</div>
        </div>
        {canCompose && (
          <DemoTooltip id="compose_memo" title="Compose an official memo" body="Send a memo to individuals, departments, or all staff. Every recipient must acknowledge receipt — creating a permanent timestamped record." position="bottom">
            <button onClick={() => navigate('/memos/compose')} style={styles.composeBtn}>
              + Compose Memo
            </button>
          </DemoTooltip>
        )}
        {isDemoMode && (
          <button onClick={handleStartTour} style={styles.tourBtn} title="Restart the guided tour">
            🗺 Take a Tour
          </button>
        )}
      </div>

      {/* Stat cards */}
      <div style={styles.statGrid} data-tour="stat-cards">
        <StatCard icon="📨" label="Pending Acknowledgment" value={stats.pending_memos} color="#006B3C" onClick={() => navigate('/memos/inbox')} />
        <StatCard icon="📬" label="Unread Memos" value={stats.unread_memos} color="#0366D6" onClick={() => navigate('/memos/inbox')} />
        <StatCard icon="✅" label="Pending Approvals" value={stats.pending_approvals} color="#6F42C1" onClick={() => navigate('/workflows')} />
        <StatCard icon="📋" label="Assigned Tasks" value={stats.assigned_tasks} color={stats.overdue_tasks > 0 ? '#D73A49' : '#E36209'}
          note={stats.overdue_tasks > 0 ? `${stats.overdue_tasks} overdue` : null} onClick={() => navigate('/tasks')} />
        <StatCard icon="🎫" label="My Open Tickets" value={stats.my_open_tickets} color="#0366D6"
          note={stats.my_queue_tickets > 0 ? `${stats.my_queue_tickets} in my ICT queue` : null} onClick={() => navigate('/tickets')} />
      </div>

      <div style={styles.twoCol}>
        {/* Left column */}
        <div>
          {/* Recent memos */}
          <div style={styles.panel} data-tour="recent-memos-panel">
            <div style={styles.panelHeader}>
              <span style={styles.panelTitle}>Recent Memos</span>
              <button onClick={() => navigate('/memos/inbox')} style={styles.viewAll}>View all →</button>
            </div>
            {data?.recent_memos?.length === 0 && <div style={styles.empty}>No memos yet</div>}
            {data?.recent_memos?.map(m => (
              <div key={m.id} onClick={() => navigate(`/memos/${m.id}`)} style={styles.memoRow}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ ...styles.urgencyDot, background: urgencyColors[m.urgency] }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={styles.memoSubject}>{m.subject}</div>
                    <div style={styles.memoMeta}>
                      {m.sender_name} &nbsp;·&nbsp; {m.memo_number}
                    </div>
                  </div>
                  <StatusBadge status={m.delivery_status} />
                </div>
              </div>
            ))}
          </div>

          {/* Pending workflow actions */}
          <div style={{ ...styles.panel, marginTop: 16 }}>
            <div style={styles.panelHeader}>
              <span style={styles.panelTitle}>Awaiting Your Approval</span>
              <button onClick={() => navigate('/workflows')} style={styles.viewAll}>View all →</button>
            </div>
            {data?.pending_workflows?.length === 0 && <div style={styles.empty}>Nothing pending your action</div>}
            {data?.pending_workflows?.map(w => (
              <div key={w.id} onClick={() => navigate(`/workflows/${w.id}`)} style={styles.memoRow}>
                <div style={styles.memoSubject}>{w.title}</div>
                <div style={styles.memoMeta}>{w.reference_number} · {w.step_label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div>
          <div style={styles.panel}>
            <div style={styles.panelHeader}>
              <span style={styles.panelTitle}>Notice Board</span>
              <button onClick={() => navigate('/notices')} style={styles.viewAll}>View all →</button>
            </div>
            {data?.recent_notices?.length === 0 && <div style={styles.empty}>No active notices</div>}
            {data?.recent_notices?.map(n => (
              <div key={n.id} style={styles.noticeRow}>
                <div style={styles.noticeTitle}>{n.title}</div>
                <div style={styles.noticeMeta}>Posted by {n.posted_by_name || 'System'}</div>
              </div>
            ))}
          </div>

          {/* My active tasks */}
          <div style={{ ...styles.panel, marginTop: 16 }}>
            <div style={styles.panelHeader}>
              <span style={styles.panelTitle}>My Active Tasks</span>
              <button onClick={() => navigate('/tasks')} style={styles.viewAll}>View all →</button>
            </div>
            {data?.my_tasks?.length === 0 && <div style={styles.empty}>No active tasks</div>}
            {data?.my_tasks?.map(t => (
              <div key={t.id} onClick={() => navigate(`/tasks/${t.id}`)} style={styles.memoRow}>
                <div style={styles.memoSubject}>{t.title}</div>
                <div style={{ ...styles.memoMeta, color: t.status === 'overdue' ? '#D73A49' : '#8B949E' }}>
                  {t.status === 'overdue' ? '⚠ Overdue' : t.deadline ? `Due ${new Date(t.deadline).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}` : 'No deadline'}
                </div>
              </div>
            ))}
          </div>

          <div style={{ ...styles.panel, marginTop: 16 }}>
            <div style={styles.panelHeader}>
              <span style={styles.panelTitle}>Recent Activity</span>
            </div>
            {data?.activity?.length === 0 && <div style={styles.empty}>No recent activity</div>}
            {data?.activity?.slice(0, 6).map((a, i) => (
              <div key={i} style={styles.activityRow}>
                <span style={styles.activityAction}>{formatAction(a.action)}</span>
                {a.entity_label && <span style={styles.activityLabel}> — {a.memo_number ? `${a.memo_number}: ` : ''}{a.entity_label}</span>}
                <div style={styles.activityTime}>{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, onClick, note }) {
  return (
    <div onClick={onClick} style={{ ...styles.statCard, ...(onClick ? { cursor: 'pointer' } : {}) }}>
      <div style={{ ...styles.statIcon, background: color + '15', color }}>{icon}</div>
      <div>
        <div style={{ ...styles.statValue, color }}>{value ?? 0}</div>
        <div style={styles.statLabel}>{label}</div>
        {note && <div style={styles.statNote}>{note}</div>}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    acknowledged: { bg: '#E8F5E9', color: '#28A745', label: 'Acknowledged' },
    opened: { bg: '#EAF2FF', color: '#0366D6', label: 'Opened' },
    delivered: { bg: '#F0F2F5', color: '#586069', label: 'Unread' },
  };
  const s = map[status] || map.delivered;
  return <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10, whiteSpace: 'nowrap' }}>{s.label}</span>;
}

function formatAction(action) {
  return { login: 'Signed in', open_memo: 'Opened memo', acknowledge_memo: 'Acknowledged memo', publish_memo: 'Published memo', create_staff: 'Created staff', change_password: 'Changed password' }[action] || action;
}

const styles = {
  page: { padding: '28px 32px', maxWidth: 1100 },
  loading: { padding: 40, color: '#586069' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  greeting: { fontSize: 22, fontWeight: 700, color: '#0D1117', marginBottom: 4 },
  meta: { fontSize: 13, color: '#586069' },
  composeBtn: { background: '#006B3C', color: '#fff', border: 'none', borderRadius: 6, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  tourBtn: { background: '#fff', border: '1px solid #E2E6EA', color: '#586069', borderRadius: 6, padding: '9px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 },
  statCard: { background: '#fff', borderRadius: 8, padding: '16px', border: '1px solid #E2E6EA', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
  statIcon: { width: 44, height: 44, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 },
  statValue: { fontSize: 26, fontWeight: 700, lineHeight: 1 },
  statLabel: { fontSize: 12, color: '#586069', marginTop: 3 },
  statNote: { fontSize: 11, color: '#8B949E', marginTop: 2 },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  panel: { background: '#fff', border: '1px solid #E2E6EA', borderRadius: 8, overflow: 'hidden' },
  panelHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid #E2E6EA' },
  panelTitle: { fontSize: 13, fontWeight: 700, color: '#0D1117' },
  viewAll: { background: 'none', border: 'none', color: '#006B3C', fontSize: 12, cursor: 'pointer', fontWeight: 500 },
  empty: { padding: '24px 16px', color: '#8B949E', fontSize: 13, textAlign: 'center' },
  memoRow: { padding: '12px 16px', borderBottom: '1px solid #F0F2F5', cursor: 'pointer', transition: 'background 0.1s' },
  memoSubject: { fontSize: 13, fontWeight: 600, color: '#0D1117', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  memoMeta: { fontSize: 11, color: '#8B949E' },
  urgencyDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 4 },
  noticeRow: { padding: '12px 16px', borderBottom: '1px solid #F0F2F5' },
  noticeTitle: { fontSize: 13, fontWeight: 500, color: '#0D1117', marginBottom: 2 },
  noticeMeta: { fontSize: 11, color: '#8B949E' },
  activityRow: { padding: '9px 16px', borderBottom: '1px solid #F0F2F5' },
  activityAction: { fontSize: 12, fontWeight: 600, color: '#0D1117' },
  activityLabel: { fontSize: 12, color: '#586069' },
  activityTime: { fontSize: 11, color: '#8B949E', marginTop: 2 },
};
