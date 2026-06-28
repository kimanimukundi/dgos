import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { format } from 'date-fns';
import DemoTooltip from '../components/DemoTooltip';

const urgencyConfig = {
  urgent: { color: '#D73A49', bg: '#FFEEF0', label: 'URGENT' },
  priority: { color: '#E36209', bg: '#FFF5E0', label: 'PRIORITY' },
  routine: { color: '#0366D6', bg: '#EAF2FF', label: 'ROUTINE' },
  confidential: { color: '#6F42C1', bg: '#F3EEFF', label: 'CONFIDENTIAL' },
};

export default function MemoView() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [memo, setMemo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [acknowledging, setAcknowledging] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/memos/${id}`)
      .then(r => {
        setMemo(r.data);
        if (r.data.my_status?.acknowledged_at) setAcknowledged(true);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleAcknowledge = async () => {
    setAcknowledging(true); setError('');
    try {
      await api.post(`/memos/${id}/acknowledge`, { comment });
      setAcknowledged(true);
      setMemo(prev => ({ ...prev, my_status: { ...prev.my_status, acknowledged_at: new Date(), delivery_status: 'acknowledged' } }));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to acknowledge');
    } finally {
      setAcknowledging(false);
    }
  };

  if (loading) return <div style={styles.loading}>Loading memo...</div>;
  if (!memo) return <div style={styles.loading}>Memo not found</div>;

  const urg = urgencyConfig[memo.urgency] || urgencyConfig.routine;
  const isSender = memo.sender_id === user?.id;
  const isRecipient = !!memo.my_status;
  const canAcknowledge = isRecipient && !acknowledged;

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <button onClick={() => navigate(-1)} style={styles.back}>← Back</button>
        <div style={styles.actions}>
          {isSender && (
            <button onClick={() => navigate(`/memos/${id}/tracking`)} style={styles.trackBtn}>
              View Tracking
            </button>
          )}
        </div>
      </div>

      <div style={styles.memoContainer}>
        {/* Official header */}
        <div style={styles.officialHeader}>
          <div style={styles.govBrand}>
            <span style={{ fontSize: 24 }}>🦁</span>
            <div>
              <div style={styles.govName}>Ministry of Tourism & Wildlife</div>
              <div style={styles.govSub}>Government of Kenya</div>
            </div>
          </div>
          <div style={styles.memoNumBadge}>
            <div style={styles.memoNumLabel}>OFFICIAL MEMO</div>
            <div style={styles.memoNumValue}>{memo.memo_number}</div>
          </div>
        </div>

        <div style={styles.memoBody}>
          {/* Urgency banner */}
          <div style={{ ...styles.urgencyBanner, background: urg.bg, borderLeft: `4px solid ${urg.color}` }}>
            <span style={{ ...styles.urgencyLabel, color: urg.color }}>{urg.label}</span>
            <span style={styles.urgencyClass}>{memo.classification?.toUpperCase()}</span>
          </div>

          {/* Meta grid */}
          <div style={styles.metaGrid}>
            <MetaRow label="TO" value={memo.recipients?.map(r => r.full_name).join(', ')} />
            <MetaRow label="FROM" value={`${memo.sender_name}, ${memo.sender_title}`} />
            <MetaRow label="DATE" value={memo.published_at ? format(new Date(memo.published_at), 'dd MMMM yyyy') : '—'} />
            <MetaRow label="SUBJECT" value={memo.subject} bold />
            {memo.reference_memo_number && (
              <MetaRow label="REF" value={`${memo.reference_memo_number}: ${memo.reference_memo_subject}`} />
            )}
          </div>

          <div style={styles.divider} />

          {/* Body */}
          <div style={styles.bodyText}>
            {memo.body?.split('\n').map((line, i) => (
              <p key={i} style={{ marginBottom: line ? 12 : 6 }}>{line || '\u00A0'}</p>
            ))}
          </div>

          {/* Action required */}
          {memo.action_required && (
            <div style={styles.actionBox}>
              <div style={styles.actionTitle}>⚡ Action Required</div>
              {memo.action_description && <div style={styles.actionDesc}>{memo.action_description}</div>}
              {memo.action_deadline && (
                <div style={styles.actionDeadline}>Deadline: {format(new Date(memo.action_deadline), 'dd MMMM yyyy')}</div>
              )}
            </div>
          )}

          <div style={styles.divider} />

          {/* Status trail */}
          <div style={styles.trail}>
            <TrailStep label="Delivered" time={memo.published_at} done />
            <TrailArrow />
            <TrailStep label="Opened" time={memo.my_status?.opened_at} done={!!memo.my_status?.opened_at} />
            <TrailArrow />
            <TrailStep label="Acknowledged" time={memo.my_status?.acknowledged_at} done={!!memo.my_status?.acknowledged_at} active={canAcknowledge} />
          </div>
        </div>

        {/* Acknowledgment action */}
        {isRecipient && (
          <div style={styles.ackZone}>
            {acknowledged ? (
              <div style={styles.ackDone}>
                <span style={styles.ackCheck}>✓</span>
                <div>
                  <div style={styles.ackDoneTitle}>You acknowledged this memo</div>
                  <div style={styles.ackDoneTime}>
                    {memo.my_status?.acknowledged_at ? format(new Date(memo.my_status.acknowledged_at), 'dd MMM yyyy, HH:mm') : ''}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div style={styles.ackPrompt}>
                  I confirm I have read and understood the contents of this memo.
                </div>
                <textarea
                  value={comment} onChange={e => setComment(e.target.value)}
                  placeholder="Optional comment (e.g. Noted, will action by Friday)"
                  style={{ ...styles.ackComment, resize: 'vertical' }}
                  rows={2}
                />
                {error && <div style={styles.error}>{error}</div>}
                <DemoTooltip id="acknowledge_memo" title="Official acknowledgment" body="Clicking this creates a permanent, timestamped record that you received and read this memo. This replaces the physical signature on a printed copy." position="top">
                  <button onClick={handleAcknowledge} disabled={acknowledging} style={styles.ackBtn}>
                    {acknowledging ? 'Acknowledging...' : '✓ Acknowledge Receipt'}
                  </button>
                </DemoTooltip>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MetaRow({ label, value, bold }) {
  return (
    <div style={styles.metaRow}>
      <span style={styles.metaLabel}>{label}</span>
      <span style={{ ...styles.metaValue, fontWeight: bold ? 700 : 500 }}>{value}</span>
    </div>
  );
}

function TrailStep({ label, time, done, active }) {
  return (
    <div style={styles.trailStep}>
      <div style={{ ...styles.trailDot, background: done ? '#28A745' : active ? '#006B3C' : '#E2E6EA', border: active && !done ? '2px solid #006B3C' : 'none' }}>
        {done && <span style={{ color: '#fff', fontSize: 10 }}>✓</span>}
      </div>
      <div style={styles.trailLabel}>{label}</div>
      {time && <div style={styles.trailTime}>{format(new Date(time), 'dd MMM, HH:mm')}</div>}
    </div>
  );
}

function TrailArrow() {
  return <div style={styles.trailArrow} />;
}

const styles = {
  page: { padding: '24px 32px', maxWidth: 860 },
  loading: { padding: 40, color: '#586069' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  back: { background: 'none', border: '1px solid #E2E6EA', color: '#586069', borderRadius: 6, padding: '7px 14px', fontSize: 13, cursor: 'pointer' },
  actions: { display: 'flex', gap: 8 },
  trackBtn: { background: '#006B3C', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  memoContainer: { background: '#fff', border: '1px solid #E2E6EA', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  officialHeader: { background: '#F7F8FA', borderBottom: '2px solid #006B3C', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  govBrand: { display: 'flex', alignItems: 'center', gap: 12 },
  govName: { fontSize: 14, fontWeight: 700, color: '#0D1117' },
  govSub: { fontSize: 12, color: '#586069' },
  memoNumBadge: { textAlign: 'right' },
  memoNumLabel: { fontSize: 10, color: '#8B949E', letterSpacing: '0.06em', fontWeight: 700 },
  memoNumValue: { fontSize: 15, fontWeight: 700, color: '#006B3C', fontFamily: 'monospace' },
  memoBody: { padding: '24px' },
  urgencyBanner: { padding: '10px 14px', borderRadius: 6, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  urgencyLabel: { fontSize: 12, fontWeight: 700, letterSpacing: '0.06em' },
  urgencyClass: { fontSize: 11, color: '#8B949E', fontWeight: 600 },
  metaGrid: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 },
  metaRow: { display: 'flex', gap: 16, fontSize: 13 },
  metaLabel: { width: 70, fontWeight: 700, color: '#586069', fontSize: 11, letterSpacing: '0.04em', flexShrink: 0, paddingTop: 1 },
  metaValue: { color: '#0D1117', flex: 1 },
  divider: { height: 1, background: '#E2E6EA', margin: '20px 0' },
  bodyText: { fontSize: 14, lineHeight: 1.8, color: '#0D1117' },
  actionBox: { background: '#FFF5E0', border: '1px solid #FFDF7E', borderRadius: 6, padding: '14px 16px', marginTop: 20 },
  actionTitle: { fontSize: 13, fontWeight: 700, color: '#E36209', marginBottom: 6 },
  actionDesc: { fontSize: 13, color: '#0D1117', marginBottom: 6 },
  actionDeadline: { fontSize: 12, color: '#E36209', fontWeight: 600 },
  trail: { display: 'flex', alignItems: 'center', gap: 0 },
  trailStep: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 },
  trailDot: { width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  trailLabel: { fontSize: 11, fontWeight: 600, color: '#586069' },
  trailTime: { fontSize: 10, color: '#8B949E', textAlign: 'center' },
  trailArrow: { height: 2, flex: 1, background: '#E2E6EA', marginBottom: 24 },
  ackZone: { background: '#F7F8FA', borderTop: '1px solid #E2E6EA', padding: '20px 24px' },
  ackPrompt: { fontSize: 13, color: '#0D1117', marginBottom: 12, fontStyle: 'italic' },
  ackComment: { marginBottom: 12, fontSize: 13 },
  ackBtn: { background: '#006B3C', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer', width: '100%' },
  ackDone: { display: 'flex', alignItems: 'center', gap: 14 },
  ackCheck: { width: 40, height: 40, borderRadius: '50%', background: '#28A745', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 },
  ackDoneTitle: { fontSize: 14, fontWeight: 700, color: '#28A745' },
  ackDoneTime: { fontSize: 12, color: '#8B949E' },
  error: { background: '#FFEEF0', border: '1px solid #FDAEB7', color: '#D73A49', padding: '8px 12px', borderRadius: 5, fontSize: 12, marginBottom: 10 },
};
