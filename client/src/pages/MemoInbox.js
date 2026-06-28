import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { format } from 'date-fns';

const urgencyConfig = {
  urgent: { color: '#D73A49', bg: '#FFEEF0', label: 'URGENT' },
  priority: { color: '#E36209', bg: '#FFF5E0', label: 'PRIORITY' },
  routine: { color: '#0366D6', bg: '#EAF2FF', label: 'ROUTINE' },
  confidential: { color: '#6F42C1', bg: '#F3EEFF', label: 'CONFIDENTIAL' },
};

const statusConfig = {
  acknowledged: { color: '#28A745', bg: '#E8F5E9', label: 'Acknowledged' },
  opened: { color: '#0366D6', bg: '#EAF2FF', label: 'Opened' },
  delivered: { color: '#586069', bg: '#F0F2F5', label: 'Unread' },
};

export default function MemoInbox({ sent }) {
  const [memos, setMemos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    const endpoint = sent ? '/memos/sent' : '/memos/inbox';
    api.get(endpoint).then(r => setMemos(r.data)).finally(() => setLoading(false));
  }, [sent]);

  const filtered = filter === 'all' ? memos : memos.filter(m =>
    sent ? m.urgency === filter : m.delivery_status === filter
  );

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>{sent ? 'Sent Memos' : 'Memo Inbox'}</h1>
          <div style={styles.subtitle}>{memos.length} memo{memos.length !== 1 ? 's' : ''}</div>
        </div>
        {!sent && (
          <div style={styles.filters} data-tour="urgency-filter">
            {['all', 'delivered', 'opened', 'acknowledged'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{ ...styles.filterBtn, ...(filter === f ? styles.filterActive : {}) }}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && <div style={styles.loading}>Loading...</div>}
      {!loading && filtered.length === 0 && <div style={styles.empty}>No memos to display</div>}

      <div style={styles.list} data-tour="memo-list">
        {filtered.map(m => (
          <div key={m.id} onClick={() => navigate(`/memos/${m.id}`)} style={styles.row}>
            <div style={styles.rowLeft}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ ...styles.urgencyTag, background: urgencyConfig[m.urgency]?.bg, color: urgencyConfig[m.urgency]?.color }}>
                  {urgencyConfig[m.urgency]?.label}
                </span>
                <span style={styles.memoNum}>{m.memo_number}</span>
                {!sent && m.delivery_status !== 'acknowledged' && <span style={styles.unreadDot} />}
              </div>
              <div style={styles.subject}>{m.subject}</div>
              <div style={styles.meta}>
                {sent
                  ? `${m.total_recipients} recipients · ${m.acknowledged_count} acknowledged`
                  : `From: ${m.sender_name} · ${m.sender_department}`
                }
              </div>
            </div>
            <div style={styles.rowRight}>
              {!sent && (
                <span style={{ ...styles.statusBadge, background: statusConfig[m.delivery_status]?.bg, color: statusConfig[m.delivery_status]?.color }}>
                  {statusConfig[m.delivery_status]?.label}
                </span>
              )}
              {sent && (
                <div style={styles.trackProgress}>
                  <div style={styles.progressLabel}>{m.acknowledged_count}/{m.total_recipients} ack.</div>
                  <div style={styles.progressBar}>
                    <div style={{ ...styles.progressFill, width: m.total_recipients > 0 ? `${(m.acknowledged_count/m.total_recipients)*100}%` : '0%' }} />
                  </div>
                </div>
              )}
              <div style={styles.date}>{m.published_at ? format(new Date(m.published_at), 'd MMM yyyy') : '—'}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  page: { padding: '28px 32px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title: { fontSize: 22, fontWeight: 700, color: '#0D1117', marginBottom: 2 },
  subtitle: { fontSize: 13, color: '#586069' },
  filters: { display: 'flex', gap: 6 },
  filterBtn: { background: '#fff', border: '1px solid #E2E6EA', color: '#586069', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer' },
  filterActive: { background: '#006B3C', color: '#fff', borderColor: '#006B3C' },
  loading: { color: '#586069', padding: 20 },
  empty: { background: '#fff', border: '1px solid #E2E6EA', borderRadius: 8, padding: '48px', textAlign: 'center', color: '#8B949E', fontSize: 14 },
  list: { display: 'flex', flexDirection: 'column', gap: 2 },
  row: { background: '#fff', border: '1px solid #E2E6EA', borderRadius: 8, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'box-shadow 0.15s' },
  rowLeft: { flex: 1, minWidth: 0 },
  rowRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, marginLeft: 20, flexShrink: 0 },
  urgencyTag: { fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, letterSpacing: '0.04em' },
  memoNum: { fontSize: 12, color: '#586069', fontFamily: 'monospace' },
  unreadDot: { width: 8, height: 8, borderRadius: '50%', background: '#006B3C' },
  subject: { fontSize: 14, fontWeight: 600, color: '#0D1117', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  meta: { fontSize: 12, color: '#8B949E' },
  statusBadge: { fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 10 },
  date: { fontSize: 11, color: '#8B949E' },
  trackProgress: { textAlign: 'right' },
  progressLabel: { fontSize: 11, color: '#586069', marginBottom: 4 },
  progressBar: { width: 100, height: 4, background: '#E2E6EA', borderRadius: 2 },
  progressFill: { height: '100%', background: '#006B3C', borderRadius: 2, transition: 'width 0.3s' },
};
