import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const statusConfig = {
  in_use:        { color: '#28A745', bg: '#E8F5E9', label: 'In Use' },
  in_storage:    { color: '#586069', bg: '#F0F2F5', label: 'In Storage' },
  under_repair:  { color: '#E36209', bg: '#FFF5E0', label: 'Under Repair' },
  disposed:      { color: '#D73A49', bg: '#FFEEF0', label: 'Disposed' },
};
const conditionConfig = {
  good: '#28A745', fair: '#E36209', poor: '#D73A49', non_functional: '#8B949E',
};

export default function Assets() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [staff, setStaff] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showNew, setShowNew] = useState(false);

  const canManage = ['supervisor', 'hod', 'director', 'system_admin'].includes(user?.role);

  const load = () => {
    setLoading(true);
    api.get('/assets', { params: { search: search || undefined, status: statusFilter || undefined } })
      .then(r => setAssets(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => {
    Promise.all([api.get('/assets/categories'), api.get('/staff'), api.get('/staff/departments')])
      .then(([c, s, d]) => { setCategories(c.data); setStaff(s.data); setDepartments(d.data); });
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (e) => { e.preventDefault(); load(); };

  const totalValue = assets.reduce((sum, a) => sum + (parseFloat(a.current_value) || 0), 0);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Asset Registry</h1>
          <div style={styles.sub}>{assets.length} assets · Total current value: KES {totalValue.toLocaleString()}</div>
        </div>
        {canManage && (
          <button onClick={() => setShowNew(!showNew)} style={styles.newBtn}>
            {showNew ? 'Cancel' : '+ Register Asset'}
          </button>
        )}
      </div>

      {showNew && (
        <NewAssetForm categories={categories} staff={staff} departments={departments}
          onCreated={(a) => { setAssets(prev => [a, ...prev]); setShowNew(false); }} />
      )}

      <form onSubmit={handleSearch} style={styles.searchBar}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          data-tour="asset-search" placeholder="Search by name, tag, or serial number..." style={{ flex: 1 }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={styles.select}>
          <option value="">All statuses</option>
          <option value="in_use">In Use</option>
          <option value="in_storage">In Storage</option>
          <option value="under_repair">Under Repair</option>
          <option value="disposed">Disposed</option>
        </select>
        <button type="submit" style={styles.searchBtn}>Search</button>
      </form>

      {loading && <div style={styles.loading}>Loading assets...</div>}
      {!loading && assets.length === 0 && <div style={styles.empty}>No assets found</div>}

      <div style={styles.tableWrap} data-tour="asset-list">
        {assets.length > 0 && (
          <div style={styles.tableHead}>
            <span style={{ flex: 1.2 }}>Tag</span>
            <span style={{ flex: 2.5 }}>Asset</span>
            <span style={{ flex: 1.5 }}>Department</span>
            <span style={{ flex: 1.5 }}>Custodian</span>
            <span style={{ flex: 1 }}>Condition</span>
            <span style={{ flex: 1 }}>Status</span>
            <span style={{ flex: 1 }}>Value</span>
          </div>
        )}
        {assets.map(a => {
          const s = statusConfig[a.status] || statusConfig.in_use;
          return (
            <div key={a.id} onClick={() => navigate(`/assets/${a.id}`)} style={styles.row}>
              <span style={{ flex: 1.2, fontSize: 11, fontFamily: 'monospace', color: '#006B3C', fontWeight: 600 }}>{a.asset_tag}</span>
              <div style={{ flex: 2.5 }}>
                <div style={styles.assetName}>{a.name}</div>
                <div style={styles.assetCat}>{a.category_name}</div>
              </div>
              <span style={{ flex: 1.5, fontSize: 12, color: '#586069' }}>{a.department_name || '—'}</span>
              <span style={{ flex: 1.5, fontSize: 12, color: '#586069' }}>{a.custodian_name || '—'}</span>
              <span style={{ flex: 1, fontSize: 12, color: conditionConfig[a.condition], fontWeight: 600, textTransform: 'capitalize' }}>
                {a.condition?.replace('_', ' ')}
              </span>
              <div style={{ flex: 1 }}>
                <span style={{ ...styles.statusBadge, background: s.bg, color: s.color }}>{s.label}</span>
              </div>
              <span style={{ flex: 1, fontSize: 12, color: '#0D1117', fontWeight: 600 }}>
                {a.current_value ? `${parseFloat(a.current_value).toLocaleString()}` : '—'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NewAssetForm({ categories, staff, departments, onCreated }) {
  const [form, setForm] = useState({ name: '', category_id: '', description: '', serial_number: '',
    purchase_date: '', purchase_value: '', current_value: '', condition: 'good', department_id: '', custodian_id: '', location: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!form.name) { setError('Asset name is required'); return; }
    setSaving(true); setError('');
    try {
      const res = await api.post('/assets', form);
      onCreated(res.data);
    } catch (err) { setError(err.response?.data?.error || 'Failed to register asset'); }
    finally { setSaving(false); }
  };

  return (
    <div style={styles.form}>
      <div style={styles.formTitle}>Register New Asset</div>
      {error && <div style={styles.error}>{error}</div>}
      <div style={styles.formGrid}>
        <div style={{ ...styles.field, gridColumn: '1 / -1' }}>
          <label style={styles.label}>Asset Name</label>
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Dell OptiPlex Desktop Computer" />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Category</label>
          <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
            <option value="">— Select —</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Serial Number</label>
          <input value={form.serial_number} onChange={e => setForm({ ...form, serial_number: e.target.value })} />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Purchase Date</label>
          <input type="date" value={form.purchase_date} onChange={e => setForm({ ...form, purchase_date: e.target.value })} />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Purchase Value (KES)</label>
          <input type="number" value={form.purchase_value} onChange={e => setForm({ ...form, purchase_value: e.target.value })} />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Current Value (KES)</label>
          <input type="number" value={form.current_value} onChange={e => setForm({ ...form, current_value: e.target.value })} />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Condition</label>
          <select value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })}>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
            <option value="non_functional">Non-functional</option>
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
          <label style={styles.label}>Custodian</label>
          <select value={form.custodian_id} onChange={e => setForm({ ...form, custodian_id: e.target.value })}>
            <option value="">— Select —</option>
            {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Location</label>
          <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="e.g. ICT Storage Room" />
        </div>
        <div style={{ ...styles.field, gridColumn: '1 / -1' }}>
          <label style={styles.label}>Description</label>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} style={{ width: '100%', resize: 'vertical' }} />
        </div>
      </div>
      <button onClick={handleSubmit} disabled={saving} style={styles.submitBtn}>
        {saving ? 'Registering...' : 'Register Asset'}
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
  tableWrap: { background: '#fff', border: '1px solid #E2E6EA', borderRadius: 8, overflow: 'hidden' },
  tableHead: { display: 'flex', padding: '10px 16px', background: '#F7F8FA', borderBottom: '1px solid #E2E6EA', fontSize: 11, fontWeight: 700, color: '#586069', textTransform: 'uppercase', letterSpacing: '0.04em', gap: 8 },
  row: { display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #F0F2F5', cursor: 'pointer', gap: 8 },
  assetName: { fontSize: 13, fontWeight: 600, color: '#0D1117', marginBottom: 2 },
  assetCat: { fontSize: 11, color: '#8B949E' },
  statusBadge: { fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 10, whiteSpace: 'nowrap' },
};
