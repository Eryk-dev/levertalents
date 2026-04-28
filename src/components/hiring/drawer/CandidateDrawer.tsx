import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Btn, Row } from "@/components/primitives/LinearKit";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCandidate } from "@/hooks/hiring/useCandidates";
import {
  useApplicationsByCandidate,
  useJobForApplication,
  useRejectApplication,
  useMoveApplicationStage,
} from "@/hooks/hiring/useApplications";
import {
  useFitResponse,
  useFitSurveys,
  useIssueFitLink,
} from "@/hooks/hiring/useCulturalFit";
import { useInterviewsByApplication } from "@/hooks/hiring/useInterviews";
import {
  APPLICATION_STAGE_LABELS,
  APPLICATION_STAGE_TRANSITIONS,
} from "@/lib/hiring/statusMachine";
import { InterviewScheduler } from "@/components/hiring/InterviewScheduler";
import { DiscardReasonDialog } from "@/components/hiring/DiscardReasonDialog";
import { AdmissionForm } from "@/components/hiring/AdmissionForm";
import { CandidateDrawerHeader } from "./CandidateDrawerHeader";
import { CandidateDrawerTabs, type DrawerTab } from "./CandidateDrawerTabs";
import { CandidateDrawerContent } from "./CandidateDrawerContent";
import type {
  ApplicationStage,
  InterviewRow,
} from "@/integrations/supabase/hiring-types";

interface CandidateDrawerProps {
  candidateId: string | null;
  applicationId?: string | null;
  onClose: () => void;
}

const VALID_TABS: DrawerTab[] = [
  "perfil",
  "entrevistas",
  "fit",
  "antecedentes",
  "historico",
  "audit",
];

function parseTab(raw: string | null): DrawerTab {
  return raw && (VALID_TABS as string[]).includes(raw) ? (raw as DrawerTab) : "perfil";
}

/**
 * Plan 02-09 Task 1a — Shell do CandidateDrawer (≤200 linhas).
 *
 * Substitui a versão monolítica de 867 linhas (`src/components/hiring/CandidateDrawer.tsx`).
 * Quebrado em:
 *   - CandidateDrawerHeader (avatar + nome + ações primárias)
 *   - CandidateDrawerTabs (tab strip)
 *   - CandidateDrawerContent (switch sobre activeTab → *TabContent)
 *
 * State (active application, dialogs, tab) fica aqui no shell. Sub-componentes
 * são puros presentacionais com props in / callbacks out (Notion-style nested
 * drawer — feedback_ux.md: nunca navega para fora do board).
 *
 * activeTab sincroniza com URL via `useSearchParams("?tab=")` — botão back
 * volta para tab anterior; refresh preserva tab.
 */
export function CandidateDrawer({
  candidateId,
  applicationId,
  onClose,
}: CandidateDrawerProps) {
  if (!candidateId) {
    return (
      <aside className="hidden lg:flex h-full flex-col items-center justify-center border-l border-border bg-bg px-6 text-center text-text-subtle">
        <div className="mx-auto mb-3 grid h-9 w-9 place-items-center rounded-md bg-bg-subtle">
          <FileText className="h-4 w-4" strokeWidth={1.75} />
        </div>
        <p className="text-[13px] font-medium text-text">Selecione um candidato</p>
        <p className="mt-1 max-w-[280px] text-[12px]">
          Clique em um card do pipeline para ver perfil, entrevistas, fit cultural e histórico.
        </p>
      </aside>
    );
  }

  return (
    <CandidateDrawerBody
      candidateId={candidateId}
      preferredApplicationId={applicationId ?? null}
      onClose={onClose}
    />
  );
}

function CandidateDrawerBody({
  candidateId,
  preferredApplicationId,
  onClose,
}: {
  candidateId: string;
  preferredApplicationId: string | null;
  onClose: () => void;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = parseTab(searchParams.get("tab"));
  const { userRole } = useAuth();
  // Audit log tab visível para is_people_manager (admin/rh) — RLS filtra
  // o conteúdo também (defense in depth).
  const showAuditLog = userRole === "admin" || userRole === "rh";

  const { data: candidate, isLoading } = useCandidate(candidateId);
  const { data: applications = [] } = useApplicationsByCandidate(candidateId);
  const [activeAppId, setActiveAppId] = useState<string | null>(preferredApplicationId);

  const [schedulerOpen, setSchedulerOpen] = useState(false);
  const [issueLinkOpen, setIssueLinkOpen] = useState(false);
  const [refusalOpen, setRefusalOpen] = useState(false);
  const [admissionOpen, setAdmissionOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveChoice, setMoveChoice] = useState<ApplicationStage | null>(null);

  const active =
    applications.find((a) => a.id === (activeAppId ?? preferredApplicationId)) ??
    applications[0] ??
    null;

  const { data: job } = useJobForApplication(active?.id);
  const { data: fitResponse } = useFitResponse(active?.id);
  const surveysQ = useFitSurveys();
  const issueLink = useIssueFitLink();
  const { data: interviews = [] } = useInterviewsByApplication(active?.id);
  const reject = useRejectApplication();
  const move = useMoveApplicationStage();

  const setActiveTab = (tab: DrawerTab) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", tab);
        return next;
      },
      { replace: true },
    );
  };

  // ESC fecha drawer (preserva scroll do board parent)
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  if (isLoading || !candidate) {
    return (
      <aside className="flex h-full flex-col border-l border-border bg-surface">
        <div className="flex h-full items-center justify-center text-[12.5px] text-text-muted">
          Carregando candidato...
        </div>
      </aside>
    );
  }

  const nextStages: ApplicationStage[] = active
    ? APPLICATION_STAGE_TRANSITIONS[active.stage]
    : [];

  const handleDownloadCv = async () => {
    if (!candidate.cv_storage_path) return;
    const { data } = await supabase.storage
      .from("hiring")
      .createSignedUrl(candidate.cv_storage_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  return (
    <aside
      className="flex h-full flex-col w-full md:w-[480px] shrink-0 border-l border-border bg-surface overflow-hidden"
      role="complementary"
      aria-label="Detalhes do candidato"
    >
      <CandidateDrawerHeader
        candidate={candidate}
        active={active}
        applications={applications}
        hasNextStage={nextStages.length > 0}
        hasCv={!!candidate.cv_storage_path}
        onClose={onClose}
        onAdvanceStage={() => {
          setMoveChoice(nextStages[0] ?? null);
          setMoveOpen(true);
        }}
        onSchedule={() => setSchedulerOpen(true)}
        onIssueFit={() => setIssueLinkOpen(true)}
        onDownloadCv={handleDownloadCv}
        onRefuse={() => setRefusalOpen(true)}
        onSelectApplication={(id) => setActiveAppId(id)}
      />

      <CandidateDrawerTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showAuditLog={showAuditLog}
      />

      <CandidateDrawerContent
        activeTab={activeTab}
        candidate={candidate}
        active={active}
        applications={applications}
        job={job ?? null}
        fitResponse={fitResponse ?? null}
        interviews={interviews as InterviewRow[]}
        onDownloadCv={handleDownloadCv}
        onIssueFit={() => setIssueLinkOpen(true)}
        onSchedule={() => setSchedulerOpen(true)}
        onStartAdmission={() => setAdmissionOpen(true)}
      />

      {/* Dialogs auxiliares (estado lifted no shell) */}
      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Avançar etapa</DialogTitle>
          </DialogHeader>
          {active ? (
            <div className="space-y-3">
              <p className="text-sm text-text-muted">
                De <strong className="text-text">{APPLICATION_STAGE_LABELS[active.stage]}</strong> para:
              </p>
              <Select
                value={moveChoice ?? undefined}
                onValueChange={(v) => setMoveChoice(v as ApplicationStage)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Escolha a próxima etapa" />
                </SelectTrigger>
                <SelectContent>
                  {nextStages.map((s) => (
                    <SelectItem key={s} value={s}>
                      {APPLICATION_STAGE_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Row justify="end" gap={8} className="pt-2">
                <Btn variant="secondary" size="sm" onClick={() => setMoveOpen(false)}>
                  Cancelar
                </Btn>
                <Btn
                  variant="primary"
                  size="sm"
                  disabled={!moveChoice}
                  onClick={async () => {
                    if (!active || !moveChoice || !job) return;
                    const result = await move.mutateAsync({
                      id: active.id,
                      fromStage: active.stage,
                      toStage: moveChoice,
                      jobId: job.id,
                      companyId: job.company_id,
                    });
                    if (result.ok) setMoveOpen(false);
                  }}
                >
                  Mover
                </Btn>
              </Row>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {active ? (
        <Dialog open={schedulerOpen} onOpenChange={setSchedulerOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Agendar entrevista</DialogTitle>
            </DialogHeader>
            <InterviewScheduler
              applicationId={active.id}
              onCancel={() => setSchedulerOpen(false)}
              onCreated={() => setSchedulerOpen(false)}
            />
          </DialogContent>
        </Dialog>
      ) : null}

      <DiscardReasonDialog
        open={refusalOpen}
        candidateName={candidate.full_name}
        loading={reject.isPending}
        onCancel={() => setRefusalOpen(false)}
        onConfirm={({ reason, addToTalentPool, notes }) => {
          if (!active) return;
          reject.mutate(
            {
              id: active.id,
              discardReason: reason,
              addToTalentPool,
              discardNotes: notes,
            },
            {
              onSuccess: () => {
                setRefusalOpen(false);
                onClose();
              },
            },
          );
        }}
      />

      <Dialog open={issueLinkOpen} onOpenChange={setIssueLinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Fit Cultural</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-text-muted">
              Escolha o questionário para gerar um link único válido por 3 dias.
            </p>
            {surveysQ.data?.length ? (
              <Select
                onValueChange={(surveyId) => {
                  if (!active) return;
                  issueLink.mutate(
                    { applicationId: active.id, surveyId },
                    { onSuccess: () => setIssueLinkOpen(false) },
                  );
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o questionário" />
                </SelectTrigger>
                <SelectContent>
                  {surveysQ.data.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-text-muted">
                Nenhum questionário ativo. Crie um em &ldquo;Fit Cultural&rdquo;.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {active && admissionOpen && job ? (
        <Dialog open={admissionOpen} onOpenChange={setAdmissionOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Iniciar admissão</DialogTitle>
            </DialogHeader>
            <AdmissionForm
              application={active}
              companyId={job.company_id}
              onCancel={() => setAdmissionOpen(false)}
              onStarted={() => setAdmissionOpen(false)}
            />
          </DialogContent>
        </Dialog>
      ) : null}
    </aside>
  );
}

export default CandidateDrawer;
