import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const groupLabels = {
  memos: 'Memos', workflows: 'Workflows', tasks: 'Tasks', tickets: 'Helpdesk',
  leave: 'Leave', contracts: 'Contracts', meetings: 'Meetings',
};
const viewAllLinks = {
  memos: '/memos/inbox', workflows: '/workflows', tasks: '/tasks', tickets: '/tickets',
  leave: '/leave', contracts: '/contracts', meetings: '/meetings',
};

export default function NotificationBell() {
  const [data, setData] = useState({ notifications: [], unread_count: 0 });
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const containerRef = useRef(null);

  const load = () => {
    api.get('/notifications').then(r => setData(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = async (n) => {
    setOpen(false);
    if (!n.read) {
      try { await api.post(`/notifications/${encodeURIComponent(n.key)}/read`); } catch {}
    }
    navigate(n.url);
  };

  const handleMarkAllRead = async () => {
    const unreadKeys = data.notifications.filter(n => !n.read).map(n => n.key);
    if (!unreadKeys.length) return;
    try {
      await api.post('/notifications/mark-all-read', { keys: unreadKeys });
      load();
    } catch {}
  };

  // Group notifications by type, preserving sort order within each
  const grouped = data.notifications.reduce((acc, n) => {
    if (!acc[n.group]) acc[n.group] = [];
    acc[n.group].push(n);
    return acc;
  }, {});

  return (
    <div ref={containerRef} style={styles.container}>
      <button onClick={() => setOpen(!open)} style={styles.bellBtn}>
        <span style={styles.bellIcon}>🔔</span>
        {data.unread_count > 0 && (
          <span style={styles.badge}>{data.unread_count > 9 ? '9+' : data.unread_count}</span>
        )}
      </button>

      {open && (
        <div style={styles.dropdown}>
          <div style={styles.header}>
            <span style={styles.headerTitle}>Notifications</span>
            {data.unread_count > 0 && (
              <button onClick={handleMarkAllRead} style={styles.markAllBtn}>Mark all read</button>
            )}
          </div>

          {loading && <div style={styles.empty}>Loading...</div>}
          {!loading && data.notifications.length === 0 && (
            <div style={styles.empty}>You're all caught up</div>
          )}

          {!loading && Object.entries(grouped).map(([group, items]) => (
            <div key={group} style={styles.group}>
              <div style={styles.groupHeader}>
                <span>{groupLabels[group] || group}</span>
                <span
                  onClick={(e) => { e.stopPropagation(); setOpen(false); navigate(viewAllLinks[group] || '/'); }}
                  style={styles.viewAll}
                >
                  View all →
                </span>
              </div>
              {items.map(n => (
                <div key={n.key} onClick={() => handleSelect(n)}
                  style={{ ...styles.item, ...(n.read ? styles.itemRead : {}) }}>
                  <span style={styles.itemIcon}>{n.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ ...styles.itemTitle, ...(n.urgent && !n.read ? styles.itemTitleUrgent : {}) }}>
                      {n.title}
                    </div>
                    <div style={styles.itemDetail}>{n.detail}</div>
                  </div>
                  {!n.read && <span style={styles.unreadDot} />}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { position: 'relative' },
  bellBtn: { position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: 8, display: 'flex', alignItems: 'center' },
  bellIcon: { fontSize: 18 },
  badge: { position: 'absolute', top: 2, right: 2, background: '#D73A49', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 10, padding: '1px 5px', minWidth: 16, textAlign: 'center', lineHeight: '14px' },
  dropdown: { position: 'absolute', top: '120%', right: 0, width: 380, background: '#fff', border: '1px solid #E2E6EA', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: 480, overflowY: 'auto', zIndex: 200 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #E2E6EA', position: 'sticky', top: 0, background: '#fff' },
  headerTitle: { fontSize: 13, fontWeight: 700, color: '#0D1117' },
  markAllBtn: { background: 'none', border: 'none', color: '#006B3C', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  empty: { padding: '28px', textAlign: 'center', color: '#8B949E', fontSize: 13 },
  group: { borderBottom: '1px solid #F0F2F5' },
  groupHeader: { display: 'flex', justifyContent: 'space-between', padding: '8px 16px 4px', fontSize: 11, fontWeight: 700, color: '#8B949E', textTransform: 'uppercase', letterSpacing: '0.05em' },
  viewAll: { color: '#006B3C', cursor: 'pointer', textTransform: 'none', fontWeight: 600, fontSize: 11 },
  item: { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 16px', cursor: 'pointer' },
  itemRead: { opacity: 0.55 },
  itemIcon: { fontSize: 14, marginTop: 1 },
  itemTitle: { fontSize: 13, fontWeight: 600, color: '#0D1117', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  itemTitleUrgent: { color: '#D73A49' },
  itemDetail: { fontSize: 11, color: '#8B949E', marginTop: 1 },
  unreadDot: { width: 7, height: 7, borderRadius: '50%', background: '#006B3C', flexShrink: 0, marginTop: 4 },
};
