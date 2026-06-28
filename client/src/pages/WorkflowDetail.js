import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { format } from 'date-fns';
import DemoTooltip from '../components/DemoTooltip';

const statusConfig = {
  in_progress: { color: '#0366D6', bg: '#EAF2FF', label: 'In Progress' },
  completed:   { color: '#28A745', bg: '#E8F5E9', label: 'Completed' },
  rejected:    { color: '#D73A49', bg: '#FFEEF0', label: 'Rejected' },
  withdrawn:   { color: '#586069', bg: '#F0F2F5', label: 'Withdrawn' },
};

// eslint-disable-next-line no-unused-vars
const actionColors = {
  approved: { color: '#28A745', bg: '#E8F5E9', icon: '✓' },
  rejected: { color: '#D73A49', bg: '#FFEEF0', icon: '✕' },
  pending:  { color: '#8B949E', bg: '#F0F2F5', icon: '…' },
};

export default function WorkflowDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [workflow, setWorkflow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/workflows/${id}`).then(r => setWorkflow(r.data)).finally(() => setLoading(false));
  }, [id]);

  const handleAction = async (action) => {
    if (action === 'rejected' && !comment.trim()) {
      setError('A comment is required when rejecting'); return;
    }
    setActing(true); setError('');
    try {
      await api.post(`/workflows/${id}/action`, { action, comment });
      const res = await api.get(`/workflows/${id}`);
      setWorkflow(res.data);
      setComment('');
    } catch (err) {
      setError(err.response?.data?.error || 'Action failed');
    } finally { setActing(false); }
  };

  const handleWithdraw = async () => {
    if (!window.confirm('Withdraw this request? This cannot be undone.')) return;
    setWithdrawing(true); setError('');
    try {
      await api.post(`/workflows/${id}/withdraw`);
      const res = await api.get(`/workflows/${id}`);
      setWorkflow(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Withdraw failed');
    } finally { setWithdrawing(false); }
  };

  if (loading) return <div style={styles.loading}>Loading workflow...</div>;
  if (!workflow) return <div style={styles.loading}>Workflow not found</div>;

  const s = statusConfig[workflow.status] || statusConfig.in_progress;
  const canAct = !!workflow.my_pending_step;
  const isInitiator = workflow.initiator_id === user?.id;
  const totalSteps = parseInt(workflow.total_steps);

  return (
    <div style={styles.page}>
      <button onClick={() => navigate('/workflows')} style={styles.back}>← Back to Workflows</button>

      <div style={styles.container}>
        {/* Header */}
        <div style={styles.wfHeader}>
          <div style={styles.wfHeaderLeft}>
            <div style={styles.refNum}>{workflow.reference_number}</div>
            <h1 style={styles.title}>{workflow.title}</h1>
            <div style={styles.meta}>
              <span>{workflow.template_name}</span>
              <span style={styles.dot}>·</span>
              <span>Initiated by {workflow.initiator_name}</span>
              <span style={styles.dot}>·</span>
              <span>{workflow.initiator_department}</span>
              <span style={styles.dot}>·</span>
              <span>{format(new Date(workflow.created_at), 'dd MMM yyyy')}</span>
            </div>
          </div>
          <span style={{ ...styles.statusBadge, background: s.bg, color: s.color }}>{s.label}</span>
        </div>

        {/* Description */}
        {workflow.description && (
          <div style={styles.description}>{workflow.description}</div>
        )}

        {workflow.linked_assets?.length > 0 && (
          <div style={styles.assetsSection} data-tour="linked-assets">
            <div style={styles.assetsSectionTitle}>🗂 Linked Assets ({workflow.linked_assets.length})</div>
            {workflow.linked_assets.map(a => (
              <Link key={a.id} to={`/assets/${a.id}`} style={styles.assetLinkRow}>
                <span style={styles.assetLinkTag}>{a.asset_tag}</span>
                <span style={{ flex: 1 }}>{a.name}</span>
                <span style={styles.assetLinkCondition}>{a.condition?.replace('_', ' ')}</span>
              </Link>
            ))}
          </div>
        )}

        {/* Step progress */}
        <div style={styles.stepsSection}>
          <div style={styles.sectionTitle}>Approval Chain</div>
          <div style={styles.stepsTrail}>
            {workflow.template_steps?.map((ts, i) => {
              const stepAction = workflow.steps?.find(s => s.step_order === ts.step_order);
              const isCurrent = ts.step_order === workflow.current_step && workflow.status === 'in_progress';
              const isDone = stepAction?.action === 'approved';
              const isRejected = stepAction?.action === 'rejected';
              const isPending = !stepAction?.action && stepAction?.assigned_to;

              return (
                <React.Fragment key={ts.id}>
                  <div style={{ ...styles.step, ...(isCurrent ? styles.stepCurrent : {}), ...(isDone ? styles.stepDone : {}), ...(isRejected ? styles.stepRejected : {}) }}>
                    <div style={{ ...styles.stepNum,
                      background: isDone ? '#28A745' : isRejected ? '#D73A49' : isCurrent ? '#006B3C' : '#E2E6EA',
                      color: isDone || isRejected || isCurrent ? '#fff' : '#8B949E'
                    }}>
                      {isDone ? '✓' : isRejected ? '✕' : ts.step_order}
                    </div>
                    <div style={styles.stepBody}>
                      <div style={styles.stepLabel}>{ts.label}</div>
                      {stepAction?.assignee_name && (
                        <div style={styles.stepAssignee}>{stepAction.assignee_name}</div>
                      )}
                      {stepAction?.actioned_at && (
                        <div style={styles.stepTime}>{format(new Date(stepAction.actioned_at), 'dd MMM yyyy, HH:mm')}</div>
                      )}
                      {stepAction?.comment && (
                        <div style={styles.stepComment}>"{stepAction.comment}"</div>
                      )}
                      {isCurrent && isPending && (
                        <div style={styles.stepSla}>
                          SLA: {stepAction?.sla_deadline ? format(new Date(stepAction.sla_deadline), 'dd MMM, HH:mm') : '—'}
                        </div>
                      )}
                    </div>
                  </div>
                  {i < totalSteps - 1 && <div style={styles.stepConnector} />}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Action panel */}
        {canAct && workflow.status === 'in_progress' && (
          <div style={styles.actionPanel}>
            <div style={styles.actionTitle}>
              Your Action Required — <em>{workflow.my_pending_step.step_label}</em>
            </div>
            <textarea value={comment} onChange={e => setComment(e.target.value)}
              placeholder="Comment (required for rejection, optional for approval)"
              rows={3} style={styles.commentBox} />
            {error && <div style={styles.error}>{error}</div>}
            <div style={styles.actionBtns}>
              <button onClick={() => handleAction('rejected')} disabled={acting} style={styles.rejectBtn}>
                ✕ Reject
              </button>
              <DemoTooltip id="workflow_approve" title="Your approval is permanent" body="This action is timestamped and recorded in the audit trail. The workflow automatically advances to the next step and the next approver is notified." position="top">
                <button onClick={() => handleAction('approved')} disabled={acting} style={styles.approveBtn}>
                  {acting ? 'Processing...' : '✓ Approve'}
                </button>
              </DemoTooltip>
            </div>
          </div>
        )}

        {workflow.status === 'completed' && (
          <div style={styles.completedBanner}>
            ✓ This workflow was completed on {workflow.completed_at ? format(new Date(workflow.completed_at), 'dd MMMM yyyy') : '—'}
          </div>
        )}

        {workflow.status === 'rejected' && (
          <div style={styles.rejectedBanner}>
            ✕ This workflow was rejected. The initiator has been notified.
          </div>
        )}

        {workflow.status === 'withdrawn' && (
          <div style={styles.withdrawnBanner}>
            ↩ This request was withdrawn by the initiator.
          </div>
        )}

        {isInitiator && workflow.status === 'in_progress' && (
          <div style={styles.withdrawZone}>
            {error && !canAct && <div style={styles.error}>{error}</div>}
            <button onClick={handleWithdraw} disabled={withdrawing} style={styles.withdrawBtn}>
              {withdrawing ? 'Withdrawing...' : 'Withdraw Request'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: { padding: '28px 32px', maxWidth: 800 },
  loading: { padding: 40, color: '#586069' },
  back: { background: 'none', border: '1px solid #E2E6EA', color: '#586069', borderRadius: 6, padding: '7px 14px', fontSize: 13, cursor: 'pointer', marginBottom: 20 },
  container: { background: '#fff', border: '1px solid #E2E6EA', borderRadius: 10, overflow: 'hidden' },
  wfHeader: { padding: '20px 24px', borderBottom: '1px solid #E2E6EA', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#F7F8FA' },
  wfHeaderLeft: { flex: 1 },
  refNum: { fontSize: 11, fontFamily: 'monospace', color: '#006B3C', fontWeight: 600, marginBottom: 4 },
  title: { fontSize: 18, fontWeight: 700, color: '#0D1117', marginBottom: 8 },
  meta: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#586069', flexWrap: 'wrap' },
  dot: { color: '#C8CDD4' },
  statusBadge: { fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 10, flexShrink: 0, marginLeft: 16 },
  description: { padding: '16px 24px', fontSize: 13, color: '#586069', lineHeight: 1.7, borderBottom: '1px solid #E2E6EA', background: '#FAFBFC' },
  stepsSection: { padding: '20px 24px' },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: '#586069', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 },
  stepsTrail: { display: 'flex', flexDirection: 'column', gap: 0 },
  step: { display: 'flex', gap: 14, padding: '12px', borderRadius: 8, border: '1px solid transparent' },
  stepCurrent: { background: '#F7FFFE', border: '1px solid #006B3C' },
  stepDone: { background: '#F7FFF9' },
  stepRejected: { background: '#FFF5F5' },
  stepNum: { width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0, marginTop: 2 },
  stepBody: { flex: 1 },
  stepLabel: { fontSize: 13, fontWeight: 700, color: '#0D1117', marginBottom: 2 },
  stepAssignee: { fontSize: 12, color: '#586069' },
  stepTime: { fontSize: 11, color: '#8B949E', marginTop: 2 },
  stepComment: { fontSize: 12, color: '#586069', fontStyle: 'italic', marginTop: 6, background: '#F7F8FA', padding: '6px 10px', borderRadius: 5 },
  stepSla: { fontSize: 11, color: '#E36209', fontWeight: 600, marginTop: 4 },
  stepConnector: { width: 2, height: 16, background: '#E2E6EA', marginLeft: 22 },
  actionPanel: { margin: '0 24px 24px', background: '#F7F8FA', border: '1px solid #E2E6EA', borderRadius: 8, padding: '16px' },
  actionTitle: { fontSize: 13, fontWeight: 600, color: '#0D1117', marginBottom: 12 },
  commentBox: { width: '100%', resize: 'vertical', marginBottom: 12, fontSize: 13 },
  error: { background: '#FFEEF0', border: '1px solid #FDAEB7', color: '#D73A49', padding: '8px 12px', borderRadius: 5, fontSize: 12, marginBottom: 10 },
  actionBtns: { display: 'flex', gap: 10, justifyContent: 'flex-end' },
  approveBtn: { background: '#006B3C', color: '#fff', border: 'none', borderRadius: 6, padding: '9px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  rejectBtn: { background: '#fff', border: '1px solid #D73A49', color: '#D73A49', borderRadius: 6, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  completedBanner: { margin: '0 24px 24px', background: '#E8F5E9', border: '1px solid #A8D5B5', color: '#28A745', padding: '12px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600 },
  rejectedBanner: { margin: '0 24px 24px', background: '#FFEEF0', border: '1px solid #FDAEB7', color: '#D73A49', padding: '12px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600 },
  withdrawnBanner: { margin: '0 24px 24px', background: '#F0F2F5', border: '1px solid #E2E6EA', color: '#586069', padding: '12px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600 },
  assetsSection: { padding: '0 24px 16px' },
  assetsSectionTitle: { fontSize: 12, fontWeight: 700, color: '#586069', marginBottom: 8 },
  assetLinkRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#F7F8FA', borderRadius: 6, marginBottom: 4, fontSize: 13, color: '#0D1117', textDecoration: 'none' },
  assetLinkTag: { fontFamily: 'monospace', fontSize: 11, color: '#006B3C' },
  assetLinkCondition: { fontSize: 11, color: '#8B949E', textTransform: 'capitalize' },
  withdrawZone: { padding: '0 24px 24px', textAlign: 'right' },
  withdrawBtn: { background: '#fff', border: '1px solid #C8CDD4', color: '#586069', borderRadius: 6, padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
};
