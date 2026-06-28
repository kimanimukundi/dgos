import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { format } from 'date-fns';

const statusConfig = {
  pending:  { color: '#E36209', bg: '#FFF5E0', label: 'Pending' },
  approved: { color: '#28A745', bg: '#E8F5E9', label: 'Approved' },
  rejected: { color: '#D73A49', bg: '#FFEEF0', label: 'Rejected' },
};

const LEAVE_TYPES = ['annual', 'sick', 'compassionate', 'study', 'maternity', 'paternity'];

export default function Leave() {
  const { user } = useAuth();
  const [tab, setTab] = useState('mine');
  const [myLeave, setMyLeave] = useState([]);
  const [pendingApproval, setPendingApproval] = useState([]);
  const [allLeave, setAllLeave] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ leave_type: 'annual', start_date: '', end_date: '', reason: '', acting_officer_id: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const canApprove = ['supervisor','hod','director','system_admin'].includes(user?.role);
  const canViewAll = ['director','auditor','system_admin'].includes(user?.role);

  useEffect(() => {
    const calls = [api.get('/leave/mine'), api.get('/staff')];
    if (canApprove) calls.push(api.get('/leave/pending-approval'));
    if (canViewAll) calls.push(api.get('/leave'));
    Promise.all(calls).then(results => {
      setMyLeave(results[0].data);
      setStaff(results[1].data);
      if (canApprove) setPendingApproval(results[2].data);
      if (canViewAll) setAllLeave(results[canApprove ? 3 : 2]?.data || []);
    }).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async () => {
    if (!form.leave_type || !form.start_date || !form.end_date) { setError('Leave type and dates are required'); return; }
    setSubmitting(true); setError('');
    try {
      const res = await api.post('/leave', form);
      setMyLeave(prev => [res.data, ...prev]);
      setShowForm(false);
      setForm({ leave_type: 'annual', start_date: '', end_date: '', reason: '', acting_officer_id: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit request');
    } finally { setSubmitting(false); }
  };

  const handleAction = async (id, action) => {
    try {
      await api.post(`/leave/${id}/action`, { action });
      setPendingApproval(prev => prev.filter(l => l.id !== id));
    } catch (err) { setError('Action failed'); }
  };

  const displayed = tab === 'mine' ? myLeave : tab === 'pending' ? pendingApproval : allLeave;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Leave Management</h1>
          <div style={styles.sub}>Submit and track staff leave requests</div>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={styles.newBtn} data-tour="apply-leave-btn">
          {showForm ? 'Cancel' : '+ Apply for Leave'}
        </button>
      </div>

      {showForm && (
        <div style={styles.form}>
          <div style={styles.formTitle}>New Leave Application</div>
          {error && <div style={styles.error}>{error}</div>}
          <div style={styles.formGrid}>
            <div style={styles.field}>
              <label style={styles.label}>Leave Type</label>
              <select value={form.leave_type} onChange={e => setForm({ ...form, leave_type: e.target.value })}>
                {LEAVE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)} Leave</option>)}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Acting Officer (optional)</label>
              <select value={form.acting_officer_id} onChange={e => setForm({ ...form, acting_officer_id: e.target.value })}>
                <option value="">— None —</option>
                {staff.filter(s => s.id !== user?.id).map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Start Date</label>
              <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>End Date</label>
              <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
            </div>
            <div style={{ ...styles.field, gridColumn: '1 / -1' }}>
              <label style={styles.label}>Reason</label>
              <textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}
                placeholder="Briefly state the reason for leave..." rows={2} style={styles.textarea} />
            </div>
          </div>
          <button onClick={handleSubmit} disabled={submitting} style={styles.submitBtn}>
            {submitting ? 'Submitting...' : 'Submit Application'}
          </button>
        </div>
      )}

      <div style={styles.tabs}>
        <TabBtn label="My Applications" count={myLeave.length} active={tab==='mine'} onClick={() => setTab('mine')} />
        {canApprove && <TabBtn label="Pending Approval" count={pendingApproval.length} active={tab==='pending'} onClick={() => setTab('pending')} />}
        {canViewAll && <TabBtn label="All Leave" count={allLeave.length} active={tab==='all'} onClick={() => setTab('all')} />}
      </div>

      {loading && <div style={styles.loading}>Loading...</div>}
      {!loading && displayed.length === 0 && <div style={styles.empty}>No leave requests in this view</div>}

      <div style={styles.list} data-tour="my-leave-list">
        {displayed.map(l => {
          const s = statusConfig[l.status] || statusConfig.pending;
          return (
            <div key={l.id} style={styles.row}>
              <div style={styles.rowLeft}>
                <div style={styles.refRow}>
                  <span style={styles.refNum}>{l.reference_number}</span>
                  <span style={styles.leaveType}>{l.leave_type?.charAt(0).toUpperCase() + l.leave_type?.slice(1)} Leave</span>
                </div>
                {(tab !== 'mine') && <div style={styles.staffName}>{l.staff_name} — {l.job_title}</div>}
                <div style={styles.dates}>
                  {format(new Date(l.start_date), 'd MMM yyyy')} → {format(new Date(l.end_date), 'd MMM yyyy')}
                  &nbsp;· {l.days_requested} day{l.days_requested !== 1 ? 's' : ''}
                </div>
                {l.reason && <div style={styles.reason}>{l.reason}</div>}
                {l.acting_officer_name && <div style={styles.acting}>Acting: {l.acting_officer_name}</div>}
              </div>
              <div style={styles.rowRight}>
                <span style={{ ...styles.statusBadge, background: s.bg, color: s.color }}>{s.label}</span>
                {tab === 'pending' && (
                  <div style={styles.actionBtns}>
                    <button onClick={() => handleAction(l.id, 'rejected')} style={styles.rejectBtn}>Reject</button>
                    <button onClick={() => handleAction(l.id, 'approved')} style={styles.approveBtn}>Approve</button>
                  </div>
                )}
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

const styles = {
  page: { padding: '28px 32px', maxWidth: 900 },
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
  submitBtn: { background: '#006B3C', color: '#fff', border: 'none', borderRadius: 6, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 8 },
  tabs: { display: 'flex', gap: 4, marginBottom: 16, borderBottom: '2px solid #E2E6EA' },
  tab: { background: 'none', border: 'none', padding: '8px 16px 10px', fontSize: 13, fontWeight: 500, color: '#586069', cursor: 'pointer', borderBottom: '2px solid transparent', marginBottom: -2, display: 'flex', alignItems: 'center', gap: 8 },
  tabActive: { color: '#006B3C', borderBottomColor: '#006B3C', fontWeight: 700 },
  tabCount: { background: '#E2E6EA', color: '#586069', fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 10 },
  tabCountActive: { background: '#E8F5EE', color: '#006B3C' },
  loading: { padding: 40, color: '#586069' },
  empty: { background: '#fff', border: '1px solid #E2E6EA', borderRadius: 8, padding: '48px', textAlign: 'center', color: '#8B949E' },
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  row: { background: '#fff', border: '1px solid #E2E6EA', borderRadius: 8, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  rowLeft: { flex: 1 },
  rowRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, marginLeft: 16, flexShrink: 0 },
  refRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 },
  refNum: { fontSize: 11, fontFamily: 'monospace', color: '#006B3C', fontWeight: 600 },
  leaveType: { fontSize: 12, fontWeight: 600, color: '#0D1117' },
  staffName: { fontSize: 13, fontWeight: 600, color: '#0D1117', marginBottom: 2 },
  dates: { fontSize: 12, color: '#586069', marginBottom: 2 },
  reason: { fontSize: 12, color: '#8B949E', fontStyle: 'italic' },
  acting: { fontSize: 11, color: '#0366D6', marginTop: 2 },
  statusBadge: { fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 10 },
  actionBtns: { display: 'flex', gap: 6 },
  approveBtn: { background: '#006B3C', color: '#fff', border: 'none', borderRadius: 5, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  rejectBtn: { background: '#fff', border: '1px solid #D73A49', color: '#D73A49', borderRadius: 5, padding: '5px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
};
