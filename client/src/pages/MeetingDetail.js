import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { format } from 'date-fns';

export default function MeetingDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState(null);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [minutesDraft, setMinutesDraft] = useState('');
  const [savingMinutes, setSavingMinutes] = useState(false);
  const [showApForm, setShowApForm] = useState(false);
  const [error, setError] = useState('');

  const refresh = () => api.get(`/meetings/${id}`).then(r => { setMeeting(r.data); setMinutesDraft(r.data.minutes || ''); });

  useEffect(() => {
    refresh().finally(() => setLoading(false));
    api.get('/staff').then(r => setStaff(r.data));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const isOrganiser = meeting?.organiser_id === user?.id;

  const handleSaveMinutes = async () => {
    setSavingMinutes(true); setError('');
    try {
      await api.patch(`/meetings/${id}`, { minutes: minutesDraft, status: 'completed' });
      await refresh();
    } catch (err) { setError('Failed to save minutes'); }
    finally { setSavingMinutes(false); }
  };

  if (loading) return <div style={styles.loading}>Loading meeting...</div>;
  if (!meeting) return <div style={styles.loading}>Meeting not found</div>;

  return (
    <div style={styles.page}>
      <button onClick={() => navigate('/meetings')} style={styles.back}>← Back to Meetings</button>

      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <div style={styles.refNum}>{meeting.reference_number}</div>
            <h1 style={styles.title}>{meeting.title}</h1>
            <div style={styles.meta}>
              {format(new Date(meeting.meeting_date), 'EEEE, d MMMM yyyy')}
              {meeting.start_time && ` · ${meeting.start_time.slice(0,5)}${meeting.end_time ? `–${meeting.end_time.slice(0,5)}` : ''}`}
              {meeting.location && ` · ${meeting.location}`}
            </div>
            <div style={styles.organiser}>Organised by {meeting.organiser_name}</div>
          </div>
          <span style={{ ...styles.statusBadge, ...(meeting.status === 'completed' ? styles.statusCompleted : styles.statusScheduled) }}>
            {meeting.status === 'completed' ? 'Completed' : 'Scheduled'}
          </span>
        </div>

        {meeting.agenda && (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Agenda</div>
            <div style={styles.agendaText}>{meeting.agenda}</div>
          </div>
        )}

        <div style={styles.section}>
          <div style={styles.sectionTitle}>Attendees ({meeting.attendees?.length || 0})</div>
          <div style={styles.attendeeGrid}>
            {meeting.attendees?.map(a => (
              <div key={a.id} style={styles.attendeeChip}>
                <span style={styles.attendeeName}>{a.full_name}</span>
                <span style={{ ...styles.attendanceStatus, ...attendanceStyle(a.attendance_status) }}>
                  {a.attendance_status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionTitle}>Minutes</div>
          {!isOrganiser && (
            meeting.minutes
              ? <div style={styles.minutesText}>{meeting.minutes}</div>
              : <div style={styles.empty}>Minutes not yet recorded</div>
          )}
          {isOrganiser && (
            <div>
              <textarea value={minutesDraft} onChange={e => setMinutesDraft(e.target.value)}
                placeholder="Record the meeting minutes here..." rows={6} style={styles.minutesInput} />
              {error && <div style={styles.error}>{error}</div>}
              <button onClick={handleSaveMinutes} disabled={savingMinutes} style={styles.saveMinutesBtn}>
                {savingMinutes ? 'Saving...' : meeting.status === 'completed' ? 'Update Minutes' : 'Save Minutes & Mark Completed'}
              </button>
            </div>
          )}
        </div>

        <div style={styles.section}>
          <div style={styles.sectionHeaderRow}>
            <div style={styles.sectionTitle}>Action Points</div>
            {isOrganiser && (
              <button onClick={() => setShowApForm(!showApForm)} style={styles.addApBtn}>
                {showApForm ? 'Cancel' : '+ Add'}
              </button>
            )}
          </div>

          {showApForm && <ActionPointForm staff={staff} meetingId={id} onAdded={() => { refresh(); setShowApForm(false); }} />}

          {meeting.action_points?.length === 0 && <div style={styles.empty}>No action points recorded</div>}
          {meeting.action_points?.map(ap => (
            <div key={ap.id} style={styles.apRow}>
              <div style={styles.apDesc}>{ap.description}</div>
              <div style={styles.apMeta}>
                {ap.assignee_name && `Assigned to ${ap.assignee_name}`}
                {ap.deadline && ` · Due ${format(new Date(ap.deadline), 'd MMM yyyy')}`}
              </div>
              {ap.task_id && (
                <Link to={`/tasks/${ap.task_id}`} style={styles.apTaskLink}>
                  ↳ View as task {ap.task_status && `(${ap.task_status.replace('_',' ')})`}
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ActionPointForm({ staff, meetingId, onAdded }) {
  const [form, setForm] = useState({ description: '', assigned_to: '', deadline: '', create_task: true });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.description) return;
    setSaving(true);
    try {
      await api.post(`/meetings/${meetingId}/action-points`, form);
      onAdded();
    } finally { setSaving(false); }
  };

  return (
    <div style={styles.apForm}>
      <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
        placeholder="Action point description" style={{ marginBottom: 8 }} />
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <select value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} style={{ flex: 1 }}>
          <option value="">— Assign to —</option>
          {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
        </select>
        <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} style={{ width: 160 }} />
      </div>
      <label style={{ fontSize: 12, color: '#586069', display: 'flex', alignItems: 'center', marginBottom: 10 }}>
        <input type="checkbox" checked={form.create_task} onChange={e => setForm({ ...form, create_task: e.target.checked })}
          style={{ width: 'auto', marginRight: 6 }} />
        Also create a Task for this action point
      </label>
      <button onClick={handleSubmit} disabled={saving || !form.description} style={styles.submitApBtn}>
        {saving ? 'Adding...' : 'Add Action Point'}
      </button>
    </div>
  );
}

function attendanceStyle(status) {
  const map = {
    attended: { color: '#28A745', background: '#E8F5E9' },
    apologised: { color: '#E36209', background: '#FFF5E0' },
    absent: { color: '#D73A49', background: '#FFEEF0' },
    invited: { color: '#586069', background: '#F0F2F5' },
  };
  return map[status] || map.invited;
}

const styles = {
  page: { padding: '28px 32px', maxWidth: 800 },
  loading: { padding: 40, color: '#586069' },
  back: { background: 'none', border: '1px solid #E2E6EA', color: '#586069', borderRadius: 6, padding: '7px 14px', fontSize: 13, cursor: 'pointer', marginBottom: 20 },
  container: { background: '#fff', border: '1px solid #E2E6EA', borderRadius: 10, padding: '24px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #E2E6EA' },
  refNum: { fontSize: 11, fontFamily: 'monospace', color: '#006B3C', fontWeight: 600, marginBottom: 4 },
  title: { fontSize: 18, fontWeight: 700, color: '#0D1117', marginBottom: 6 },
  meta: { fontSize: 12, color: '#586069', marginBottom: 4 },
  organiser: { fontSize: 12, color: '#8B949E' },
  statusBadge: { fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 10, flexShrink: 0 },
  statusScheduled: { background: '#EAF2FF', color: '#0366D6' },
  statusCompleted: { background: '#E8F5E9', color: '#28A745' },
  section: { marginTop: 20, paddingTop: 16, borderTop: '1px solid #E2E6EA' },
  sectionHeaderRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: '#586069', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 },
  agendaText: { fontSize: 13, color: '#0D1117', lineHeight: 1.8, whiteSpace: 'pre-line' },
  attendeeGrid: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  attendeeChip: { display: 'flex', alignItems: 'center', gap: 6, background: '#F7F8FA', borderRadius: 16, padding: '5px 6px 5px 12px', fontSize: 12 },
  attendeeName: { color: '#0D1117' },
  attendanceStatus: { fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, textTransform: 'capitalize' },
  minutesText: { fontSize: 13, color: '#0D1117', lineHeight: 1.8, whiteSpace: 'pre-line', background: '#F7F8FA', padding: '14px', borderRadius: 6 },
  minutesInput: { width: '100%', resize: 'vertical', marginBottom: 10 },
  saveMinutesBtn: { background: '#006B3C', color: '#fff', border: 'none', borderRadius: 6, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  error: { background: '#FFEEF0', color: '#D73A49', padding: '8px 12px', borderRadius: 5, fontSize: 12, marginBottom: 10 },
  empty: { fontSize: 13, color: '#8B949E', fontStyle: 'italic' },
  addApBtn: { background: '#F0F2F5', border: 'none', color: '#0D1117', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  apForm: { background: '#F7F8FA', borderRadius: 8, padding: '14px', marginBottom: 12 },
  submitApBtn: { background: '#006B3C', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  apRow: { background: '#F7F8FA', borderRadius: 6, padding: '10px 14px', marginBottom: 8 },
  apDesc: { fontSize: 13, fontWeight: 500, color: '#0D1117', marginBottom: 4 },
  apMeta: { fontSize: 11, color: '#8B949E' },
  apTaskLink: { fontSize: 11, color: '#006B3C', fontWeight: 600, marginTop: 4, display: 'inline-block' },
};
