import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { format } from 'date-fns';

const priorityConfig = {
  low:      { color: '#586069', bg: '#F0F2F5', label: 'Low' },
  normal:   { color: '#0366D6', bg: '#EAF2FF', label: 'Normal' },
  high:     { color: '#E36209', bg: '#FFF5E0', label: 'High' },
  critical: { color: '#D73A49', bg: '#FFEEF0', label: 'Critical' },
};
const statusConfig = {
  pending:     { color: '#586069', bg: '#F0F2F5', label: 'Pending' },
  in_progress: { color: '#0366D6', bg: '#EAF2FF', label: 'In Progress' },
  completed:   { color: '#28A745', bg: '#E8F5E9', label: 'Completed' },
  overdue:     { color: '#D73A49', bg: '#FFEEF0', label: 'Overdue' },
};

export default function Tasks() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('mine');
  const [myTasks, setMyTasks] = useState([]);
  const [assignedByMe, setAssignedByMe] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  const canAssign = ['supervisor','hod','director','system_admin'].includes(user?.role);
  const canViewAll = ['hod','director','auditor','system_admin'].includes(user?.role);

  useEffect(() => {
    const calls = [
      api.get('/tasks/mine'),
      api.get('/staff'),
    ];
    if (canAssign) calls.push(api.get('/tasks/assigned-by-me'));
    if (canViewAll) calls.push(api.get('/tasks'));

    Promise.all(calls).then(results => {
      setMyTasks(results[0].data);
      setStaff(results[1].data);
      if (canAssign) setAssignedByMe(results[2].data);
      if (canViewAll) setAllTasks(results[canAssign ? 3 : 2]?.data || []);
    }).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displayed = tab === 'mine' ? myTasks : tab === 'assigned' ? assignedByMe : allTasks;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Tasks</h1>
          <div style={styles.sub}>Execution layer — assigned work with deadlines and evidence</div>
        </div>
        {canAssign && (
          <button onClick={() => setShowNew(!showNew)} style={styles.newBtn}>
            {showNew ? 'Cancel' : '+ Assign Task'}
          </button>
        )}
      </div>

      {showNew && <NewTaskForm staff={staff} onCreated={(t) => {
        setAssignedByMe(prev => [t, ...prev]);
        setShowNew(false);
      }} />}

      <div style={styles.tabs}>
        <TabBtn label="My Tasks" count={myTasks.length} active={tab==='mine'} onClick={() => setTab('mine')} />
        {canAssign && <TabBtn label="Assigned by Me" count={assignedByMe.length} active={tab==='assigned'} onClick={() => setTab('assigned')} />}
        {canViewAll && <TabBtn label="All Tasks" count={allTasks.length} active={tab==='all'} onClick={() => setTab('all')} />}
      </div>

      {loading && <div style={styles.loading}>Loading tasks...</div>}
      {!loading && displayed.length === 0 && <div style={styles.empty}>No tasks in this view</div>}

      <div style={styles.list}>
        {displayed.map(t => {
          const p = priorityConfig[t.priority] || priorityConfig.normal;
          const s = statusConfig[t.status] || statusConfig.pending;
          const isOverdue = t.status === 'overdue';

          return (
            <div key={t.id} onClick={() => navigate(`/tasks/${t.id}`)}
              style={{ ...styles.row, ...(isOverdue ? styles.rowOverdue : {}) }}>
              <div style={styles.rowLeft}>
                <div style={styles.rowTop}>
                  <span style={{ ...styles.priorityTag, background: p.bg, color: p.color }}>{p.label}</span>
                  {t.workflow_ref && <span style={styles.wfTag}>↳ {t.workflow_ref}</span>}
                </div>
                <div style={styles.taskTitle}>{t.title}</div>
                <div style={styles.taskMeta}>
                  {tab === 'mine' ? `Assigned by ${t.assigned_by_name}` : `Assigned to ${t.assignee_name}`}
                  {t.assignee_department && ` · ${t.assignee_department}`}
                </div>
              </div>
              <div style={styles.rowRight}>
                <span style={{ ...styles.statusBadge, background: s.bg, color: s.color }}>{s.label}</span>
                {t.deadline && (
                  <div style={{ ...styles.deadline, color: isOverdue ? '#D73A49' : '#586069' }}>
                    {isOverdue ? '⚠ ' : ''}Due {format(new Date(t.deadline), 'd MMM yyyy')}
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

function NewTaskForm({ staff, onCreated }) {
  const [form, setForm] = useState({ title: '', description: '', assigned_to: '', deadline: '', priority: 'normal' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [availableAssets, setAvailableAssets] = useState([]);
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [showAssets, setShowAssets] = useState(false);

  const loadAssets = () => {
    if (availableAssets.length === 0) api.get('/assets').then(r => setAvailableAssets(r.data));
    setShowAssets(!showAssets);
  };

  const toggleAsset = (id) => setSelectedAssets(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSubmit = async () => {
    if (!form.title || !form.assigned_to) { setError('Title and assignee are required'); return; }
    setSaving(true); setError('');
    try {
      const res = await api.post('/tasks', { ...form, asset_ids: selectedAssets });
      onCreated(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create task');
    } finally { setSaving(false); }
  };

  return (
    <div style={styles.newForm}>
      <div style={styles.newFormTitle}>Assign New Task</div>
      {error && <div style={styles.error}>{error}</div>}
      <div style={styles.formGrid}>
        <div style={{ ...styles.field, gridColumn: '1 / -1' }}>
          <label style={styles.label}>Task Title</label>
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="What needs to be done?" />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Assign To</label>
          <select value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })}>
            <option value="">— Select staff —</option>
            {staff.map(s => <option key={s.id} value={s.id}>{s.full_name} — {s.job_title}</option>)}
          </select>
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Priority</label>
          <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Deadline</label>
          <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />
        </div>
        <div style={{ ...styles.field, gridColumn: '1 / -1' }}>
          <label style={styles.label}>Description</label>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="Full details of the task, including any evidence required..." rows={3} style={styles.textarea} />
        </div>
        <div style={{ ...styles.field, gridColumn: '1 / -1' }}>
          <button type="button" onClick={loadAssets} style={styles.linkAssetsBtn}>
            {showAssets ? 'Hide assets' : `🗂 Link assets (optional)${selectedAssets.length ? ` — ${selectedAssets.length} selected` : ''}`}
          </button>
          {showAssets && (
            <div style={styles.assetPicker}>
              {availableAssets.map(a => (
                <label key={a.id} style={styles.assetPickerItem}>
                  <input type="checkbox" checked={selectedAssets.includes(a.id)} onChange={() => toggleAsset(a.id)}
                    style={{ width: 'auto', marginRight: 8 }} />
                  <span style={styles.assetPickerTag}>{a.asset_tag}</span>
                  <span>{a.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
      <button onClick={handleSubmit} disabled={saving} style={styles.submitBtn}>
        {saving ? 'Assigning...' : 'Assign Task'}
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
  tabs: { display: 'flex', gap: 4, marginBottom: 16, borderBottom: '2px solid #E2E6EA', paddingBottom: 0 },
  tab: { background: 'none', border: 'none', padding: '8px 16px 10px', fontSize: 13, fontWeight: 500, color: '#586069', cursor: 'pointer', borderBottom: '2px solid transparent', marginBottom: -2, display: 'flex', alignItems: 'center', gap: 8 },
  tabActive: { color: '#006B3C', borderBottomColor: '#006B3C', fontWeight: 700 },
  tabCount: { background: '#E2E6EA', color: '#586069', fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 10 },
  tabCountActive: { background: '#E8F5EE', color: '#006B3C' },
  loading: { padding: 40, color: '#586069' },
  empty: { background: '#fff', border: '1px solid #E2E6EA', borderRadius: 8, padding: '48px', textAlign: 'center', color: '#8B949E' },
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  row: { background: '#fff', border: '1px solid #E2E6EA', borderRadius: 8, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer' },
  rowOverdue: { borderColor: '#FDAEB7', background: '#FFFAFA' },
  rowLeft: { flex: 1, minWidth: 0 },
  rowRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, marginLeft: 16, flexShrink: 0 },
  rowTop: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 },
  priorityTag: { fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, letterSpacing: '0.04em' },
  wfTag: { fontSize: 11, color: '#8B949E', fontFamily: 'monospace' },
  taskTitle: { fontSize: 13, fontWeight: 600, color: '#0D1117', marginBottom: 3 },
  taskMeta: { fontSize: 12, color: '#8B949E' },
  statusBadge: { fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 10 },
  deadline: { fontSize: 11, fontWeight: 500 },
  newForm: { background: '#fff', border: '1px solid #E2E6EA', borderRadius: 8, padding: '20px', marginBottom: 20 },
  newFormTitle: { fontSize: 14, fontWeight: 700, color: '#0D1117', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #E2E6EA' },
  error: { background: '#FFEEF0', border: '1px solid #FDAEB7', color: '#D73A49', padding: '8px 12px', borderRadius: 5, fontSize: 12, marginBottom: 12 },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  field: { marginBottom: 4 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#0D1117', marginBottom: 6 },
  textarea: { width: '100%', resize: 'vertical' },
  submitBtn: { background: '#006B3C', color: '#fff', border: 'none', borderRadius: 6, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 8 },
  linkAssetsBtn: { background: '#F7F8FA', border: '1px solid #E2E6EA', color: '#586069', borderRadius: 6, padding: '8px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  assetPicker: { marginTop: 8, maxHeight: 160, overflowY: 'auto', border: '1px solid #E2E6EA', borderRadius: 6, padding: 4 },
  assetPickerItem: { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', fontSize: 12, cursor: 'pointer' },
  assetPickerTag: { fontFamily: 'monospace', fontSize: 11, color: '#006B3C' },
};
