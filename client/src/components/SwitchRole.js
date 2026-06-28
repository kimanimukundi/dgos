import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function SwitchRole() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleSwitch = () => {
    logout();
    localStorage.removeItem('dgos_demo_role');
    localStorage.removeItem('dgos_start_tour');
    navigate('/login');
  };

  return (
    <div style={styles.container}>
      <button onClick={handleSwitch} style={styles.btn}>⇄ Switch Role</button>
    </div>
  );
}

const styles = {
  container: { display: 'flex', alignItems: 'center' },
  btn: { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
};
