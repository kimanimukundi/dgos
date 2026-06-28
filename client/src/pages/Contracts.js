import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { format } from 'date-fns';

export default function Contracts() {
  const { user } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState(null);

  const canManage = ['hod', 'director', 'system_admin'].includes(user?.role);

  useEffect(() => {
    Promise.all([api.get('/contracts'), api.get('/contracts/vendors'), api.get('/staff/departments')])
      .then(([c, v, d]) => { setContracts(c.data); setVendors(v.data); setDepartments(d.data); })
      .finally(() => setLoading(false));
  }, []);

  const expiringSoon = contracts.filter(c => c.status === 'active' && c.days_to_expiry !== null && c.days_to_expiry <= 90);
  const totalValue = contracts.filter(c => c.status === 'active').reduce((sum, c) => sum + (parseFloat(c.contract_value) || 0), 0);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Contracts & Vendors</h1>
          <div style={styles.sub}>{contracts.length} contracts · Active value: KES {totalValue.toLocaleString()}</div>
        </div>
        {canManage && (
          <button onClick={() => setShowNew(!showNew)} style={styles.newBtn}>
            {showNew ? 'Cancel' : '+ New Contract'}
          </button>
        )}
      </div>

      {expiringSoon.length > 0 && (
        <div style={styles.alertBanner} data-tour="expiry-banner">
          ⚠ <strong>{expiringSoon.length} contract{expiringSoon.length > 1 ? 's' : ''}</strong> expiring within 90 days
        </div>
      )}

      {showNew && (
        <NewContractForm vendors={vendors} departments={departments}
          onCreated={(c) => { setContracts(prev => [c, ...prev]); setShowNew(false); }} />
      )}

      {loading && <div style={styles.loading}>Loading contracts...</div>}
      {!loading && contracts.length === 0 && <div style={styles.empty}>No contracts registered</div>}

      <div style={styles.tableWrap} data-tour="contract-list">
        {contracts.length > 0 && (
          <div style={styles.tableHead}>
            <span style={{ flex: 1.2 }}>Ref</span>
            <span style={{ flex: 2.5 }}>Title</span>
            <span style={{ flex: 1.5 }}>Vendor</span>
            <span style={{ flex: 1.2 }}>Value</span>
            <span style={{ flex: 1.5 }}>Expires</span>
            <span style={{ flex: 1 }}>Status</span>
          </div>
        )}
        {contracts.map(c => {
          const isExpiringSoon = c.status === 'active' && c.days_to_expiry !== null && c.days_to_expiry <= 90;
          return (
            <div key={c.id} onClick={() => setSelected(c)} style={{ ...styles.row, ...(isExpiringSoon ? styles.rowAlert : {}) }}>
              <span style={{ flex: 1.2, fontSize: 11, fontFamily: 'monospace', color: '#006B3C', fontWeight: 600 }}>{c.reference_number}</span>
              <div style={{ flex: 2.5 }}>
                <div style={styles.contractTitle}>{c.title}</div>
                <div style={styles.contractDept}>{c.department_name}</div>
              </div>
              <span style={{ flex: 1.5, fontSize: 12, color: '#586069' }}>{c.vendor_name}</span>
              <span style={{ flex: 1.2, fontSize: 12, fontWeight: 600 }}>{c.contract_value ? `KES ${parseFloat(c.contract_value).toLocaleString()}` : '—'}</span>
              <div style={{ flex: 1.5 }}>
                <div style={{ fontSize: 12, color: isExpiringSoon ? '#D73A49' : '#586069', fontWeight: isExpiringSoon ? 600 : 400 }}>
                  {format(new Date(c.end_date), 'd MMM yyyy')}
                </div>
                {isExpiringSoon && <div style={styles.expiryWarning}>{c.days_to_expiry}d remaining</div>}
              </div>
              <div style={{ flex: 1 }}>
                <StatusBadge status={c.status} />
              </div>
            </div>
          );
        })}
      </div>

      {selected && <ContractModal contract={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    active: { bg: '#E8F5E9', color: '#28A745', label: 'Active' },
    expired: { bg: '#FFEEF0', color: '#D73A49', label: 'Expired' },
    terminated: { bg: '#F0F2F5', color: '#586069', label: 'Terminated' },
    renewed: { bg: '#EAF2FF', color: '#0366D6', label: 'Renewed' },
  };
  const s = map[status] || map.active;
  return <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 10 }}>{s.label}</span>;
}

function ContractModal({ contract, onClose }) {
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={styles.modalClose}>✕</button>
        <div style={styles.modalRef}>{contract.reference_number}</div>
        <h2 style={styles.modalTitle}>{contract.title}</h2>
        <StatusBadge status={contract.status} />

        {contract.description && <div style={styles.modalDescription}>{contract.description}</div>}

        <div style={styles.modalGrid}>
          <ModalDetail label="Vendor" value={contract.vendor_name} />
          <ModalDetail label="Contact" value={contract.contact_person || '—'} />
          <ModalDetail label="Email" value={contract.vendor_email || '—'} />
          <ModalDetail label="Department" value={contract.department_name || '—'} />
          <ModalDetail label="Value" value={contract.contract_value ? `KES ${parseFloat(contract.contract_value).toLocaleString()}` : '—'} />
          <ModalDetail label="Managed By" value={contract.managed_by_name || '—'} />
          <ModalDetail label="Start Date" value={format(new Date(contract.start_date), 'd MMM yyyy')} />
          <ModalDetail label="End Date" value={format(new Date(contract.end_date), 'd MMM yyyy')} />
        </div>
      </div>
    </div>
  );
}

function ModalDetail({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#8B949E', textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, color: '#0D1117' }}>{value}</div>
    </div>
  );
}

function NewContractForm({ vendors, departments, onCreated }) {
  const [form, setForm] = useState({ title: '', vendor_id: '', department_id: '', contract_value: '', start_date: '', end_date: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!form.title || !form.vendor_id || !form.start_date || !form.end_date) {
      setError('Title, vendor, and dates are required'); return;
    }
    setSaving(true); setError('');
    try {
      const res = await api.post('/contracts', form);
      onCreated(res.data);
    } catch (err) { setError(err.response?.data?.error || 'Failed to create contract'); }
    finally { setSaving(false); }
  };

  return (
    <div style={styles.form}>
      <div style={styles.formTitle}>New Contract</div>
      {error && <div style={styles.error}>{error}</div>}
      <div style={styles.formGrid}>
        <div style={{ ...styles.field, gridColumn: '1 / -1' }}>
          <label style={styles.label}>Contract Title</label>
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Office Furniture Supply" />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Vendor</label>
          <select value={form.vendor_id} onChange={e => setForm({ ...form, vendor_id: e.target.value })}>
            <option value="">— Select —</option>
            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
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
          <label style={styles.label}>Contract Value (KES)</label>
          <input type="number" value={form.contract_value} onChange={e => setForm({ ...form, contract_value: e.target.value })} />
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
          <label style={styles.label}>Description</label>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} style={{ width: '100%', resize: 'vertical' }} />
        </div>
      </div>
      <button onClick={handleSubmit} disabled={saving} style={styles.submitBtn}>
        {saving ? 'Creating...' : 'Create Contract'}
      </button>
    </div>
  );
}

const styles = {
  page: { padding: '28px 32px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: 700, color: '#0D1117', marginBottom: 4 },
  sub: { fontSize: 13, color: '#586069' },
  newBtn: { background: '#006B3C', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  alertBanner: { background: '#FFF5E0', border: '1px solid #FFDF7E', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 13 },
  form: { background: '#fff', border: '1px solid #E2E6EA', borderRadius: 8, padding: '20px', marginBottom: 20 },
  formTitle: { fontSize: 14, fontWeight: 700, color: '#0D1117', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #E2E6EA' },
  error: { background: '#FFEEF0', border: '1px solid #FDAEB7', color: '#D73A49', padding: '8px 12px', borderRadius: 5, fontSize: 12, marginBottom: 12 },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 },
  field: { marginBottom: 4 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#0D1117', marginBottom: 6 },
  submitBtn: { background: '#006B3C', color: '#fff', border: 'none', borderRadius: 6, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 12 },
  loading: { padding: 40, color: '#586069' },
  empty: { background: '#fff', border: '1px solid #E2E6EA', borderRadius: 8, padding: '48px', textAlign: 'center', color: '#8B949E' },
  tableWrap: { background: '#fff', border: '1px solid #E2E6EA', borderRadius: 8, overflow: 'hidden' },
  tableHead: { display: 'flex', padding: '10px 16px', background: '#F7F8FA', borderBottom: '1px solid #E2E6EA', fontSize: 11, fontWeight: 700, color: '#586069', textTransform: 'uppercase', letterSpacing: '0.04em', gap: 8 },
  row: { display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #F0F2F5', cursor: 'pointer', gap: 8 },
  rowAlert: { background: '#FFFAF5' },
  contractTitle: { fontSize: 13, fontWeight: 600, color: '#0D1117', marginBottom: 2 },
  contractDept: { fontSize: 11, color: '#8B949E' },
  expiryWarning: { fontSize: 10, color: '#D73A49', fontWeight: 600 },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: '#fff', borderRadius: 12, padding: '28px', width: '100%', maxWidth: 480, position: 'relative', maxHeight: '85vh', overflowY: 'auto' },
  modalClose: { position: 'absolute', right: 16, top: 16, background: 'none', border: 'none', fontSize: 16, color: '#8B949E', cursor: 'pointer' },
  modalRef: { fontSize: 11, fontFamily: 'monospace', color: '#006B3C', fontWeight: 600, marginBottom: 4 },
  modalTitle: { fontSize: 18, fontWeight: 700, color: '#0D1117', marginBottom: 10 },
  modalDescription: { fontSize: 13, color: '#586069', lineHeight: 1.6, margin: '16px 0' },
  modalGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20, paddingTop: 16, borderTop: '1px solid #E2E6EA' },
};
