import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  Calendar,
  Check,
  Copy,
  Download,
  History,
  Link as LinkIcon,
  Mail,
  MessageCircle,
  MessageSquare,
  Phone,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import {
  EmptyState,
  Icon,
  LoadingState,
  StatusBadge,
} from "@/components/primitives";
import {
  Btn,
  Chip,
  LinearAvatar,
  LinearEmpty,
  Row,
  TimelineItem,
} from "@/components/primitives/LinearKit";
import { supabase } from "@/integrations/supabase/client";
import { useCandidate, useAnonymizeCandidate } from "@/hooks/hiring/useCandidates";
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
import { CulturalFitResponseViewer } from "@/components/hiring/CulturalFitResponseViewer";
import { BackgroundCheckUploader } from "@/components/hiring/BackgroundCheckUploader";
import { DiscardReasonDialog } from "@/components/hiring/DiscardReasonDialog";
import { InterviewScheduler } from "@/components/hiring/InterviewScheduler";
import { InterviewNotesEditor } from "@/components/hiring/InterviewNotesEditor";
import { HiringDecisionPanel } from "@/components/hiring/HiringDecisionPanel";
import { InterviewTimeline } from "@/components/hiring/InterviewTimeline";
import { AdmissionForm } from "@/components/hiring/AdmissionForm";
import { AdmissionStatusPanel } from "@/components/hiring/AdmissionStatusPanel";
import {
  APPLICATION_STAGE_LABELS,
  APPLICATION_STAGE_TRANSITIONS,
} from "@/lib/hiring/statusMachine";
import type {
  ApplicationRow,
  ApplicationStage,
  InterviewRow,
} from "@/integrations/supabase/hiring-types";
import { cn } from "@/lib/utils";

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

  return (
    <div className="flex flex-col h-full font-sans text-text animate-fade-in">
      {/* Top bar: breadcrumb + actions */}
      <div className="px-5 lg:px-7 pt-5 pb-3 border-b border-border">
        <div className="flex items-center justify-between gap-4 mb-2.5">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-[13px] text-text-muted min-w-0"
          >
            <Link
              to="/hiring/candidates"
              className="inline-flex items-center gap-1.5 hover:text-text transition-colors"
            >
              <Icon name="users" size={13} />
              Candidatos
            </Link>
            <span className="text-text-subtle">/</span>
            <span className="truncate font-medium text-text">{candidate.full_name}</span>
          </nav>
          <Row gap={6}>
            {active ? (
              <>
                {nextStages.length > 0 ? (
                  <Btn
                    variant="primary"
                    size="sm"
                    icon={<ArrowRight className="h-3.5 w-3.5" />}
                    onClick={() => {
                      setMoveChoice(nextStages[0]);
                      setMoveOpen(true);
                    }}
                  >
                    Avançar etapa
                  </Btn>
                ) : null}
                <Btn
                  variant="secondary"
                  size="sm"
                  icon={<Calendar className="h-3.5 w-3.5" />}
                  onClick={() => setSchedulerOpen(true)}
                >
                  Agendar
                </Btn>
                <Btn
                  variant="accent"
                  size="sm"
                  icon={<Sparkles className="h-3.5 w-3.5" />}
                  onClick={() => setIssueLinkOpen(true)}
                >
                  Fit
                </Btn>
              </>
            ) : null}
            <Btn
              variant="ghost"
              size="sm"
              icon={<MessageSquare className="h-3.5 w-3.5" />}
              onClick={() => setRefusalPickerOpen(true)}
              disabled={!active}
              className="text-status-red hover:!text-status-red"
            >
              Recusar
            </Btn>
            <Btn
              variant="ghost"
              size="sm"
              icon={<ShieldAlert className="h-3.5 w-3.5" />}
              onClick={() => setAnonymizeOpen(true)}
              className="text-text-muted hover:!text-status-red"
            >
              Anonimizar
            </Btn>
          </Row>
        </div>

        {/* Title row */}
        <Row align="start" gap={12}>
          <LinearAvatar name={candidate.full_name} size={40} />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h1 className="text-[22px] font-semibold tracking-[-0.02em] m-0 truncate">
                {candidate.full_name}
              </h1>
              {active ? (
                <StatusBadge kind="application" status={active.stage} size="sm" showIcon />
              ) : null}
              {candidate.anonymized_at ? (
                <Chip color="neutral" size="sm">
                  Anonimizado
                </Chip>
              ) : null}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[12.5px] text-text-muted">
              {candidate.email ? (
                <span className="inline-flex items-center gap-1 truncate">
                  <Mail className="h-3 w-3 shrink-0" /> {candidate.email}
                </span>
              ) : null}
              {candidate.phone ? (
                <>
                  <span className="text-text-subtle">·</span>
                  <span className="inline-flex items-center gap-1 truncate">
                    <Phone className="h-3 w-3 shrink-0" /> {candidate.phone}
                  </span>
                </>
              ) : null}
              {candidate.source ? (
                <>
                  <span className="text-text-subtle">·</span>
                  <span>Origem: {candidate.source}</span>
                </>
              ) : null}
            </div>
          </div>
        </Row>

      </div>

      {/* Body: main + right rail */}
      <div className="flex-1 min-h-0 overflow-hidden grid grid-cols-1 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0 min-h-0 overflow-auto scrollbar-linear">
          <div className="p-5 lg:p-7 max-w-[820px] mx-auto space-y-8">
            <PerfilSection
              candidate={candidate}
              active={active}
              job={job ?? null}
              interviews={interviews}
              onStartAdmission={() => setAdmissionOpen(true)}
              onIssueFit={() => setIssueLinkOpen(true)}
              onDownloadCv={handleDownloadCv}
              fitDone={fitDone}
              fitResponseAt={fitResponse?.submitted_at ?? null}
            />

            <section id="fit" className="scroll-mt-5 space-y-3">
              <SectionTitle
                icon={<Sparkles className="h-3.5 w-3.5" />}
                right={
                  fitDone ? (
                    <Chip color="green" size="sm">
                      Concluído
                    </Chip>
                  ) : active ? (
                    <Btn
                      variant="accent"
                      size="xs"
                      icon={<Sparkles className="h-3 w-3" />}
                      onClick={() => setIssueLinkOpen(true)}
                    >
                      Enviar Fit
                    </Btn>
                  ) : null
                }
              >
                Fit cultural
              </SectionTitle>
              {active ? (
                <CulturalFitResponseViewer
                  applicationId={active.id}
                  surveyId={fitResponse?.survey_id ?? null}
                />
              ) : (
                <LinearEmpty
                  icon={<Sparkles className="w-[18px] h-[18px]" />}
                  title="Sem aplicação ativa"
                  description="Sem uma aplicação, não é possível enviar ou ver o Fit Cultural."
                />
              )}
            </section>

            <section id="entrevistas" className="scroll-mt-5 space-y-3">
              <SectionTitle
                icon={<Calendar className="h-3.5 w-3.5" />}
                count={interviews.length || undefined}
                right={
                  active ? (
                    <Btn
                      variant="secondary"
                      size="xs"
                      icon={<Calendar className="h-3 w-3" />}
                      onClick={() => setSchedulerOpen(true)}
                    >
                      Agendar
                    </Btn>
                  ) : null
                }
              >
                Entrevistas
              </SectionTitle>
              <EntrevistasSection
                active={active}
                interviews={interviews}
                job={job ?? null}
                candidateId={candidate.id}
              />
            </section>

            <section id="antecedentes" className="scroll-mt-5 space-y-3">
              <SectionTitle icon={<ShieldCheck className="h-3.5 w-3.5" />}>
                Antecedentes
              </SectionTitle>
              {active && job ? (
                <BackgroundCheckUploader
                  applicationId={active.id}
                  candidateId={candidate.id}
                  companyId={job.company_id}
                  jobOpeningId={job.id}
                />
              ) : (
                <LinearEmpty
                  icon={<ShieldCheck className="w-[18px] h-[18px]" />}
                  title="Sem aplicação ativa"
                  description="Sem uma aplicação, não é possível enviar antecedentes."
                />
              )}
            </section>

            <section id="historico" className="scroll-mt-5 space-y-3">
              <SectionTitle
                icon={<History className="h-3.5 w-3.5" />}
                count={applications.length || undefined}
              >
                Histórico de aplicações
              </SectionTitle>
              <HistoricoSection
                applications={applications}
                activeId={active?.id ?? null}
                onPick={(id) => setActiveAppId(id)}
              />
            </section>
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

      {/* Dialog: Avançar etapa */}
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
                    if (!active || !moveChoice) return;
                    const result = await move.mutateAsync({
                      id: active.id,
                      fromStage: active.stage,
                      toStage: moveChoice,
                      expectedUpdatedAt: active.updated_at,
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

      {/* Dialog: Agendar entrevista */}
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

      {/* Dialog: Admissão */}
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

      {/* Dialog de descarte com motivo + banco de talentos */}
      <DiscardReasonDialog
        open={refusalPickerOpen}
        candidateName={candidate.full_name}
        loading={reject.isPending}
        onCancel={() => setRefusalPickerOpen(false)}
        onConfirm={handleDiscardConfirm}
      />

      {/* Dialog: Fit cultural */}
      <Dialog
        open={issueLinkOpen}
        onOpenChange={(open) => (open ? setIssueLinkOpen(true) : resetIssueLink())}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {issuedLink ? "Link gerado" : "Enviar Fit Cultural"}
            </DialogTitle>
          </DialogHeader>
          {issuedLink ? (
            <div className="space-y-4">
              <p className="text-[13px] text-text-muted">
                Compartilhe o link abaixo com o candidato.{" "}
                <span className="text-text">
                  Expira em{" "}
                  {new Date(issuedLink.expiresAt).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  .
                </span>
              </p>

              <div className="flex items-center gap-1.5 rounded-md border border-border bg-bg-subtle pl-2.5 pr-1 py-1">
                <LinkIcon className="h-3.5 w-3.5 text-text-subtle shrink-0" />
                <input
                  readOnly
                  value={issuedLink.url}
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 min-w-0 bg-transparent text-[12.5px] text-text outline-none truncate"
                />
                <Btn
                  variant={linkCopied ? "secondary" : "primary"}
                  size="xs"
                  icon={
                    linkCopied ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )
                  }
                  onClick={handleCopyLink}
                >
                  {linkCopied ? "Copiado" : "Copiar"}
                </Btn>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Btn
                  variant="secondary"
                  size="sm"
                  icon={<MessageCircle className="h-3.5 w-3.5" />}
                  onClick={handleSendWhatsapp}
                >
                  WhatsApp
                </Btn>
                <Btn
                  variant="secondary"
                  size="sm"
                  icon={<Mail className="h-3.5 w-3.5" />}
                  onClick={handleSendEmail}
                  disabled={!candidate.email}
                >
                  Email
                </Btn>
              </div>

              <DialogFooter className="pt-1">
                <Btn
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIssuedLink(null);
                    setLinkCopied(false);
                    setIssueLinkSurveyId(null);
                  }}
                >
                  Gerar novo
                </Btn>
                <Btn variant="primary" size="sm" onClick={resetIssueLink}>
                  Fechar
                </Btn>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-[13px] text-text-muted">
                Escolha o questionário e gere um link único. Validade: 3 dias.
              </p>
              {surveysQ.data?.length ? (
                <Select
                  value={issueLinkSurveyId ?? undefined}
                  onValueChange={(v) => setIssueLinkSurveyId(v)}
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
                <p className="text-[13px] text-text-muted">
                  Nenhum questionário ativo. Crie um em Fit Cultural.
                </p>
              )}
              <DialogFooter>
                <Btn variant="secondary" size="sm" onClick={resetIssueLink}>
                  Cancelar
                </Btn>
                <Btn
                  variant="primary"
                  size="sm"
                  disabled={!issueLinkSurveyId || issueLink.isPending}
                  onClick={handleGenerateFitLink}
                >
                  {issueLink.isPending ? "Gerando…" : "Gerar link"}
                </Btn>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Anonimizar */}
      <Dialog open={anonymizeOpen} onOpenChange={setAnonymizeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anonimizar candidato?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-muted">
            Essa ação é definitiva: apaga PII, CV, respostas do Fit e transcrições de entrevistas.
          </p>
          <DialogFooter>
            <Btn variant="secondary" size="sm" onClick={() => setAnonymizeOpen(false)}>
              Cancelar
            </Btn>
            <Btn
              variant="danger"
              size="sm"
              disabled={anonymize.isPending}
              onClick={() => {
                anonymize.mutate(candidate.id, {
                  onSuccess: () => setAnonymizeOpen(false),
                });
              }}
            >
              Anonimizar
            </Btn>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Sections ───────────────────────────────────────────── */

function PerfilSection({
  candidate,
  active,
  job,
  interviews,
  onStartAdmission,
  onDownloadCv,
  fitResponseAt,
}: {
  candidate: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    document_type: string | null;
    document_number: string | null;
    source: string | null;
    cv_storage_path: string | null;
  };
  active: ApplicationRow | null;
  job: { id: string; company_id: string; title?: string } | null;
  interviews: InterviewRow[];
  onStartAdmission: () => void;
  onIssueFit: () => void;
  onDownloadCv: () => void;
  fitDone: boolean;
  fitResponseAt: string | null;
}) {
  const summary =
    (candidate as typeof candidate & { summary?: string | null; bio?: string | null }).summary ??
    (candidate as typeof candidate & { summary?: string | null; bio?: string | null }).bio ??
    null;

  return (
    <section id="perfil" className="scroll-mt-5 space-y-5">
      <SectionTitle icon={<Icon name="book" size={14} />}>Perfil</SectionTitle>

      <div>
        <div className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-subtle">
          Resumo
        </div>
        {summary ? (
          <p className="mt-1 text-[13px] leading-[1.55] text-text">{summary}</p>
        ) : (
          <p className="mt-1 text-[12.5px] text-text-muted">—</p>
        )}
      </div>

      <div className="grid gap-3 text-[13px] md:grid-cols-2">
        <KVLine label="Documento">
          {candidate.document_type?.toUpperCase() ?? "—"}
          {candidate.document_number ? ` · ${candidate.document_number}` : ""}
        </KVLine>
        <KVLine label="Origem">{candidate.source ?? "—"}</KVLine>
        <KVLine label="Telefone">{candidate.phone ?? "—"}</KVLine>
        <KVLine label="CV">
          {candidate.cv_storage_path ? (
            <button
              type="button"
              onClick={onDownloadCv}
              className="inline-flex items-center gap-1 text-accent-text hover:underline"
            >
              <Download className="h-3 w-3" /> Baixar currículo
            </button>
          ) : (
            <span className="text-text-muted">Não enviado</span>
          )}
        </KVLine>
      </div>

      {active ? (
        <div>
          <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-subtle">
            Timeline
          </div>
          <AggregatedTimeline
            active={active}
            interviews={interviews}
            fitResponseAt={fitResponseAt}
          />
        </div>
      ) : null}

      {active && active.stage === "aprovado" && job ? (
        <div className="rounded-md border border-status-green/30 bg-status-green-soft p-3.5">
          <Row align="start" gap={10}>
            <Sparkles className="h-4 w-4 text-status-green shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-[12.5px] font-medium text-text">Pronto para admissão</p>
              <p className="text-[11.5px] text-text-muted mt-0.5">
                O candidato foi aprovado. Inicie o pré-cadastro quando quiser.
              </p>
            </div>
            <Btn variant="primary" size="sm" onClick={onStartAdmission}>
              Iniciar admissão
            </Btn>
          </Row>
        </div>
      ) : null}

      {active && (active.stage === "em_admissao" || active.stage === "admitido") ? (
        <AdmissionStatusPanel application={active} />
      ) : null}
    </section>
  );
}

function EntrevistasSection({
  active,
  interviews,
  job,
  candidateId,
}: {
  active: ApplicationRow | null;
  interviews: InterviewRow[];
  job: { id: string; company_id: string } | null;
  candidateId: string;
}) {
  if (!active) {
    return (
      <LinearEmpty
        icon={<Calendar className="w-[18px] h-[18px]" />}
        title="Sem aplicação ativa"
        description="Sem uma aplicação, não é possível agendar entrevistas."
      />
    );
  }
  if (interviews.length === 0) {
    return (
      <p className="text-[12.5px] text-text-muted">
        Nenhuma entrevista agendada. Use o botão "Agendar" acima para criar a primeira.
      </p>
    );
  }
  return (
    <div className="space-y-4">
      <InterviewTimeline interviews={interviews} />
      {job
        ? interviews.map((i) => (
            <div key={i.id} className="space-y-3">
              <InterviewNotesEditor
                interview={i}
                candidateId={candidateId}
                companyId={job.company_id}
                jobOpeningId={job.id}
              />
              {i.kind === "final" ? <HiringDecisionPanel interview={i} /> : null}
            </div>
          ))
        : null}
    </div>
  );
}

function HistoricoSection({
  applications,
  activeId,
  onPick,
}: {
  applications: ApplicationRow[];
  activeId: string | null;
  onPick: (id: string) => void;
}) {
  if (applications.length === 0) {
    return (
      <p className="text-[12.5px] text-text-muted">
        Este candidato ainda não tem aplicações.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      <ul className="divide-y divide-border rounded-md border border-border overflow-hidden">
        {applications.map((a) => (
          <li
            key={a.id}
            className={cn(
              "flex items-center justify-between gap-2 px-3 py-2.5 text-[12.5px] cursor-pointer hover:bg-bg-subtle transition-colors",
              activeId === a.id && "bg-accent-soft",
            )}
            onClick={() => onPick(a.id)}
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-text">
                Vaga {a.job_opening_id.slice(0, 8)}…
              </p>
              <p className="text-[11px] text-text-subtle">
                Entrada: {new Date(a.stage_entered_at).toLocaleDateString("pt-BR")}
              </p>
            </div>
            <StatusBadge kind="application" status={a.stage} size="sm" />
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─── Right rail — Linear Issue properties ───────────────── */

function CandidateRightRail({
  candidate,
  applications,
  active,
  job,
  fitDone,
  onPickApplication,
}: {
  candidate: {
    id: string;
    document_type: string | null;
    document_number: string | null;
    source: string | null;
    anonymized_at: string | null;
  };
  applications: ApplicationRow[];
  active: ApplicationRow | null;
  job: { id: string; title?: string } | null;
  fitDone: boolean;
  onPickApplication: (id: string) => void;
}) {
  const otherApps = applications.filter((a) => a.id !== active?.id);
  return (
    <div className="px-4 py-4 space-y-1">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-subtle mb-2">
        Propriedades
      </div>

      <PropertyRow label="Vaga atual">
        {job ? (
          <Link
            to={`/hiring/jobs/${job.id}`}
            className="inline-flex items-center gap-1 text-accent-text hover:underline min-w-0 truncate"
          >
            <Icon name="briefcase" size={12} className="shrink-0" />
            <span className="truncate">{job.title ?? "Abrir vaga"}</span>
          </Link>
        ) : (
          <span className="text-text-muted">—</span>
        )}
      </PropertyRow>

      <PropertyRow label="Stage atual">
        {active ? (
          <StatusBadge kind="application" status={active.stage} size="sm" />
        ) : (
          <span className="text-text-muted">—</span>
        )}
      </PropertyRow>

      <PropertyRow label="Aplicou em">
        {active ? (
          <span className="tabular-nums">
            {new Date(active.created_at).toLocaleDateString("pt-BR")}
          </span>
        ) : (
          <span className="text-text-muted">—</span>
        )}
      </PropertyRow>

      <PropertyRow label="Origem">
        <span>{candidate.source ?? "—"}</span>
      </PropertyRow>

      <PropertyRow label="Fit cultural">
        {fitDone ? (
          <Chip color="green" size="sm">
            Concluído
          </Chip>
        ) : active ? (
          <Chip color="neutral" size="sm">
            Pendente
          </Chip>
        ) : (
          <span className="text-text-muted">—</span>
        )}
      </PropertyRow>

      <PropertyRow label="Documento">
        <span className="truncate">
          {candidate.document_type?.toUpperCase() ?? "—"}
          {candidate.document_number ? ` · ${candidate.document_number}` : ""}
        </span>
      </PropertyRow>

      {candidate.anonymized_at ? (
        <PropertyRow label="Anonimizado em">
          <span className="tabular-nums">
            {new Date(candidate.anonymized_at).toLocaleDateString("pt-BR")}
          </span>
        </PropertyRow>
      ) : null}

      {otherApps.length > 0 ? (
        <div className="pt-3 mt-2 border-t border-border">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-subtle mb-1.5">
            Outras aplicações
          </div>
          <div className="flex flex-col gap-1">
            {otherApps.map((a) => (
              <button
                key={a.id}
                onClick={() => onPickApplication(a.id)}
                className="flex items-center justify-between gap-2 w-full text-left rounded px-2 py-1 hover:bg-bg-subtle transition-colors"
              >
                <span className="text-[12px] text-text truncate">
                  Vaga {a.job_opening_id.slice(0, 8)}…
                </span>
                <StatusBadge kind="application" status={a.stage} size="sm" />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ─── Helpers ────────────────────────────────────────────── */

function SectionTitle({
  children,
  icon,
  count,
  right,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  count?: number;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        {icon ? <span className="text-text-subtle">{icon}</span> : null}
        <h2 className="text-[13px] font-semibold tracking-[-0.005em] text-text m-0">
          {children}
        </h2>
        {typeof count === "number" ? (
          <span className="inline-flex items-center justify-center rounded bg-bg-muted px-1.5 text-[10.5px] tabular-nums text-text-muted">
            {count}
          </span>
        ) : null}
      </div>
      {right}
    </div>
  );
}

function KVLine({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10.5px] font-semibold text-text-subtle uppercase tracking-[0.04em]">
        {label}
      </div>
      <div className="text-[13px] text-text mt-0.5">{children}</div>
    </div>
  );
}

function PropertyRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-b-0 min-h-[30px]">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.04em] text-text-subtle shrink-0">
        {label}
      </div>
      <div className="text-[12.5px] text-text min-w-0 text-right truncate">{children}</div>
    </div>
  );
}

type TimelineEvent = {
  key: string;
  at: number;
  title: string;
  sub?: string;
  icon: React.ReactNode;
  active?: boolean;
};

function AggregatedTimeline({
  active,
  interviews,
  fitResponseAt,
}: {
  active: ApplicationRow;
  interviews: InterviewRow[];
  fitResponseAt: string | null;
}) {
  const events: TimelineEvent[] = [];

  if (active.stage_entered_at) {
    events.push({
      key: `stage:${active.id}`,
      at: new Date(active.stage_entered_at).getTime(),
      title: `Entrou em ${APPLICATION_STAGE_LABELS[active.stage]}`,
      icon: <ArrowRight className="h-[11px] w-[11px]" />,
    });
  }
  for (const i of interviews) {
    const label = i.kind === "final" ? "Entrevista final" : "Entrevista RH";
    const when = new Date(i.scheduled_at).toLocaleString("pt-BR");
    events.push({
      key: `interview:${i.id}`,
      at: new Date(i.scheduled_at).getTime(),
      title: `${label} ${i.status === "realizada" ? "concluída" : i.status === "cancelada" ? "cancelada" : "agendada"}`,
      sub: when,
      icon: <Calendar className="h-[11px] w-[11px]" />,
    });
  }
  if (fitResponseAt) {
    events.push({
      key: `fit`,
      at: new Date(fitResponseAt).getTime(),
      title: "Fit cultural respondido",
      icon: <Sparkles className="h-[11px] w-[11px]" />,
    });
  }
  events.sort((a, b) => a.at - b.at);
  if (events.length > 0) events[events.length - 1].active = true;
  if (events.length === 0) {
    return <p className="text-[12.5px] text-text-muted">Sem eventos ainda.</p>;
  }
  return (
    <div>
      {events.map((e, idx) => (
        <TimelineItem
          key={e.key}
          icon={e.icon}
          title={e.title}
          sub={e.sub}
          time={<span className="tabular-nums">{formatRelative(e.at)}</span>}
          active={e.active}
          last={idx === events.length - 1}
        />
      ))}
    </div>
  );
}

function formatRelative(timestamp: number) {
  const diff = Date.now() - timestamp;
  const dayMs = 86_400_000;
  const days = Math.floor(diff / dayMs);
  if (days <= 0) return "hoje";
  if (days === 1) return "ontem";
  if (days < 30) return `há ${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `há ${months}m`;
  return `há ${Math.floor(months / 12)}a`;
}
