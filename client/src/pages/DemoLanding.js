import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DEMO_ROLES } from '../utils/demoContent';

export default function DemoLanding() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState('');

  const handleRoleSelect = async (role) => {
    setLoading(role.id); setError('');
    try {
      await login(role.email, role.password);
      // Signal to App that tour should start for this role
      localStorage.setItem('dgos_demo_role', role.id);
      localStorage.setItem('dgos_start_tour', role.id);
      navigate('/');
    } catch {
      setError('Login failed — please try again');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <div style={styles.govBadge}>
          <span style={styles.govEmoji}>🦁</span>
          <div>
            <div style={styles.govName}>Ministry of Tourism & Wildlife</div>
            <div style={styles.govSub}>Government of Kenya</div>
          </div>
        </div>
        <h1 style={styles.title}>Digital Government Operations System</h1>
        <p style={styles.subtitle}>
          A working prototype replacing printed memos, paper approvals, and physical filing
          with a single accountable digital platform.
        </p>
        <div style={styles.demoBadge}>🔬 Interactive Prototype — fictional data only</div>
      </div>

      <div style={styles.roleSection}>
        <div style={styles.roleHeading}>Choose a role to explore</div>
        <div style={styles.roleSubheading}>
          Each role shows a different perspective. Pick one and a guided tour will walk you through its key features.
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.roleGrid}>
          {DEMO_ROLES.map(role => (
            <button key={role.id} onClick={() => handleRoleSelect(role)}
              disabled={loading !== null}
              style={{ ...styles.roleCard, ...(loading === role.id ? styles.roleCardLoading : {}) }}>
              <div style={{ ...styles.roleEmoji, background: role.color + '18' }}>{role.emoji}</div>
              <div style={styles.roleInfo}>
                <div style={{ ...styles.roleLabel, color: role.color }}>{role.tagline}</div>
                <div style={styles.roleName}>{role.name}</div>
                <div style={styles.roleDept}>{role.title} · {role.department}</div>
                <div style={styles.roleDesc}>{role.description}</div>
                <div style={styles.highlights}>
                  {role.highlights.map((h, i) => (
                    <span key={i} style={styles.highlightTag}>✓ {h}</span>
                  ))}
                </div>
              </div>
              <div style={{ ...styles.enterBtn, background: loading === role.id ? '#8B949E' : role.color }}>
                {loading === role.id ? 'Logging in...' : 'Explore →'}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div style={styles.footer}>
        <div style={styles.footerGrid}>
          <FooterItem icon="🔒" label="Fictional data only" text="No real Ministry staff data. All names, memos, and records are for demonstration." />
          <FooterItem icon="🔄" label="Fully interactive" text="Send memos, approve workflows, raise tickets. Everything works and persists across roles." />
          <FooterItem icon="🏛" label="Built for Kenya" text="Designed for the Kenyan government context — memo culture, approval hierarchies, institutional accountability." />
        </div>
        <div style={styles.footerNote}>React · Node.js · PostgreSQL · Ministry of Tourism & Wildlife Kenya</div>
      </div>
    </div>
  );
}

function FooterItem({ icon, label, text }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 28, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>{text}</div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#F7F8FA', fontFamily: "'Inter', -apple-system, sans-serif" },
  hero: { background: 'linear-gradient(135deg, #003d24 0%, #006B3C 60%, #008847 100%)', color: '#fff', padding: '56px 40px 64px', textAlign: 'center' },
  govBadge: { display: 'inline-flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.12)', borderRadius: 40, padding: '10px 20px', marginBottom: 28 },
  govEmoji: { fontSize: 28 },
  govName: { fontSize: 15, fontWeight: 700, textAlign: 'left' },
  govSub: { fontSize: 12, opacity: 0.7 },
  title: { fontSize: 36, fontWeight: 800, lineHeight: 1.2, margin: '0 auto 16px', maxWidth: 680 },
  subtitle: { fontSize: 16, opacity: 0.85, maxWidth: 560, margin: '0 auto 24px', lineHeight: 1.6 },
  demoBadge: { display: 'inline-block', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 20, padding: '6px 16px', fontSize: 13, fontWeight: 500 },
  roleSection: { maxWidth: 1000, margin: '0 auto', padding: '48px 24px 32px' },
  roleHeading: { fontSize: 24, fontWeight: 800, color: '#0D1117', textAlign: 'center', marginBottom: 8 },
  roleSubheading: { fontSize: 15, color: '#586069', textAlign: 'center', marginBottom: 36, maxWidth: 520, margin: '0 auto 36px' },
  error: { background: '#FFEEF0', border: '1px solid #FDAEB7', color: '#D73A49', padding: '10px 16px', borderRadius: 8, fontSize: 13, marginBottom: 20, textAlign: 'center' },
  roleGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 },
  roleCard: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', background: '#fff', border: '2px solid #E2E6EA', borderRadius: 12, padding: '20px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', fontFamily: 'inherit' },
  roleCardLoading: { opacity: 0.6, cursor: 'not-allowed' },
  roleEmoji: { width: 52, height: 52, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, marginBottom: 14 },
  roleInfo: { flex: 1, marginBottom: 16 },
  roleLabel: { fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 },
  roleName: { fontSize: 15, fontWeight: 700, color: '#0D1117', marginBottom: 2 },
  roleDept: { fontSize: 11, color: '#8B949E', marginBottom: 10 },
  roleDesc: { fontSize: 13, color: '#586069', lineHeight: 1.5, marginBottom: 12 },
  highlights: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  highlightTag: { fontSize: 11, color: '#28A745', background: '#E8F5E9', padding: '2px 8px', borderRadius: 10, fontWeight: 500 },
  enterBtn: { alignSelf: 'stretch', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 700, cursor: 'pointer', textAlign: 'center' },
  footer: { background: '#0D1117', color: '#fff', padding: '48px 40px 32px' },
  footerGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32, maxWidth: 900, margin: '0 auto 40px' },
  footerNote: { textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.3)' },
};
