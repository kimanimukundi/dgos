import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { formatDistanceToNow } from 'date-fns';

const statusConfig = {
  open:        { color: '#E36209', bg: '#FFF5E0', label: 'Open' },
  assigned:    { color: '#0366D6', bg: '#EAF2FF', label: 'Assigned' },
  in_progress: { color: '#0366D6', bg: '#EAF2FF', label: 'In Progress' },
  resolved:    { color: '#28A745', bg: '#E8F5E9', label: 'Resolved' },
  closed:      { color: '#586069', bg: '#F0F2F5', label: 'Closed' },
  reopened:    { color: '#D73A49', bg: '#FFEEF0', label: 'Reopened' },
};
const priorityConfig = {
  low: { color: '#586069', bg: '#F0F2F5' }, medium: { color: '#0366D6', bg: '#EAF2FF' },
  high: { color: '#E36209', bg: '#FFF5E0' }, critical: { color: '#D73A49', bg: '#FFEEF0' },
};
const categoryLabels = { hardware: '🖥 Hardware', software: '💿 Software', network: '📶 Network', access: '🔑 Access & Accounts', other: '❓ Other' };

export default function Tickets() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('mine');
  const [myTickets, setMyTickets] = useState([]);
  const [queue, setQueue] = useState([]);
  const [isIctAgent, setIsIctAgent] = useState(false);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [queueFilter, setQueueFilter] = useState('');

  const canRaiseForOthers = ['hod', 'director', 'system_admin'].includes(user?.role);

  const loadAll = () => {
    const calls = [api.get('/tickets/mine'), api.get('/staff')];
    Promise.all(calls).then(async ([mine, s]) => {
      setMyTickets(mine.data);
      setStaff(s.data);
      try {
        const q = await api.get('/tickets/queue');
        setQueue(q.data);
        setIsIctAgent(true);
      } catch { setIsIctAgent(false); }
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadAll(); }, []);

  const loadQueue = (params = {}) => {
    api.get('/tickets/queue', { params }).then(r => setQueue(r.data));
  };

  const displayed = tab === 'mine' ? myTickets : queue;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>ICT Helpdesk</h1>
          <div style={styles.sub}>Report and track technical support requests</div>
        </div>
        <button onClick={() => setShowNew(!showNew)} style={styles.newBtn} data-tour="raise-ticket-btn">
          {showNew ? 'Cancel' : '+ Raise Ticket'}
        </button>
      </div>

      {showNew && (
        <NewTicketForm staff={staff} canRaiseForOthers={canRaiseForOthers} currentUser={user}
          onCreated={(t) => { setMyTickets(prev => [t, ...prev]); setShowNew(false); navigate(`/tickets/${t.id}`); }} />
      )}

      <div style={styles.tabs}>
        <TabBtn label="My Tickets" count={myTickets.length} active={tab === 'mine'} onClick={() => setTab('mine')} />
        {isIctAgent && <TabBtn label="ICT Queue" count={queue.length} active={tab === 'queue'} onClick={() => setTab('queue')} data-tour="ict-queue-tab" />}
      </div>

      {tab === 'queue' && isIctAgent && (
        <div style={styles.queueFilters}>
          {[
            { key: '', label: 'All' },
            { key: 'unassigned', label: 'Unassigned', tourId: 'unassigned-filter' },
            { key: 'mine', label: 'Assigned to Me' },
          ].map(f => (
            <button key={f.key} onClick={() => { setQueueFilter(f.key); loadQueue(f.key ? { assigned: f.key } : {}); }}
              style={{ ...styles.queueFilterBtn, ...(queueFilter === f.key ? styles.queueFilterActive : {}) }}>
              {f.label}
            </button>
          ))}
        </div>
      )}

      {loading && <div style={styles.loading}>Loading tickets...</div>}
      {!loading && displayed.length === 0 && <div style={styles.empty}>No tickets in this view</div>}

      <div style={styles.list} data-tour="ticket-list">
        {displayed.map(t => {
          const s = statusConfig[t.status] || statusConfig.open;
          const p = priorityConfig[t.priority] || priorityConfig.medium;
          const ageHours = (Date.now() - new Date(t.created_at)) / 3600000;
          const isAging = !['resolved', 'closed'].includes(t.status) &&
            ((t.status === 'open' && ageHours > 24) || ageHours > 72);

          return (
            <div key={t.id} onClick={() => navigate(`/tickets/${t.id}`)}
              style={{ ...styles.row, ...(isAging ? styles.rowAging : {}) }}>
              <div style={styles.rowLeft}>
                <div style={styles.rowTop}>
                  <span style={styles.ticketNum}>{t.ticket_number}</span>
                  <span style={styles.categoryTag}>{categoryLabels[t.category]}</span>
                  <span style={{ ...styles.priorityTag, background: p.bg, color: p.color }}>{t.priority?.toUpperCase()}</span>
                  {isAging && <span style={styles.agingTag}>⏱ Aging</span>}
                </div>
                <div style={styles.subject}>{t.subject}</div>
                <div style={styles.meta}>
                  {tab === 'queue'
                    ? `${t.requester_name} · ${t.requester_department}`
                    : t.raised_by_name && t.raised_by_name !== t.requester_name ? `Raised by ${t.raised_by_name}` : null}
                  {t.assignee_name && ` · Assigned to ${t.assignee_name}`}
                </div>
              </div>
              <div style={styles.rowRight}>
                <span style={{ ...styles.statusBadge, background: s.bg, color: s.color }}>{s.label}</span>
                <div style={styles.time}>{formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TabBtn({ label, count, active, onClick }) {
  return (
    <button onClick={onClick} style={{ ...styles.tab, ...(active ? styles.tabActive : {}) }}>
      {label}
      <span style={{ ...styles.tabCount, ...(active ? styles.tabCountActive : {}) }}>{count}</span>
    </button>
  );
}

function NewTicketForm({ staff, canRaiseForOthers, currentUser, onCreated }) {
  const [form, setForm] = useState({ subject: '', description: '', category: 'other', priority: 'medium', requester_id: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!form.subject || !form.description) { setError('Subject and description are required'); return; }
    setSaving(true); setError('');
    try {
      const res = await api.post('/tickets', { ...form, requester_id: form.requester_id || undefined });
      onCreated(res.data);
    } catch (err) { setError(err.response?.data?.error || 'Failed to raise ticket'); }
    finally { setSaving(false); }
  };

  return (
    <div style={styles.form}>
      <div style={styles.formTitle}>Raise a New Ticket</div>
      {error && <div style={styles.error}>{error}</div>}
      <div style={styles.formGrid}>
        <div style={{ ...styles.field, gridColumn: '1 / -1' }}>
          <label style={styles.label}>Subject</label>
          <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="Brief summary of the issue" />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Category</label>
          <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
            <option value="hardware">Hardware</option>
            <option value="software">Software</option>
            <option value="network">Network</option>
            <option value="access">Access & Accounts</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Priority</label>
          <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        {canRaiseForOthers && (
          <div style={styles.field}>
            <label style={styles.label}>Raise On Behalf Of</label>
            <select value={form.requester_id} onChange={e => setForm({ ...form, requester_id: e.target.value })}>
              <option value="">Myself ({currentUser?.full_name})</option>
              {staff.filter(s => s.id !== currentUser?.id).map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
          </div>
        )}
        <div style={{ ...styles.field, gridColumn: '1 / -1' }}>
          <label style={styles.label}>Description</label>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="Describe the issue in detail — what happened, when it started, anything you've already tried..."
            rows={4} style={styles.textarea} />
        </div>
      </div>
      <button onClick={handleSubmit} disabled={saving} style={styles.submitBtn}>
        {saving ? 'Submitting...' : 'Raise Ticket'}
      </button>
    </div>
  );
}

const styles = {
  page: { padding: '28px 32px', maxWidth: 1000 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 700, color: '#0D1117', marginBottom: 4 },
  sub: { fontSize: 13, color: '#586069' },
  newBtn: { background: '#006B3C', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  form: { background: '#fff', border: '1px solid #E2E6EA', borderRadius: 8, padding: '20px', marginBottom: 20 },
  formTitle: { fontSize: 14, fontWeight: 700, color: '#0D1117', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #E2E6EA' },
  error: { background: '#FFEEF0', border: '1px solid #FDAEB7', color: '#D73A49', padding: '8px 12px', borderRadius: 5, fontSize: 12, marginBottom: 12 },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  field: { marginBottom: 4 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#0D1117', marginBottom: 6 },
  textarea: { width: '100%', resize: 'vertical' },
  submitBtn: { background: '#006B3C', color: '#fff', border: 'none', borderRadius: 6, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 12 },
  tabs: { display: 'flex', gap: 4, marginBottom: 12, borderBottom: '2px solid #E2E6EA' },
  tab: { background: 'none', border: 'none', padding: '8px 16px 10px', fontSize: 13, fontWeight: 500, color: '#586069', cursor: 'pointer', borderBottom: '2px solid transparent', marginBottom: -2, display: 'flex', alignItems: 'center', gap: 8 },
  tabActive: { color: '#006B3C', borderBottomColor: '#006B3C', fontWeight: 700 },
  tabCount: { background: '#E2E6EA', color: '#586069', fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 10 },
  tabCountActive: { background: '#E8F5EE', color: '#006B3C' },
  queueFilters: { display: 'flex', gap: 6, marginBottom: 14 },
  queueFilterBtn: { background: '#fff', border: '1px solid #E2E6EA', color: '#586069', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 500, cursor: 'pointer' },
  queueFilterActive: { background: '#006B3C', color: '#fff', borderColor: '#006B3C' },
  loading: { padding: 40, color: '#586069' },
  empty: { background: '#fff', border: '1px solid #E2E6EA', borderRadius: 8, padding: '48px', textAlign: 'center', color: '#8B949E' },
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  row: { background: '#fff', border: '1px solid #E2E6EA', borderRadius: 8, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer' },
  rowAging: { borderColor: '#FDAEB7', background: '#FFFAFA' },
  rowLeft: { flex: 1, minWidth: 0 },
  rowRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, marginLeft: 16, flexShrink: 0 },
  rowTop: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' },
  ticketNum: { fontSize: 11, fontFamily: 'monospace', color: '#006B3C', fontWeight: 600 },
  categoryTag: { fontSize: 11, color: '#586069' },
  priorityTag: { fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, letterSpacing: '0.04em' },
  agingTag: { fontSize: 10, fontWeight: 700, color: '#D73A49', background: '#FFEEF0', padding: '2px 8px', borderRadius: 10 },
  subject: { fontSize: 13, fontWeight: 600, color: '#0D1117', marginBottom: 3 },
  meta: { fontSize: 12, color: '#8B949E' },
  statusBadge: { fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 10 },
  time: { fontSize: 11, color: '#8B949E' },
};
