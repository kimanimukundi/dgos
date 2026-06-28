import React from 'react';
import { useTour } from '../context/TourContext';

export default function TourOverlay() {
  const { active, currentStep, stepIndex, totalSteps, targetRect, isFirstOnPage, next, endTour } = useTour();

  if (!active || !currentStep) return null;

  const useSpotlight = currentStep.spotlight && isFirstOnPage;
  const progress = ((stepIndex + 1) / totalSteps) * 100;
  const padding = 10;

  // Card positioning: appear alongside the target, or centred if no target
  const getCardStyle = () => {
    if (!targetRect) return { ...styles.card, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    const spaceBelow = window.innerHeight - (targetRect.top + targetRect.height);
    const spaceRight = window.innerWidth - (targetRect.left + targetRect.width);
    const cardW = 320;
    const cardH = 180;

    if (spaceBelow > cardH + 20) {
      return { ...styles.card, top: targetRect.top + targetRect.height + padding + 10, left: Math.min(targetRect.left, window.innerWidth - cardW - 20) };
    } else if (targetRect.top > cardH + 20) {
      return { ...styles.card, top: targetRect.top - cardH - padding - 10, left: Math.min(targetRect.left, window.innerWidth - cardW - 20) };
    } else if (spaceRight > cardW + 20) {
      return { ...styles.card, top: Math.max(20, targetRect.top), left: targetRect.left + targetRect.width + padding + 10 };
    } else {
      return { ...styles.card, top: Math.max(20, targetRect.top), left: Math.max(20, targetRect.left - cardW - padding - 10) };
    }
  };

  return (
    <>
      {/* Spotlight overlay — SVG with a cut-out hole around the target */}
      {useSpotlight && targetRect ? (
        <svg style={styles.spotlightSvg} onClick={endTour}>
          <defs>
            <mask id="spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={targetRect.left - padding} y={targetRect.top - padding}
                width={targetRect.width + padding * 2} height={targetRect.height + padding * 2}
                rx="8" fill="black"
              />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(0,0,0,0.65)" mask="url(#spotlight-mask)" />
          {/* Glowing border around target */}
          <rect
            x={targetRect.left - padding} y={targetRect.top - padding}
            width={targetRect.width + padding * 2} height={targetRect.height + padding * 2}
            rx="8" fill="none" stroke="#4ADE80" strokeWidth="2.5"
            style={{ filter: 'drop-shadow(0 0 8px #4ADE80)' }}
          />
        </svg>
      ) : (
        /* Dim overlay for tooltip steps — lighter, no hole */
        <div style={styles.dimOverlay} />
      )}

      {/* Target pulse ring for tooltip steps */}
      {!useSpotlight && targetRect && (
        <div style={{
          ...styles.pulseRing,
          top: targetRect.top - padding,
          left: targetRect.left - padding,
          width: targetRect.width + padding * 2,
          height: targetRect.height + padding * 2,
        }} />
      )}

      {/* Tour card */}
      <div style={getCardStyle()}>
        {/* Progress bar */}
        <div style={styles.progressTrack}>
          <div style={{ ...styles.progressFill, width: `${progress}%` }} />
        </div>

        {/* Step dots */}
        <div style={styles.dots}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} style={{ ...styles.dot, ...(i === stepIndex ? styles.dotActive : i < stepIndex ? styles.dotDone : {}) }} />
          ))}
        </div>

        <div style={styles.cardTitle}>{currentStep.title}</div>
        <div style={styles.cardBody}>{currentStep.body}</div>

        <div style={styles.cardFooter}>
          <button onClick={endTour} style={styles.skipBtn}>Skip tour</button>
          <button onClick={next} style={styles.nextBtn}>
            {stepIndex === totalSteps - 1 ? 'Finish ✓' : 'Next →'}
          </button>
        </div>

        <div style={styles.stepLabel}>{stepIndex + 1} of {totalSteps}</div>
      </div>
    </>
  );
}

const styles = {
  spotlightSvg: {
    position: 'fixed', inset: 0, width: '100vw', height: '100vh', zIndex: 900, pointerEvents: 'all',
  },
  dimOverlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 900, pointerEvents: 'none',
  },
  pulseRing: {
    position: 'fixed', borderRadius: 10, zIndex: 901, pointerEvents: 'none',
    border: '2px solid #4ADE80', boxShadow: '0 0 0 4px rgba(74,222,128,0.2)',
    animation: 'none',
  },
  card: {
    position: 'fixed', zIndex: 1000, width: 320,
    background: '#fff', borderRadius: 14, padding: '20px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
    pointerEvents: 'all',
  },
  progressTrack: { height: 3, background: '#E2E6EA', borderRadius: 2, marginBottom: 14, overflow: 'hidden' },
  progressFill: { height: '100%', background: '#006B3C', transition: 'width 0.3s ease' },
  dots: { display: 'flex', gap: 5, marginBottom: 12, flexWrap: 'wrap' },
  dot: { width: 7, height: 7, borderRadius: '50%', background: '#E2E6EA', transition: 'all 0.2s' },
  dotActive: { background: '#006B3C', transform: 'scale(1.3)' },
  dotDone: { background: '#A8D5B5' },
  cardTitle: { fontSize: 15, fontWeight: 800, color: '#0D1117', marginBottom: 8, lineHeight: 1.3 },
  cardBody: { fontSize: 13, color: '#586069', lineHeight: 1.6, marginBottom: 16 },
  cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  skipBtn: { background: 'none', border: 'none', color: '#8B949E', fontSize: 12, cursor: 'pointer', padding: 0 },
  nextBtn: { background: '#006B3C', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  stepLabel: { textAlign: 'center', fontSize: 10, color: '#C8CDD4', marginTop: 10 },
};
