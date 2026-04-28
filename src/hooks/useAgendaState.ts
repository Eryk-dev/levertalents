import { useState, useCallback } from 'react';

/**
 * useAgendaState — manages agenda item list for 1:1 meetings.
 * D-19: custom hook extracted from OneOnOneMeetingForm monolith.
 * INV-3-24: hook < 100 ln.
 */
export interface AgendaItem {
  id: string;
  text: string;
  checked: boolean;
}

export function useAgendaState(initial: AgendaItem[] = []) {
  const [items, setItems] = useState<AgendaItem[]>(initial);

  const add = useCallback((text: string) => {
    setItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), text, checked: false },
    ]);
  }, []);

  const toggle = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, checked: !it.checked } : it)),
    );
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const update = useCallback((id: string, text: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, text } : it)),
    );
  }, []);

  return { items, setItems, add, toggle, remove, update };
}
