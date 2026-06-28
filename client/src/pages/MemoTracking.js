import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { format } from 'date-fns';

const statusConfig = {
  acknowledged: { color: '#28A745', bg: '#E8F5E9', label: 'Acknowledged', icon: '✓' },
  opened: { color: '#0366D6', bg: '#EAF2FF', label: 'Opened', icon: '👁' },
  delivered: { color: '#586069', bg: '#F0F2F5', label: 'Unread', icon: '📬' },
};

export default function MemoTracking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    api.get(`/memos/${id}/tracking`).then(r => setData(r.data)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={styles.loading}>Loading tracking data...</div>;
  if (!data) return <div style={styles.loading}>Not found</div>;

  const { memo, recipients, summary } = data;
  const filtered = filter === 'all' ? recipients : recipients.filter(r => r.delivery_status === filter);

  const pct = summary.total > 0 ? Math.round((summary.acknowledged / summary.total) * 100) : 0;

  return (
    <div style={styles.page}>
      <button onClick={() => navigate(`/memos/${id}`)} style={styles.back}>← Back to Memo</button>

      <div style={styles.memoTitle}>
        <div style={styles.memoNum}>{memo.memo_number}</div>
        <h1 style={styles.title}>{memo.subject}</h1>
        <div style={styles.publishedAt}>
          Published {memo.published_at ? format(new Date(memo.published_at), 'dd MMMM yyyy, HH:mm') : '—'}
        </div>
      </div>

      {/* Summary cards */}
      <div style={styles.summaryGrid}>
        <SummaryCard label="Total Recipients" value={summary.total} color="#006B3C" />
        <SummaryCard label="Acknowledged" value={summary.acknowledged} color="#28A745" />
        <SummaryCard label="Opened" value={summary.opened} color="#0366D6" />
        <SummaryCard label="Unread" value={summary.delivered} color="#586069" />
      </div>

      {/* Progress bar */}
      <div style={styles.progressSection}>
        <div style={styles.progressHeader}>
          <span style={styles.progressLabel}>Acknowledgment Progress</span>
          <span style={styles.progressPct}>{pct}%</span>
        </div>
        <div style={styles.progressTrack}>
          <div style={{ ...styles.progressFill, width: `${pct}%`, background: pct === 100 ? '#28A745' : '#006B3C' }} />
        </div>
        <div style={styles.progressSub}>{summary.acknowledged} of {summary.total} recipients have acknowledged</div>
      </div>

      {/* Filter tabs */}
      <div style={styles.filters}>
        {['all', 'acknowledged', 'opened', 'delivered'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ ...styles.filterBtn, ...(filter === f ? styles.filterActive : {}) }}>
            {f === 'all' ? 'All' : statusConfig[f]?.label}
            <span style={styles.filterCount}>
              {f === 'all' ? summary.total : summary[f] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Recipients table */}
      <div style={styles.table}>
        <div style={styles.tableHeader}>
          <span style={{ flex: 2 }}>Staff Member</span>
          <span style={{ flex: 2 }}>Department</span>
          <span style={{ flex: 1 }}>Status</span>
          <span style={{ flex: 1.5 }}>Opened</span>
          <span style={{ flex: 1.5 }}>Acknowledged</span>
        </div>
        {filtered.length === 0 && <div style={styles.empty}>No recipients in this category</div>}
        {filtered.map(r => {
          const s = statusConfig[r.delivery_status] || statusConfig.delivered;
          return (
            <div key={r.staff_id} style={styles.tableRow}>
              <div style={{ flex: 2 }}>
                <div style={styles.staffName}>{r.full_name}</div>
                <div style={styles.staffTitle}>{r.job_title}</div>
              </div>
              <div style={{ flex: 2, fontSize: 12, color: '#586069' }}>{r.department_name}</div>
              <div style={{ flex: 1 }}>
                <span style={{ ...styles.statusBadge, background: s.bg, color: s.color }}>
                  {s.icon} {s.label}
                </span>
              </div>
              <div style={{ flex: 1.5, fontSize: 12, color: '#586069' }}>
                {r.opened_at ? format(new Date(r.opened_at), 'dd MMM, HH:mm') : '—'}
              </div>
              <div style={{ flex: 1.5 }}>
                {r.acknowledged_at ? (
                  <div>
                    <div style={{ fontSize: 12, color: '#28A745', fontWeight: 600 }}>{format(new Date(r.acknowledged_at), 'dd MMM, HH:mm')}</div>
                    {r.acknowledgment_comment && (
                      <div style={styles.comment}>"{r.acknowledgment_comment}"</div>
                    )}
                  </div>
                ) : '—'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color }) {
  return (
    <div style={styles.summaryCard}>
      <div style={{ ...styles.summaryValue, color }}>{value}</div>
      <div style={styles.summaryLabel}>{label}</div>
    </div>
  );
}

const styles = {
  page: { padding: '28px 32px', maxWidth: 1000 },
  loading: { padding: 40, color: '#586069' },
  back: { background: 'none', border: '1px solid #E2E6EA', color: '#586069', borderRadius: 6, padding: '7px 14px', fontSize: 13, cursor: 'pointer', marginBottom: 20 },
  memoTitle: { marginBottom: 24 },
  memoNum: { fontSize: 12, color: '#8B949E', fontFamily: 'monospace', marginBottom: 4 },
  title: { fontSize: 20, fontWeight: 700, color: '#0D1117', marginBottom: 4 },
  publishedAt: { fontSize: 12, color: '#8B949E' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 },
  summaryCard: { background: '#fff', border: '1px solid #E2E6EA', borderRadius: 8, padding: '16px', textAlign: 'center' },
  summaryValue: { fontSize: 28, fontWeight: 700, lineHeight: 1, marginBottom: 6 },
  summaryLabel: { fontSize: 12, color: '#586069' },
  progressSection: { background: '#fff', border: '1px solid #E2E6EA', borderRadius: 8, padding: '16px 20px', marginBottom: 20 },
  progressHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 13, fontWeight: 600, color: '#0D1117' },
  progressPct: { fontSize: 13, fontWeight: 700, color: '#006B3C' },
  progressTrack: { height: 8, background: '#E2E6EA', borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', borderRadius: 4, transition: 'width 0.5s' },
  progressSub: { fontSize: 12, color: '#8B949E' },
  filters: { display: 'flex', gap: 6, marginBottom: 16 },
  filterBtn: { background: '#fff', border: '1px solid #E2E6EA', color: '#586069', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 },
  filterActive: { background: '#006B3C', color: '#fff', borderColor: '#006B3C' },
  filterCount: { background: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: '1px 6px', fontSize: 11 },
  table: { background: '#fff', border: '1px solid #E2E6EA', borderRadius: 8, overflow: 'hidden' },
  tableHeader: { display: 'flex', padding: '10px 16px', background: '#F7F8FA', borderBottom: '1px solid #E2E6EA', fontSize: 11, fontWeight: 700, color: '#586069', textTransform: 'uppercase', letterSpacing: '0.04em' },
  tableRow: { display: 'flex', alignItems: 'flex-start', padding: '12px 16px', borderBottom: '1px solid #F0F2F5' },
  staffName: { fontSize: 13, fontWeight: 600, color: '#0D1117', marginBottom: 2 },
  staffTitle: { fontSize: 11, color: '#8B949E' },
  statusBadge: { fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 10, whiteSpace: 'nowrap' },
  comment: { fontSize: 11, color: '#586069', fontStyle: 'italic', marginTop: 2 },
  empty: { padding: '24px', textAlign: 'center', color: '#8B949E', fontSize: 13 },
};
