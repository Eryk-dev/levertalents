import { Trash2 } from 'lucide-react';
import { Chip } from '@/components/primitives/LinearKit';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Database } from '@/integrations/supabase/types';

type CycleRow = Database['public']['Tables']['evaluation_cycles']['Row'];

export interface CycleCardProps {
  cycle: CycleRow;
  selected?: boolean;
  onClick?: () => void;
  onDelete?: () => void;
}

function statusChip(status: string, daysLeft: number) {
  if (status === 'closed') return <Chip color="amber" size="sm">Encerrado</Chip>;
  if (status === 'draft') return <Chip color="blue" size="sm">Rascunho</Chip>;
  if (status === 'active' && daysLeft <= 3)
    return <Chip color="amber" size="sm">{`Encerra em ${daysLeft}d`}</Chip>;
  return <Chip color="green" size="sm">Em andamento</Chip>;
}

export function CycleCard({ cycle, selected, onClick, onDelete }: CycleCardProps) {
  const daysLeft = differenceInDays(new Date(cycle.ends_at), new Date());

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      className={cn(
        'group relative bg-surface border border-border rounded-lg p-3.5 cursor-pointer transition-colors hover:bg-bg-subtle',
        selected && 'border-l-4 border-l-accent bg-accent-soft',
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-semibold text-text">{cycle.name}</h3>
        <div className="flex items-center gap-2">
          {statusChip(cycle.status, daysLeft)}
          {onDelete && (
            <button
              type="button"
              aria-label="Excluir ciclo"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-bg-subtle text-text-muted hover:text-status-red"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      <p className="text-xs text-text-subtle mt-2">
        {format(new Date(cycle.starts_at), 'dd MMM', { locale: ptBR })}
        {' → '}
        {format(new Date(cycle.ends_at), 'dd MMM yyyy', { locale: ptBR })}
      </p>
    </div>
  );
}
