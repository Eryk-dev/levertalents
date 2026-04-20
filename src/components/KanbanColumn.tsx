import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { KanbanCard, type KanbanPlan } from "./KanbanCard";
import { LucideIcon } from "lucide-react";

type Tone = "neutral" | "info" | "warning" | "success" | "danger";

const TONE_DOT: Record<Tone, string> = {
  neutral: "bg-text-subtle",
  info: "bg-status-blue",
  warning: "bg-status-amber",
  success: "bg-status-green",
  danger: "bg-status-red",
};

interface KanbanColumnProps {
  id: string;
  title: string;
  icon: LucideIcon;
  tone?: Tone;
  plans: KanbanPlan[];
  onDelete?: (id: string) => void;
}

export function KanbanColumn({
  id,
  title,
  tone = "neutral",
  plans,
  onDelete,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col kanban-column min-h-0 transition-colors",
        isOver && "ring-2 ring-accent/40",
      )}
    >
      <header className="flex items-center justify-between gap-2 px-1 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn("inline-block w-1.5 h-1.5 rounded-full", TONE_DOT[tone])} />
          <h3 className="truncate text-[11px] font-semibold uppercase tracking-[0.06em] text-text">
            {title}
          </h3>
          <span className="text-[11px] text-text-subtle tabular">{plans.length}</span>
        </div>
      </header>

      <div className="flex-1 space-y-1.5 overflow-y-auto scrollbar-linear">
        {plans.length === 0 ? (
          <div className="py-4 px-2 text-[11.5px] text-text-subtle text-center border border-dashed border-border rounded-md">
            Sem PDIs nesta etapa
          </div>
        ) : (
          plans.map((plan) => <KanbanCard key={plan.id} plan={plan} onDelete={onDelete} />)
        )}
      </div>
    </div>
  );
}
