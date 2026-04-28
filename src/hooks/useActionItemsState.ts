import { useState, useCallback } from 'react';

/**
 * useActionItemsState — manages action item checklist for 1:1 meetings.
 * D-19: custom hook extracted from OneOnOneMeetingForm monolith.
 * INV-3-24: hook < 100 ln.
 */
export interface ActionItem {
  id: string;
  text: string;
  assignee_id: string | null;
  due_date: string | null; // ISO date
  checked: boolean;
}

export function useActionItemsState(initial: ActionItem[] = []) {
  const [items, setItems] = useState<ActionItem[]>(initial);

  const add = useCallback(
    (
      text: string,
      assignee_id: string | null = null,
      due_date: string | null = null,
    ) => {
      setItems((prev) => [
        ...prev,
        { id: crypto.randomUUID(), text, assignee_id, due_date, checked: false },
      ]);
    },
    [],
  );

  const toggle = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, checked: !it.checked } : it)),
    );
  }, []);

  const update = useCallback(
    (id: string, patch: Partial<Omit<ActionItem, 'id'>>) => {
      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, ...patch } : it)),
      );
    },
    [],
  );

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  return { items, setItems, add, toggle, update, remove };
}
