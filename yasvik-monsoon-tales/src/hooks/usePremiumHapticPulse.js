import { useCallback, useEffect, useRef, useState } from 'react';

export function usePremiumHapticPulse(durationMs = 300) {
  const [isPulseActive, setIsPulseActive] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const triggerPulse = useCallback(() => {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(15);
    }

    setIsPulseActive(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsPulseActive(false);
    }, durationMs);
  }, [durationMs]);

  return { isPulseActive, triggerPulse };
}

