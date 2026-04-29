import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState, LoadingState } from "@/components/primitives";
import { supabase } from "@/integrations/supabase/client";
import {
  useCandidate,
  useAnonymizeCandidate,
} from "@/hooks/hiring/useCandidates";
import {
  useApplicationsByCandidate,
  useJobForApplication,
  useMoveApplicationStage,
  useRejectApplication,
} from "@/hooks/hiring/useApplications";
import {
  useFitResponse,
  useFitSurveys,
  useIssueFitLink,
} from "@/hooks/hiring/useCulturalFit";
import { useInterviewsByApplication } from "@/hooks/hiring/useInterviews";
import { DiscardReasonDialog } from "@/components/hiring/DiscardReasonDialog";
import { InterviewScheduler } from "@/components/hiring/InterviewScheduler";
import { AdmissionForm } from "@/components/hiring/AdmissionForm";
import { APPLICATION_STAGE_TRANSITIONS } from "@/lib/hiring/statusMachine";
import type {
  ApplicationRow,
  ApplicationStage,
} from "@/integrations/supabase/hiring-types";
import { CandidateHeader } from "@/features/hiring-candidate-profile/components/CandidateHeader";
import { CandidateApplicationsSection } from "@/features/hiring-candidate-profile/components/CandidateApplicationsSection";
import { CandidateFitSection } from "@/features/hiring-candidate-profile/components/CandidateFitSection";
import { CandidateDecisionSection } from "@/features/hiring-candidate-profile/components/CandidateDecisionSection";
import {
  CandidateAuditSection,
  CandidateRightRail,
} from "@/features/hiring-candidate-profile/components/CandidateAuditSection";
import { CandidateFitLinkDialog } from "@/features/hiring-candidate-profile/components/CandidateFitLinkDialog";
import { CandidateMoveStageDialog } from "@/features/hiring-candidate-profile/components/CandidateMoveStageDialog";
import { CandidateAnonymizeDialog } from "@/features/hiring-candidate-profile/components/CandidateAnonymizeDialog";

/**
 * CandidateProfile — page shell.
 *
 * Orquestra os hooks canônicos do domínio (useCandidate, useApplicationsByCandidate,
 * useFitResponse, useFitSurveys, useInterviewsByApplication, useAnonymizeCandidate,
 * useJobForApplication, useMoveApplicationStage, useRejectApplication, useIssueFitLink)
 * e compõe 5 sub-seções via feature folder src/features/hiring-candidate-profile/.
 *
 * Plan 04-06 (split QUAL-04). Sem mudança funcional — refator estrutural.
 */
export default function CandidateProfile() {
  const { id: candidateId } = useParams<{ id: string }>();
  const { data: candidate, isLoading } = useCandidate(candidateId);
  const { data: applications = [] } = useApplicationsByCandidate(candidateId);

  const [activeAppId, setActiveAppId] = useState<string | null>(null);
  const [refusalPickerOpen, setRefusalPickerOpen] = useState(false);
  const [issueLinkOpen, setIssueLinkOpen] = useState(false);
  const [issueLinkSurveyId, setIssueLinkSurveyId] = useState<string | null>(null);
  const [issuedLink, setIssuedLink] = useState<{ url: string; expiresAt: string } | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [anonymizeOpen, setAnonymizeOpen] = useState(false);
  const [schedulerOpen, setSchedulerOpen] = useState(false);
  const [admissionOpen, setAdmissionOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveChoice, setMoveChoice] = useState<ApplicationStage | null>(null);

  const anonymize = useAnonymizeCandidate();
  const reject = useRejectApplication();
  const move = useMoveApplicationStage();
  const issueLink = useIssueFitLink();
  const surveysQ = useFitSurveys();

  const active: ApplicationRow | null = useMemo(() => {
    if (!applications.length) return null;
    const byId = applications.find((a) => a.id === activeAppId);
    if (byId) return byId;
    return applications[0];
  }, [applications, activeAppId]);

  const { data: job } = useJobForApplication(active?.id);
  const { data: fitResponse } = useFitResponse(active?.id);
  const { data: interviews = [] } = useInterviewsByApplication(active?.id);

  if (isLoading) return <LoadingState layout="list" count={4} />;
  if (!candidate) {
    return (
      <div className="p-6 lg:p-10">
        <EmptyState title="Candidato não encontrado" />
      </div>
    );
  }

  const handleDiscardConfirm = (args: {
    reason: import("@/integrations/supabase/hiring-types").DiscardReason;
    addToTalentPool: boolean;
    notes: string | null;
  }) => {
    if (!active) return;
    reject.mutate(
      {
        id: active.id,
        discardReason: args.reason,
        addToTalentPool: args.addToTalentPool,
        discardNotes: args.notes,
      },
      { onSuccess: () => setRefusalPickerOpen(false) },
    );
  };

  const handleDownloadCv = async () => {
    if (!candidate.cv_storage_path) return;
    const { data } = await supabase.storage
      .from("hiring")
      .createSignedUrl(candidate.cv_storage_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const resetIssueLink = () => {
    setIssueLinkOpen(false);
    setIssueLinkSurveyId(null);
    setIssuedLink(null);
    setLinkCopied(false);
  };

  const handleGenerateFitLink = () => {
    if (!active || !issueLinkSurveyId) return;
    issueLink.mutate(
      { applicationId: active.id, surveyId: issueLinkSurveyId },
      {
        onSuccess: (payload) => {
          setIssuedLink({ url: payload.public_url, expiresAt: payload.expires_at });
        },
      },
    );
  };

  const handleCopyLink = async () => {
    if (!issuedLink) return;
    try {
      await navigator.clipboard.writeText(issuedLink.url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      /* noop */
    }
  };

  const fitMessageText = (url: string) =>
    `Olá ${candidate.full_name.split(" ")[0] ?? ""}! Para dar seguimento no processo, poderia responder esse questionário rápido? ${url}`;

  const handleSendWhatsapp = () => {
    if (!issuedLink) return;
    const phone = (candidate.phone ?? "").replace(/\D+/g, "");
    const text = encodeURIComponent(fitMessageText(issuedLink.url));
    const base = phone ? `https://wa.me/${phone}` : "https://wa.me/";
    window.open(`${base}?text=${text}`, "_blank", "noopener,noreferrer");
  };

  const handleSendEmail = () => {
    if (!issuedLink) return;
    const subject = encodeURIComponent("Questionário de Fit Cultural");
    const body = encodeURIComponent(fitMessageText(issuedLink.url));
    const to = candidate.email ?? "";
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
  };

  const nextStages: ApplicationStage[] = active
    ? APPLICATION_STAGE_TRANSITIONS[active.stage]
    : [];

  const fitDone = !!fitResponse?.submitted_at;

  const handleAdvance = (next: ApplicationStage) => {
    setMoveChoice(next);
    setMoveOpen(true);
  };

  const handleMoveConfirm = async () => {
    if (!active || !moveChoice) return;
    const result = await move.mutateAsync({
      id: active.id,
      fromStage: active.stage,
      toStage: moveChoice,
      expectedUpdatedAt: active.updated_at,
    });
    if (result.ok) setMoveOpen(false);
  };

  const handleResetIssued = () => {
    setIssuedLink(null);
    setLinkCopied(false);
    setIssueLinkSurveyId(null);
  };

  return (
    <div className="flex flex-col h-full font-sans text-text animate-fade-in">
      <CandidateHeader
        candidate={candidate}
        active={active}
        nextStages={nextStages}
        onAdvance={handleAdvance}
        onSchedule={() => setSchedulerOpen(true)}
        onIssueFit={() => setIssueLinkOpen(true)}
        onRefuse={() => setRefusalPickerOpen(true)}
        onAnonymize={() => setAnonymizeOpen(true)}
      />

      {/* Body: main + right rail */}
      <div className="flex-1 min-h-0 overflow-hidden grid grid-cols-1 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0 min-h-0 overflow-auto scrollbar-linear">
          <div className="p-5 lg:p-7 max-w-[820px] mx-auto space-y-8">
            <CandidateDecisionSection
              candidate={candidate}
              active={active}
              job={job ?? null}
              interviews={interviews}
              fitResponseAt={fitResponse?.submitted_at ?? null}
              onStartAdmission={() => setAdmissionOpen(true)}
              onDownloadCv={handleDownloadCv}
            />

            <CandidateFitSection
              active={active}
              fitResponse={fitResponse ?? null}
              onIssueFit={() => setIssueLinkOpen(true)}
            />

            <CandidateApplicationsSection
              candidateId={candidate.id}
              applications={applications}
              active={active}
              interviews={interviews}
              job={job ?? null}
              onPickApplication={(id) => setActiveAppId(id)}
              onSchedule={() => setSchedulerOpen(true)}
            />

            <CandidateAuditSection
              candidate={candidate}
              active={active}
              job={job ?? null}
            />
          </div>
        </div>

        {/* Right rail */}
        <aside className="hidden lg:flex flex-col min-h-0 overflow-auto scrollbar-linear border-l border-border bg-bg">
          <CandidateRightRail
            candidate={candidate}
            applications={applications}
            active={active}
            job={job ?? null}
            fitDone={fitDone}
            onPickApplication={(id) => setActiveAppId(id)}
          />
        </aside>
      </div>

      <CandidateMoveStageDialog
        open={moveOpen}
        onOpenChange={setMoveOpen}
        active={active}
        nextStages={nextStages}
        moveChoice={moveChoice}
        onMoveChoiceChange={setMoveChoice}
        onConfirm={handleMoveConfirm}
      />

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

      <DiscardReasonDialog
        open={refusalPickerOpen}
        candidateName={candidate.full_name}
        loading={reject.isPending}
        onCancel={() => setRefusalPickerOpen(false)}
        onConfirm={handleDiscardConfirm}
      />

      <CandidateFitLinkDialog
        open={issueLinkOpen}
        onClose={resetIssueLink}
        surveys={surveysQ.data ?? []}
        surveyId={issueLinkSurveyId}
        onSurveyIdChange={setIssueLinkSurveyId}
        issuedLink={issuedLink}
        isGenerating={issueLink.isPending}
        onGenerate={handleGenerateFitLink}
        onResetIssued={handleResetIssued}
        linkCopied={linkCopied}
        onCopyLink={handleCopyLink}
        onSendWhatsapp={handleSendWhatsapp}
        onSendEmail={handleSendEmail}
        candidateEmail={candidate.email ?? null}
      />

      <CandidateAnonymizeDialog
        open={anonymizeOpen}
        onOpenChange={setAnonymizeOpen}
        loading={anonymize.isPending}
        onConfirm={() =>
          anonymize.mutate(candidate.id, {
            onSuccess: () => setAnonymizeOpen(false),
          })
        }
      />
    </div>
  );
}
