import { useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { LoadingState } from "@/components/primitives";
import { CandidateCard, type KanbanApplication } from "./CandidateCard";
import { OptimisticMutationToast } from "./OptimisticMutationToast";
import { useMoveApplicationStage } from "@/hooks/hiring/useApplications";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import type { ApplicationStage } from "@/integrations/supabase/hiring-types";
import { STAGE_GROUPS, STAGE_GROUP_DOT_COLORS, type StageGroup } from "@/lib/hiring/stageGroups";

export interface CandidateListFilters {
  search: string;
  stages: string[];
  jobIds: string[];
  ownerIds: string[];
}

interface AllCandidatesKanbanProps {
  onOpenCandidate?: (application: KanbanApplication) => void;
  selectedApplicationId?: string | null;
  filters?: CandidateListFilters;
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
  showJob?: boolean;
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
  showJob = false,
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
      className={cn(
        "flex min-w-[220px] max-w-[240px] shrink-0 flex-col rounded-md border border-border bg-surface",
        isOver && "ring-1 ring-accent",
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
        <button
          type="button"
          className="inline-flex h-4 w-4 items-center justify-center rounded text-text-subtle hover:bg-bg-subtle"
          aria-label="Adicionar candidato"
          tabIndex={-1}
        >
          <Plus className="h-3 w-3" />
        </button>
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
                showJob={showJob}
              />
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

const DESCARTADOS_KEY = "descartados" as const;

type ApplicationWithRelations = {
  id: string;
  candidate_id: string;
  stage: ApplicationStage;
  stage_entered_at: string;
  updated_at: string;
  last_moved_by: string | null;
  candidate: { id: string; full_name: string | null; email: string | null } | null;
  job: { id: string; title: string; requested_by: string } | null;
};

export function AllCandidatesKanban({
  onOpenCandidate,
  selectedApplicationId,
  filters,
}: AllCandidatesKanbanProps) {
  const move = useMoveApplicationStage();
  const [conflict, setConflict] = useState(false);
  const [activeApp, setActiveApp] = useState<KanbanApplication | null>(null);
  const [descartadosOpen, setDescartadosOpen] = useState(false);

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["hiring", "applications", "all-active"],
    queryFn: async (): Promise<ApplicationWithRelations[]> => {
      const { data, error } = await supabase
        .from("applications")
        .select(
          "id, candidate_id, stage, stage_entered_at, updated_at, last_moved_by, candidate:candidates!applications_candidate_id_fkey(id, full_name, email), job:job_openings!applications_job_opening_id_fkey(id, title, requested_by)",
        )
        .order("stage_entered_at", { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as ApplicationWithRelations[];
    },
  });

  const columns = useMemo(() => {
    const byGroup = new Map<string, KanbanApplication[]>();
    for (const g of STAGE_GROUPS) byGroup.set(g.key, []);
    const search = (filters?.search ?? "").trim().toLowerCase();
    const stages = filters?.stages ?? [];
    const jobIds = filters?.jobIds ?? [];
    const ownerIds = filters?.ownerIds ?? [];

    for (const a of applications) {
      // Filter by search (name or email)
      if (search) {
        const name = (a.candidate?.full_name || "").toLowerCase();
        const email = (a.candidate?.email || "").toLowerCase();
        if (!name.includes(search) && !email.includes(search)) continue;
      }
      if (stages.length && !stages.includes(a.stage)) continue;
      if (jobIds.length && (!a.job?.id || !jobIds.includes(a.job.id))) continue;
      if (ownerIds.length) {
        const owner = a.job?.requested_by ?? null;
        if (!owner || !ownerIds.includes(owner)) continue;
      }

      const kanbanApp: KanbanApplication = {
        id: a.id,
        candidate_id: a.candidate_id,
        candidate_name: a.candidate?.full_name || "Candidato",
        candidate_email: a.candidate?.email ?? null,
        job_id: a.job?.id ?? null,
        job_title: a.job?.title ?? null,
        owner_id: a.job?.requested_by ?? null,
        stage: a.stage,
        stage_entered_at: a.stage_entered_at,
      };
      const group = STAGE_GROUPS.find((g) => g.stages.includes(a.stage));
      if (group) byGroup.get(group.key)?.push(kanbanApp);
    }
    return byGroup;
  }, [applications, filters]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

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

  const onDragEnd = async (event: DragEndEvent) => {
    setActiveApp(null);
    const activeId = event.active.id as string;
    const overId = event.over?.id as string | undefined;
    if (!overId || !activeId.startsWith("app:") || !overId.startsWith("appcol:")) return;
    const appId = activeId.slice("app:".length);
    const groupKey = overId.slice("appcol:".length);
    const app = applications.find((a) => a.id === appId);
    if (!app) return;
    const targetGroup = STAGE_GROUPS.find((g) => g.key === groupKey);
    if (!targetGroup) return;

    const currentGroup = STAGE_GROUPS.find((g) => g.stages.includes(app.stage));
    if (currentGroup?.key === targetGroup.key) return;

    if (targetGroup.key === DESCARTADOS_KEY) setDescartadosOpen(true);

    const result = await move.mutateAsync({
      id: app.id,
      fromStage: app.stage,
      toStage: targetGroup.defaultStage,
      expectedUpdatedAt: app.updated_at,
    });
    if (!result.ok) setConflict(true);
  };

  if (isLoading) return <LoadingState layout="cards" count={4} />;

  return (
    <div className="space-y-3">
      <OptimisticMutationToast
        visible={conflict}
        onReload={() => {
          setConflict(false);
          window.location.reload();
        }}
        onDismiss={() => setConflict(false)}
      />
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
              showJob
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
