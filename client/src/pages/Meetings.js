import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { format } from 'date-fns';

const statusConfig = {
  scheduled: { color: '#0366D6', bg: '#EAF2FF', label: 'Scheduled' },
  completed: { color: '#28A745', bg: '#E8F5E9', label: 'Completed' },
  cancelled: { color: '#D73A49', bg: '#FFEEF0', label: 'Cancelled' },
};

export default function Meetings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  const canOrganise = ['supervisor', 'hod', 'director', 'system_admin'].includes(user?.role);

  useEffect(() => {
    Promise.all([api.get('/meetings'), api.get('/staff')])
      .then(([m, s]) => { setMeetings(m.data); setStaff(s.data); })
      .finally(() => setLoading(false));
  }, []);

  const upcoming = meetings.filter(m => m.status === 'scheduled');
  const past = meetings.filter(m => m.status !== 'scheduled');

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Meetings</h1>
          <div style={styles.sub}>Schedule, record minutes, and track action points</div>
        </div>
        {canOrganise && (
          <button onClick={() => setShowNew(!showNew)} style={styles.newBtn}>
            {showNew ? 'Cancel' : '+ Schedule Meeting'}
          </button>
        )}
      </div>

      {showNew && <NewMeetingForm staff={staff} onCreated={(m) => { setMeetings(prev => [m, ...prev]); setShowNew(false); navigate(`/meetings/${m.id}`); }} />}

      {loading && <div style={styles.loading}>Loading meetings...</div>}

      {!loading && upcoming.length > 0 && (
        <>
          <div style={styles.sectionLabel}>Upcoming</div>
          <div style={styles.list}>
            {upcoming.map(m => <MeetingRow key={m.id} m={m} onClick={() => navigate(`/meetings/${m.id}`)} />)}
          </div>
        </>
      )}

      {!loading && past.length > 0 && (
        <>
          <div style={styles.sectionLabel}>Past Meetings</div>
          <div style={styles.list}>
            {past.map(m => <MeetingRow key={m.id} m={m} onClick={() => navigate(`/meetings/${m.id}`)} />)}
          </div>
        </>
      )}

      {!loading && meetings.length === 0 && <div style={styles.empty}>No meetings scheduled</div>}
    </div>
  );
}

function MeetingRow({ m, onClick }) {
  const s = statusConfig[m.status] || statusConfig.scheduled;
  return (
    <div onClick={onClick} style={styles.row}>
      <div style={styles.rowLeft}>
        <div style={styles.refRow}>
          <span style={styles.refNum}>{m.reference_number}</span>
        </div>
        <div style={styles.meetingTitle}>{m.title}</div>
        <div style={styles.meetingMeta}>
          {format(new Date(m.meeting_date), 'EEEE, d MMMM yyyy')}
          {m.start_time && ` · ${m.start_time.slice(0,5)}${m.end_time ? `–${m.end_time.slice(0,5)}` : ''}`}
          {m.location && ` · ${m.location}`}
        </div>
      </div>
      <div style={styles.rowRight}>
        <span style={{ ...styles.statusBadge, background: s.bg, color: s.color }}>{s.label}</span>
        <div style={styles.attendeeCount}>{m.attendee_count} attendee{m.attendee_count !== '1' ? 's' : ''}</div>
      </div>
    </div>
  );
}

function NewMeetingForm({ staff, onCreated }) {
  const [form, setForm] = useState({ title: '', agenda: '', meeting_date: '', start_time: '', end_time: '', location: '' });
  const [selectedAttendees, setSelectedAttendees] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggleAttendee = (id) => setSelectedAttendees(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSubmit = async () => {
    if (!form.title || !form.meeting_date) { setError('Title and date are required'); return; }
    setSaving(true); setError('');
    try {
      const res = await api.post('/meetings', { ...form, attendee_ids: selectedAttendees });
      onCreated(res.data);
    } catch (err) { setError(err.response?.data?.error || 'Failed to schedule meeting'); }
    finally { setSaving(false); }
  };

  return (
    <div style={styles.form}>
      <div style={styles.formTitle}>Schedule New Meeting</div>
      {error && <div style={styles.error}>{error}</div>}
      <div style={styles.formGrid}>
        <div style={{ ...styles.field, gridColumn: '1 / -1' }}>
          <label style={styles.label}>Meeting Title</label>
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Q1 2025 Coordination Meeting" />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Date</label>
          <input type="date" value={form.meeting_date} onChange={e => setForm({ ...form, meeting_date: e.target.value })} />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Start Time</label>
          <input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>End Time</label>
          <input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} />
        </div>
        <div style={{ ...styles.field, gridColumn: '1 / -1' }}>
          <label style={styles.label}>Location</label>
          <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="e.g. Ministry Boardroom" />
        </div>
        <div style={{ ...styles.field, gridColumn: '1 / -1' }}>
          <label style={styles.label}>Agenda</label>
          <textarea value={form.agenda} onChange={e => setForm({ ...form, agenda: e.target.value })}
            placeholder="1. Item one&#10;2. Item two..." rows={4} style={styles.textarea} />
        </div>
        <div style={{ ...styles.field, gridColumn: '1 / -1' }}>
          <label style={styles.label}>Attendees ({selectedAttendees.length} selected)</label>
          <div style={styles.attendeeList}>
            {staff.map(s => (
              <label key={s.id} style={styles.attendeeItem}>
                <input type="checkbox" checked={selectedAttendees.includes(s.id)} onChange={() => toggleAttendee(s.id)}
                  style={{ width: 'auto', marginRight: 8 }} />
                <span>{s.full_name}</span>
                <span style={styles.attendeeTitle}>{s.job_title}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
      <button onClick={handleSubmit} disabled={saving} style={styles.submitBtn}>
        {saving ? 'Scheduling...' : 'Schedule Meeting'}
      </button>
    </div>
  );
}

const styles = {
  page: { padding: '28px 32px', maxWidth: 900 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 700, color: '#0D1117', marginBottom: 4 },
  sub: { fontSize: 13, color: '#586069' },
  newBtn: { background: '#006B3C', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  form: { background: '#fff', border: '1px solid #E2E6EA', borderRadius: 8, padding: '20px', marginBottom: 24 },
  formTitle: { fontSize: 14, fontWeight: 700, color: '#0D1117', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #E2E6EA' },
  error: { background: '#FFEEF0', border: '1px solid #FDAEB7', color: '#D73A49', padding: '8px 12px', borderRadius: 5, fontSize: 12, marginBottom: 12 },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 },
  field: { marginBottom: 4 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#0D1117', marginBottom: 6 },
  textarea: { width: '100%', resize: 'vertical' },
  attendeeList: { maxHeight: 180, overflowY: 'auto', border: '1px solid #E2E6EA', borderRadius: 6, padding: 4 },
  attendeeItem: { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', fontSize: 12, cursor: 'pointer' },
  attendeeTitle: { fontSize: 11, color: '#8B949E', marginLeft: 'auto' },
  submitBtn: { background: '#006B3C', color: '#fff', border: 'none', borderRadius: 6, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 12 },
  loading: { padding: 40, color: '#586069' },
  empty: { background: '#fff', border: '1px solid #E2E6EA', borderRadius: 8, padding: '48px', textAlign: 'center', color: '#8B949E' },
  sectionLabel: { fontSize: 12, fontWeight: 700, color: '#586069', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '20px 0 10px' },
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  row: { background: '#fff', border: '1px solid #E2E6EA', borderRadius: 8, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer' },
  rowLeft: { flex: 1 },
  rowRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 },
  refRow: { marginBottom: 4 },
  refNum: { fontSize: 11, fontFamily: 'monospace', color: '#006B3C', fontWeight: 600 },
  meetingTitle: { fontSize: 14, fontWeight: 600, color: '#0D1117', marginBottom: 3 },
  meetingMeta: { fontSize: 12, color: '#8B949E' },
  statusBadge: { fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 10 },
  attendeeCount: { fontSize: 11, color: '#8B949E' },
};
