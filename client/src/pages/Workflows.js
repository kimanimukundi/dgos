import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { format, formatDistanceToNow } from 'date-fns';

const statusConfig = {
  in_progress: { color: '#0366D6', bg: '#EAF2FF', label: 'In Progress' },
  completed:   { color: '#28A745', bg: '#E8F5E9', label: 'Completed' },
  rejected:    { color: '#D73A49', bg: '#FFEEF0', label: 'Rejected' },
  withdrawn:   { color: '#586069', bg: '#F0F2F5', label: 'Withdrawn' },
};

export default function Workflows() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('pending');
  const [instances, setInstances] = useState([]);
  const [pendingMine, setPendingMine] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  const canInitiate = ['supervisor','hod','director','system_admin'].includes(user?.role);

  useEffect(() => {
    Promise.all([
      api.get('/workflows/pending-my-action'),
      api.get('/workflows'),
      api.get('/workflows/templates'),
    ]).then(([p, all, t]) => {
      setPendingMine(p.data);
      setInstances(all.data);
      setTemplates(t.data);
    }).finally(() => setLoading(false));
  }, []);

  const myWorkflows = instances.filter(w => w.initiator_id === user?.id || w.current_assignee_id === user?.id);

  const displayed = tab === 'pending' ? pendingMine
    : tab === 'mine' ? myWorkflows
    : instances;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Workflows & Approvals</h1>
          <div style={styles.sub}>Track and action official approval requests</div>
        </div>
        {canInitiate && (
          <button onClick={() => setShowNew(!showNew)} style={styles.newBtn}>
            {showNew ? 'Cancel' : '+ New Request'}
          </button>
        )}
      </div>

      {showNew && <NewWorkflowForm templates={templates} user={user} onCreated={(w) => {
        setInstances(prev => [w, ...prev]);
        setShowNew(false);
        navigate(`/workflows/${w.id}`);
      }} />}

      {/* Pending my action banner */}
      {pendingMine.length > 0 && (
        <div style={styles.pendingBanner} data-tour="pending-banner">
          <span style={styles.pendingIcon}>⚡</span>
          <span><strong>{pendingMine.length} workflow step{pendingMine.length > 1 ? 's' : ''}</strong> awaiting your action</span>
        </div>
      )}

      {/* Tabs */}
      <div style={styles.tabs}>
        {[
          { key: 'pending', label: `Pending My Action`, count: pendingMine.length },
          { key: 'mine', label: 'My Requests', count: myWorkflows.length },
          { key: 'all', label: 'All Workflows', count: instances.length },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ ...styles.tab, ...(tab === t.key ? styles.tabActive : {}) }}>
            {t.label}
            <span style={{ ...styles.tabCount, ...(tab === t.key ? styles.tabCountActive : {}) }}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {loading && <div style={styles.loading}>Loading...</div>}
      {!loading && displayed.length === 0 && (
        <div style={styles.empty}>No workflows in this view</div>
      )}

      <div style={styles.list} data-tour="workflow-list">
        {displayed.map(w => {
          const s = statusConfig[w.status] || statusConfig.in_progress;
          const isMyAction = pendingMine.some(p => p.id === w.id);
          return (
            <div key={w.id} onClick={() => navigate(`/workflows/${w.id}`)} style={{
              ...styles.row, ...(isMyAction ? styles.rowUrgent : {})
            }}>
              <div style={styles.rowLeft}>
                <div style={styles.rowTop}>
                  <span style={styles.refNum}>{w.reference_number}</span>
                  <span style={styles.templateName}>{w.template_name}</span>
                  {isMyAction && <span style={styles.myActionTag}>Action Required</span>}
                </div>
                <div style={styles.rowTitle}>{w.title}</div>
                <div style={styles.rowMeta}>
                  Initiated by {w.initiator_name} &nbsp;·&nbsp;
                  {formatDistanceToNow(new Date(w.created_at), { addSuffix: true })}
                  {w.step_label && ` · Current step: ${w.step_label}`}
                </div>
              </div>
              <div style={styles.rowRight}>
                <span style={{ ...styles.statusBadge, background: s.bg, color: s.color }}>{s.label}</span>
                <div style={styles.stepProgress}>
                  Step {w.current_step || 1} of {w.total_steps}
                </div>
                {w.sla_deadline && !w.actioned_at && (
                  <div style={{ ...styles.sla, color: new Date(w.sla_deadline) < new Date() ? '#D73A49' : '#8B949E' }}>
                    SLA: {format(new Date(w.sla_deadline), 'd MMM HH:mm')}
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

function NewWorkflowForm({ templates, user, onCreated }) {
  const [form, setForm] = useState({ template_id: '', title: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [availableAssets, setAvailableAssets] = useState([]);
  const [selectedAssets, setSelectedAssets] = useState([]);

  const canInitiateTemplate = (t) => {
    if (t.initiator_roles.includes(user?.role)) return true;
    if (t.id === 2) return true; // leave for everyone
    return false;
  };

  const selectedTemplate = templates.find(t => t.id === parseInt(form.template_id));
  const isAssetDisposal = selectedTemplate?.name === 'Asset Disposal';

  useEffect(() => {
    if (isAssetDisposal && availableAssets.length === 0) {
      api.get('/workflows/assets/available').then(r => setAvailableAssets(r.data));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAssetDisposal]);

  const toggleAsset = (id) => setSelectedAssets(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSubmit = async () => {
    if (!form.template_id || !form.title) { setError('Select a workflow type and enter a title'); return; }
    setSaving(true); setError('');
    try {
      const res = await api.post('/workflows', { ...form, asset_ids: selectedAssets });
      onCreated(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create workflow');
    } finally { setSaving(false); }
  };

  return (
    <div style={styles.newForm}>
      <div style={styles.newFormTitle}>New Workflow Request</div>
      {error && <div style={styles.error}>{error}</div>}
      <div style={styles.formGrid}>
        <div style={styles.field}>
          <label style={styles.label}>Workflow Type</label>
          <select value={form.template_id} onChange={e => { setForm({ ...form, template_id: e.target.value }); setSelectedAssets([]); }}>
            <option value="">— Select —</option>
            {templates.filter(canInitiateTemplate).map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div style={{ ...styles.field, gridColumn: '1 / -1' }}>
          <label style={styles.label}>Title / Subject</label>
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="Brief description of this request" />
        </div>
        <div style={{ ...styles.field, gridColumn: '1 / -1' }}>
          <label style={styles.label}>Description</label>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="Provide full details of the request..." rows={4} style={styles.textarea} />
        </div>
        {isAssetDisposal && (
          <div style={{ ...styles.field, gridColumn: '1 / -1' }}>
            <label style={styles.label}>Assets to Dispose ({selectedAssets.length} selected)</label>
            <div style={styles.assetList}>
              {availableAssets.length === 0 && <div style={styles.assetEmpty}>Loading assets...</div>}
              {availableAssets.map(a => (
                <label key={a.id} style={styles.assetItem}>
                  <input type="checkbox" checked={selectedAssets.includes(a.id)} onChange={() => toggleAsset(a.id)}
                    style={{ width: 'auto', marginRight: 8 }} />
                  <span style={styles.assetTag}>{a.asset_tag}</span>
                  <span style={{ flex: 1 }}>{a.name}</span>
                  <span style={styles.assetCondition}>{a.condition?.replace('_', ' ')}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
      <button onClick={handleSubmit} disabled={saving} style={styles.submitBtn}>
        {saving ? 'Submitting...' : 'Submit Request'}
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
  pendingBanner: { background: '#FFF5E0', border: '1px solid #FFDF7E', borderRadius: 8, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 },
  pendingIcon: { fontSize: 16 },
  tabs: { display: 'flex', gap: 4, marginBottom: 16, borderBottom: '2px solid #E2E6EA', paddingBottom: 0 },
  tab: { background: 'none', border: 'none', padding: '8px 16px 10px', fontSize: 13, fontWeight: 500, color: '#586069', cursor: 'pointer', borderBottom: '2px solid transparent', marginBottom: -2, display: 'flex', alignItems: 'center', gap: 8 },
  tabActive: { color: '#006B3C', borderBottomColor: '#006B3C', fontWeight: 700 },
  tabCount: { background: '#E2E6EA', color: '#586069', fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 10 },
  tabCountActive: { background: '#E8F5EE', color: '#006B3C' },
  loading: { padding: 40, color: '#586069' },
  empty: { background: '#fff', border: '1px solid #E2E6EA', borderRadius: 8, padding: '48px', textAlign: 'center', color: '#8B949E' },
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  row: { background: '#fff', border: '1px solid #E2E6EA', borderRadius: 8, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer', transition: 'box-shadow 0.15s' },
  rowUrgent: { borderColor: '#FFDF7E', background: '#FFFDF5' },
  rowLeft: { flex: 1, minWidth: 0 },
  rowRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, marginLeft: 20, flexShrink: 0 },
  rowTop: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 },
  refNum: { fontSize: 11, fontFamily: 'monospace', color: '#006B3C', fontWeight: 600 },
  templateName: { fontSize: 11, color: '#8B949E', background: '#F0F2F5', padding: '2px 8px', borderRadius: 10 },
  myActionTag: { fontSize: 10, fontWeight: 700, color: '#E36209', background: '#FFF5E0', padding: '2px 8px', borderRadius: 10 },
  rowTitle: { fontSize: 14, fontWeight: 600, color: '#0D1117', marginBottom: 4 },
  rowMeta: { fontSize: 12, color: '#8B949E' },
  statusBadge: { fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 10 },
  stepProgress: { fontSize: 11, color: '#8B949E' },
  sla: { fontSize: 11, fontWeight: 500 },
  newForm: { background: '#fff', border: '1px solid #E2E6EA', borderRadius: 8, padding: '20px', marginBottom: 20 },
  newFormTitle: { fontSize: 14, fontWeight: 700, color: '#0D1117', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #E2E6EA' },
  error: { background: '#FFEEF0', border: '1px solid #FDAEB7', color: '#D73A49', padding: '8px 12px', borderRadius: 5, fontSize: 12, marginBottom: 12 },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  field: { marginBottom: 4 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#0D1117', marginBottom: 6 },
  textarea: { width: '100%', resize: 'vertical' },
  submitBtn: { background: '#006B3C', color: '#fff', border: 'none', borderRadius: 6, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 8 },
  assetList: { maxHeight: 220, overflowY: 'auto', border: '1px solid #E2E6EA', borderRadius: 6, padding: 4 },
  assetEmpty: { padding: 16, textAlign: 'center', color: '#8B949E', fontSize: 12 },
  assetItem: { display: 'flex', alignItems: 'center', padding: '8px 10px', borderRadius: 5, cursor: 'pointer', fontSize: 13, gap: 4 },
  assetTag: { fontFamily: 'monospace', fontSize: 11, color: '#006B3C', marginRight: 6 },
  assetCondition: { fontSize: 11, color: '#8B949E', textTransform: 'capitalize' },
};
