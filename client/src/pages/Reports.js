import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { format, formatDistanceToNow } from 'date-fns';

const ACTION_LABELS = {
  login: 'Signed in', open_memo: 'Opened memo', acknowledge_memo: 'Acknowledged memo',
  publish_memo: 'Published memo', create_staff: 'Created staff account',
  change_password: 'Changed password', initiate_workflow: 'Initiated workflow',
  complete_workflow: 'Workflow completed', reject_workflow: 'Workflow rejected',
  create_task: 'Created task', update_task_status: 'Updated task status',
};

export default function Reports() {
  const [tab, setTab] = useState('memo-ack');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [auditFilters, setAuditFilters] = useState({ staff_id: '', action: '', entity_type: '' });

  useEffect(() => { api.get('/staff').then(r => setStaffList(r.data)); }, []);

  useEffect(() => { loadReport(tab); }, [tab]);

  const loadReport = async (reportTab, params = {}) => {
    setLoading(true); setData(null);
    try {
      let endpoint = '';
      if (reportTab === 'memo-ack') endpoint = '/reports/memo-acknowledgment';
      else if (reportTab === 'workflow') endpoint = '/reports/workflow-performance';
      else if (reportTab === 'tasks') endpoint = '/reports/task-completion';
      else if (reportTab === 'activity') endpoint = '/reports/staff-activity';
      else if (reportTab === 'audit') endpoint = '/reports/audit-log';
      const res = await api.get(endpoint, { params });
      setData(res.data);
    } catch (err) { setData({ error: 'Failed to load report' }); }
    finally { setLoading(false); }
  };

  const tabs = [
    { key: 'memo-ack', label: '📨 Memo Acknowledgment' },
    { key: 'workflow', label: '🔁 Workflow Performance' },
    { key: 'tasks', label: '✔ Task Completion' },
    { key: 'activity', label: '👤 Staff Activity' },
    { key: 'audit', label: '🔍 Audit Log' },
  ];

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Reports & Analytics</h1>
        <div style={styles.sub}>Operational intelligence for Ministry management</div>
      </div>

      <div style={styles.tabs} data-tour="report-tabs">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ ...styles.tab, ...(tab === t.key ? styles.tabActive : {}) }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && <div style={styles.loading}>Loading report...</div>}
      {data?.error && <div style={styles.error}>{data.error}</div>}

      {!loading && data && (
        <>
          {tab === 'memo-ack' && <MemoAckReport data={data} />}
          {tab === 'workflow' && <WorkflowReport data={data} />}
          {tab === 'tasks' && <TaskReport data={data} />}
          {tab === 'activity' && <ActivityReport data={data} />}
          {tab === 'audit' && (
            <><div data-tour="audit-log-section" style={{ height: 0 }} /><AuditLog data={data} staffList={staffList} filters={auditFilters}
              onFilter={(f) => { setAuditFilters(f); loadReport('audit', f); }} /></>
          )}
        </>
      )}
    </div>
  );
}

function MemoAckReport({ data }) {
  const overall = data.length > 0
    ? Math.round(data.reduce((sum, m) => sum + parseFloat(m.ack_rate || 0), 0) / data.length)
    : 0;
  return (
    <div>
      <div style={styles.summaryRow}>
        <SummaryCard label="Total Memos" value={data.length} color="#006B3C" />
        <SummaryCard label="Avg Acknowledgment Rate" value={`${overall}%`} color={overall > 75 ? '#28A745' : '#E36209'} />
        <SummaryCard label="Fully Acknowledged" value={data.filter(m => parseFloat(m.ack_rate) === 100).length} color="#28A745" />
        <SummaryCard label="Below 50% Ack." value={data.filter(m => parseFloat(m.ack_rate) < 50).length} color="#D73A49" />
      </div>
      <div style={styles.tableWrap}>
        <div style={styles.tableHead}>
          <span style={{ flex: 1.2 }}>Memo No.</span>
          <span style={{ flex: 3 }}>Subject</span>
          <span style={{ flex: 1 }}>Urgency</span>
          <span style={{ flex: 1 }}>Recipients</span>
          <span style={{ flex: 1 }}>Acknowledged</span>
          <span style={{ flex: 1 }}>Rate</span>
          <span style={{ flex: 1.2 }}>Date</span>
        </div>
        {data.map(m => (
          <div key={m.id} style={styles.tableRow}>
            <span style={{ flex: 1.2, fontSize: 11, fontFamily: 'monospace', color: '#006B3C' }}>{m.memo_number}</span>
            <div style={{ flex: 3 }}>
              <div style={styles.cellTitle}>{m.subject}</div>
              <div style={styles.cellSub}>{m.sender_name}</div>
            </div>
            <span style={{ flex: 1, fontSize: 12, color: '#586069', textTransform: 'capitalize' }}>{m.urgency}</span>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{m.total_recipients}</span>
            <span style={{ flex: 1, fontSize: 13, color: '#28A745', fontWeight: 600 }}>{m.acknowledged}</span>
            <div style={{ flex: 1 }}>
              <div style={styles.miniBar}>
                <div style={{ ...styles.miniBarFill, width: `${m.ack_rate}%`, background: m.ack_rate >= 75 ? '#28A745' : m.ack_rate >= 50 ? '#E36209' : '#D73A49' }} />
              </div>
              <span style={{ fontSize: 11, color: '#586069' }}>{m.ack_rate}%</span>
            </div>
            <span style={{ flex: 1.2, fontSize: 11, color: '#8B949E' }}>{format(new Date(m.published_at), 'd MMM yyyy')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkflowReport({ data }) {
  return (
    <div>
      <div style={styles.summaryRow}>
        {data.template_stats?.map(t => (
          <SummaryCard key={t.id} label={t.name} value={`${t.completed}/${t.total}`}
            sub={`avg ${t.avg_hours_to_complete || '—'}h`} color="#006B3C" />
        ))}
      </div>
      <div style={styles.sectionLabel}>Step Bottleneck Analysis</div>
      <div style={styles.tableWrap}>
        <div style={styles.tableHead}>
          <span style={{ flex: 2 }}>Workflow Type</span>
          <span style={{ flex: 2 }}>Step</span>
          <span style={{ flex: 1 }}>Completed</span>
          <span style={{ flex: 1 }}>Pending</span>
          <span style={{ flex: 1.5 }}>Avg Hours</span>
        </div>
        {data.step_stats?.map((s, i) => (
          <div key={i} style={styles.tableRow}>
            <span style={{ flex: 2, fontSize: 12, color: '#586069' }}>{s.template_name}</span>
            <div style={{ flex: 2 }}>
              <span style={styles.cellTitle}>{s.step_label}</span>
              <span style={{ fontSize: 11, color: '#8B949E', marginLeft: 6 }}>Step {s.step_order}</span>
            </div>
            <span style={{ flex: 1, fontSize: 13, color: '#28A745', fontWeight: 600 }}>{s.actioned}</span>
            <span style={{ flex: 1, fontSize: 13, color: s.pending > 0 ? '#E36209' : '#586069', fontWeight: 600 }}>{s.pending}</span>
            <span style={{ flex: 1.5, fontSize: 13, color: s.avg_hours > 48 ? '#D73A49' : '#0D1117', fontWeight: 600 }}>
              {s.avg_hours ? `${s.avg_hours}h` : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TaskReport({ data }) {
  return (
    <div>
      <div style={styles.summaryRow}>
        {data.by_department?.slice(0,4).map((d, i) => (
          <SummaryCard key={i} label={d.department_name || 'Unknown'} value={`${d.completion_rate}%`}
            sub={`${d.completed}/${d.total} completed`} color={d.completion_rate >= 75 ? '#28A745' : '#E36209'} />
        ))}
      </div>
      <div style={styles.sectionLabel}>Department Breakdown</div>
      <div style={styles.tableWrap}>
        <div style={styles.tableHead}>
          <span style={{ flex: 2 }}>Department</span>
          <span style={{ flex: 1 }}>Total</span>
          <span style={{ flex: 1 }}>Completed</span>
          <span style={{ flex: 1 }}>Overdue</span>
          <span style={{ flex: 1 }}>In Progress</span>
          <span style={{ flex: 1.5 }}>Completion Rate</span>
        </div>
        {data.by_department?.map((d, i) => (
          <div key={i} style={styles.tableRow}>
            <span style={{ flex: 2, fontSize: 13, fontWeight: 500 }}>{d.department_name || '—'}</span>
            <span style={{ flex: 1, fontSize: 13 }}>{d.total}</span>
            <span style={{ flex: 1, fontSize: 13, color: '#28A745', fontWeight: 600 }}>{d.completed}</span>
            <span style={{ flex: 1, fontSize: 13, color: '#D73A49', fontWeight: 600 }}>{d.overdue}</span>
            <span style={{ flex: 1, fontSize: 13, color: '#0366D6' }}>{d.in_progress}</span>
            <div style={{ flex: 1.5 }}>
              <div style={styles.miniBar}>
                <div style={{ ...styles.miniBarFill, width: `${d.completion_rate}%`, background: d.completion_rate >= 75 ? '#28A745' : '#E36209' }} />
              </div>
              <span style={{ fontSize: 11 }}>{d.completion_rate}%</span>
            </div>
          </div>
        ))}
      </div>
      {data.overdue_tasks?.length > 0 && (
        <>
          <div style={styles.sectionLabel}>Overdue Tasks</div>
          <div style={styles.tableWrap}>
            <div style={styles.tableHead}>
              <span style={{ flex: 2.5 }}>Task</span>
              <span style={{ flex: 1.5 }}>Assignee</span>
              <span style={{ flex: 1 }}>Priority</span>
              <span style={{ flex: 1 }}>Deadline</span>
              <span style={{ flex: 1 }}>Days Overdue</span>
            </div>
            {data.overdue_tasks.map(t => (
              <div key={t.id} style={{ ...styles.tableRow, background: '#FFFAFA' }}>
                <div style={{ flex: 2.5 }}>
                  <div style={styles.cellTitle}>{t.title}</div>
                  <div style={styles.cellSub}>Assigned by {t.assigned_by_name}</div>
                </div>
                <div style={{ flex: 1.5 }}>
                  <div style={styles.cellTitle}>{t.assignee_name}</div>
                  <div style={styles.cellSub}>{t.department_name}</div>
                </div>
                <span style={{ flex: 1, fontSize: 12, textTransform: 'capitalize', color: '#E36209' }}>{t.priority}</span>
                <span style={{ flex: 1, fontSize: 12, color: '#D73A49' }}>{format(new Date(t.deadline), 'd MMM yyyy')}</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#D73A49' }}>{t.days_overdue}d</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ActivityReport({ data }) {
  const now = new Date();
  const inactive = data.filter(s => !s.last_active || (now - new Date(s.last_active)) > 7 * 24 * 3600000);
  return (
    <div>
      <div style={styles.summaryRow}>
        <SummaryCard label="Active Staff" value={data.length} color="#006B3C" />
        <SummaryCard label="Inactive 7+ Days" value={inactive.length} color="#D73A49" />
        <SummaryCard label="Total Logins (30d)" value={data.reduce((s, r) => s + parseInt(r.logins_30d), 0)} color="#0366D6" />
        <SummaryCard label="Memos Acknowledged (30d)" value={data.reduce((s, r) => s + parseInt(r.memos_acked_30d), 0)} color="#28A745" />
      </div>
      <div style={styles.tableWrap}>
        <div style={styles.tableHead}>
          <span style={{ flex: 2 }}>Staff Member</span>
          <span style={{ flex: 2 }}>Department</span>
          <span style={{ flex: 1 }}>Role</span>
          <span style={{ flex: 1.5 }}>Last Active</span>
          <span style={{ flex: 1 }}>Logins (30d)</span>
          <span style={{ flex: 1 }}>Memos Acked</span>
        </div>
        {data.map(s => {
          const isInactive = !s.last_active || (now - new Date(s.last_active)) > 7 * 24 * 3600000;
          return (
            <div key={s.id} style={styles.tableRow}>
              <div style={{ flex: 2 }}>
                <div style={styles.cellTitle}>{s.full_name}</div>
                <div style={styles.cellSub}>{s.job_title}</div>
              </div>
              <span style={{ flex: 2, fontSize: 12, color: '#586069' }}>{s.department_name}</span>
              <span style={{ flex: 1, fontSize: 11, color: '#586069', textTransform: 'capitalize' }}>{s.role?.replace('_',' ')}</span>
              <span style={{ flex: 1.5, fontSize: 12, color: isInactive ? '#D73A49' : '#28A745' }}>
                {s.last_active ? formatDistanceToNow(new Date(s.last_active), { addSuffix: true }) : 'Never'}
              </span>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{s.logins_30d}</span>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#28A745' }}>{s.memos_acked_30d}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AuditLog({ data, staffList, filters, onFilter }) {
  const [f, setF] = useState(filters);
  return (
    <div>
      <div style={styles.auditFilters}>
        <select value={f.staff_id} onChange={e => setF({ ...f, staff_id: e.target.value })} style={styles.filterSelect}>
          <option value="">All staff</option>
          {staffList.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
        </select>
        <select value={f.entity_type} onChange={e => setF({ ...f, entity_type: e.target.value })} style={styles.filterSelect}>
          <option value="">All types</option>
          <option value="memo">Memos</option>
          <option value="workflow">Workflows</option>
          <option value="task">Tasks</option>
          <option value="staff">Staff</option>
        </select>
        <button onClick={() => onFilter(f)} style={styles.filterBtn}>Apply Filter</button>
        <button onClick={() => { const empty = { staff_id: '', action: '', entity_type: '' }; setF(empty); onFilter(empty); }} style={styles.clearBtn}>Clear</button>
      </div>
      <div style={styles.tableWrap}>
        <div style={styles.tableHead}>
          <span style={{ flex: 1.5 }}>When</span>
          <span style={{ flex: 2 }}>Who</span>
          <span style={{ flex: 2 }}>Action</span>
          <span style={{ flex: 3 }}>Detail</span>
        </div>
        {data.length === 0 && <div style={{ padding: '24px', textAlign: 'center', color: '#8B949E' }}>No entries found</div>}
        {data.map(entry => {
          const validDate = entry.created_at && !isNaN(new Date(entry.created_at).getTime());
          return (
          <div key={entry.id} style={styles.tableRow}>
            <div style={{ flex: 1.5 }}>
              <div style={styles.cellTitle}>{validDate ? format(new Date(entry.created_at), 'd MMM yyyy') : '—'}</div>
              <div style={styles.cellSub}>{validDate ? format(new Date(entry.created_at), 'HH:mm:ss') : ''}</div>
            </div>
            <div style={{ flex: 2 }}>
              <div style={styles.cellTitle}>{entry.actor_name}</div>
              <div style={styles.cellSub}>{entry.actor_department}</div>
            </div>
            <span style={{ flex: 2, fontSize: 12, color: '#0D1117' }}>{ACTION_LABELS[entry.action] || entry.action}</span>
            <div style={{ flex: 3 }}>
              {entry.entity_label && <div style={styles.cellTitle}>{entry.entity_label}</div>}
              <div style={styles.cellSub}>{entry.entity_type}{entry.entity_id ? ` #${entry.entity_id}` : ''}</div>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, sub, color }) {
  return (
    <div style={styles.summaryCard}>
      <div style={{ ...styles.summaryValue, color }}>{value}</div>
      <div style={styles.summaryLabel}>{label}</div>
      {sub && <div style={styles.summarySub}>{sub}</div>}
    </div>
  );
}

const styles = {
  page: { padding: '28px 32px' },
  header: { marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 700, color: '#0D1117', marginBottom: 4 },
  sub: { fontSize: 13, color: '#586069' },
  tabs: { display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap', borderBottom: '2px solid #E2E6EA' },
  tab: { background: 'none', border: 'none', padding: '8px 14px 10px', fontSize: 13, fontWeight: 500, color: '#586069', cursor: 'pointer', borderBottom: '2px solid transparent', marginBottom: -2 },
  tabActive: { color: '#006B3C', borderBottomColor: '#006B3C', fontWeight: 700 },
  loading: { padding: 40, color: '#586069' },
  error: { background: '#FFEEF0', color: '#D73A49', padding: '12px 16px', borderRadius: 6, fontSize: 13 },
  summaryRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 },
  summaryCard: { background: '#fff', border: '1px solid #E2E6EA', borderRadius: 8, padding: '16px', textAlign: 'center' },
  summaryValue: { fontSize: 26, fontWeight: 700, lineHeight: 1, marginBottom: 4 },
  summaryLabel: { fontSize: 12, color: '#586069' },
  summarySub: { fontSize: 11, color: '#8B949E', marginTop: 2 },
  sectionLabel: { fontSize: 12, fontWeight: 700, color: '#586069', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '20px 0 10px' },
  tableWrap: { background: '#fff', border: '1px solid #E2E6EA', borderRadius: 8, overflow: 'hidden', marginBottom: 16 },
  tableHead: { display: 'flex', padding: '10px 16px', background: '#F7F8FA', borderBottom: '1px solid #E2E6EA', fontSize: 11, fontWeight: 700, color: '#586069', textTransform: 'uppercase', letterSpacing: '0.04em', gap: 8 },
  tableRow: { display: 'flex', alignItems: 'flex-start', padding: '11px 16px', borderBottom: '1px solid #F0F2F5', gap: 8 },
  cellTitle: { fontSize: 13, fontWeight: 500, color: '#0D1117' },
  cellSub: { fontSize: 11, color: '#8B949E', marginTop: 1 },
  miniBar: { height: 4, background: '#E2E6EA', borderRadius: 2, width: 80, marginBottom: 2 },
  miniBarFill: { height: '100%', borderRadius: 2 },
  auditFilters: { display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' },
  filterSelect: { width: 180 },
  filterBtn: { background: '#006B3C', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  clearBtn: { background: '#fff', border: '1px solid #E2E6EA', color: '#586069', borderRadius: 6, padding: '8px 14px', fontSize: 13, cursor: 'pointer' },
};
