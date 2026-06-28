import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { format } from 'date-fns';

const typeConfig = {
  policy: { label: 'Policy', color: '#6F42C1' }, circular: { label: 'Circular', color: '#0366D6' },
  report: { label: 'Report', color: '#28A745' }, guideline: { label: 'Guideline', color: '#E36209' },
  other: { label: 'Other', color: '#586069' },
};
const statusConfig = {
  draft: { color: '#E36209', bg: '#FFF5E0', label: 'Draft' },
  published: { color: '#28A745', bg: '#E8F5E9', label: 'Published' },
  superseded: { color: '#586069', bg: '#F0F2F5', label: 'Superseded' },
  archived: { color: '#8B949E', bg: '#F0F2F5', label: 'Archived' },
};

export default function DocumentDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNewVersion, setShowNewVersion] = useState(false);
  const [versionForm, setVersionForm] = useState({ original_name: '', change_note: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const refresh = () => api.get(`/documents/${id}`).then(r => setDoc(r.data));

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { refresh().finally(() => setLoading(false)); }, [id]);

  if (loading) return <div style={styles.loading}>Loading document...</div>;
  if (!doc) return <div style={styles.loading}>Document not found</div>;

  const t = typeConfig[doc.document_type] || typeConfig.other;
  const s = statusConfig[doc.status] || statusConfig.published;
  const isOwner = doc.uploaded_by === user?.id;
  const canManage = isOwner || ['hod', 'director', 'system_admin'].includes(user?.role);

  const handleNewVersion = async () => {
    if (!versionForm.original_name) { setError('File name is required'); return; }
    setSaving(true); setError('');
    try {
      await api.post(`/documents/${id}/versions`, versionForm);
      await refresh();
      setShowNewVersion(false);
      setVersionForm({ original_name: '', change_note: '' });
    } catch (err) { setError('Failed to add new version'); }
    finally { setSaving(false); }
  };

  const handlePublishDraft = async () => {
    try { await api.patch(`/documents/${id}`, { status: 'published' }); await refresh(); }
    catch { setError('Failed to publish'); }
  };

  const handleArchive = async () => {
    if (!window.confirm('Archive this document?')) return;
    try { await api.patch(`/documents/${id}`, { status: 'archived' }); await refresh(); }
    catch { setError('Failed to archive'); }
  };

  return (
    <div style={styles.page}>
      <button onClick={() => navigate('/documents')} style={styles.back}>← Back to Document Registry</button>

      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <div style={styles.tags}>
              <span style={styles.docNum}>{doc.document_number}</span>
              <span style={{ ...styles.typeTag, color: t.color }}>{t.label}</span>
            </div>
            <h1 style={styles.title}>{doc.title}</h1>
            <div style={styles.meta}>
              {doc.department_name && `${doc.department_name} · `}Uploaded by {doc.uploaded_by_name}
            </div>
          </div>
          <span style={{ ...styles.statusBadge, background: s.bg, color: s.color }}>{s.label}</span>
        </div>

        {doc.description && <div style={styles.description}>{doc.description}</div>}

        {doc.workflow_ref && (
          <Link to={`/workflows/${doc.workflow_instance_id}`} style={styles.workflowLink}>
            ↳ Produced via workflow <strong>{doc.workflow_ref}</strong> — {doc.workflow_title}
          </Link>
        )}

        {error && <div style={styles.error}>{error}</div>}

        {canManage && doc.status === 'draft' && (
          <div style={styles.actionRow}>
            <button onClick={handlePublishDraft} style={styles.publishBtn}>Publish This Draft</button>
          </div>
        )}

        {canManage && doc.status !== 'archived' && (
          <div style={styles.actionRow}>
            <button onClick={() => setShowNewVersion(!showNewVersion)} style={styles.newVersionBtn}>
              {showNewVersion ? 'Cancel' : '+ Upload New Version'}
            </button>
            <button onClick={handleArchive} style={styles.archiveBtn}>Archive</button>
          </div>
        )}

        {showNewVersion && (
          <div style={styles.versionForm}>
            <input value={versionForm.original_name} onChange={e => setVersionForm({ ...versionForm, original_name: e.target.value })}
              placeholder="New file name, e.g. policy_v2.pdf" style={{ marginBottom: 8 }} />
            <textarea value={versionForm.change_note} onChange={e => setVersionForm({ ...versionForm, change_note: e.target.value })}
              placeholder="What changed in this version?" rows={2} style={{ width: '100%', resize: 'vertical', marginBottom: 8 }} />
            <button onClick={handleNewVersion} disabled={saving} style={styles.submitVersionBtn}>
              {saving ? 'Uploading...' : 'Upload Version'}
            </button>
          </div>
        )}

        <div style={styles.section}>
          <div style={styles.sectionTitle}>Version History ({doc.versions?.length || 0})</div>
          {doc.versions?.map(v => (
            <div key={v.id} style={styles.versionRow}>
              <div style={styles.versionBadge}>v{v.version_number}</div>
              <div style={{ flex: 1 }}>
                <div style={styles.versionFile}>{v.original_name}</div>
                {v.change_note && <div style={styles.versionNote}>{v.change_note}</div>}
                <div style={styles.versionMeta}>{v.uploaded_by_name} · {format(new Date(v.uploaded_at), 'd MMM yyyy, HH:mm')}</div>
              </div>
              {v.id === doc.current_version_id && <span style={styles.currentTag}>Current</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { padding: '28px 32px', maxWidth: 760 },
  loading: { padding: 40, color: '#586069' },
  back: { background: 'none', border: '1px solid #E2E6EA', color: '#586069', borderRadius: 6, padding: '7px 14px', fontSize: 13, cursor: 'pointer', marginBottom: 20 },
  container: { background: '#fff', border: '1px solid #E2E6EA', borderRadius: 10, padding: '24px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #E2E6EA' },
  tags: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 },
  docNum: { fontSize: 11, fontFamily: 'monospace', color: '#006B3C', fontWeight: 600 },
  typeTag: { fontSize: 12, fontWeight: 600 },
  title: { fontSize: 18, fontWeight: 700, color: '#0D1117', marginBottom: 6 },
  meta: { fontSize: 12, color: '#586069' },
  statusBadge: { fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 10, flexShrink: 0 },
  description: { fontSize: 13, color: '#586069', lineHeight: 1.6, marginBottom: 16 },
  workflowLink: { display: 'block', background: '#FFF5E0', border: '1px solid #FFDF7E', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#0D1117', textDecoration: 'none', marginBottom: 16 },
  error: { background: '#FFEEF0', color: '#D73A49', padding: '8px 12px', borderRadius: 5, fontSize: 12, marginBottom: 12 },
  actionRow: { display: 'flex', gap: 8, marginBottom: 12 },
  publishBtn: { background: '#006B3C', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  newVersionBtn: { background: '#F0F2F5', border: 'none', color: '#0D1117', borderRadius: 6, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  archiveBtn: { background: '#fff', border: '1px solid #E2E6EA', color: '#8B949E', borderRadius: 6, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  versionForm: { background: '#F7F8FA', borderRadius: 8, padding: '14px', marginBottom: 16 },
  submitVersionBtn: { background: '#006B3C', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  section: { marginTop: 16, paddingTop: 16, borderTop: '1px solid #E2E6EA' },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: '#586069', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 },
  versionRow: { display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 12px', background: '#F7F8FA', borderRadius: 6, marginBottom: 6 },
  versionBadge: { background: '#006B3C', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 10, flexShrink: 0 },
  versionFile: { fontSize: 13, fontWeight: 600, color: '#0D1117', marginBottom: 2 },
  versionNote: { fontSize: 12, color: '#586069', marginBottom: 2 },
  versionMeta: { fontSize: 11, color: '#8B949E' },
  currentTag: { fontSize: 10, fontWeight: 700, color: '#28A745', background: '#E8F5E9', padding: '2px 8px', borderRadius: 10, flexShrink: 0 },
};
