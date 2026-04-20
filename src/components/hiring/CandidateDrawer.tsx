import { useState } from "react";
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
import {
  Calendar,
  Download,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Phone,
  Mail,
  FileText,
  History,
  X,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Btn, Chip, Row, LinearAvatar, ProgressBar, TimelineItem } from "@/components/primitives/LinearKit";
import { StatusBadge } from "@/components/primitives";
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
import { CulturalFitResponseViewer } from "./CulturalFitResponseViewer";
import { InterviewTimeline } from "./InterviewTimeline";
import { InterviewScheduler } from "./InterviewScheduler";
import { StandardMessagePicker } from "./StandardMessagePicker";
import { BackgroundCheckUploader } from "./BackgroundCheckUploader";
import { AdmissionForm } from "./AdmissionForm";
import { AdmissionStatusPanel } from "./AdmissionStatusPanel";
import { HiringDecisionPanel } from "./HiringDecisionPanel";
import { InterviewNotesEditor } from "./InterviewNotesEditor";
import type {
  ApplicationStage,
  CulturalFitResponseRow,
  InterviewRow,
} from "@/integrations/supabase/hiring-types";

interface CandidateDrawerProps {
  candidateId: string | null;
  applicationId?: string | null;
  onClose: () => void;
}

type DrawerTab = "perfil" | "entrevistas" | "fit" | "antecedentes" | "historico";

/**
 * Painel inline (não é mais um Sheet). Renderizado ao lado do pipeline:
 * layout pai usa grid `1fr 420px`. Fecha via botão X ou ao clicar em outro
 * candidato — o pai controla o estado.
 */
export function CandidateDrawer({ candidateId, applicationId, onClose }: CandidateDrawerProps) {
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
  const { data: candidate, isLoading } = useCandidate(candidateId);
  const { data: applications = [] } = useApplicationsByCandidate(candidateId);
  const [activeAppId, setActiveAppId] = useState<string | null>(preferredApplicationId);
  const [tab, setTab] = useState<DrawerTab>("perfil");
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

  const contactMeta = [candidate.email, candidate.phone].filter(Boolean).join(" · ");

  const tabs: { k: DrawerTab; label: string; icon: typeof FileText }[] = [
    { k: "perfil", label: "Perfil", icon: FileText },
    { k: "entrevistas", label: "Entrevistas", icon: Calendar },
    { k: "fit", label: "Fit", icon: Sparkles },
    { k: "antecedentes", label: "Antecedentes", icon: ShieldCheck },
    { k: "historico", label: "Histórico", icon: History },
  ];

  return (
    <aside className="flex h-full flex-col border-l border-border bg-surface overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-border">
        <Row align="start" gap={10}>
          <LinearAvatar name={candidate.full_name} size={36} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-[15px] font-semibold text-text tracking-[-0.01em] truncate">
                  {candidate.full_name}
                </h2>
                {contactMeta ? (
                  <div className="mt-0.5 flex flex-wrap gap-2 text-[11.5px] text-text-muted">
                    {candidate.email ? (
                      <span className="inline-flex items-center gap-1 truncate">
                        <Mail className="h-3 w-3 shrink-0" aria-hidden /> {candidate.email}
                      </span>
                    ) : null}
                    {candidate.phone ? (
                      <span className="inline-flex items-center gap-1 truncate">
                        <Phone className="h-3 w-3 shrink-0" aria-hidden /> {candidate.phone}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="rounded p-1 text-text-subtle hover:bg-bg-subtle hover:text-text-muted transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </Row>

        {active ? (
          <>
            <Row gap={6} className="mt-2.5 flex-wrap">
              <StatusBadge kind="application" status={active.stage} size="sm" showIcon />
              {applications.length > 1 ? (
                <Select value={active.id} onValueChange={(v) => setActiveAppId(v)}>
                  <SelectTrigger className="h-[22px] w-auto px-2 text-[11px] gap-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {applications.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {APPLICATION_STAGE_LABELS[a.stage]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
            </Row>

            <Row gap={6} className="mt-3 flex-wrap">
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
                variant="secondary"
                size="sm"
                icon={<Sparkles className="h-3.5 w-3.5" />}
                onClick={() => setIssueLinkOpen(true)}
              >
                Fit
              </Btn>
              {candidate.cv_storage_path ? (
                <Btn
                  variant="secondary"
                  size="sm"
                  icon={<Download className="h-3.5 w-3.5" />}
                  onClick={handleDownloadCv}
                >
                  CV
                </Btn>
              ) : null}
              <div className="flex-1" />
              <Btn
                variant="ghost"
                size="sm"
                className="text-status-red hover:!text-status-red"
                icon={<MessageSquare className="h-3.5 w-3.5" />}
                onClick={() => setRefusalOpen(true)}
              >
                Recusar
              </Btn>
            </Row>
          </>
        ) : null}
      </div>

      {/* Tabs */}
      <div className="flex items-end gap-0 border-b border-border px-4">
        {tabs.map((t) => {
          const TIcon = t.icon;
          const isActive = tab === t.k;
          return (
            <button
              key={t.k}
              type="button"
              onClick={() => setTab(t.k)}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-2 text-[12.5px] transition-colors -mb-px",
                "border-b-2",
                isActive
                  ? "text-text font-semibold border-text"
                  : "text-text-muted font-[450] border-transparent hover:text-text",
              )}
            >
              <TIcon className="h-3 w-3" aria-hidden />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-linear px-4 py-4">
        {tab === "perfil" ? (
          <ProfileSection
            candidate={candidate}
            onDownloadCv={handleDownloadCv}
            active={active}
            job={job ?? null}
            onStartAdmission={() => setAdmissionOpen(true)}
            fitResponse={fitResponse ?? null}
            interviews={interviews as InterviewRow[]}
            onIssueFit={() => setIssueLinkOpen(true)}
          />
        ) : null}

        {tab === "entrevistas" ? (
          <InterviewsSection
            active={active}
            interviews={interviews}
            job={job ?? null}
            candidateId={candidate.id}
            onSchedule={() => setSchedulerOpen(true)}
          />
        ) : null}

        {tab === "fit" ? (
          active ? (
            <CulturalFitResponseViewer
              applicationId={active.id}
              surveyId={fitResponse?.survey_id ?? null}
            />
          ) : (
            <p className="text-[12.5px] text-text-muted">
              Selecione uma aplicação para ver o Fit Cultural.
            </p>
          )
        ) : null}

        {tab === "antecedentes" ? (
          active && job ? (
            <BackgroundCheckUploader
              applicationId={active.id}
              candidateId={candidate.id}
              companyId={job.company_id}
              jobOpeningId={job.id}
            />
          ) : (
            <p className="text-[12.5px] text-text-muted">
              Selecione uma aplicação para enviar antecedentes.
            </p>
          )
        ) : null}

        {tab === "historico" ? (
          applications.length === 0 ? (
            <p className="text-[12.5px] text-text-muted">Sem aplicações.</p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border overflow-hidden">
              {applications.map((a) => (
                <li
                  key={a.id}
                  className={cn(
                    "flex items-center justify-between gap-2 px-3 py-2.5 text-[12.5px]",
                    active?.id === a.id && "bg-accent-soft",
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
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
          )
        ) : null}
      </div>

      {/* Dialogs auxiliares */}
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

      <StandardMessagePicker
        open={refusalOpen}
        kind="recusa"
        confirmLabel="Recusar candidato"
        onPick={(messageId) => {
          if (!active || !messageId) return;
          reject.mutate(
            { id: active.id, rejectionMessageId: messageId },
            {
              onSuccess: () => {
                setRefusalOpen(false);
                onClose();
              },
            },
          );
        }}
        onCancel={() => setRefusalOpen(false)}
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

/* ─── Seções internas do drawer ──────────────────────────── */

type CandidateLike = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  document_type: string | null;
  document_number: string | null;
  source: string | null;
  cv_storage_path: string | null;
};

type JobLike = { id: string; company_id: string } | null;

type ApplicationLike = { id: string; stage: ApplicationStage; stage_entered_at?: string } | null;

function ProfileSection({
  candidate,
  onDownloadCv,
  active,
  job,
  onStartAdmission,
  fitResponse,
  interviews,
  onIssueFit,
}: {
  candidate: CandidateLike;
  onDownloadCv: () => void;
  active: ApplicationLike;
  job: JobLike;
  onStartAdmission: () => void;
  fitResponse: CulturalFitResponseRow | null;
  interviews: InterviewRow[];
  onIssueFit: () => void;
}) {
  // Placeholder/graceful fallback para o resumo — CandidateRow não tem
  // summary/bio no schema atual; quando o Eryk adicionar, consumir aqui.
  const summary = (candidate as CandidateLike & { summary?: string | null; bio?: string | null }).summary
    ?? (candidate as CandidateLike & { summary?: string | null; bio?: string | null }).bio
    ?? null;

  const fitDone = !!fitResponse?.submitted_at;
  const fitPercent = fitDone ? 100 : 0;

  return (
    <div className="space-y-4">
      {/* Bloco Resumo */}
      <section>
        <div className="mb-2 text-[11px] font-semibold text-text-subtle uppercase tracking-[0.06em]">
          Resumo
        </div>
        {summary ? (
          <p className="text-[13px] leading-[1.55] text-text">{summary}</p>
        ) : (
          <p className="text-[12.5px] text-text-muted">—</p>
        )}
      </section>

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
              <Download className="h-3 w-3" aria-hidden /> Baixar currículo
            </button>
          ) : (
            <span className="text-text-muted">Não enviado</span>
          )}
        </KVLine>
      </div>

      {/* Bloco Fit Cultural */}
      {active ? (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[11px] font-semibold text-text-subtle uppercase tracking-[0.06em]">
              Fit cultural · {fitDone ? "concluído" : "em andamento"}
            </div>
            {fitDone ? (
              <Chip color="green" size="sm" icon={<CheckCircle2 className="h-3 w-3" />}>
                Concluído
              </Chip>
            ) : null}
          </div>
          <div className="rounded-md border border-border bg-bg-subtle p-3">
            <Row justify="between" align="center">
              <div className="text-[12.5px] font-medium text-text">
                {fitDone
                  ? `Resposta registrada em ${new Date(fitResponse!.submitted_at).toLocaleDateString("pt-BR")}`
                  : "Sem resposta ainda"}
              </div>
              <span className="text-[11.5px] font-medium tabular-nums text-text-muted">
                {fitPercent}%
              </span>
            </Row>
            <ProgressBar value={fitPercent} size={3} className="mt-2" />
            {!fitDone ? (
              <Row justify="end" className="mt-2">
                <Btn
                  variant="ghost"
                  size="xs"
                  iconRight={<ArrowRight className="h-3 w-3" />}
                  onClick={onIssueFit}
                >
                  Lembrar
                </Btn>
              </Row>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* Timeline agregada */}
      {active ? (
        <section>
          <div className="mb-2 text-[11px] font-semibold text-text-subtle uppercase tracking-[0.06em]">
            Timeline
          </div>
          <AggregatedTimeline
            active={active as { id: string; stage: ApplicationStage; stage_entered_at?: string }}
            interviews={interviews}
            fitResponse={fitResponse}
          />
        </section>
      ) : null}

      {active && active.stage === "aprovado" && job ? (
        <div className="rounded-md border border-status-green/30 bg-status-green-soft p-3.5">
          <Row align="start" gap={10}>
            <CheckCircle2 className="h-4 w-4 text-status-green shrink-0 mt-0.5" />
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
        <AdmissionStatusPanel application={active as never} />
      ) : null}
    </div>
  );
}

/* ─── Timeline agregada: consolida eventos do candidato ────────── */

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
  fitResponse,
}: {
  active: { id: string; stage: ApplicationStage; stage_entered_at?: string };
  interviews: InterviewRow[];
  fitResponse: CulturalFitResponseRow | null;
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

  if (fitResponse?.submitted_at) {
    events.push({
      key: `fit:${fitResponse.id}`,
      at: new Date(fitResponse.submitted_at).getTime(),
      title: "Fit cultural respondido",
      icon: <Sparkles className="h-[11px] w-[11px]" />,
    });
  }

  events.sort((a, b) => a.at - b.at);

  // Destaca o evento mais recente como "ativo"
  if (events.length > 0) events[events.length - 1].active = true;

  if (events.length === 0) {
    return (
      <p className="text-[12.5px] text-text-muted">Sem eventos ainda.</p>
    );
  }

  return (
    <div>
      {events.map((e, idx) => (
        <TimelineItem
          key={e.key}
          icon={e.icon}
          title={e.title}
          sub={e.sub}
          time={
            <span className="tabular-nums">
              {formatRelative(e.at)}
            </span>
          }
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

function InterviewsSection({
  active,
  interviews,
  job,
  candidateId,
  onSchedule,
}: {
  active: ApplicationLike;
  interviews: Array<{ id: string; kind: string }> | [];
  job: JobLike;
  candidateId: string;
  onSchedule: () => void;
}) {
  if (!active) {
    return (
      <p className="text-[12.5px] text-text-muted">
        Selecione uma aplicação para ver entrevistas.
      </p>
    );
  }
  return (
    <div className="space-y-4">
      <Row justify="between">
        <p className="text-[12.5px] text-text-muted">
          {interviews.length === 0
            ? "Nenhuma entrevista ainda."
            : `${interviews.length} entrevista${interviews.length === 1 ? "" : "s"} registrada${
                interviews.length === 1 ? "" : "s"
              }.`}
        </p>
        <Btn
          variant="secondary"
          size="sm"
          icon={<Calendar className="h-3.5 w-3.5" />}
          onClick={onSchedule}
        >
          Agendar
        </Btn>
      </Row>
      <InterviewTimeline interviews={interviews as never} />
      {job
        ? (interviews as Array<{ id: string; kind: string }>).map((i) => (
            <div key={i.id} className="space-y-3">
              <InterviewNotesEditor
                interview={i as never}
                candidateId={candidateId}
                companyId={job.company_id}
                jobOpeningId={job.id}
              />
              {i.kind === "final" ? <HiringDecisionPanel interview={i as never} /> : null}
            </div>
          ))
        : null}
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

export default CandidateDrawer;
