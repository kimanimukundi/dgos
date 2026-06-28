import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { format } from 'date-fns';

const statusConfig = {
  open:        { color: '#E36209', bg: '#FFF5E0', label: 'Open' },
  assigned:    { color: '#0366D6', bg: '#EAF2FF', label: 'Assigned' },
  in_progress: { color: '#0366D6', bg: '#EAF2FF', label: 'In Progress' },
  resolved:    { color: '#28A745', bg: '#E8F5E9', label: 'Resolved' },
  closed:      { color: '#586069', bg: '#F0F2F5', label: 'Closed' },
  reopened:    { color: '#D73A49', bg: '#FFEEF0', label: 'Reopened' },
};
const priorityConfig = {
  low: { color: '#586069', bg: '#F0F2F5' }, medium: { color: '#0366D6', bg: '#EAF2FF' },
  high: { color: '#E36209', bg: '#FFF5E0' }, critical: { color: '#D73A49', bg: '#FFEEF0' },
};
const categoryLabels = { hardware: 'Hardware', software: 'Software', network: 'Network', access: 'Access & Accounts', other: 'Other' };

export default function TicketDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  const refresh = () => api.get(`/tickets/${id}`).then(r => setTicket(r.data));

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (ticket?.is_ict_agent) api.get('/tickets/meta/agents').then(r => setAgents(r.data));
  }, [ticket?.is_ict_agent]);

  if (loading) return <div style={styles.loading}>Loading ticket...</div>;
  if (!ticket) return <div style={styles.loading}>Ticket not found</div>;

  const s = statusConfig[ticket.status] || statusConfig.open;
  const p = priorityConfig[ticket.priority] || priorityConfig.medium;
  const isRequester = ticket.requester_id === user?.id;
  const isAgent = ticket.is_ict_agent;
  const canReopen = isRequester && ['resolved', 'closed'].includes(ticket.status);

  const updateStatus = async (status) => {
    if (status === 'resolved' && !resolutionNote.trim() && !ticket.resolution_note) {
      setError('A resolution note is required to resolve a ticket'); return;
    }
    setWorking(true); setError('');
    try {
      await api.patch(`/tickets/${id}`, { status, resolution_note: resolutionNote || undefined });
      await refresh();
      setResolutionNote('');
    } catch (err) { setError(err.response?.data?.error || 'Update failed'); }
    finally { setWorking(false); }
  };

  const reassign = async (agentId) => {
    setWorking(true); setError('');
    try {
      await api.patch(`/tickets/${id}`, { assigned_to: agentId || null });
      await refresh();
    } catch (err) { setError('Reassignment failed'); }
    finally { setWorking(false); }
  };

  const postComment = async () => {
    if (!comment.trim()) return;
    setWorking(true);
    try {
      await api.patch(`/tickets/${id}`, { comment });
      await refresh();
      setComment('');
    } catch (err) { setError('Failed to post comment'); }
    finally { setWorking(false); }
  };

  const reopen = async () => {
    if (!window.confirm('Reopen this ticket? ICT will be notified.')) return;
    setWorking(true); setError('');
    try {
      await api.patch(`/tickets/${id}`, { status: 'reopened' });
      await refresh();
    } catch (err) { setError(err.response?.data?.error || 'Reopen failed'); }
    finally { setWorking(false); }
  };

  return (
    <div style={styles.page}>
      <button onClick={() => navigate('/tickets')} style={styles.back}>← Back to Tickets</button>

      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <div style={styles.tags}>
              <span style={styles.ticketNum}>{ticket.ticket_number}</span>
              <span style={styles.categoryTag}>{categoryLabels[ticket.category]}</span>
              <span style={{ ...styles.priorityTag, background: p.bg, color: p.color }}>{ticket.priority?.toUpperCase()}</span>
            </div>
            <h1 style={styles.title}>{ticket.subject}</h1>
            <div style={styles.meta}>
              Requested by {ticket.requester_name} ({ticket.requester_department})
              {ticket.raised_by_name && ticket.raised_by_name !== ticket.requester_name && ` · Raised by ${ticket.raised_by_name}`}
            </div>
          </div>
          <span style={{ ...styles.statusBadge, background: s.bg, color: s.color }}>{s.label}</span>
        </div>

        <div style={styles.description}>{ticket.description}</div>

        <div style={styles.detailGrid}>
          <DetailItem label="Assigned To" value={ticket.assignee_name || 'Unassigned'} />
          <DetailItem label="Created" value={format(new Date(ticket.created_at), 'd MMM yyyy, HH:mm')} />
          {ticket.resolved_at && <DetailItem label="Resolved" value={format(new Date(ticket.resolved_at), 'd MMM yyyy, HH:mm')} />}
          {ticket.reopened_count > 0 && <DetailItem label="Reopened" value={`${ticket.reopened_count} time(s)`} />}
        </div>

        {ticket.resolution_note && (
          <div style={styles.resolutionNote}>
            <div style={styles.resolutionTitle}>✓ Resolution</div>
            <div style={styles.resolutionText}>{ticket.resolution_note}</div>
          </div>
        )}

        {error && <div style={{ ...styles.error, margin: '0 24px' }}>{error}</div>}

        {/* ICT Agent controls */}
        {isAgent && !['resolved', 'closed'].includes(ticket.status) && (
          <div style={styles.agentPanel}>
            <div style={styles.agentPanelTitle}>ICT Actions</div>

            <div style={styles.agentRow}>
              <label style={styles.smallLabel}>Reassign</label>
              <select value={ticket.assigned_to || ''} onChange={e => reassign(e.target.value || null)} disabled={working}>
                <option value="">— Unassigned —</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.full_name} ({a.open_count} open)</option>)}
              </select>
            </div>

            <div style={styles.agentRow}>
              <label style={styles.smallLabel}>Status</label>
              <div style={styles.statusBtns}>
                {ticket.status !== 'in_progress' && (
                  <button onClick={() => updateStatus('in_progress')} disabled={working} style={styles.statusBtn}>Mark In Progress</button>
                )}
              </div>
            </div>

            <div style={styles.agentRow}>
              <label style={styles.smallLabel}>Resolution Note (required to resolve)</label>
              <textarea value={resolutionNote} onChange={e => setResolutionNote(e.target.value)}
                placeholder="Describe how this was resolved..." rows={3} style={styles.textarea} />
            </div>
            <button onClick={() => updateStatus('resolved')} disabled={working} style={styles.resolveBtn}>
              {working ? 'Updating...' : '✓ Mark Resolved'}
            </button>
          </div>
        )}

        {isAgent && ticket.status === 'resolved' && (
          <div style={styles.agentPanel}>
            <button onClick={() => updateStatus('closed')} disabled={working} style={styles.closeBtn}>
              {working ? 'Closing...' : 'Close Ticket'}
            </button>
          </div>
        )}

        {canReopen && (
          <div style={styles.reopenZone}>
            <button onClick={reopen} disabled={working} style={styles.reopenBtn}>
              ↺ Reopen This Ticket
            </button>
          </div>
        )}

        {/* Comments */}
        <div style={styles.commentsSection}>
          <div style={styles.commentsTitle}>Comments</div>
          {ticket.comments?.length === 0 && <div style={styles.noComments}>No comments yet</div>}
          {ticket.comments?.map(c => (
            <div key={c.id} style={styles.comment}>
              <div style={styles.commentHeader}>
                <span style={styles.commentAuthor}>{c.author_name}</span>
                <span style={styles.commentTime}>{format(new Date(c.created_at), 'd MMM yyyy, HH:mm')}</span>
              </div>
              <div style={styles.commentText}>{c.comment}</div>
            </div>
          ))}
          {(isAgent || isRequester) && (
            <div style={styles.addComment}>
              <textarea value={comment} onChange={e => setComment(e.target.value)}
                placeholder="Add a comment..." rows={2} style={styles.textarea} />
              <button onClick={postComment} disabled={working || !comment.trim()} style={styles.commentBtn}>
                {working ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#8B949E', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, color: '#0D1117' }}>{value}</div>
    </div>
  );
}

const styles = {
  page: { padding: '28px 32px', maxWidth: 780 },
  loading: { padding: 40, color: '#586069' },
  back: { background: 'none', border: '1px solid #E2E6EA', color: '#586069', borderRadius: 6, padding: '7px 14px', fontSize: 13, cursor: 'pointer', marginBottom: 20 },
  container: { background: '#fff', border: '1px solid #E2E6EA', borderRadius: 10, overflow: 'hidden' },
  header: { padding: '20px 24px', borderBottom: '1px solid #E2E6EA', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#F7F8FA' },
  tags: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  ticketNum: { fontSize: 11, fontFamily: 'monospace', color: '#006B3C', fontWeight: 600 },
  categoryTag: { fontSize: 11, color: '#586069', background: '#F0F2F5', padding: '2px 8px', borderRadius: 10 },
  priorityTag: { fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, letterSpacing: '0.04em' },
  title: { fontSize: 18, fontWeight: 700, color: '#0D1117', marginBottom: 6 },
  meta: { fontSize: 12, color: '#586069' },
  statusBadge: { fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 10, flexShrink: 0, marginLeft: 16 },
  description: { padding: '16px 24px', fontSize: 13, color: '#586069', lineHeight: 1.7, borderBottom: '1px solid #E2E6EA', background: '#FAFBFC' },
  detailGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, padding: '16px 24px', borderBottom: '1px solid #E2E6EA' },
  resolutionNote: { margin: '16px 24px 0', padding: '12px 16px', background: '#E8F5E9', border: '1px solid #A8D5B5', borderRadius: 8 },
  resolutionTitle: { fontSize: 12, fontWeight: 700, color: '#28A745', marginBottom: 4 },
  resolutionText: { fontSize: 13, color: '#0D1117' },
  error: { background: '#FFEEF0', border: '1px solid #FDAEB7', color: '#D73A49', padding: '8px 12px', borderRadius: 5, fontSize: 12, marginTop: 12 },
  agentPanel: { padding: '16px 24px', borderTop: '1px solid #E2E6EA', background: '#F7F8FA' },
  agentPanelTitle: { fontSize: 13, fontWeight: 700, color: '#0D1117', marginBottom: 12 },
  agentRow: { marginBottom: 12 },
  smallLabel: { display: 'block', fontSize: 11, fontWeight: 600, color: '#586069', marginBottom: 6 },
  statusBtns: { display: 'flex', gap: 8 },
  statusBtn: { background: '#EAF2FF', color: '#0366D6', border: '1px solid #0366D6', borderRadius: 6, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  textarea: { width: '100%', resize: 'vertical' },
  resolveBtn: { background: '#006B3C', color: '#fff', border: 'none', borderRadius: 6, padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', marginTop: 8 },
  closeBtn: { background: '#F0F2F5', color: '#0D1117', border: '1px solid #E2E6EA', borderRadius: 6, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  reopenZone: { padding: '16px 24px', borderTop: '1px solid #E2E6EA', textAlign: 'center' },
  reopenBtn: { background: '#fff', border: '1px solid #D73A49', color: '#D73A49', borderRadius: 6, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  commentsSection: { padding: '16px 24px', borderTop: '1px solid #E2E6EA' },
  commentsTitle: { fontSize: 12, fontWeight: 700, color: '#586069', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 },
  noComments: { fontSize: 13, color: '#8B949E', fontStyle: 'italic', marginBottom: 12 },
  comment: { background: '#F7F8FA', borderRadius: 6, padding: '10px 12px', marginBottom: 8 },
  commentHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 },
  commentAuthor: { fontSize: 12, fontWeight: 700, color: '#0D1117' },
  commentTime: { fontSize: 11, color: '#8B949E' },
  commentText: { fontSize: 13, color: '#586069' },
  addComment: { marginTop: 12, borderTop: '1px solid #E2E6EA', paddingTop: 12 },
  commentBtn: { background: '#F0F2F5', border: '1px solid #E2E6EA', color: '#0D1117', borderRadius: 6, padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 8 },
};
