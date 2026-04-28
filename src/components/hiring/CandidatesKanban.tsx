import { useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { LoadingState } from "@/components/primitives";
import { CandidateCard, type KanbanApplication } from "./CandidateCard";
import { LegacyStageWarning } from "./LegacyStageWarning";
import { useApplicationsByJob, useMoveApplicationStage } from "@/hooks/hiring/useApplications";
import { useApplicationsRealtime } from "@/hooks/hiring/useApplicationsRealtime";
import { useScope } from "@/app/providers/ScopeProvider";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  APPLICATION_STAGE_LABELS,
  canTransition,
} from "@/lib/hiring/statusMachine";
import {
  STAGE_GROUPS,
  STAGE_GROUP_BY_STAGE,
  STAGE_GROUP_DOT_COLORS,
  type StageGroup,
} from "@/lib/hiring/stageGroups";

interface CandidatesKanbanProps {
  jobId: string;
  jobName?: string;
  onOpenCandidate?: (application: KanbanApplication) => void;
  selectedApplicationId?: string | null;
  onAddCandidate?: (group: StageGroup) => void;
}

interface ColumnProps {
  group: StageGroup;
  apps: KanbanApplication[];
  onOpen?: (app: KanbanApplication) => void;
  collapsible?: boolean;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  selectedApplicationId?: string | null;
  onAddCandidate?: (group: StageGroup) => void;
}

function Column({
  group,
  apps,
  onOpen,
  collapsible,
  defaultOpen = true,
  open: openProp,
  onOpenChange,
  selectedApplicationId,
  onAddCandidate,
}: ColumnProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;
  const setOpen = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };
  const { setNodeRef, isOver } = useDroppable({ id: `appcol:${group.key}` });
  const dotColor = STAGE_GROUP_DOT_COLORS[group.key];

  return (
    <div
      ref={setNodeRef}
      data-testid={`appcol:${group.key}`}
      className={cn(
        "flex flex-1 min-w-[150px] flex-col rounded-md border bg-surface transition-colors",
        // UI-SPEC §"Kanban column on drag-over": bg-accent-soft + border-accent + dashed
        isOver
          ? "bg-accent-soft border-accent border-dashed"
          : "border-border",
      )}
    >
      <header className="flex items-center justify-between gap-2 px-2.5 py-2 border-b border-border">
        <div className="flex items-center gap-1.5 min-w-0">
          {collapsible ? (
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="inline-flex h-4 w-4 items-center justify-center rounded text-text-subtle hover:bg-bg-subtle"
              aria-label={open ? "Recolher" : "Expandir"}
            >
              {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
          ) : null}
          <span
            className="inline-block h-[5px] w-[5px] rounded-full shrink-0"
            style={{ background: dotColor }}
          />
          <h3 className="truncate text-[10.5px] font-semibold uppercase tracking-[0.05em] text-text">
            {group.label}
          </h3>
          <span className="shrink-0 text-[10.5px] font-medium tabular-nums text-text-subtle">
            {apps.length}
          </span>
        </div>
        {onAddCandidate ? (
          <button
            type="button"
            onClick={() => onAddCandidate(group)}
            className="inline-flex h-4 w-4 items-center justify-center rounded text-text-subtle hover:bg-bg-subtle"
            aria-label="Adicionar candidato"
          >
            <Plus className="h-3 w-3" />
          </button>
        ) : null}
      </header>
      {open ? (
        <div className="flex-1 space-y-1 overflow-y-auto p-1.5 min-h-[60px]">
          {apps.length === 0 ? (
            <div className="px-2 py-3 text-center text-[10.5px] text-text-subtle">
              Sem candidatos
            </div>
          ) : (
            apps.map((a) => (
              <CandidateCard
                key={a.id}
                application={a}
                onOpen={onOpen}
                selected={selectedApplicationId === a.id}
              />
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

const DESCARTADOS_KEY = "descartados" as const;

export function CandidatesKanban({
  jobId,
  jobName,
  onOpenCandidate,
  selectedApplicationId,
  onAddCandidate,
}: CandidatesKanbanProps) {
  // jobName aceito por consistência com chamadas externas; não usado no body.
  void jobName;
  const { scope } = useScope();
  const { data: applications = [], isLoading } = useApplicationsByJob(jobId);
  const move = useMoveApplicationStage();

  // D-04: Realtime silent re-render per-jobId (Plan 02-05 hook).
  useApplicationsRealtime(jobId);

  const [activeApp, setActiveApp] = useState<KanbanApplication | null>(null);
  const [descartadosOpen, setDescartadosOpen] = useState(false);

  const { data: backgrounds = {} } = useQuery({
    queryKey: ["hiring-kanban-backgrounds", jobId],
    enabled: applications.length > 0,
    queryFn: async () => {
      const ids = applications.map((a) => a.id);
      if (ids.length === 0) return {};
      const { data, error } = await supabase
        .from("background_checks")
        .select("application_id, status_flag")
        .in("application_id", ids);
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const row of data ?? []) {
        map[row.application_id as string] = row.status_flag as string;
      }
      return map;
    },
  });

  const { data: interviewsNext = {} } = useQuery({
    queryKey: ["hiring-kanban-next-interview", jobId],
    enabled: applications.length > 0,
    queryFn: async () => {
      const ids = applications.map((a) => a.id);
      if (ids.length === 0) return {};
      const { data, error } = await supabase
        .from("interviews")
        .select("application_id, scheduled_at, status")
        .in("application_id", ids)
        .eq("status", "agendada")
        .order("scheduled_at", { ascending: true });
      if (error) return {};
      const map: Record<string, string> = {};
      for (const row of data ?? []) {
        const k = row.application_id as string;
        if (!map[k]) map[k] = row.scheduled_at as string;
      }
      return map;
    },
  });

  const columns = useMemo(() => {
    const byGroup = new Map<string, KanbanApplication[]>();
    for (const g of STAGE_GROUPS) byGroup.set(g.key, []);
    for (const a of applications) {
      const candidate = a.candidate;
      const kanbanApp: KanbanApplication = {
        id: a.id,
        candidate_id: a.candidate_id,
        candidate_name: candidate?.full_name || "Candidato",
        candidate_email: candidate?.email ?? null,
        stage: a.stage,
        stage_entered_at: a.stage_entered_at,
        backgroundFlag:
          (backgrounds as Record<string, KanbanApplication["backgroundFlag"]>)[a.id] ?? null,
        nextInterviewAt: (interviewsNext as Record<string, string>)[a.id] ?? null,
      };
      const group = STAGE_GROUPS.find((g) => g.stages.includes(a.stage));
      if (group) byGroup.get(group.key)?.push(kanbanApp);
    }
    return byGroup;
  }, [applications, backgrounds, interviewsNext]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const onDragStart = (event: DragStartEvent) => {
    const id = event.active.id as string;
    if (!id.startsWith("app:")) return;
    const appId = id.slice("app:".length);
    for (const bucket of columns.values()) {
      const found = bucket.find((a) => a.id === appId);
      if (found) {
        setActiveApp(found);
        return;
      }
    }
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveApp(null);
    const activeId = event.active.id as string;
    const overId = event.over?.id as string | undefined;
    if (!overId || !activeId.startsWith("app:") || !overId.startsWith("appcol:")) return;
    const appId = activeId.slice("app:".length);
    const groupKey = overId.slice("appcol:".length);
    const app = applications.find((a) => a.id === appId);
    if (!app) return;
    const targetGroup = STAGE_GROUPS.find((g) => g.key === groupKey);
    // Mesma coluna: nada a fazer.
    if (!targetGroup || targetGroup.key === STAGE_GROUP_BY_STAGE[app.stage]) return;

    const toStage = targetGroup.defaultStage;

    // D-02: canTransition() ANTES do mutate — corrige bug #1.
    if (!canTransition(app.stage, toStage, "application")) {
      toast.error(
        `Não é possível mover de "${APPLICATION_STAGE_LABELS[app.stage]}" direto para "${APPLICATION_STAGE_LABELS[toStage]}".`,
      );
      return;
    }

    if (targetGroup.key === DESCARTADOS_KEY) setDescartadosOpen(true);

    if (!scope) return;
    move.mutate({
      id: app.id,
      fromStage: app.stage,
      toStage,
      jobId,
      companyId: scope.companyIds[0] ?? "",
    });
  };

  if (isLoading) {
    return <LoadingState layout="cards" count={4} />;
  }

  return (
    <div className="space-y-3">
      <LegacyStageWarning jobId={jobId} />
      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveApp(null)}
      >
        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-linear">
          {STAGE_GROUPS.map((g) => (
            <Column
              key={g.key}
              group={g}
              apps={columns.get(g.key) ?? []}
              onOpen={onOpenCandidate}
              collapsible={g.key === DESCARTADOS_KEY}
              defaultOpen={g.key !== DESCARTADOS_KEY}
              open={g.key === DESCARTADOS_KEY ? descartadosOpen : undefined}
              onOpenChange={g.key === DESCARTADOS_KEY ? setDescartadosOpen : undefined}
              selectedApplicationId={selectedApplicationId ?? null}
              onAddCandidate={
                onAddCandidate && g.key !== DESCARTADOS_KEY ? onAddCandidate : undefined
              }
            />
          ))}
        </div>
        <DragOverlay dropAnimation={null}>
          {activeApp ? <CandidateCard application={activeApp} asOverlay /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
