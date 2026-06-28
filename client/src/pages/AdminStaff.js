import React, { useState, useEffect } from 'react';
import api from '../utils/api';

const ROLES = ['staff', 'supervisor', 'hod', 'director', 'system_admin', 'auditor'];

export default function AdminStaff() {
  const [staff, setStaff] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', job_title: '', grade: '', role: 'staff', department_id: '', unit_id: '', supervisor_id: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([api.get('/staff'), api.get('/staff/departments'), api.get('/staff/units')])
      .then(([s, d, u]) => { setStaff(s.data); setDepartments(d.data); setUnits(u.data); })
      .finally(() => setLoading(false));
  }, []);

  const filteredUnits = form.department_id ? units.filter(u => u.department_id === parseInt(form.department_id)) : units;

  const handleCreate = async () => {
    if (!form.full_name || !form.email || !form.role) { setError('Name, email and role are required'); return; }
    setSaving(true); setError(''); setSuccess('');
    try {
      const res = await api.post('/staff', {
        ...form,
        department_id: form.department_id ? parseInt(form.department_id) : null,
        unit_id: form.unit_id ? parseInt(form.unit_id) : null,
        supervisor_id: form.supervisor_id ? parseInt(form.supervisor_id) : null,
      });
      setSuccess(`Account created. Staff ID: ${res.data.staff_id} · Default password: ${res.data.default_password}`);
      setStaff(prev => [res.data, ...prev]);
      setForm({ full_name: '', email: '', job_title: '', grade: '', role: 'staff', department_id: '', unit_id: '', supervisor_id: '', phone: '' });
      setShowForm(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create staff');
    } finally {
      setSaving(false);
    }
  };

  const filtered = staff.filter(s =>
    !search || s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.job_title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Manage Staff</h1>
          <div style={styles.sub}>{staff.length} accounts · ICT Administration</div>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={styles.addBtn} data-tour="add-staff-btn">
          {showForm ? 'Cancel' : '+ Add Staff'}
        </button>
      </div>

      {success && <div style={styles.success}>{success}</div>}

      {showForm && (
        <div style={styles.form}>
          <div style={styles.formTitle}>New Staff Account</div>
          {error && <div style={styles.error}>{error}</div>}
          <div style={styles.grid3}>
            <div style={styles.field}>
              <label style={styles.label}>Full Name *</label>
              <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="As on official documents" />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Work Email *</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="name@tourism.go.ke" />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Phone</label>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Optional" />
            </div>
          </div>
          <div style={styles.grid3}>
            <div style={styles.field}>
              <label style={styles.label}>Job Title</label>
              <input value={form.job_title} onChange={e => setForm({ ...form, job_title: e.target.value })} placeholder="e.g. Senior Accountant" />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Grade</label>
              <input value={form.grade} onChange={e => setForm({ ...form, grade: e.target.value })} placeholder="e.g. S3" />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Role *</label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>
          <div style={styles.grid3}>
            <div style={styles.field}>
              <label style={styles.label}>Department</label>
              <select value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value, unit_id: '' })}>
                <option value="">— Select —</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Unit</label>
              <select value={form.unit_id} onChange={e => setForm({ ...form, unit_id: e.target.value })} disabled={!form.department_id}>
                <option value="">— Select —</option>
                {filteredUnits.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Supervisor</label>
              <select value={form.supervisor_id} onChange={e => setForm({ ...form, supervisor_id: e.target.value })}>
                <option value="">— Select —</option>
                {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
            </div>
          </div>
          <div style={styles.formNote}>Default password: <code>Password@123</code> — staff must change on first login</div>
          <button onClick={handleCreate} disabled={saving} style={styles.saveBtn}>
            {saving ? 'Creating account...' : 'Create Account'}
          </button>
        </div>
      )}

      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search staff..." style={{ ...styles.searchInput, marginBottom: 16 }} />

      {loading && <div style={styles.loading}>Loading...</div>}

      <div style={styles.table} data-tour="staff-table">
        <div style={styles.tableHead}>
          <span style={{ flex: 2 }}>Name</span>
          <span style={{ flex: 2 }}>Email</span>
          <span style={{ flex: 1.5 }}>Department</span>
          <span style={{ flex: 1 }}>Role</span>
          <span style={{ flex: 0.8 }}>Status</span>
        </div>
        {filtered.map(s => (
          <div key={s.id} style={styles.tableRow}>
            <div style={{ flex: 2 }}>
              <div style={styles.name}>{s.full_name}</div>
              <div style={styles.meta}>{s.staff_id} · {s.job_title}</div>
            </div>
            <div style={{ flex: 2, fontSize: 12, color: '#586069' }}>{s.email}</div>
            <div style={{ flex: 1.5, fontSize: 12, color: '#586069' }}>{s.department_name || '—'}</div>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#006B3C', background: '#E8F5EE', padding: '2px 8px', borderRadius: 10, textTransform: 'capitalize' }}>
                {s.role.replace('_', ' ')}
              </span>
            </div>
            <div style={{ flex: 0.8 }}>
              <span style={{ fontSize: 11, color: s.account_status === 'active' ? '#28A745' : '#D73A49', fontWeight: 600 }}>
                {s.account_status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  page: { padding: '28px 32px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 700, color: '#0D1117', marginBottom: 4 },
  sub: { fontSize: 13, color: '#586069' },
  addBtn: { background: '#006B3C', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  success: { background: '#E8F5E9', border: '1px solid #A8D5B5', color: '#28A745', padding: '12px 16px', borderRadius: 6, fontSize: 13, marginBottom: 16, fontFamily: 'monospace' },
  form: { background: '#fff', border: '1px solid #E2E6EA', borderRadius: 8, padding: '20px', marginBottom: 24 },
  formTitle: { fontSize: 14, fontWeight: 700, color: '#0D1117', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #E2E6EA' },
  error: { background: '#FFEEF0', border: '1px solid #FDAEB7', color: '#D73A49', padding: '8px 12px', borderRadius: 5, fontSize: 12, marginBottom: 12 },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 4 },
  field: { marginBottom: 12 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#0D1117', marginBottom: 5 },
  formNote: { fontSize: 12, color: '#8B949E', background: '#F7F8FA', padding: '10px 12px', borderRadius: 5, marginBottom: 14 },
  saveBtn: { background: '#006B3C', color: '#fff', border: 'none', borderRadius: 6, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  searchInput: { width: '100%', maxWidth: 360 },
  loading: { padding: 40, color: '#586069' },
  table: { background: '#fff', border: '1px solid #E2E6EA', borderRadius: 8, overflow: 'hidden' },
  tableHead: { display: 'flex', padding: '10px 16px', background: '#F7F8FA', borderBottom: '1px solid #E2E6EA', fontSize: 11, fontWeight: 700, color: '#586069', textTransform: 'uppercase', letterSpacing: '0.04em', gap: 8 },
  tableRow: { display: 'flex', alignItems: 'flex-start', padding: '12px 16px', borderBottom: '1px solid #F0F2F5', gap: 8 },
  name: { fontSize: 13, fontWeight: 600, color: '#0D1117', marginBottom: 2 },
  meta: { fontSize: 11, color: '#8B949E' },
};
