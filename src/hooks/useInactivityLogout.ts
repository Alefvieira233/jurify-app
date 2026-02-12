import { useEffect, useRef, useCallback } from 'react';

const INACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'mousedown',
  'mousemove',
  'keydown',
  'scroll',
  'touchstart',
  'pointerdown',
];

/** Default: 30 minutes of inactivity */
const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000;

/**
 * Auto-logout hook — signs the user out after a period of inactivity.
 *
 * Listens to mouse, keyboard, scroll, and touch events to reset the timer.
 * Uses passive event listeners to avoid impacting scroll performance.
 *
 * @param onLogout  Callback executed when the inactivity timeout fires.
 * @param timeoutMs Inactivity threshold in milliseconds (default 30 min).
 * @param enabled   Pass `false` to disable (e.g. when user is not authenticated).
 */
export function useInactivityLogout(
  onLogout: () => void,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
  enabled: boolean = true,
): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onLogoutRef = useRef(onLogout);
  onLogoutRef.current = onLogout;

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onLogoutRef.current();
    }, timeoutMs);
  }, [timeoutMs]);

  useEffect(() => {
    if (!enabled) return;

    resetTimer();

    const handler = () => resetTimer();

    for (const event of INACTIVITY_EVENTS) {
      window.addEventListener(event, handler, { passive: true });
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      for (const event of INACTIVITY_EVENTS) {
        window.removeEventListener(event, handler);
      }
    };
  }, [enabled, resetTimer]);
}
