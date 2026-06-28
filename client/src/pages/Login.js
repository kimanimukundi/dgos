import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DEMO_ROLES } from '../utils/demoContent';

// Map email to tour role id
const EMAIL_TO_ROLE = {
  'cs@tourism.go.ke': 'cs',
  'director.finance@tourism.go.ke': 'hod_finance',
  'director.ict@tourism.go.ke': 'ict_director',
  'dennis.kiprop@tourism.go.ke': 'ict_admin',
  'mary.achieng@tourism.go.ke': 'staff',
  'auditor@tourism.go.ke': 'auditor',
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAccounts, setShowAccounts] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const user = await login(email, password);
      // Set tour role if this is a known demo account and tour not yet done
      const roleId = EMAIL_TO_ROLE[email.toLowerCase()];
      if (roleId) {
        localStorage.setItem('dgos_demo_role', roleId);
        const tourDone = localStorage.getItem(`dgos_tour_done_${roleId}`);
        if (!tourDone) {
          localStorage.setItem('dgos_start_tour', roleId);
        }
      }
      if (user.must_change_password) navigate('/change-password');
      else navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials');
    } finally { setLoading(false); }
  };

  const quickLogin = (role) => {
    setEmail(role.email);
    setPassword('password');
    setShowAccounts(false);
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.crest}>🦁</div>
          <div>
            <div style={styles.ministry}>Ministry of Tourism & Wildlife</div>
            <div style={styles.system}>Digital Government Operations System</div>
          </div>
        </div>
        <div style={styles.divider} />

        <h2 style={styles.title}>Staff Login</h2>
        <p style={styles.subtitle}>Access is restricted to authorised Ministry staff only.</p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label style={styles.label}>Work Email Address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="yourname@tourism.go.ke" required autoFocus />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password" required />
          </div>
          <button type="submit" disabled={loading}
            style={loading ? styles.btnDisabled : styles.btn}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Demo accounts section */}
        <div style={styles.demoSection}>
          <button onClick={() => setShowAccounts(!showAccounts)} style={styles.demoToggle}>
            {showAccounts ? '▾' : '▸'} Demo accounts — click to fill credentials
          </button>
          {showAccounts && (
            <div style={styles.accountsList}>
              {DEMO_ROLES.map(role => (
                <button key={role.id} onClick={() => quickLogin(role)} style={styles.accountBtn}>
                  <span style={styles.accountEmoji}>{role.emoji}</span>
                  <div style={styles.accountInfo}>
                    <div style={styles.accountTitle}>{role.title}</div>
                    <div style={styles.accountEmail}>{role.email}</div>
                  </div>
                  <span style={styles.accountFill}>Fill →</span>
                </button>
              ))}
              <div style={styles.passwordNote}>Password for all accounts: <code>password</code></div>
            </div>
          )}
        </div>

        <div style={styles.help}>
          Forgot your password? Contact the ICT Directorate for assistance.
        </div>
      </div>
      <div style={styles.footer}>
        Government of Kenya · Ministry of Tourism & Wildlife · DGOS v1.0
      </div>
    </div>
  );
}

const styles = {
  wrapper: { minHeight: '100vh', background: 'linear-gradient(135deg, #004D2B 0%, #006B3C 50%, #00843D 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { background: '#fff', borderRadius: 12, padding: '40px', width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
  header: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 },
  crest: { fontSize: 40 },
  ministry: { fontSize: 15, fontWeight: 700, color: '#0D1117', lineHeight: 1.3 },
  system: { fontSize: 12, color: '#586069', marginTop: 2 },
  divider: { height: 1, background: '#E2E6EA', margin: '0 0 24px' },
  title: { fontSize: 20, fontWeight: 700, marginBottom: 6, color: '#0D1117' },
  subtitle: { fontSize: 12, color: '#586069', marginBottom: 24 },
  error: { background: '#FFEEF0', border: '1px solid #FDAEB7', color: '#D73A49', padding: '10px 14px', borderRadius: 6, fontSize: 13, marginBottom: 16 },
  field: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#0D1117', marginBottom: 6 },
  btn: { width: '100%', background: '#006B3C', color: '#fff', border: 'none', borderRadius: 6, padding: 11, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 4 },
  btnDisabled: { width: '100%', background: '#8B949E', color: '#fff', border: 'none', borderRadius: 6, padding: 11, fontSize: 14, fontWeight: 600, cursor: 'not-allowed', marginTop: 4 },
  demoSection: { marginTop: 24, borderTop: '1px solid #E2E6EA', paddingTop: 16 },
  demoToggle: { background: 'none', border: 'none', color: '#006B3C', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: 12 },
  accountsList: { display: 'flex', flexDirection: 'column', gap: 6 },
  accountBtn: { display: 'flex', alignItems: 'center', gap: 10, background: '#F7F8FA', border: '1px solid #E2E6EA', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', width: '100%' },
  accountEmoji: { fontSize: 18, flexShrink: 0 },
  accountInfo: { flex: 1 },
  accountTitle: { fontSize: 12, fontWeight: 700, color: '#0D1117' },
  accountEmail: { fontSize: 11, color: '#8B949E' },
  accountFill: { fontSize: 11, color: '#006B3C', fontWeight: 600, flexShrink: 0 },
  passwordNote: { fontSize: 11, color: '#8B949E', textAlign: 'center', marginTop: 8 },
  help: { marginTop: 20, fontSize: 12, color: '#8B949E', textAlign: 'center', lineHeight: 1.6 },
  footer: { marginTop: 24, color: 'rgba(255,255,255,0.6)', fontSize: 12 },
};
