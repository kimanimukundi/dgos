import React, { useState, useEffect } from 'react';
import api from '../utils/api';

const roleColors = {
  director: '#6F42C1', hod: '#0366D6', supervisor: '#28A745',
  staff: '#586069', system_admin: '#E36209', auditor: '#D73A49',
};

export default function OrgChart() {
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    api.get('/staff/org-chart').then(r => {
      setTree(r.data);
      // Expand all by default
      const exp = {};
      r.data.forEach(d => { exp[`dept-${d.id}`] = true; d.units?.forEach(u => { exp[`unit-${u.id}`] = true; }); });
      setExpanded(exp);
    }).finally(() => setLoading(false));
  }, []);

  const toggle = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  if (loading) return <div style={styles.loading}>Loading org chart...</div>;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Organisational Chart</h1>
          <div style={styles.sub}>Ministry of Tourism & Wildlife — Headquarters Structure</div>
        </div>
      </div>

      {/* Ministry root */}
      <div style={styles.root}>
        <span style={{ fontSize: 22 }}>🦁</span>
        <div>
          <div style={styles.rootName}>Ministry of Tourism & Wildlife</div>
          <div style={styles.rootSub}>Government of Kenya · Utalii House, Nairobi</div>
        </div>
      </div>

      <div style={styles.tree} data-tour="org-tree">
        {tree.map(dept => (
          <div key={dept.id} style={styles.deptBlock}>
            <div onClick={() => toggle(`dept-${dept.id}`)} style={styles.deptHeader}>
              <span style={styles.toggleIcon}>{expanded[`dept-${dept.id}`] ? '▾' : '▸'}</span>
              <div style={styles.deptInfo}>
                <div style={styles.deptName}>{dept.name}</div>
                <div style={styles.deptCode}>{dept.code}</div>
              </div>
              <span style={styles.deptStaffCount}>{dept.staff_count} staff</span>
            </div>

            {expanded[`dept-${dept.id}`] && (
              <div style={styles.deptContent}>
                {/* Direct staff (no unit) */}
                {dept.direct_staff?.map(s => (
                  <StaffChip key={s.id} staff={s} />
                ))}

                {/* Units */}
                {dept.units?.map(unit => (
                  <div key={unit.id} style={styles.unitBlock}>
                    <div onClick={() => toggle(`unit-${unit.id}`)} style={styles.unitHeader}>
                      <span style={styles.toggleIconSm}>{expanded[`unit-${unit.id}`] ? '▾' : '▸'}</span>
                      <span style={styles.unitName}>{unit.name}</span>
                      <span style={styles.unitCode}>{unit.code}</span>
                    </div>
                    {expanded[`unit-${unit.id}`] && (
                      <div style={styles.unitStaff}>
                        {unit.staff?.length === 0 && <div style={styles.noStaff}>No staff assigned</div>}
                        {unit.staff?.map(s => <StaffChip key={s.id} staff={s} />)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={styles.legend}>
        {Object.entries(roleColors).map(([role, color]) => (
          <div key={role} style={styles.legendItem}>
            <span style={{ ...styles.legendDot, background: color }} />
            <span style={styles.legendLabel}>{role.replace('_', ' ')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StaffChip({ staff }) {
  const color = roleColors[staff.role] || roleColors.staff;
  return (
    <div style={styles.staffChip}>
      <div style={{ ...styles.chipAvatar, background: color }}>{staff.full_name[0]}</div>
      <div>
        <div style={styles.chipName}>{staff.full_name}</div>
        <div style={styles.chipTitle}>{staff.job_title}</div>
      </div>
      <span style={{ ...styles.chipRole, color, background: color + '18' }}>{staff.role.replace('_', ' ')}</span>
    </div>
  );
}

const styles = {
  page: { padding: '28px 32px' },
  loading: { padding: 40, color: '#586069' },
  header: { marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 700, color: '#0D1117', marginBottom: 4 },
  sub: { fontSize: 13, color: '#586069' },
  root: { background: '#006B3C', color: '#fff', borderRadius: 10, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, maxWidth: 500 },
  rootName: { fontSize: 15, fontWeight: 700 },
  rootSub: { fontSize: 12, opacity: 0.7, marginTop: 2 },
  tree: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 },
  deptBlock: { border: '1px solid #E2E6EA', borderRadius: 8, overflow: 'hidden', background: '#fff' },
  deptHeader: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer', background: '#F7F8FA', borderBottom: '1px solid #E2E6EA' },
  toggleIcon: { color: '#586069', fontSize: 14, width: 14 },
  deptInfo: { flex: 1 },
  deptName: { fontSize: 13, fontWeight: 700, color: '#0D1117' },
  deptCode: { fontSize: 11, color: '#8B949E', fontFamily: 'monospace' },
  deptStaffCount: { fontSize: 11, color: '#8B949E', background: '#E2E6EA', padding: '2px 8px', borderRadius: 10 },
  deptContent: { padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 },
  unitBlock: { border: '1px solid #E2E6EA', borderRadius: 6, overflow: 'hidden' },
  unitHeader: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'pointer', background: '#FAFBFC' },
  toggleIconSm: { color: '#8B949E', fontSize: 11, width: 12 },
  unitName: { flex: 1, fontSize: 12, fontWeight: 600, color: '#0D1117' },
  unitCode: { fontSize: 10, color: '#8B949E', fontFamily: 'monospace' },
  unitStaff: { padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 4 },
  noStaff: { fontSize: 12, color: '#8B949E', fontStyle: 'italic', padding: '4px 0' },
  staffChip: { display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 6, background: '#F7F8FA' },
  chipAvatar: { width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0 },
  chipName: { fontSize: 12, fontWeight: 600, color: '#0D1117', marginBottom: 1 },
  chipTitle: { fontSize: 11, color: '#8B949E' },
  chipRole: { fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, textTransform: 'capitalize', whiteSpace: 'nowrap', marginLeft: 'auto' },
  legend: { display: 'flex', flexWrap: 'wrap', gap: 12 },
  legendItem: { display: 'flex', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: '50%' },
  legendLabel: { fontSize: 12, color: '#586069', textTransform: 'capitalize' },
};
