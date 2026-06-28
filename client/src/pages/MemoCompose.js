import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function MemoCompose() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState({ subject: '', body: '', urgency: 'routine', classification: 'internal', action_required: false, action_description: '', action_deadline: '' });
  const [recipientMode, setRecipientMode] = useState('department');
  const [selectedDepts, setSelectedDepts] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState([]);
  const [allStaff, setAllStaff] = useState(false);
  const [publishing, setPublishing] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [saving, setSaving] = useState(false);
  const [draftId, setDraftId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/staff/departments').then(r => setDepartments(r.data));
    api.get('/staff').then(r => setStaff(r.data));
  }, []);

  const canSendAll = ['director', 'system_admin'].includes(user?.role);

  const saveDraft = async () => {
    setSaving(true); setError('');
    try {
      if (draftId) {
        // update not implemented in this demo — just use existing draft
        return draftId;
      }
      const res = await api.post('/memos', { ...form });
      setDraftId(res.data.id);
      return res.data.id;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save draft');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!form.subject || !form.body) { setError('Subject and body are required'); return; }
    const hasRecipients = allStaff || selectedDepts.length > 0 || selectedStaff.length > 0;
    if (!hasRecipients) { setError('Please select at least one recipient'); return; }

    setPublishing(true); setError('');
    try {
      const id = await saveDraft();
      if (!id) return;

      await api.post(`/memos/${id}/publish`, {
        all_staff: allStaff,
        department_ids: selectedDepts.map(Number),
        recipient_ids: selectedStaff.map(Number),
      });
      navigate('/memos/sent');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to publish memo');
    } finally {
      setPublishing(false);
    }
  };

  const toggleDept = (id) => setSelectedDepts(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleStaff = (id) => setSelectedStaff(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Compose Memo</h1>
          <div style={styles.sub}>Ministry of Tourism & Wildlife</div>
        </div>
        <div style={styles.headerActions}>
          <button onClick={() => navigate(-1)} style={styles.cancelBtn}>Cancel</button>
          <button onClick={handlePublish} disabled={publishing} style={publishing ? styles.publishBtnDisabled : styles.publishBtn}>
            {publishing ? 'Publishing...' : 'Publish Memo'}
          </button>
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.twoCol}>
        <div style={styles.left}>
          {/* Memo form */}
          <div style={styles.section}>
            <div style={styles.fieldRow}>
              <div style={styles.field}>
                <label style={styles.label}>Urgency Level</label>
                <select value={form.urgency} onChange={e => setForm({ ...form, urgency: e.target.value })}>
                  <option value="routine">Routine</option>
                  <option value="priority">Priority</option>
                  <option value="urgent">Urgent</option>
                  <option value="confidential">Confidential</option>
                </select>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Classification</label>
                <select value={form.classification} onChange={e => setForm({ ...form, classification: e.target.value })}>
                  <option value="internal">Internal Only</option>
                  <option value="restricted">Restricted</option>
                  <option value="confidential">Confidential</option>
                </select>
              </div>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Subject</label>
              <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="Enter memo subject" />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Body</label>
              <textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })}
                placeholder="Type the memo content here..." rows={12} style={styles.textarea} />
            </div>

            <div style={styles.actionRequired}>
              <label style={styles.checkLabel}>
                <input type="checkbox" checked={form.action_required} onChange={e => setForm({ ...form, action_required: e.target.checked })}
                  style={{ width: 'auto', marginRight: 8 }} />
                This memo requires action from recipients
              </label>
              {form.action_required && (
                <div style={styles.actionFields}>
                  <div style={styles.field}>
                    <label style={styles.label}>Action Description</label>
                    <input value={form.action_description} onChange={e => setForm({ ...form, action_description: e.target.value })}
                      placeholder="What action is required?" />
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>Action Deadline</label>
                    <input type="date" value={form.action_deadline} onChange={e => setForm({ ...form, action_deadline: e.target.value })} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recipients */}
        <div style={styles.right}>
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Recipients</div>

            {canSendAll && (
              <label style={{ ...styles.checkLabel, marginBottom: 16, display: 'flex' }}>
                <input type="checkbox" checked={allStaff} onChange={e => { setAllStaff(e.target.checked); if (e.target.checked) { setSelectedDepts([]); setSelectedStaff([]); } }}
                  style={{ width: 'auto', marginRight: 8 }} />
                <strong>Send to All Staff</strong>
              </label>
            )}

            {!allStaff && (
              <>
                <div style={styles.modeTabs}>
                  <button onClick={() => setRecipientMode('department')} style={{ ...styles.modeTab, ...(recipientMode === 'department' ? styles.modeTabActive : {}) }}>By Department</button>
                  <button onClick={() => setRecipientMode('individual')} style={{ ...styles.modeTab, ...(recipientMode === 'individual' ? styles.modeTabActive : {}) }}>Individual</button>
                </div>

                {recipientMode === 'department' && (
                  <div style={styles.checkList}>
                    {departments.map(d => (
                      <label key={d.id} style={styles.checkItem}>
                        <input type="checkbox" checked={selectedDepts.includes(d.id)} onChange={() => toggleDept(d.id)}
                          style={{ width: 'auto', marginRight: 8 }} />
                        <span style={styles.checkItemText}>
                          <span>{d.name}</span>
                          <span style={styles.checkItemCount}>{d.staff_count} staff</span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                {recipientMode === 'individual' && (
                  <div style={styles.checkList}>
                    {staff.filter(s => s.id !== user?.id).map(s => (
                      <label key={s.id} style={styles.checkItem}>
                        <input type="checkbox" checked={selectedStaff.includes(s.id)} onChange={() => toggleStaff(s.id)}
                          style={{ width: 'auto', marginRight: 8 }} />
                        <span style={styles.checkItemText}>
                          <span>{s.full_name}</span>
                          <span style={styles.checkItemCount}>{s.job_title}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Summary */}
            <div style={styles.recipientSummary}>
              {allStaff ? '📨 All active staff' :
               selectedDepts.length > 0 ? `📨 ${selectedDepts.length} department(s)` :
               selectedStaff.length > 0 ? `📨 ${selectedStaff.length} individual(s)` :
               'No recipients selected'}
            </div>
          </div>

          {/* Preview */}
          <div style={{ ...styles.section, marginTop: 16 }}>
            <div style={styles.sectionTitle}>Preview</div>
            <div style={styles.preview}>
              <div style={styles.previewRow}><span style={styles.previewKey}>FROM</span><span>{user?.full_name}</span></div>
              <div style={styles.previewRow}><span style={styles.previewKey}>DATE</span><span>{new Date().toLocaleDateString('en-KE')}</span></div>
              <div style={styles.previewRow}><span style={styles.previewKey}>REF</span><span style={{ fontFamily: 'monospace', color: '#8B949E' }}>MEMO/MOT/{new Date().getFullYear()}/XXX</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { padding: '28px 32px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title: { fontSize: 22, fontWeight: 700, color: '#0D1117', marginBottom: 2 },
  sub: { fontSize: 13, color: '#586069' },
  headerActions: { display: 'flex', gap: 10 },
  cancelBtn: { background: '#fff', border: '1px solid #E2E6EA', color: '#586069', borderRadius: 6, padding: '8px 18px', fontSize: 13, cursor: 'pointer' },
  publishBtn: { background: '#006B3C', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  publishBtnDisabled: { background: '#8B949E', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 20px', fontSize: 13, fontWeight: 700, cursor: 'not-allowed' },
  error: { background: '#FFEEF0', border: '1px solid #FDAEB7', color: '#D73A49', padding: '10px 14px', borderRadius: 6, fontSize: 13, marginBottom: 16 },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 },
  left: {},
  right: {},
  section: { background: '#fff', border: '1px solid #E2E6EA', borderRadius: 8, padding: '20px' },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: '#0D1117', marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid #E2E6EA' },
  fieldRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 },
  field: { marginBottom: 16 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#0D1117', marginBottom: 6 },
  textarea: { width: '100%', minHeight: 220, resize: 'vertical', lineHeight: 1.7 },
  actionRequired: { background: '#F7F8FA', borderRadius: 6, padding: '14px' },
  checkLabel: { fontSize: 13, color: '#0D1117', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  actionFields: { marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  modeTabs: { display: 'flex', gap: 6, marginBottom: 12 },
  modeTab: { flex: 1, background: '#F7F8FA', border: '1px solid #E2E6EA', color: '#586069', borderRadius: 5, padding: '6px', fontSize: 12, cursor: 'pointer' },
  modeTabActive: { background: '#006B3C', color: '#fff', borderColor: '#006B3C' },
  checkList: { maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 },
  checkItem: { display: 'flex', alignItems: 'flex-start', padding: '8px', borderRadius: 5, cursor: 'pointer', background: '#F7F8FA', marginBottom: 2 },
  checkItemText: { display: 'flex', flexDirection: 'column', gap: 1, fontSize: 12 },
  checkItemCount: { color: '#8B949E', fontSize: 11 },
  recipientSummary: { marginTop: 12, fontSize: 12, color: '#006B3C', fontWeight: 600, background: '#E8F5EE', padding: '8px 12px', borderRadius: 5 },
  preview: { display: 'flex', flexDirection: 'column', gap: 8 },
  previewRow: { display: 'flex', gap: 10, fontSize: 12 },
  previewKey: { width: 40, fontWeight: 700, color: '#8B949E', fontSize: 10, letterSpacing: '0.04em', paddingTop: 1 },
};
