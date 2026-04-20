import { useDraggable } from "@dnd-kit/core";
import { Lock, Users, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import type { JobOpeningRow } from "@/integrations/supabase/hiring-types";
import {
  STAGE_GROUPS,
  STAGE_GROUP_BAR_COLORS,
  type StageGroupKey,
} from "@/lib/hiring/stageGroups";
import type { JobApplicationCounts } from "@/hooks/hiring/useApplicationCountsByJob";
import { Chip } from "@/components/primitives/LinearKit";

interface JobCardProps {
  job: JobOpeningRow;
  companyName?: string;
  counts?: JobApplicationCounts;
  onOpen: () => void;
  isDraggable?: boolean;
  asOverlay?: boolean;
}

// Priority stripe based on idleDays (stalled flag)
function prioColorFor(idleDays: number | null | undefined): string {
  if (idleDays == null) return "hsl(var(--prio-med))";
  if (idleDays >= 7) return "hsl(var(--prio-urgent))";
  if (idleDays >= 3) return "hsl(var(--prio-high))";
  return "hsl(var(--prio-med))";
}

export function JobCard({
  job,
  companyName,
  counts,
  onOpen,
  isDraggable = true,
  asOverlay = false,
}: JobCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `job:${job.id}`,
    disabled: !isDraggable || asOverlay,
  });

  const daysOpen = Math.max(
    0,
    Math.floor((Date.now() - new Date(job.opened_at).getTime()) / 86_400_000),
  );

  const total = counts?.total ?? 0;
  const newToday = counts?.today ?? 0;
  const idleDays = counts?.idleDays ?? null;
  const stalled = idleDays != null && idleDays >= 7 && total > 0;

  const visibleGroups = STAGE_GROUPS.filter((g) => g.key !== "descartados");
  const totalActive = visibleGroups.reduce((acc, g) => acc + (counts?.byGroup[g.key] ?? 0), 0);

  return (
    <button
      ref={asOverlay ? undefined : setNodeRef}
      {...(isDraggable && !asOverlay ? attributes : {})}
      {...(isDraggable && !asOverlay ? listeners : {})}
      onClick={(e) => {
        if (asOverlay || isDragging) return;
        e.preventDefault();
        onOpen();
      }}
      className={cn(
        "group w-full text-left select-none rounded-md border border-border bg-surface p-2.5",
        "transition-colors hover:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        isDragging && !asOverlay && "opacity-30",
        isDraggable && !isDragging && !asOverlay && "cursor-grab",
        asOverlay && "cursor-grabbing shadow-popup",
      )}
      style={{
        borderLeftWidth: "3px",
        borderLeftColor: prioColorFor(idleDays),
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium text-text tracking-[-0.005em] line-clamp-2" title={job.title}>
            {job.title}
          </div>
          <div className="text-[11.5px] text-text-muted mt-0.5 truncate">
            {companyName ?? "Empresa"}
            {job.sector ? ` · ${job.sector}` : ""}
          </div>
        </div>
        {stalled && (
          <span
            title="Parada há 7+ dias"
            className="shrink-0 w-1.5 h-1.5 rounded-full bg-status-amber mt-1"
            aria-hidden
          />
        )}
        {job.confidential && (
          <Lock className="shrink-0 w-3 h-3 text-text-subtle mt-0.5" aria-label="Confidencial" />
        )}
      </div>

      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
        <Chip color="neutral" size="sm" icon={<Users className="w-3 h-3" strokeWidth={1.75} />}>
          {total}
        </Chip>
        <Chip color="neutral" size="sm" icon={<Calendar className="w-3 h-3" strokeWidth={1.75} />}>
          {daysOpen}d
        </Chip>
        {newToday > 0 && (
          <Chip color="blue" size="sm">
            +{newToday} hoje
          </Chip>
        )}
      </div>

      {total > 0 && (
        <div className="mt-2 flex h-1 w-full overflow-hidden rounded-full bg-bg-muted">
          {visibleGroups.map((g) => {
            const v = counts?.byGroup[g.key] ?? 0;
            if (v === 0 || totalActive === 0) return null;
            const pct = (v / totalActive) * 100;
            return (
              <span
                key={g.key}
                style={{ width: `${pct}%` }}
                className={cn("h-full", STAGE_GROUP_BAR_COLORS[g.key as StageGroupKey])}
                title={`${g.label}: ${v}`}
              />
            );
          })}
        </div>
      )}
    </button>
  );
}
