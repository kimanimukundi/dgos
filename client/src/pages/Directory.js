import React, { useState, useEffect } from 'react';
import api from '../utils/api';

const roleColors = {
  director: { bg: '#F3EEFF', color: '#6F42C1' },
  hod: { bg: '#EAF2FF', color: '#0366D6' },
  supervisor: { bg: '#E8F5E9', color: '#28A745' },
  staff: { bg: '#F0F2F5', color: '#586069' },
  system_admin: { bg: '#FFF5E0', color: '#E36209' },
  auditor: { bg: '#FFEEF0', color: '#D73A49' },
};

export default function Directory() {
  const [staff, setStaff] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/staff'),
      api.get('/staff/departments'),
    ]).then(([s, d]) => { setStaff(s.data); setDepartments(d.data); }).finally(() => setLoading(false));
  }, []);

  const filtered = staff.filter(s => {
    const matchSearch = !search || s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      s.job_title?.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());
    const matchDept = !deptFilter || s.department_id === parseInt(deptFilter);
    return matchSearch && matchDept;
  });

  // Group by department
  const grouped = filtered.reduce((acc, s) => {
    const key = s.department_name || 'Unassigned';
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Staff Directory</h1>
          <div style={styles.sub}>{staff.length} active staff members</div>
        </div>
      </div>

      <div style={styles.searchBar}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, title, or email..." style={{ flex: 1 }} />
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} style={styles.select}>
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      {loading && <div style={styles.loading}>Loading directory...</div>}

      <div style={styles.layout}>
        <div style={styles.list} data-tour="staff-list">
          {Object.entries(grouped).map(([deptName, members]) => (
            <div key={deptName} style={styles.deptGroup}>
              <div style={styles.deptHeader}>{deptName} <span style={styles.deptCount}>({members.length})</span></div>
              {members.map(s => (
                <div key={s.id} onClick={() => setSelected(s)}
                  style={{ ...styles.staffRow, ...(selected?.id === s.id ? styles.staffRowActive : {}) }}>
                  <div style={styles.avatar}>{s.full_name[0]}</div>
                  <div style={styles.staffInfo}>
                    <div style={styles.staffName}>{s.full_name}</div>
                    <div style={styles.staffTitle}>{s.job_title}</div>
                  </div>
                  <span style={{ ...styles.roleBadge, ...roleColors[s.role] }}>
                    {s.role.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          ))}
          {!loading && filtered.length === 0 && <div style={styles.empty}>No staff found</div>}
        </div>

        {selected && (
          <div style={styles.detail}>
            <button onClick={() => setSelected(null)} style={styles.closeBtn}>✕</button>
            <div style={styles.detailAvatar}>{selected.full_name[0]}</div>
            <div style={styles.detailName}>{selected.full_name}</div>
            <div style={styles.detailTitle}>{selected.job_title}</div>
            <span style={{ ...styles.roleBadge, ...roleColors[selected.role], fontSize: 12, padding: '4px 12px' }}>
              {selected.role.replace('_', ' ')}
            </span>

            <div style={styles.detailDivider} />

            <DetailRow label="Staff ID" value={selected.staff_id} mono />
            <DetailRow label="Email" value={selected.email} />
            {selected.phone && <DetailRow label="Phone" value={selected.phone} />}
            <DetailRow label="Grade" value={selected.grade || '—'} />
            <DetailRow label="Department" value={selected.department_name || '—'} />
            <DetailRow label="Unit" value={selected.unit_name || '—'} />
            <DetailRow label="Supervisor" value={selected.supervisor_name || '—'} />

            <div style={styles.statusChip}>
              <span style={{ color: '#28A745' }}>●</span> {selected.employment_status}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value, mono }) {
  return (
    <div style={styles.detailRow}>
      <span style={styles.detailLabel}>{label}</span>
      <span style={{ ...styles.detailValue, fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</span>
    </div>
  );
}

const styles = {
  page: { padding: '28px 32px' },
  header: { marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 700, color: '#0D1117', marginBottom: 4 },
  sub: { fontSize: 13, color: '#586069' },
  searchBar: { display: 'flex', gap: 10, marginBottom: 20 },
  select: { width: 220 },
  loading: { padding: 40, color: '#586069' },
  layout: { display: 'flex', gap: 20 },
  list: { flex: 1, minWidth: 0 },
  deptGroup: { marginBottom: 20 },
  deptHeader: { fontSize: 11, fontWeight: 700, color: '#586069', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '6px 0 8px', borderBottom: '1px solid #E2E6EA', marginBottom: 4 },
  deptCount: { fontWeight: 400, color: '#8B949E' },
  staffRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 7, cursor: 'pointer', transition: 'background 0.1s', marginBottom: 2 },
  staffRowActive: { background: '#E8F5EE', outline: '1px solid #006B3C' },
  avatar: { width: 36, height: 36, borderRadius: '50%', background: '#006B3C', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 },
  staffInfo: { flex: 1, minWidth: 0 },
  staffName: { fontSize: 13, fontWeight: 600, color: '#0D1117', marginBottom: 2 },
  staffTitle: { fontSize: 11, color: '#8B949E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  roleBadge: { fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, textTransform: 'capitalize', whiteSpace: 'nowrap' },
  empty: { padding: '32px', textAlign: 'center', color: '#8B949E' },
  detail: { width: 280, background: '#fff', border: '1px solid #E2E6EA', borderRadius: 10, padding: '20px', height: 'fit-content', position: 'sticky', top: 20, flexShrink: 0, textAlign: 'center' },
  closeBtn: { position: 'absolute', right: 12, top: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#8B949E', fontSize: 16, display: 'block', marginLeft: 'auto' },
  detailAvatar: { width: 60, height: 60, borderRadius: '50%', background: '#006B3C', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, margin: '0 auto 12px' },
  detailName: { fontSize: 15, fontWeight: 700, color: '#0D1117', marginBottom: 4 },
  detailTitle: { fontSize: 12, color: '#586069', marginBottom: 10 },
  detailDivider: { height: 1, background: '#E2E6EA', margin: '16px 0', textAlign: 'left' },
  detailRow: { display: 'flex', justifyContent: 'space-between', gap: 8, padding: '6px 0', borderBottom: '1px solid #F0F2F5', textAlign: 'left' },
  detailLabel: { fontSize: 11, color: '#8B949E', fontWeight: 600 },
  detailValue: { fontSize: 12, color: '#0D1117', textAlign: 'right', wordBreak: 'break-word' },
  statusChip: { marginTop: 12, fontSize: 12, color: '#586069', textTransform: 'capitalize' },
};
