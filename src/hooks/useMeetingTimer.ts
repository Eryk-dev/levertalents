import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * useMeetingTimer — tracks elapsed meeting seconds.
 * D-19: custom hook extracted from OneOnOneMeetingForm monolith.
 * INV-3-24: hook < 100 ln.
 */
export function useMeetingTimer(initialSeconds = 0) {
  const [elapsed, setElapsed] = useState(initialSeconds);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const start = useCallback(() => setRunning(true), []);
  const stop = useCallback(() => setRunning(false), []);
  const reset = useCallback(() => {
    setRunning(false);
    setElapsed(0);
  }, []);

  return { elapsed, running, start, stop, reset };
}
