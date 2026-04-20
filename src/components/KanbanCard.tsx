import { useDraggable } from "@dnd-kit/core";
import { CalendarClock, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { LinearAvatar, Chip, ProgressBar } from "@/components/primitives/LinearKit";

export interface KanbanPlan {
  id: string;
  title: string;
  status: string;
  development_area?: string | null;
  progress_percentage?: number | null;
  deadline?: string | null;
  user?: {
    id?: string;
    full_name?: string | null;
    avatar_url?: string | null;
  } | null;
}

interface KanbanCardProps {
  plan: KanbanPlan;
  onDelete?: (id: string) => void;
  asOverlay?: boolean;
}

function formatDeadline(iso: string): { text: string; overdue: boolean; soon: boolean } {
  const d = new Date(iso);
  const days = Math.ceil((d.getTime() - Date.now()) / 86_400_000);
  const label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  return { text: label, overdue: days < 0, soon: days >= 0 && days <= 7 };
}

export function KanbanCard({ plan, onDelete, asOverlay = false }: KanbanCardProps) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `plan:${plan.id}`,
    disabled: asOverlay,
  });

  const progress = Math.max(0, Math.min(100, plan.progress_percentage ?? 0));
  const deadline = plan.deadline ? formatDeadline(plan.deadline) : null;

  return (
    <div
      ref={asOverlay ? undefined : setNodeRef}
      {...(asOverlay ? {} : attributes)}
      {...(asOverlay ? {} : listeners)}
      onClick={(e) => {
        if (asOverlay || isDragging) return;
        e.preventDefault();
        navigate("/pdi");
      }}
      role="button"
      tabIndex={0}
      className={cn(
        "group relative block w-full select-none rounded-md border border-border bg-surface p-2.5 text-left",
        "transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        !asOverlay && "cursor-grab hover:border-border-strong",
        isDragging && !asOverlay && "opacity-30",
        asOverlay && "cursor-grabbing shadow-popup",
      )}
    >
      <div className="text-[12.5px] font-medium text-text tracking-[-0.005em] line-clamp-2">
        {plan.title}
      </div>

      <div className="mt-2">
        <ProgressBar value={progress} size={3} />
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        <LinearAvatar name={plan.user?.full_name || "?"} size={16} />
        <span className="text-[11px] text-text-muted truncate flex-1">
          {(plan.user?.full_name || "").split(" ")[0]}
        </span>
        {deadline && (
          <Chip
            color={deadline.overdue ? "red" : deadline.soon ? "amber" : "neutral"}
            size="sm"
            icon={<CalendarClock className="w-3 h-3" strokeWidth={1.75} />}
          >
            {deadline.text}
          </Chip>
        )}
        {onDelete && !asOverlay && (
          <button
            className="opacity-0 group-hover:opacity-100 transition-opacity text-text-subtle hover:text-status-red"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(plan.id);
            }}
            aria-label="Excluir PDI"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
