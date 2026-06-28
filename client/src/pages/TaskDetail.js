import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { format } from 'date-fns';

const priorityConfig = {
  low: { color: '#586069', bg: '#F0F2F5' }, normal: { color: '#0366D6', bg: '#EAF2FF' },
  high: { color: '#E36209', bg: '#FFF5E0' }, critical: { color: '#D73A49', bg: '#FFEEF0' },
};
const statusConfig = {
  pending: { color: '#586069', bg: '#F0F2F5', label: 'Pending' },
  in_progress: { color: '#0366D6', bg: '#EAF2FF', label: 'In Progress' },
  completed: { color: '#28A745', bg: '#E8F5E9', label: 'Completed' },
  overdue: { color: '#D73A49', bg: '#FFEEF0', label: 'Overdue' },
};

export default function TaskDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [completionNote, setCompletionNote] = useState('');
  const [newSubtask, setNewSubtask] = useState('');
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [commenting, setCommenting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/tasks/${id}`).then(r => setTask(r.data)).finally(() => setLoading(false));
  }, [id]);

  const refresh = () => api.get(`/tasks/${id}`).then(r => setTask(r.data));

  const handleStatusUpdate = async (status) => {
    if (status === 'completed' && !completionNote.trim()) {
      setError('A completion note is required'); return;
    }
    setCompleting(true); setError('');
    try {
      await api.patch(`/tasks/${id}`, { status, completion_note: completionNote });
      await refresh();
      setCompletionNote('');
    } catch (err) {
      setError(err.response?.data?.error || 'Update failed');
    } finally { setCompleting(false); }
  };

  const handleComment = async () => {
    if (!comment.trim()) return;
    setCommenting(true);
    try {
      await api.patch(`/tasks/${id}`, { comment });
      await refresh();
      setComment('');
    } catch (err) { setError('Failed to post comment'); }
    finally { setCommenting(false); }
  };

  const handleAddSubtask = async () => {
    if (!newSubtask.trim()) return;
    setAddingSubtask(true);
    try {
      await api.post(`/tasks/${id}/subtasks`, { title: newSubtask });
      await refresh();
      setNewSubtask('');
    } catch (err) { setError('Failed to add subtask'); }
    finally { setAddingSubtask(false); }
  };

  const handleToggleSubtask = async (subtaskId, completed) => {
    try {
      await api.patch(`/tasks/subtasks/${subtaskId}`, { completed: !completed });
      await refresh();
    } catch (err) { setError('Failed to update subtask'); }
  };

  if (loading) return <div style={styles.loading}>Loading task...</div>;
  if (!task) return <div style={styles.loading}>Task not found</div>;

  const isAssignee = task.assigned_to === user?.id;
  const isAssigner = task.assigned_by === user?.id;
  const isActive = ['pending', 'in_progress', 'overdue'].includes(task.status);
  const p = priorityConfig[task.priority] || priorityConfig.normal;
  const s = statusConfig[task.status] || statusConfig.pending;

  return (
    <div style={styles.page}>
      <button onClick={() => navigate('/tasks')} style={styles.back}>← Back to Tasks</button>
      <div style={styles.container}>
        <div style={styles.taskHeader}>
          <div>
            <div style={styles.tags}>
              <span style={{ ...styles.priorityTag, background: p.bg, color: p.color }}>{task.priority?.toUpperCase()}</span>
              {task.workflow_ref && <span style={styles.wfTag}>↳ {task.workflow_ref}</span>}
            </div>
            <h1 style={styles.title}>{task.title}</h1>
            <div style={styles.meta}>
              Assigned by {task.assigned_by_name} &nbsp;·&nbsp; To: {task.assignee_name}
              {task.assignee_department && ` · ${task.assignee_department}`}
            </div>
          </div>
          <span style={{ ...styles.statusBadge, background: s.bg, color: s.color }}>{s.label}</span>
        </div>

        {task.description && (
          <div style={styles.description}>{task.description}</div>
        )}

        {task.linked_assets?.length > 0 && (
          <div style={styles.assetsBlock}>
            <div style={styles.assetsTitle}>🗂 Linked Assets</div>
            {task.linked_assets.map(a => (
              <Link key={a.id} to={`/assets/${a.id}`} style={styles.assetLink}>
                <span style={styles.assetTag}>{a.asset_tag}</span>
                <span>{a.name}</span>
              </Link>
            ))}
          </div>
        )}

        <div style={styles.detailGrid}>
          <DetailItem label="Deadline" value={task.deadline ? format(new Date(task.deadline), 'dd MMMM yyyy') : '—'} />
          <DetailItem label="Created" value={format(new Date(task.created_at), 'dd MMM yyyy')} />
          {task.completed_at && <DetailItem label="Completed" value={format(new Date(task.completed_at), 'dd MMM yyyy, HH:mm')} />}
          {task.workflow_title && <DetailItem label="Linked Workflow" value={task.workflow_title} />}
        </div>

        {task.completion_note && (
          <div style={styles.completionNote}>
            <div style={styles.completionNoteTitle}>✓ Completion Note</div>
            <div style={styles.completionNoteText}>{task.completion_note}</div>
          </div>
        )}

        {/* Status actions for assignee */}
        {isAssignee && isActive && (
          <div style={styles.actionPanel}>
            <div style={styles.actionTitle}>Update Task</div>
            {task.status === 'pending' && (
              <button onClick={() => handleStatusUpdate('in_progress')} style={styles.startBtn}>
                Mark as In Progress
              </button>
            )}
            {['in_progress', 'overdue', 'pending'].includes(task.status) && (
              <div style={styles.completeSection}>
                <label style={styles.label}>Completion Note (required)</label>
                <textarea value={completionNote} onChange={e => setCompletionNote(e.target.value)}
                  placeholder="Describe what was done and any evidence of completion..."
                  rows={3} style={styles.textarea} />
                {error && <div style={styles.error}>{error}</div>}
                <button onClick={() => handleStatusUpdate('completed')} disabled={completing} style={styles.completeBtn}>
                  {completing ? 'Marking complete...' : '✓ Mark as Complete'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Subtasks */}
        <div style={styles.subtasksSection}>
          <div style={styles.subtasksTitle}>
            Subtasks {task.subtasks?.length > 0 && `(${task.subtasks.filter(s => s.completed).length}/${task.subtasks.length})`}
          </div>
          {task.subtasks?.map(st => (
            <label key={st.id} style={styles.subtaskRow}>
              <input type="checkbox" checked={st.completed} onChange={() => handleToggleSubtask(st.id, st.completed)}
                style={{ width: 'auto', marginRight: 10 }} />
              <span style={{ ...styles.subtaskText, ...(st.completed ? styles.subtaskDone : {}) }}>{st.title}</span>
            </label>
          ))}
          {(isAssignee || isAssigner) && (
            <div style={styles.addSubtask}>
              <input value={newSubtask} onChange={e => setNewSubtask(e.target.value)}
                placeholder="Add a subtask..." onKeyDown={e => e.key === 'Enter' && handleAddSubtask()} />
              <button onClick={handleAddSubtask} disabled={addingSubtask || !newSubtask.trim()} style={styles.addSubtaskBtn}>+</button>
            </div>
          )}
        </div>

        {/* Comments */}
        <div style={styles.commentsSection}>
          <div style={styles.commentsTitle}>Comments & Updates</div>
          {task.comments?.length === 0 && <div style={styles.noComments}>No comments yet</div>}
          {task.comments?.map(c => (
            <div key={c.id} style={styles.comment}>
              <div style={styles.commentHeader}>
                <span style={styles.commentAuthor}>{c.author_name}</span>
                <span style={styles.commentTime}>{format(new Date(c.created_at), 'dd MMM yyyy, HH:mm')}</span>
              </div>
              <div style={styles.commentText}>{c.comment}</div>
            </div>
          ))}
          {(isAssignee || isAssigner) && (
            <div style={styles.addComment}>
              <textarea value={comment} onChange={e => setComment(e.target.value)}
                placeholder="Add a comment or update..." rows={2} style={styles.textarea} />
              <button onClick={handleComment} disabled={commenting || !comment.trim()} style={styles.commentBtn}>
                {commenting ? 'Posting...' : 'Post Comment'}
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: '#8B949E', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      <span style={{ fontSize: 13, color: '#0D1117' }}>{value}</span>
    </div>
  );
}

const styles = {
  page: { padding: '28px 32px', maxWidth: 780 },
  loading: { padding: 40, color: '#586069' },
  back: { background: 'none', border: '1px solid #E2E6EA', color: '#586069', borderRadius: 6, padding: '7px 14px', fontSize: 13, cursor: 'pointer', marginBottom: 20 },
  container: { background: '#fff', border: '1px solid #E2E6EA', borderRadius: 10, overflow: 'hidden' },
  taskHeader: { padding: '20px 24px', borderBottom: '1px solid #E2E6EA', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#F7F8FA' },
  tags: { display: 'flex', gap: 8, marginBottom: 8 },
  priorityTag: { fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, letterSpacing: '0.04em' },
  wfTag: { fontSize: 11, color: '#8B949E', fontFamily: 'monospace' },
  title: { fontSize: 18, fontWeight: 700, color: '#0D1117', marginBottom: 6 },
  meta: { fontSize: 12, color: '#586069' },
  statusBadge: { fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 10, flexShrink: 0, marginLeft: 16 },
  description: { padding: '16px 24px', fontSize: 13, color: '#586069', lineHeight: 1.7, borderBottom: '1px solid #E2E6EA', background: '#FAFBFC' },
  assetsBlock: { padding: '12px 24px', borderBottom: '1px solid #E2E6EA' },
  assetsTitle: { fontSize: 12, fontWeight: 700, color: '#586069', marginBottom: 8 },
  assetLink: { display: 'flex', gap: 10, alignItems: 'center', padding: '7px 12px', background: '#F7F8FA', borderRadius: 6, marginBottom: 4, fontSize: 13, color: '#0D1117', textDecoration: 'none' },
  assetTag: { fontFamily: 'monospace', fontSize: 11, color: '#006B3C' },
  subtasksSection: { padding: '16px 24px', borderBottom: '1px solid #E2E6EA' },
  subtasksTitle: { fontSize: 12, fontWeight: 700, color: '#586069', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 },
  subtaskRow: { display: 'flex', alignItems: 'center', padding: '6px 0', cursor: 'pointer' },
  subtaskText: { fontSize: 13, color: '#0D1117' },
  subtaskDone: { textDecoration: 'line-through', color: '#8B949E' },
  addSubtask: { display: 'flex', gap: 8, marginTop: 8 },
  addSubtaskBtn: { background: '#006B3C', color: '#fff', border: 'none', borderRadius: 6, width: 32, fontSize: 16, fontWeight: 700, cursor: 'pointer' },
  detailGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, padding: '16px 24px', borderBottom: '1px solid #E2E6EA' },
  completionNote: { margin: '0 24px 0', padding: '12px 16px', background: '#E8F5E9', border: '1px solid #A8D5B5', borderRadius: 8 },
  completionNoteTitle: { fontSize: 12, fontWeight: 700, color: '#28A745', marginBottom: 4 },
  completionNoteText: { fontSize: 13, color: '#0D1117' },
  actionPanel: { padding: '16px 24px', borderTop: '1px solid #E2E6EA', background: '#F7F8FA' },
  actionTitle: { fontSize: 13, fontWeight: 700, color: '#0D1117', marginBottom: 12 },
  startBtn: { background: '#EAF2FF', color: '#0366D6', border: '1px solid #0366D6', borderRadius: 6, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 12 },
  completeSection: { marginTop: 8 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#0D1117', marginBottom: 6 },
  textarea: { width: '100%', resize: 'vertical', marginBottom: 10 },
  error: { background: '#FFEEF0', border: '1px solid #FDAEB7', color: '#D73A49', padding: '8px 12px', borderRadius: 5, fontSize: 12, marginBottom: 8 },
  completeBtn: { background: '#006B3C', color: '#fff', border: 'none', borderRadius: 6, padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  commentsSection: { padding: '16px 24px', borderTop: '1px solid #E2E6EA' },
  commentsTitle: { fontSize: 12, fontWeight: 700, color: '#586069', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 },
  noComments: { fontSize: 13, color: '#8B949E', fontStyle: 'italic', marginBottom: 12 },
  comment: { background: '#F7F8FA', borderRadius: 6, padding: '10px 12px', marginBottom: 8 },
  commentHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 },
  commentAuthor: { fontSize: 12, fontWeight: 700, color: '#0D1117' },
  commentTime: { fontSize: 11, color: '#8B949E' },
  commentText: { fontSize: 13, color: '#586069' },
  addComment: { marginTop: 12, borderTop: '1px solid #E2E6EA', paddingTop: 12 },
  commentBtn: { background: '#F0F2F5', border: '1px solid #E2E6EA', color: '#0D1117', borderRadius: 6, padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
};
