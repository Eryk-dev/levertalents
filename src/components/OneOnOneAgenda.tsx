import { useState, useEffect } from 'react';
import { Card, SectionHeader, Btn, Row } from '@/components/primitives/LinearKit';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2 } from 'lucide-react';
import { useAgendaState, type AgendaItem } from '@/hooks/useAgendaState';

/**
 * OneOnOneAgenda — collaborative agenda list for 1:1 meetings.
 * D-18: extracted from OneOnOneMeetingForm monolith.
 * Items: id, text, checked; add/toggle/remove; insertion order preserved.
 */
export interface OneOnOneAgendaProps {
  items: AgendaItem[];
  onChange: (items: AgendaItem[]) => void;
}

export function OneOnOneAgenda({ items, onChange }: OneOnOneAgendaProps) {
  const state = useAgendaState(items);
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
      <SectionHeader>Pauta</SectionHeader>
      <ul className="space-y-2">
        {state.items.length === 0 && (
          <li>
            <p className="text-sm text-text-subtle">Nenhum item de pauta ainda.</p>
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
              aria-label="Marcar item de pauta"
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
            <button
              type="button"
              onClick={() => state.remove(it.id)}
              aria-label="Remover item"
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
          placeholder="Adicionar tópico…"
        />
        <Btn variant="secondary" onClick={handleAdd}>
          Adicionar
        </Btn>
      </Row>
    </Card>
  );
}
