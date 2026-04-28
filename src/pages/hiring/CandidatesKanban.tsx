import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Plus, ArrowLeft, ChevronDown, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { LoadingState, EmptyState } from "@/components/primitives";
import { Btn, Row } from "@/components/primitives/LinearKit";
import { CandidatesKanban } from "@/components/hiring/CandidatesKanban";
import { CandidateForm } from "@/components/hiring/CandidateForm";
import { CandidateDrawer } from "@/components/hiring/CandidateDrawer";
import type { KanbanApplication } from "@/components/hiring/CandidateCard";
import { LegacyStageWarning } from "@/components/hiring/LegacyStageWarning";
import { PipelineFilters } from "@/components/hiring/PipelineFilters";
import {
  BoardTableToggle,
  useKanbanView,
} from "@/components/hiring/BoardTableToggle";
import { CandidatesTable } from "@/components/hiring/CandidatesTable";
import { CardFieldsCustomizer } from "@/components/hiring/CardFieldsCustomizer";
import {
  useApplicationsByJob,
  useReuseCandidateForJob,
} from "@/hooks/hiring/useApplications";
import { useJobOpening } from "@/hooks/hiring/useJobOpening";
import { useTerminalApplications } from "@/hooks/hiring/useTerminalApplications";
import { APPLICATION_STAGE_LABELS } from "@/lib/hiring/statusMachine";
import { formatBRDate } from "@/lib/formatBR";

const ENCERRADAS_SESSION_KEY = "leverup:rs:encerradas-open";

/**
 * Page orchestration para CandidatesKanban (per-jobId).
 *
 * Wave 4 wire-in (Plan 02-10 gap closure — fecha SC-1 e SC-3 da
 * 02-VERIFICATION.md):
 *   - LegacyStageWarning + PipelineFilters + BoardTableToggle +
 *     CandidatesTable + CardFieldsCustomizer integrados (RS-09 + RS-13).
 *   - RS-10 Encerradas com lista real de terminais via
 *     `useTerminalApplications` — não mais placeholder + link.
 *   - Drawer aninhado preservado (Notion-style; feedback_ux.md).
 *   - Mobile overlay drawer + sessionStorage persist do Encerradas
 *     mantidos do Plan 02-09.
 */
export default function CandidatesKanbanPage() {
  const { id: jobId } = useParams<{ id: string }>();
  const { data: job, isLoading } = useJobOpening(jobId);
  const [formOpen, setFormOpen] = useState(false);
  const [candidateDrawer, setCandidateDrawer] = useState<{
    candidateId: string;
    applicationId: string;
  } | null>(null);
  const reuse = useReuseCandidateForJob();

  // Wave 4 wire-in (D-09): persiste preferência de view por jobId em
  // localStorage:leverup:rs:view:{jobId}. Hook trata jobId vazio
  // internamente (re-read via useEffect).
  const [view, setView] = useKanbanView(jobId ?? "");

  // RS-10 — encerradas colapsadas por default; sessionStorage persiste por sessão.
  const [encerradasOpen, setEncerradasOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(ENCERRADAS_SESSION_KEY) === "true";
  });

  // Compartilha cache com o board (mesmo queryKey via useScopedQuery): ambos
  // os views consomem a mesma useApplicationsByJob query — sem refetch ao
  // alternar Quadro/Tabela.
  const { data: applications = [] } = useApplicationsByJob(job?.id);

  const tableApplications: KanbanApplication[] = useMemo(
    () =>
      applications.map((a) => ({
        id: a.id,
        candidate_id: a.candidate_id,
        candidate_name: a.candidate?.full_name ?? "",
        candidate_email: a.candidate?.email ?? null,
        stage: a.stage,
        stage_entered_at: a.stage_entered_at,
        job_title: job?.title ?? null,
        nextInterviewAt: null,
      })),
    [applications, job?.title],
  );

  if (isLoading) return <LoadingState layout="cards" count={3} />;
  if (!job) {
    return (
      <div className="p-6 lg:p-10">
        <EmptyState
          title="Vaga não encontrada"
          action={
            <Btn variant="secondary" size="sm" icon={<ArrowLeft className="h-3.5 w-3.5" />}>
              <Link to="/hiring/jobs">Voltar</Link>
            </Btn>
          }
        />
      </div>
    );
  }

  const handleOpenCandidate = (app: KanbanApplication) => {
    setCandidateDrawer({ candidateId: app.candidate_id, applicationId: app.id });
  };

  const handleEncerradasToggle = (open: boolean) => {
    setEncerradasOpen(open);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(ENCERRADAS_SESSION_KEY, String(open));
    }
  };

  return (
    <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[1fr_420px] overflow-hidden font-sans text-text animate-fade-in">
      {/* Pipeline */}
      <div className="flex flex-col min-w-0 min-h-0 overflow-hidden">
        <div className="px-5 lg:px-7 pt-5 pb-3">
          <Row justify="between" align="start" gap={12}>
            <div className="min-w-0">
              <div className="text-[11px] text-text-subtle uppercase tracking-[0.06em] font-semibold">
                Candidatos da vaga
              </div>
              <h1 className="text-[20px] font-semibold tracking-[-0.02em] m-0 truncate mt-0.5">
                {job.title}
              </h1>
              <div className="text-[12.5px] text-text-muted mt-0.5">
                Arraste os cards para mover os candidatos pelas etapas. Clique para abrir.
              </div>
            </div>
            <Row gap={6}>
              <Btn variant="secondary" size="sm" icon={<ArrowLeft className="h-3.5 w-3.5" />}>
                <Link to={`/hiring/jobs/${job.id}`}>Voltar</Link>
              </Btn>
              <Btn
                variant="primary"
                size="sm"
                icon={<Plus className="h-3.5 w-3.5" />}
                onClick={() => setFormOpen(true)}
              >
                Novo candidato
              </Btn>
            </Row>
          </Row>
        </div>

        {/* Wave 4 wire-in (Plan 02-10): banner legacy + filtros inline +
            toolbar com toggle Quadro/Tabela e popover de customização. */}
        <div className="px-5 lg:px-7">
          <LegacyStageWarning jobId={job.id} />
        </div>

        <PipelineFilters />

        <Row
          justify="between"
          align="center"
          gap={6}
          className="px-5 lg:px-7 py-2"
        >
          <BoardTableToggle jobId={job.id} value={view} onChange={setView} />
          <CardFieldsCustomizer />
        </Row>

        <div className="flex-1 min-h-0 overflow-auto scrollbar-linear px-5 lg:px-7 pb-5">
          {view === "table" ? (
            <CandidatesTable
              applications={tableApplications}
              onOpen={handleOpenCandidate}
              selectedId={candidateDrawer?.applicationId ?? null}
            />
          ) : (
            <CandidatesKanban
              jobId={job.id}
              onOpenCandidate={handleOpenCandidate}
              selectedApplicationId={candidateDrawer?.applicationId ?? null}
            />
          )}

          {/* RS-10 — Encerradas (colapsada por default; sessionStorage persiste).
              Plan 02-10: substituído placeholder fixo por lista real de
              terminais via useTerminalApplications. */}
          <Collapsible open={encerradasOpen} onOpenChange={handleEncerradasToggle}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 mt-4 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-text-subtle bg-bg-subtle border border-border rounded-md w-full hover:text-text transition-colors"
              >
                {encerradasOpen ? (
                  <ChevronDown className="h-3 w-3" aria-hidden />
                ) : (
                  <ChevronRight className="h-3 w-3" aria-hidden />
                )}
                Histórico desta vaga (etapas finalizadas)
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <TerminalApplicationsList
                jobId={job.id}
                onOpen={handleOpenCandidate}
              />
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>

      {/* Drawer inline (desktop) */}
      <div className="hidden lg:flex min-h-0 overflow-hidden">
        <div className="flex-1 min-w-0 flex flex-col">
          <CandidateDrawer
            candidateId={candidateDrawer?.candidateId ?? null}
            applicationId={candidateDrawer?.applicationId ?? null}
            onClose={() => setCandidateDrawer(null)}
          />
        </div>
      </div>

      {/* Drawer mobile (overlay) */}
      {candidateDrawer ? (
        <div
          className="lg:hidden fixed inset-0 z-50 flex bg-black/30"
          onPointerDown={() => setCandidateDrawer(null)}
        >
          <div
            className="ml-auto h-full w-full max-w-[420px] bg-surface shadow-2xl flex flex-col"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <CandidateDrawer
              candidateId={candidateDrawer.candidateId}
              applicationId={candidateDrawer.applicationId}
              onClose={() => setCandidateDrawer(null)}
            />
          </div>
        </div>
      ) : null}

      {/* Novo candidato */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo candidato</DialogTitle>
          </DialogHeader>
          <CandidateForm
            jobOpeningId={job.id}
            companyId={job.company_id}
            onCancel={() => setFormOpen(false)}
            onCreated={async (candidateId) => {
              reuse.mutate({ candidateId, jobId: job.id });
              setFormOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * RS-10 Encerradas — lista real de applications em stages terminais
 * (admitido | reprovado_pelo_gestor | recusado) para a vaga corrente.
 * Deriva via useMemo de useApplicationsByJob (cache compartilhado com o
 * board — sem query DB extra).
 */
function TerminalApplicationsList({
  jobId,
  onOpen,
}: {
  jobId: string;
  onOpen: (app: KanbanApplication) => void;
}) {
  const { data: terminals = [], isLoading } = useTerminalApplications(jobId);

  if (isLoading) {
    return (
      <div className="px-3 py-3 text-[12.5px] text-text-muted">
        Carregando…
      </div>
    );
  }

  if (terminals.length === 0) {
    return (
      <div className="px-3 py-3 text-[12.5px] text-text-muted">
        Nenhum candidato em etapa final desta vaga.
      </div>
    );
  }

  return (
    <ul className="px-3 py-2 flex flex-col gap-1">
      {terminals.map((app) => (
        <li key={app.id}>
          <button
            type="button"
            onClick={() =>
              onOpen({
                id: app.id,
                candidate_id: app.candidate_id,
                candidate_name: app.candidate?.full_name ?? "",
                stage: app.stage,
                stage_entered_at: app.stage_entered_at,
              })
            }
            className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md hover:bg-bg-subtle text-left"
            aria-label={`Abrir ${app.candidate?.full_name ?? "candidato"}`}
          >
            <span className="text-[13px] font-medium truncate">
              {app.candidate?.full_name ?? "—"}
            </span>
            <span className="flex items-center gap-2 shrink-0 text-[11.5px] text-text-muted">
              <span>{APPLICATION_STAGE_LABELS[app.stage]}</span>
              <span aria-hidden>·</span>
              <span className="tabular-nums">
                {formatBRDate(app.stage_entered_at)}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
