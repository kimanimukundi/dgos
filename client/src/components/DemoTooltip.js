import React, { useState, useEffect } from 'react';

// Self-contained tooltip that shows once per key per session
// Usage: <DemoTooltip id="compose" title="Compose a memo" body="..." position="bottom">
//          <button>...</button>
//        </DemoTooltip>

export default function DemoTooltip({ id, title, body, position = 'bottom', children }) {
  const storageKey = `dgos_tooltip_seen_${id}`;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show only if not already dismissed, and only in demo mode (role set)
    const isDemoMode = !!localStorage.getItem('dgos_demo_role');
    const alreadySeen = !!localStorage.getItem(storageKey);
    if (isDemoMode && !alreadySeen) {
      // Small delay so tooltip appears after page renders
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismiss = (e) => {
    e.stopPropagation();
    setVisible(false);
    localStorage.setItem(storageKey, '1');
  };

  const posStyles = {
    bottom: { top: '110%', left: '50%', transform: 'translateX(-50%)', marginTop: 8 },
    top: { bottom: '110%', left: '50%', transform: 'translateX(-50%)', marginBottom: 8 },
    right: { left: '110%', top: '50%', transform: 'translateY(-50%)', marginLeft: 8 },
    left: { right: '110%', top: '50%', transform: 'translateY(-50%)', marginRight: 8 },
  };

  const arrowStyles = {
    bottom: { bottom: '100%', left: '50%', transform: 'translateX(-50%)', borderBottom: '6px solid #0D1117', borderLeft: '6px solid transparent', borderRight: '6px solid transparent' },
    top: { top: '100%', left: '50%', transform: 'translateX(-50%)', borderTop: '6px solid #0D1117', borderLeft: '6px solid transparent', borderRight: '6px solid transparent' },
    right: { right: '100%', top: '50%', transform: 'translateY(-50%)', borderRight: '6px solid #0D1117', borderTop: '6px solid transparent', borderBottom: '6px solid transparent' },
    left: { left: '100%', top: '50%', transform: 'translateY(-50%)', borderLeft: '6px solid #0D1117', borderTop: '6px solid transparent', borderBottom: '6px solid transparent' },
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {children}
      {visible && (
        <div style={{ ...styles.tooltip, ...posStyles[position] }}>
          <div style={{ ...styles.arrow, ...arrowStyles[position] }} />
          <div style={styles.tooltipHeader}>
            <span style={styles.tooltipTitle}>{title}</span>
            <button onClick={dismiss} style={styles.closeBtn}>✕</button>
          </div>
          <p style={styles.tooltipBody}>{body}</p>
          <button onClick={dismiss} style={styles.gotItBtn}>Got it</button>
        </div>
      )}
    </div>
  );
}

const styles = {
  tooltip: { position: 'absolute', width: 240, background: '#0D1117', color: '#fff', borderRadius: 10, padding: '14px', zIndex: 500, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' },
  arrow: { position: 'absolute', width: 0, height: 0 },
  tooltipHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  tooltipTitle: { fontSize: 13, fontWeight: 700, color: '#fff', flex: 1 },
  closeBtn: { background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 12, padding: 0, marginLeft: 8, flexShrink: 0 },
  tooltipBody: { fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, margin: '0 0 10px' },
  gotItBtn: { background: '#006B3C', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
};
