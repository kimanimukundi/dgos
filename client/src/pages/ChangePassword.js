import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function ChangePassword() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const forced = user?.must_change_password;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.new_password !== form.confirm) { setError('Passwords do not match'); return; }
    if (form.new_password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/auth/change-password', { current_password: form.current_password, new_password: form.new_password });
      if (forced) { logout(); navigate('/login'); }
      else navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.icon}>🔐</div>
        <h2 style={styles.title}>{forced ? 'Set Your Password' : 'Change Password'}</h2>
        {forced && (
          <div style={styles.notice}>
            Your account has a temporary password. You must set a new password before continuing.
          </div>
        )}
        {error && <div style={styles.error}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label style={styles.label}>{forced ? 'Temporary Password' : 'Current Password'}</label>
            <input type="password" value={form.current_password} onChange={e => setForm({ ...form, current_password: e.target.value })} required />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>New Password</label>
            <input type="password" value={form.new_password} onChange={e => setForm({ ...form, new_password: e.target.value })} required />
            <div style={styles.hint}>Minimum 8 characters</div>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Confirm New Password</label>
            <input type="password" value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} required />
          </div>
          <button type="submit" disabled={loading} style={styles.btn}>
            {loading ? 'Updating...' : 'Set New Password'}
          </button>
        </form>
        {!forced && <button onClick={() => navigate(-1)} style={styles.cancel}>Cancel</button>}
      </div>
    </div>
  );
}

const styles = {
  wrapper: { minHeight: '100vh', background: '#F7F8FA', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { background: '#fff', border: '1px solid #E2E6EA', borderRadius: 10, padding: '36px', width: '100%', maxWidth: 420 },
  icon: { fontSize: 36, marginBottom: 12 },
  title: { fontSize: 20, fontWeight: 700, color: '#0D1117', marginBottom: 16 },
  notice: { background: '#FFF5E0', border: '1px solid #FFDF7E', color: '#E36209', padding: '10px 14px', borderRadius: 6, fontSize: 13, marginBottom: 20 },
  error: { background: '#FFEEF0', border: '1px solid #FDAEB7', color: '#D73A49', padding: '10px 14px', borderRadius: 6, fontSize: 13, marginBottom: 16 },
  field: { marginBottom: 16 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#0D1117', marginBottom: 6 },
  hint: { fontSize: 11, color: '#8B949E', marginTop: 4 },
  btn: { width: '100%', background: '#006B3C', color: '#fff', border: 'none', borderRadius: 6, padding: '11px', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 4 },
  cancel: { width: '100%', background: 'none', border: 'none', color: '#8B949E', fontSize: 13, cursor: 'pointer', marginTop: 12, padding: '8px' },
};
