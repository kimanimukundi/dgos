import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { format } from 'date-fns';

const typeConfig = {
  policy: { label: '📜 Policy', color: '#6F42C1' },
  circular: { label: '📢 Circular', color: '#0366D6' },
  report: { label: '📊 Report', color: '#28A745' },
  guideline: { label: '📋 Guideline', color: '#E36209' },
  other: { label: '📄 Other', color: '#586069' },
};
const statusConfig = {
  draft: { color: '#E36209', bg: '#FFF5E0', label: 'Draft' },
  published: { color: '#28A745', bg: '#E8F5E9', label: 'Published' },
  superseded: { color: '#586069', bg: '#F0F2F5', label: 'Superseded' },
  archived: { color: '#8B949E', bg: '#F0F2F5', label: 'Archived' },
};

export default function Documents() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showNew, setShowNew] = useState(false);

  const load = (params = {}) => {
    setLoading(true);
    api.get('/documents', { params }).then(r => setDocuments(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    api.get('/staff/departments').then(r => setDepartments(r.data));
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    load({ search: search || undefined, type: typeFilter || undefined });
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Document Registry</h1>
          <div style={styles.sub}>{documents.length} documents · Policies, circulars, reports & guidelines</div>
        </div>
        <button onClick={() => setShowNew(!showNew)} style={styles.newBtn}>
          {showNew ? 'Cancel' : '+ Upload Document'}
        </button>
      </div>

      {showNew && (
        <NewDocumentForm departments={departments} userDept={user?.department_id}
          onCreated={(d) => { setDocuments(prev => [d, ...prev]); setShowNew(false); }} />
      )}

      <form onSubmit={handleSearch} style={styles.searchBar}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by title or document number..." style={{ flex: 1 }} />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={styles.select}>
          <option value="">All types</option>
          <option value="policy">Policy</option>
          <option value="circular">Circular</option>
          <option value="report">Report</option>
          <option value="guideline">Guideline</option>
          <option value="other">Other</option>
        </select>
        <button type="submit" style={styles.searchBtn}>Search</button>
      </form>

      {loading && <div style={styles.loading}>Loading documents...</div>}
      {!loading && documents.length === 0 && <div style={styles.empty}>No documents found</div>}

      <div style={styles.list}>
        {documents.map(d => {
          const t = typeConfig[d.document_type] || typeConfig.other;
          const s = statusConfig[d.status] || statusConfig.published;
          return (
            <div key={d.id} onClick={() => navigate(`/documents/${d.id}`)} style={styles.row}>
              <div style={styles.rowLeft}>
                <div style={styles.rowTop}>
                  <span style={styles.docNum}>{d.document_number}</span>
                  <span style={{ ...styles.typeTag, color: t.color }}>{t.label}</span>
                  <span style={styles.versionTag}>v{d.version_number}</span>
                </div>
                <div style={styles.docTitle}>{d.title}</div>
                <div style={styles.meta}>
                  {d.department_name && `${d.department_name} · `}{d.uploaded_by_name}
                  {d.workflow_ref && ` · ↳ ${d.workflow_ref}`}
                </div>
              </div>
              <div style={styles.rowRight}>
                <span style={{ ...styles.statusBadge, background: s.bg, color: s.color }}>{s.label}</span>
                <div style={styles.date}>{format(new Date(d.created_at), 'd MMM yyyy')}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NewDocumentForm({ departments, userDept, onCreated }) {
  const [form, setForm] = useState({ title: '', document_type: 'other', department_id: userDept || '', description: '', status: 'published', original_name: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!form.title) { setError('Title is required'); return; }
    setSaving(true); setError('');
    try {
      const res = await api.post('/documents', form);
      onCreated(res.data);
    } catch (err) { setError(err.response?.data?.error || 'Failed to upload document'); }
    finally { setSaving(false); }
  };

  return (
    <div style={styles.form}>
      <div style={styles.formTitle}>Upload New Document</div>
      {error && <div style={styles.error}>{error}</div>}
      <div style={styles.formGrid}>
        <div style={{ ...styles.field, gridColumn: '1 / -1' }}>
          <label style={styles.label}>Title</label>
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Tourism Standards Compliance Guidelines 2025" />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Document Type</label>
          <select value={form.document_type} onChange={e => setForm({ ...form, document_type: e.target.value })}>
            <option value="policy">Policy</option>
            <option value="circular">Circular</option>
            <option value="report">Report</option>
            <option value="guideline">Guideline</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Department</label>
          <select value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })}>
            <option value="">— Select —</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Visibility</label>
          <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
            <option value="published">Published (visible to all)</option>
            <option value="draft">Draft (only me / my department)</option>
          </select>
        </div>
        <div style={styles.field}>
          <label style={styles.label}>File name (demo)</label>
          <input value={form.original_name} onChange={e => setForm({ ...form, original_name: e.target.value })} placeholder="e.g. policy.pdf" />
        </div>
        <div style={{ ...styles.field, gridColumn: '1 / -1' }}>
          <label style={styles.label}>Description</label>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} style={{ width: '100%', resize: 'vertical' }} />
        </div>
      </div>
      <button onClick={handleSubmit} disabled={saving} style={styles.submitBtn}>
        {saving ? 'Uploading...' : 'Upload Document'}
      </button>
    </div>
  );
}

const styles = {
  page: { padding: '28px 32px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 700, color: '#0D1117', marginBottom: 4 },
  sub: { fontSize: 13, color: '#586069' },
  newBtn: { background: '#006B3C', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  form: { background: '#fff', border: '1px solid #E2E6EA', borderRadius: 8, padding: '20px', marginBottom: 20 },
  formTitle: { fontSize: 14, fontWeight: 700, color: '#0D1117', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #E2E6EA' },
  error: { background: '#FFEEF0', border: '1px solid #FDAEB7', color: '#D73A49', padding: '8px 12px', borderRadius: 5, fontSize: 12, marginBottom: 12 },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 },
  field: { marginBottom: 4 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#0D1117', marginBottom: 6 },
  submitBtn: { background: '#006B3C', color: '#fff', border: 'none', borderRadius: 6, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 12 },
  searchBar: { display: 'flex', gap: 10, marginBottom: 16 },
  select: { width: 180 },
  searchBtn: { background: '#006B3C', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  loading: { padding: 40, color: '#586069' },
  empty: { background: '#fff', border: '1px solid #E2E6EA', borderRadius: 8, padding: '48px', textAlign: 'center', color: '#8B949E' },
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  row: { background: '#fff', border: '1px solid #E2E6EA', borderRadius: 8, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer' },
  rowLeft: { flex: 1, minWidth: 0 },
  rowRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, marginLeft: 16, flexShrink: 0 },
  rowTop: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 },
  docNum: { fontSize: 11, fontFamily: 'monospace', color: '#006B3C', fontWeight: 600 },
  typeTag: { fontSize: 12, fontWeight: 600 },
  versionTag: { fontSize: 11, color: '#8B949E', background: '#F0F2F5', padding: '1px 7px', borderRadius: 10 },
  docTitle: { fontSize: 13, fontWeight: 600, color: '#0D1117', marginBottom: 3 },
  meta: { fontSize: 12, color: '#8B949E' },
  statusBadge: { fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 10 },
  date: { fontSize: 11, color: '#8B949E' },
};
