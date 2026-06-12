import { useEffect, useRef, useState, useCallback } from 'react';

const STORAGE_KEY = 'app_session_start';
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
const IDLE_TIMEOUT = 5 * 60 * 1000;
const WARNING_SECONDS = 30;
const POSTPONE_DURATION = 60 * 60 * 1000; // 1 hour
const CHECK_INTERVAL = 60 * 1000;

export default function useAutoRefresh() {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(WARNING_SECONDS);
  const lastActivity = useRef(Date.now());
  const postponedUntil = useRef(null);
  const countdownTimer = useRef(null);

  const reload = useCallback(() => {
    window.location.reload();
  }, []);

  const dismiss = useCallback(() => {
    setShowWarning(false);
    setCountdown(WARNING_SECONDS);
    if (countdownTimer.current) clearInterval(countdownTimer.current);
    postponedUntil.current = Date.now() + POSTPONE_DURATION;
  }, []);

  // Setup on mount: determine session start timestamp
  useEffect(() => {
    const navEntry = performance.getEntriesByType?.('navigation')?.[0];
    const isManualReload = navEntry?.type === 'reload';

    if (isManualReload) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } else {
      const existing = localStorage.getItem(STORAGE_KEY);
      if (!existing) {
        localStorage.setItem(STORAGE_KEY, String(Date.now()));
      }
    }

    // Idle detection
    const resetIdle = () => {
      lastActivity.current = Date.now();
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetIdle, { passive: true }));

    // Periodic check
    const interval = setInterval(() => {
      const sessionStart = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
      if (!sessionStart) return;

      const now = Date.now();
      const elapsed = now - sessionStart;
      const effectiveStart = Math.max(sessionStart, postponedUntil.current || 0);
      const effectiveElapsed = now - effectiveStart;

      if (effectiveElapsed < TWENTY_FOUR_HOURS) return;

      const idleFor = now - lastActivity.current;
      if (idleFor < IDLE_TIMEOUT) return;

      // 24h elapsed + idle → show warning
      if (!showWarning) {
        setShowWarning(true);
        setCountdown(WARNING_SECONDS);

        countdownTimer.current = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              clearInterval(countdownTimer.current);
              reload();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    }, CHECK_INTERVAL);

    return () => {
      clearInterval(interval);
      if (countdownTimer.current) clearInterval(countdownTimer.current);
      events.forEach(e => window.removeEventListener(e, resetIdle));
    };
  }, []);

  return { showWarning, countdown, reload, dismiss };
}