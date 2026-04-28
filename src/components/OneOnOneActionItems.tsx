import { useState, useEffect } from 'react';
import { Card, SectionHeader, Btn, Row } from '@/components/primitives/LinearKit';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2 } from 'lucide-react';
import { useActionItemsState, type ActionItem } from '@/hooks/useActionItemsState';

/**
 * OneOnOneActionItems — action item checklist for 1:1 meetings.
 * D-18: extracted from OneOnOneMeetingForm monolith.
 * Items: id, text, assignee_id, due_date (ISO), checked; add/toggle/update/remove.
 * Empty state shown when list is empty (UI-SPEC).
 */
export interface OneOnOneActionItemsProps {
  items: ActionItem[];
  onChange: (items: ActionItem[]) => void;
}

export function OneOnOneActionItems({ items, onChange }: OneOnOneActionItemsProps) {
  const state = useActionItemsState(items);
  const [newText, setNewText] = useState('');

  // Propagate internal state changes to parent
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { onChange(state.items); }, [state.items]);

  const handleAdd = () => {
    const trimmed = newText.trim();
    if (!trimmed) return;
    state.add(trimmed);
    setNewText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleAdd();
  };

  return (
    <Card>
      <SectionHeader title="Action items" />
      <ul className="space-y-2">
        {state.items.length === 0 && (
          <li>
            <p className="text-sm text-text-subtle p-3 rounded border border-dashed border-border">
              Nenhum action item ainda.
            </p>
          </li>
        )}
        {state.items.map((it) => (
          <li
            key={it.id}
            className="flex items-center gap-2 p-3 rounded border border-border"
          >
            <Checkbox
              checked={it.checked}
              onCheckedChange={() => state.toggle(it.id)}
              aria-label="Marcar action item"
            />
            <span
              className={
                it.checked
                  ? 'line-through text-text-subtle flex-1'
                  : 'flex-1'
              }
            >
              {it.text}
            </span>
            <input
              type="date"
              className="text-xs border border-border rounded px-1"
              value={it.due_date ?? ''}
              onChange={(e) =>
                state.update(it.id, { due_date: e.target.value || null })
              }
              aria-label="Prazo"
            />
            <button
              type="button"
              onClick={() => state.remove(it.id)}
              aria-label="Remover action item"
            >
              <Trash2 className="size-4 text-status-red" />
            </button>
          </li>
        ))}
      </ul>
      <Row className="mt-3 gap-2">
        <Input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Novo action item…"
        />
        <Btn variant="secondary" onClick={handleAdd}>
          Adicionar
        </Btn>
      </Row>
    </Card>
  );
}
