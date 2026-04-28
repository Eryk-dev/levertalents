import { useState, useMemo, useCallback } from 'react';
import type React from 'react';

/**
 * usePlaudInput — validates Plaud paste content and provides warning state.
 * D-12/D-14: Plaud transcript + summary are pasted manually.
 * D-19: custom hook extracted from OneOnOneMeetingForm monolith.
 * INV-3-11/INV-3-24: paste warning when < SHORT_THRESHOLD chars; hook < 100 ln.
 */
export type PlaudWarning = 'short' | 'empty' | null;

const SHORT_THRESHOLD = 50;

export function usePlaudInput(initial = '') {
  const [value, setValue] = useState(initial);

  const warning: PlaudWarning = useMemo(() => {
    if (value.length === 0) return 'empty';
    if (value.length < SHORT_THRESHOLD) return 'short';
    return null;
  }, [value]);

  const handlePaste = useCallback(
    (_event: React.ClipboardEvent<HTMLTextAreaElement>) => {
      // Default paste behavior is sufficient; hook exists for future enhancement.
      // No-op: browser handles the paste; value update happens via onChange.
    },
    [],
  );

  return { value, setValue, warning, handlePaste };
}
