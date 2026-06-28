import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ONBOARDING_STEPS } from '../utils/demoContent';

const HIGHLIGHT_ROUTES = {
  dashboard: '/',
  memos: '/memos/inbox',
  workflows: '/workflows',
  tasks: '/tasks',
  leave: '/leave',
  tickets: '/tickets',
  assets: '/assets',
  reports: '/reports',
  contracts: '/contracts',
  bell: null, // stays on current page
  search: null,
};

export default function OnboardingOverlay({ roleId, onDismiss }) {
  const navigate = useNavigate();
  const steps = ONBOARDING_STEPS[roleId] || [];
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Pre-navigate to the highlighted module for each step
    const current = steps[step];
    if (current?.highlight && HIGHLIGHT_ROUTES[current.highlight]) {
      navigate(HIGHLIGHT_ROUTES[current.highlight]);
    }
  }, [step]);

  if (!steps.length) return null;

  const current = steps[step];
  const isLast = step === steps.length - 1;
  const progress = ((step + 1) / steps.length) * 100;

  const handleNext = () => {
    if (isLast) {
      onDismiss();
    } else {
      setStep(s => s + 1);
    }
  };

  const handleSkip = () => onDismiss();

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        {/* Progress bar */}
        <div style={styles.progressTrack}>
          <div style={{ ...styles.progressFill, width: `${progress}%` }} />
        </div>

        {/* Step counter */}
        <div style={styles.stepCounter}>
          {steps.map((_, i) => (
            <div key={i} style={{ ...styles.dot, ...(i === step ? styles.dotActive : i < step ? styles.dotDone : {}) }} />
          ))}
        </div>

        {/* Content */}
        <div style={styles.iconCircle}>{current.icon}</div>
        <h2 style={styles.title}>{current.title}</h2>
        <p style={styles.body}>{current.body}</p>

        {/* Navigation */}
        <div style={styles.actions}>
          <button onClick={handleSkip} style={styles.skipBtn}>Skip tour</button>
          <button onClick={handleNext} style={styles.nextBtn}>
            {isLast ? 'Start exploring →' : 'Next →'}
          </button>
        </div>

        {/* Step label */}
        <div style={styles.stepLabel}>{step + 1} of {steps.length}</div>
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(3px)' },
  card: { background: '#fff', borderRadius: 16, padding: '36px 40px 28px', width: '100%', maxWidth: 480, position: 'relative', textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,0.3)' },
  progressTrack: { position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: '#E2E6EA', borderRadius: '16px 16px 0 0', overflow: 'hidden' },
  progressFill: { height: '100%', background: '#006B3C', transition: 'width 0.4s ease' },
  stepCounter: { display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: '50%', background: '#E2E6EA', transition: 'all 0.2s' },
  dotActive: { background: '#006B3C', transform: 'scale(1.3)' },
  dotDone: { background: '#A8D5B5' },
  iconCircle: { width: 72, height: 72, background: '#E8F5EE', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, margin: '0 auto 20px' },
  title: { fontSize: 22, fontWeight: 800, color: '#0D1117', marginBottom: 12, lineHeight: 1.3 },
  body: { fontSize: 14, color: '#586069', lineHeight: 1.7, marginBottom: 28 },
  actions: { display: 'flex', gap: 12, justifyContent: 'center' },
  skipBtn: { background: 'none', border: '1px solid #E2E6EA', color: '#8B949E', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  nextBtn: { background: '#006B3C', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  stepLabel: { marginTop: 16, fontSize: 11, color: '#C8CDD4' },
};
