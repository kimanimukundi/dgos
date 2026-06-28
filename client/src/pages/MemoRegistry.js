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

export default function MemoRegistry() {
  const navigate = useNavigate();
  const [memos, setMemos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [urgency, setUrgency] = useState('');
  const [searching, setSearching] = useState(false);

  const fetchMemos = async (params = {}) => {
    setSearching(true);
    try {
      const res = await api.get('/memos/registry', { params });
      setMemos(res.data);
    } finally {
      setSearching(false);
      setLoading(false);
    }
  };

  useEffect(() => { fetchMemos(); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchMemos({ search: search || undefined, urgency: urgency || undefined });
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Document Registry</h1>
          <div style={styles.sub}>Official memo archive — all published memos are stored permanently</div>
        </div>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} style={styles.searchBar}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by subject or memo number..." style={styles.searchInput} />
        <select value={urgency} onChange={e => setUrgency(e.target.value)} style={styles.select}>
          <option value="">All urgencies</option>
          <option value="routine">Routine</option>
          <option value="priority">Priority</option>
          <option value="urgent">Urgent</option>
          <option value="confidential">Confidential</option>
        </select>
        <button type="submit" style={styles.searchBtn}>{searching ? 'Searching...' : 'Search'}</button>
        {(search || urgency) && (
          <button type="button" onClick={() => { setSearch(''); setUrgency(''); fetchMemos(); }} style={styles.clearBtn}>Clear</button>
        )}
      </form>

      {loading && <div style={styles.loading}>Loading registry...</div>}

      {!loading && memos.length === 0 && (
        <div style={styles.empty}>No memos found matching your search</div>
      )}

      {!loading && memos.length > 0 && (
        <div style={styles.tableWrap}>
          <div style={styles.tableHeader}>
            <span style={{ flex: 1.2 }}>Memo No.</span>
            <span style={{ flex: 3 }}>Subject</span>
            <span style={{ flex: 1.5 }}>From</span>
            <span style={{ flex: 1 }}>Urgency</span>
            <span style={{ flex: 1 }}>Recipients</span>
            <span style={{ flex: 1.2 }}>Date</span>
          </div>

          {memos.map(m => {
            const u = urgencyConfig[m.urgency] || urgencyConfig.routine;
            const ackPct = m.total_recipients > 0 ? Math.round((m.acknowledged_count / m.total_recipients) * 100) : 0;
            return (
              <div key={m.id} onClick={() => navigate(`/memos/${m.id}`)} style={styles.tableRow}>
                <div style={{ flex: 1.2 }}>
                  <span style={styles.memoNum}>{m.memo_number}</span>
                </div>
                <div style={{ flex: 3 }}>
                  <div style={styles.subject}>{m.subject}</div>
                  {m.action_required && <span style={styles.actionTag}>⚡ Action required</span>}
                </div>
                <div style={{ flex: 1.5 }}>
                  <div style={styles.senderName}>{m.sender_name}</div>
                  <div style={styles.senderDept}>{m.sender_department}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ ...styles.urgencyTag, background: u.bg, color: u.color }}>{u.label}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={styles.ackStat}>{m.acknowledged_count}/{m.total_recipients}</div>
                  <div style={styles.miniProgress}>
                    <div style={{ ...styles.miniProgressFill, width: `${ackPct}%` }} />
                  </div>
                </div>
                <div style={{ flex: 1.2, fontSize: 12, color: '#586069' }}>
                  {m.published_at ? format(new Date(m.published_at), 'dd MMM yyyy') : '—'}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={styles.registryNote}>
        📋 All memos are stored permanently and cannot be deleted. This registry constitutes the official communication record of the Ministry.
      </div>
    </div>
  );
}

const styles = {
  page: { padding: '28px 32px' },
  header: { marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 700, color: '#0D1117', marginBottom: 4 },
  sub: { fontSize: 13, color: '#586069' },
  searchBar: { display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' },
  searchInput: { flex: 1 },
  select: { width: 160 },
  searchBtn: { background: '#006B3C', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
  clearBtn: { background: '#fff', border: '1px solid #E2E6EA', color: '#586069', borderRadius: 6, padding: '8px 14px', fontSize: 13, cursor: 'pointer' },
  loading: { padding: 40, color: '#586069' },
  empty: { background: '#fff', border: '1px solid #E2E6EA', borderRadius: 8, padding: '48px', textAlign: 'center', color: '#8B949E' },
  tableWrap: { background: '#fff', border: '1px solid #E2E6EA', borderRadius: 8, overflow: 'hidden', marginBottom: 16 },
  tableHeader: { display: 'flex', padding: '10px 16px', background: '#F7F8FA', borderBottom: '1px solid #E2E6EA', fontSize: 11, fontWeight: 700, color: '#586069', textTransform: 'uppercase', letterSpacing: '0.04em', gap: 8 },
  tableRow: { display: 'flex', alignItems: 'flex-start', padding: '12px 16px', borderBottom: '1px solid #F0F2F5', cursor: 'pointer', gap: 8, transition: 'background 0.1s' },
  memoNum: { fontSize: 12, fontFamily: 'monospace', color: '#006B3C', fontWeight: 600 },
  subject: { fontSize: 13, fontWeight: 600, color: '#0D1117', marginBottom: 3 },
  actionTag: { fontSize: 10, color: '#E36209', fontWeight: 600 },
  senderName: { fontSize: 12, fontWeight: 500, color: '#0D1117', marginBottom: 2 },
  senderDept: { fontSize: 11, color: '#8B949E' },
  urgencyTag: { fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, letterSpacing: '0.04em' },
  ackStat: { fontSize: 12, fontWeight: 600, color: '#006B3C', marginBottom: 4 },
  miniProgress: { height: 3, background: '#E2E6EA', borderRadius: 2, width: 60 },
  miniProgressFill: { height: '100%', background: '#006B3C', borderRadius: 2 },
  registryNote: { fontSize: 12, color: '#8B949E', background: '#F7F8FA', border: '1px solid #E2E6EA', borderRadius: 6, padding: '12px 16px' },
};
