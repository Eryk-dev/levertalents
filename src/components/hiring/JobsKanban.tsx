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
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { JobCard } from "./JobCard";
import { JOB_STATUS_LABELS } from "@/lib/hiring/statusMachine";
import { useUpdateJobOpeningStatus } from "@/hooks/hiring/useJobOpenings";
import {
  useApplicationCountsByJobs,
  type JobApplicationCounts,
} from "@/hooks/hiring/useApplicationCountsByJob";
import type { JobOpeningRow, JobStatus } from "@/integrations/supabase/hiring-types";

const COLUMNS: JobStatus[] = [
  "aguardando_publicacao",
  "publicada",
  "fechada",
];

// Linear-style column dot colors
const COLUMN_DOT: Record<JobStatus, string> = {
  aguardando_publicacao: "bg-status-amber",
  publicada: "bg-status-green",
  fechada: "bg-text-subtle",
};

interface JobsKanbanProps {
  jobs: JobOpeningRow[];
  companyById: Map<string, string>;
  onOpenJob: (jobId: string) => void;
  onCreateJob?: () => void;
}

function Column({
  status,
  jobs,
  companyById,
  countsMap,
  onOpenJob,
  onCreateJob,
  collapsible,
}: {
  status: JobStatus;
  jobs: JobOpeningRow[];
  companyById: Map<string, string>;
  countsMap: Record<string, JobApplicationCounts | undefined>;
  onOpenJob: (id: string) => void;
  onCreateJob?: () => void;
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(!collapsible);
  const { setNodeRef, isOver } = useDroppable({ id: `jobcol:${status}` });

  return (
    <div className="flex flex-col w-[248px] shrink-0">
      <header className="flex items-center justify-between gap-2 px-0.5 pb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {collapsible && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="inline-flex h-4 w-4 items-center justify-center text-text-subtle hover:text-text"
              aria-label={open ? "Recolher" : "Expandir"}
            >
              {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
          )}
          <span className={cn("inline-block w-1.5 h-1.5 rounded-full", COLUMN_DOT[status])} />
          <h3 className="truncate text-[11px] font-semibold uppercase tracking-[0.06em] text-text">
            {JOB_STATUS_LABELS[status]}
          </h3>
          <span className="text-[11px] text-text-subtle tabular">{jobs.length}</span>
        </div>
        {onCreateJob ? (
          <button
            type="button"
            onClick={onCreateJob}
            className="text-text-subtle hover:text-text"
            aria-label="Nova vaga"
          >
            <Plus className="w-3 h-3" />
          </button>
        ) : null}
      </header>
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 space-y-1.5 overflow-y-auto scrollbar-linear transition-colors rounded-md p-0.5",
          isOver && "bg-accent-soft/60 ring-1 ring-accent/30",
        )}
      >
        {open && (
          <>
            {jobs.length === 0 ? (
              <div className="py-3.5 px-2 text-[11.5px] text-text-subtle text-center border border-dashed border-border rounded-md">
                Sem vagas
              </div>
            ) : (
              jobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  companyName={companyById.get(job.company_id)}
                  counts={countsMap[job.id]}
                  onOpen={() => onOpenJob(job.id)}
                />
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function JobsKanban({ jobs, companyById, onOpenJob, onCreateJob }: JobsKanbanProps) {
  const update = useUpdateJobOpeningStatus();
  const jobIds = useMemo(() => jobs.map((j) => j.id), [jobs]);
  const { data: countsMap = {} } = useApplicationCountsByJobs(jobIds);
  const [activeJob, setActiveJob] = useState<JobOpeningRow | null>(null);

  const byStatus = useMemo(() => {
    const map = new Map<JobStatus, JobOpeningRow[]>();
    for (const s of COLUMNS) map.set(s, []);
    for (const j of jobs) {
      const bucket = map.get(j.status);
      if (bucket) bucket.push(j);
    }
    return map;
  }, [jobs]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const onDragStart = (event: DragStartEvent) => {
    const id = event.active.id as string;
    if (!id.startsWith("job:")) return;
    const jobId = id.slice("job:".length);
    const found = jobs.find((j) => j.id === jobId);
    if (found) setActiveJob(found);
  };

  const onDragEnd = async (event: DragEndEvent) => {
    setActiveJob(null);
    const activeId = event.active.id as string;
    const overId = event.over?.id as string | undefined;
    if (!overId || !activeId.startsWith("job:") || !overId.startsWith("jobcol:")) return;
    const jobId = activeId.slice("job:".length);
    const targetStatus = overId.slice("jobcol:".length) as JobStatus;
    const job = jobs.find((j) => j.id === jobId);
    if (!job || job.status === targetStatus) return;
    update.mutate({
      id: job.id,
      expectedUpdatedAt: job.updated_at,
      nextStatus: targetStatus,
      successMessage: `Vaga movida para "${JOB_STATUS_LABELS[targetStatus]}"`,
    });
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveJob(null)}
    >
      <div className="flex gap-3 min-w-max pb-2">
        {COLUMNS.map((status) => (
          <Column
            key={status}
            status={status}
            jobs={byStatus.get(status) ?? []}
            companyById={companyById}
            countsMap={countsMap as Record<string, JobApplicationCounts | undefined>}
            onOpenJob={onOpenJob}
            onCreateJob={onCreateJob}
            collapsible={status === "fechada"}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeJob ? (
          <JobCard
            job={activeJob}
            companyName={companyById.get(activeJob.company_id)}
            counts={(countsMap as Record<string, JobApplicationCounts>)[activeJob.id]}
            onOpen={() => {}}
            asOverlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
