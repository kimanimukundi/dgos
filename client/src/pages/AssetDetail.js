import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { format } from 'date-fns';

const statusConfig = {
  in_use: { color: '#28A745', bg: '#E8F5E9', label: 'In Use' },
  in_storage: { color: '#586069', bg: '#F0F2F5', label: 'In Storage' },
  under_repair: { color: '#E36209', bg: '#FFF5E0', label: 'Under Repair' },
  disposed: { color: '#D73A49', bg: '#FFEEF0', label: 'Disposed' },
};

export default function AssetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/assets/${id}`).then(r => setAsset(r.data)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={styles.loading}>Loading asset...</div>;
  if (!asset) return <div style={styles.loading}>Asset not found</div>;

  const s = statusConfig[asset.status] || statusConfig.in_use;

  return (
    <div style={styles.page}>
      <button onClick={() => navigate('/assets')} style={styles.back}>← Back to Asset Registry</button>

      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <div style={styles.tag}>{asset.asset_tag}</div>
            <h1 style={styles.title}>{asset.name}</h1>
            <div style={styles.meta}>{asset.category_name} {asset.serial_number && `· S/N: ${asset.serial_number}`}</div>
          </div>
          <span style={{ ...styles.statusBadge, background: s.bg, color: s.color }}>{s.label}</span>
        </div>

        {asset.description && <div style={styles.description}>{asset.description}</div>}

        <div style={styles.detailGrid}>
          <DetailItem label="Condition" value={asset.condition?.replace('_', ' ')} />
          <DetailItem label="Department" value={asset.department_name || '—'} />
          <DetailItem label="Custodian" value={asset.custodian_name || '—'} />
          <DetailItem label="Location" value={asset.location || '—'} />
          <DetailItem label="Purchase Date" value={asset.purchase_date ? format(new Date(asset.purchase_date), 'd MMM yyyy') : '—'} />
          <DetailItem label="Purchase Value" value={asset.purchase_value ? `KES ${parseFloat(asset.purchase_value).toLocaleString()}` : '—'} />
          <DetailItem label="Current Value" value={asset.current_value ? `KES ${parseFloat(asset.current_value).toLocaleString()}` : '—'} />
          {asset.disposed_at && <DetailItem label="Disposed On" value={format(new Date(asset.disposed_at), 'd MMM yyyy')} />}
        </div>

        {asset.disposal_ref && (
          <div onClick={() => navigate(`/workflows/${asset.disposal_workflow_id}`)} style={styles.linkedCard}>
            🗑 Disposed via <strong>{asset.disposal_ref}</strong> — {asset.disposal_title}
          </div>
        )}

        {asset.workflows?.length > 0 && (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Linked Workflows</div>
            {asset.workflows.map(w => (
              <div key={w.id} onClick={() => navigate(`/workflows/${w.id}`)} style={styles.linkRow}>
                <span style={styles.linkRef}>{w.reference_number}</span>
                <span>{w.title}</span>
              </div>
            ))}
          </div>
        )}

        {asset.tasks?.length > 0 && (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Linked Tasks</div>
            {asset.tasks.map(t => (
              <div key={t.id} onClick={() => navigate(`/tasks/${t.id}`)} style={styles.linkRow}>
                <span>{t.title}</span>
                <span style={{ fontSize: 11, color: '#8B949E', textTransform: 'capitalize' }}>{t.status?.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        )}

        <div style={styles.section}>
          <div style={styles.sectionTitle}>Asset History</div>
          {asset.history?.length === 0 && <div style={styles.empty}>No history recorded</div>}
          {asset.history?.map(h => (
            <div key={h.id} style={styles.historyRow}>
              <div style={styles.historyDot} />
              <div style={{ flex: 1 }}>
                <div style={styles.historyEvent}>{h.event?.replace('_', ' ')}</div>
                {h.detail && <div style={styles.historyDetail}>{h.detail}</div>}
                <div style={styles.historyMeta}>
                  {h.actor_name} · {format(new Date(h.created_at), 'd MMM yyyy, HH:mm')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#8B949E', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, color: '#0D1117', textTransform: 'capitalize' }}>{value}</div>
    </div>
  );
}

const styles = {
  page: { padding: '28px 32px', maxWidth: 760 },
  loading: { padding: 40, color: '#586069' },
  back: { background: 'none', border: '1px solid #E2E6EA', color: '#586069', borderRadius: 6, padding: '7px 14px', fontSize: 13, cursor: 'pointer', marginBottom: 20 },
  container: { background: '#fff', border: '1px solid #E2E6EA', borderRadius: 10, padding: '24px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #E2E6EA' },
  tag: { fontSize: 11, fontFamily: 'monospace', color: '#006B3C', fontWeight: 600, marginBottom: 4 },
  title: { fontSize: 18, fontWeight: 700, color: '#0D1117', marginBottom: 4 },
  meta: { fontSize: 12, color: '#586069' },
  statusBadge: { fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 10, flexShrink: 0 },
  description: { fontSize: 13, color: '#586069', lineHeight: 1.6, marginBottom: 20 },
  detailGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 },
  linkedCard: { background: '#FFF5E0', border: '1px solid #FFDF7E', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#0D1117', cursor: 'pointer', marginBottom: 16 },
  section: { marginTop: 20, paddingTop: 16, borderTop: '1px solid #E2E6EA' },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: '#586069', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 },
  linkRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#F7F8FA', borderRadius: 6, marginBottom: 6, cursor: 'pointer', fontSize: 13 },
  linkRef: { fontFamily: 'monospace', fontSize: 11, color: '#006B3C', marginRight: 10 },
  empty: { fontSize: 13, color: '#8B949E', fontStyle: 'italic' },
  historyRow: { display: 'flex', gap: 10, marginBottom: 12 },
  historyDot: { width: 8, height: 8, borderRadius: '50%', background: '#006B3C', marginTop: 5, flexShrink: 0 },
  historyEvent: { fontSize: 13, fontWeight: 600, color: '#0D1117', textTransform: 'capitalize' },
  historyDetail: { fontSize: 12, color: '#586069', marginTop: 2 },
  historyMeta: { fontSize: 11, color: '#8B949E', marginTop: 2 },
};
