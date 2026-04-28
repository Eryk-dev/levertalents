import { useState } from "react";
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
import { useJobOpening } from "@/hooks/hiring/useJobOpening";
import { useReuseCandidateForJob } from "@/hooks/hiring/useApplications";

const ENCERRADAS_SESSION_KEY = "leverup:rs:encerradas-open";

/**
 * Plan 02-09 Task 4 — Page orchestration para CandidatesKanban (per-jobId).
 *
 * Integra:
 *   - CandidatesKanban (board) + CandidateDrawer aninhado (Notion-style;
 *     feedback_ux.md — nunca navega fora da page)
 *   - Drawer mobile via overlay; desktop via grid 1fr/420px
 *   - RS-10 Encerradas colapsadas (sessionStorage persist por sessão)
 *
 * Wiring de LegacyStageWarning + BoardTableToggle + CandidatesTable +
 * CardFieldsCustomizer fica como TODO — esses componentes são entregues por
 * Plans 02-07 e 02-08 (em execução paralela). O orquestrador centraliza o
 * merge antes da Wave 5 / verify.
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

  // RS-10 — encerradas colapsadas por default; sessionStorage persiste por sessão
  const [encerradasOpen, setEncerradasOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(ENCERRADAS_SESSION_KEY) === "true";
  });

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

        {/*
         * TODO Wave 4 wire-in (após merge Plans 02-07 / 02-08):
         *   <LegacyStageWarning jobId={job.id} />        // Plan 02-07
         *   <PipelineFilters />                          // Plan 02-08 inline (URL state)
         *   <BoardTableToggle jobId={job.id} value={view} onChange={setView} />  // Plan 02-08
         *   <CardFieldsCustomizer />                     // Plan 02-08
         *   {view === "table" ? <CandidatesTable ... /> : <CandidatesKanban ... />}
         */}

        <div className="flex-1 min-h-0 overflow-auto scrollbar-linear px-5 lg:px-7 pb-5">
          <CandidatesKanban
            jobId={job.id}
            onOpenCandidate={handleOpenCandidate}
            selectedApplicationId={candidateDrawer?.applicationId ?? null}
          />

          {/* RS-10 — Vagas encerradas colapsada (apenas placeholder; full list
              vive em /hiring/jobs page agregada). Mantido aqui para preservar
              padrão de Collapsible com sessionStorage para essa funcionalidade
              do plano. */}
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
              <div className="px-3 py-3 text-[12.5px] text-text-muted">
                Etapas terminais (admitido/recusado/reprovado) ficam aqui
                quando expandido. Lista detalhada vive em
                <Link to="/hiring/jobs" className="ml-1 text-accent-text underline">
                  /hiring/jobs
                </Link>
                .
              </div>
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
