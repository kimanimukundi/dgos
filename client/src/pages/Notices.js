import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { format, formatDistanceToNow } from 'date-fns';

export default function Notices() {
  const { user } = useAuth();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', target: 'all', expires_at: '' });
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  const canPost = ['supervisor', 'hod', 'director', 'system_admin'].includes(user?.role);

  useEffect(() => {
    api.get('/notices').then(r => setNotices(r.data)).finally(() => setLoading(false));
  }, []);

  const handlePost = async () => {
    if (!form.title || !form.body) { setError('Title and body are required'); return; }
    setPosting(true); setError('');
    try {
      const res = await api.post('/notices', form);
      setNotices(prev => [{ ...res.data, posted_by_name: user?.full_name }, ...prev]);
      setShowForm(false);
      setForm({ title: '', body: '', target: 'all', expires_at: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to post notice');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Notice Board</h1>
          <div style={styles.sub}>General announcements and information for Ministry staff</div>
        </div>
        {canPost && (
          <button onClick={() => setShowForm(!showForm)} style={styles.postBtn}>
            {showForm ? 'Cancel' : '+ Post Notice'}
          </button>
        )}
      </div>

      {showForm && (
        <div style={styles.form}>
          <div style={styles.formTitle}>New Notice</div>
          {error && <div style={styles.error}>{error}</div>}
          <div style={styles.field}>
            <label style={styles.label}>Title</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Notice title" />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Body</label>
            <textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })}
              placeholder="Notice content..." rows={4} style={styles.textarea} />
          </div>
          <div style={styles.fieldRow}>
            <div style={styles.field}>
              <label style={styles.label}>Expires On (optional)</label>
              <input type="date" value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })} />
            </div>
          </div>
          <button onClick={handlePost} disabled={posting} style={styles.submitBtn}>
            {posting ? 'Posting...' : 'Post Notice'}
          </button>
        </div>
      )}

      {loading && <div style={styles.loading}>Loading notices...</div>}
      {!loading && notices.length === 0 && <div style={styles.empty}>No active notices</div>}

      <div style={styles.list} data-tour="notice-list">
        {notices.map(n => (
          <div key={n.id} style={styles.noticeCard}>
            <div style={styles.noticeHeader}>
              <div style={styles.noticeIcon}>📢</div>
              <div style={styles.noticeMeta}>
                <span style={styles.noticePostedBy}>{n.posted_by_name}</span>
                <span style={styles.noticeDot}>·</span>
                <span style={styles.noticeTime}>{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</span>
                {n.expires_at && (
                  <>
                    <span style={styles.noticeDot}>·</span>
                    <span style={styles.noticeExpiry}>Expires {format(new Date(n.expires_at), 'd MMM yyyy')}</span>
                  </>
                )}
              </div>
            </div>
            <div style={styles.noticeTitle}>{n.title}</div>
            <div style={styles.noticeBody}>{n.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  page: { padding: '28px 32px', maxWidth: 800 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title: { fontSize: 22, fontWeight: 700, color: '#0D1117', marginBottom: 4 },
  sub: { fontSize: 13, color: '#586069' },
  postBtn: { background: '#006B3C', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  form: { background: '#fff', border: '1px solid #E2E6EA', borderRadius: 8, padding: '20px', marginBottom: 24 },
  formTitle: { fontSize: 14, fontWeight: 700, color: '#0D1117', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #E2E6EA' },
  error: { background: '#FFEEF0', border: '1px solid #FDAEB7', color: '#D73A49', padding: '8px 12px', borderRadius: 5, fontSize: 12, marginBottom: 12 },
  field: { marginBottom: 14 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#0D1117', marginBottom: 6 },
  textarea: { width: '100%', resize: 'vertical' },
  fieldRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  submitBtn: { background: '#006B3C', color: '#fff', border: 'none', borderRadius: 6, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  loading: { padding: 40, color: '#586069' },
  empty: { background: '#fff', border: '1px solid #E2E6EA', borderRadius: 8, padding: '48px', textAlign: 'center', color: '#8B949E' },
  list: { display: 'flex', flexDirection: 'column', gap: 12 },
  noticeCard: { background: '#fff', border: '1px solid #E2E6EA', borderRadius: 8, padding: '20px' },
  noticeHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  noticeIcon: { fontSize: 18 },
  noticeMeta: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#586069', flexWrap: 'wrap' },
  noticePostedBy: { fontWeight: 600, color: '#0D1117' },
  noticeDot: { color: '#C8CDD4' },
  noticeTime: {},
  noticeExpiry: { color: '#E36209', fontWeight: 500 },
  noticeTitle: { fontSize: 15, fontWeight: 700, color: '#0D1117', marginBottom: 8 },
  noticeBody: { fontSize: 13, color: '#586069', lineHeight: 1.7 },
};
