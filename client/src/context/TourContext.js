import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const TourContext = createContext(null);

export const useTour = () => useContext(TourContext);

export function TourProvider({ children }) {
  const [active, setActive] = useState(false);
  const [steps, setSteps] = useState([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [roleId, setRoleId] = useState(null);
  const navigateRef = useRef(null);

  // Find and measure the target element
  const measureTarget = useCallback((selector) => {
    if (!selector) { setTargetRect(null); return; }
    const el = document.querySelector(`[data-tour="${selector}"]`);
    if (!el) { setTargetRect(null); return; }
    const rect = el.getBoundingClientRect();
    setTargetRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
  }, []);

  const currentStep = steps[stepIndex] || null;

  // Navigate and measure when step changes
  useEffect(() => {
    if (!active || !currentStep) return;
    const navigate = navigateRef.current;
    if (!navigate) return;

    if (currentStep.route) navigate(currentStep.route);

    // Wait for navigation + render before measuring
    const t = setTimeout(() => measureTarget(currentStep.target), currentStep.route ? 600 : 200);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, active]);

  const startTour = useCallback((tourSteps, rId, navigate) => {
    navigateRef.current = navigate;
    setSteps(tourSteps);
    setStepIndex(0);
    setRoleId(rId);
    setActive(true);
  }, []);

  const next = useCallback(() => {
    if (stepIndex < steps.length - 1) {
      setStepIndex(i => i + 1);
    } else {
      endTour();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, steps.length]);

  const endTour = useCallback(() => {
    setActive(false);
    setSteps([]);
    setStepIndex(0);
    setTargetRect(null);
    if (roleId) localStorage.setItem(`dgos_tour_done_${roleId}`, '1');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleId]);

  // Re-measure on window resize
  useEffect(() => {
    if (!active || !currentStep?.target) return;
    const handler = () => measureTarget(currentStep.target);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [active, currentStep, measureTarget]);

  const isFirstOnPage = stepIndex === 0 || steps[stepIndex - 1]?.route !== currentStep?.route;

  return (
    <TourContext.Provider value={{ active, currentStep, stepIndex, totalSteps: steps.length, targetRect, isFirstOnPage, startTour, next, endTour }}>
      {children}
    </TourContext.Provider>
  );
}
