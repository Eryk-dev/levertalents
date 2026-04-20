import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Eye, Link as LinkIcon, Lock, RotateCcw, XCircle, Activity, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  LoadingState,
  EmptyState,
  StatusBadge,
  Icon,
} from "@/components/primitives";
import {
  Btn,
  Chip,
  Row,
  LinearAvatar,
  LinearEmpty,
} from "@/components/primitives/LinearKit";
import { useJobOpening, useCloseJobOpening, useSetJobStatus } from "@/hooks/hiring/useJobOpening";
import { useApplicationsByJob } from "@/hooks/hiring/useApplications";
import { JobDescriptionEditor } from "@/components/hiring/JobDescriptionEditor";
import { JobExternalPublicationsList } from "@/components/hiring/JobExternalPublicationsList";
import { CandidatesKanban } from "@/components/hiring/CandidatesKanban";
import type { KanbanApplication } from "@/components/hiring/CandidateCard";
import type { ApplicationStage, JobCloseReason } from "@/integrations/supabase/hiring-types";
import { cn } from "@/lib/utils";

const STAGE_TO_GROUP: Partial<Record<ApplicationStage, "ativos" | "contratados" | "descartados">> = {
  recebido: "ativos",
  em_interesse: "ativos",
  aguardando_fit_cultural: "ativos",
  sem_retorno: "ativos",
  fit_recebido: "ativos",
  antecedentes_ok: "ativos",
  apto_entrevista_rh: "ativos",
  entrevista_rh_agendada: "ativos",
  entrevista_rh_feita: "ativos",
  apto_entrevista_final: "ativos",
  entrevista_final_agendada: "ativos",
  aguardando_decisao_dos_gestores: "ativos",
  aprovado: "contratados",
  em_admissao: "contratados",
  admitido: "contratados",
  reprovado_pelo_gestor: "descartados",
  recusado: "descartados",
};

function formatContractType(value: string | null | undefined): string {
  if (!value) return "—";
  switch (value) {
    case "clt":
      return "CLT";
    case "pj":
      return "PJ";
    case "pj_equity":
      return "PJ + Equity";
    case "estagio":
      return "Estágio";
    default:
      return value;
  }
}

function formatWorkMode(value: string | null | undefined): string {
  if (!value) return "—";
  switch (value) {
    case "presencial":
      return "Presencial";
    case "remoto":
      return "Remoto";
    case "hibrido":
      return "Híbrido";
    default:
      return value;
  }
}

export default function JobOpeningDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: job, isLoading } = useJobOpening(id);
  const closeJob = useCloseJobOpening();
  const setStatus = useSetJobStatus();
  const [closeOpen, setCloseOpen] = useState(false);
  const [closeReason, setCloseReason] = useState<JobCloseReason>("contratado");

  const { data: company } = useQuery({
    queryKey: ["hiring", "company", job?.company_id ?? "none"],
    enabled: !!job?.company_id,
    queryFn: async (): Promise<{ id: string; name: string } | null> => {
      if (!job?.company_id) return null;
      const { data, error } = await supabase
        .from("companies")
        .select("id, name")
        .eq("id", job.company_id)
        .maybeSingle();
      if (error) throw error;
      return (data as { id: string; name: string } | null) ?? null;
    },
  });

  const { data: recruiter } = useQuery({
    queryKey: ["hiring", "recruiter", job?.requested_by ?? "none"],
    enabled: !!job?.requested_by,
    queryFn: async (): Promise<{ id: string; full_name: string | null } | null> => {
      if (!job?.requested_by) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("id", job.requested_by)
        .maybeSingle();
      if (error) throw error;
      return (data as { id: string; full_name: string | null } | null) ?? null;
    },
  });

  const { data: applications = [] } = useApplicationsByJob(id);

  const stats = useMemo(() => {
    let ativos = 0;
    let contratados = 0;
    let descartados = 0;
    let triagem = 0;
    for (const a of applications) {
      const group = STAGE_TO_GROUP[a.stage];
      if (group === "ativos") ativos += 1;
      else if (group === "contratados") contratados += 1;
      else if (group === "descartados") descartados += 1;
      if (a.stage === "recebido" || a.stage === "em_interesse") triagem += 1;
    }
    return { total: applications.length, ativos, contratados, descartados, triagem };
  }, [applications]);

  if (isLoading) return <LoadingState layout="list" count={3} />;
  if (!job) {
    return (
      <div className="p-6 lg:p-10">
        <EmptyState
          title="Vaga não encontrada"
          message="Verifique o link ou volte para a listagem."
          action={
            <Button asChild>
              <Link to="/hiring/jobs">
                <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  const latest = job.job_descriptions[0];
  const daysOpen = Math.max(
    0,
    Math.floor((Date.now() - new Date(job.opened_at).getTime()) / 86_400_000),
  );
  const openedAt = new Date(job.opened_at);
  const targetDate = job.target_deadline ? new Date(job.target_deadline) : null;

  const handleOpenCandidate = (app: KanbanApplication) => {
    navigate(`/hiring/candidates/${app.candidate_id}`);
  };

  return (
    <div className="flex flex-col h-full font-sans text-text animate-fade-in">
      {/* Top bar: breadcrumb + global actions */}
      <div className="px-5 lg:px-7 py-2.5 border-b border-border flex items-center justify-between gap-4">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-[13px] text-text-muted min-w-0"
        >
          <Link
            to="/hiring/jobs"
            className="inline-flex items-center gap-1.5 hover:text-text transition-colors"
          >
            <Icon name="briefcase" size={13} />
            Vagas
          </Link>
          <span className="text-text-subtle">›</span>
          <span className="inline-flex items-center gap-1.5 text-text font-medium truncate">
            <Icon name="briefcase" size={13} className="text-text-subtle" />
            <span className="truncate">{job.title}</span>
          </span>
        </nav>
        <Row gap={4}>
          {job.status !== "encerrada" &&
            job.confidential === false &&
            (["publicada", "em_triagem", "pronta_para_publicar"] as typeof job.status[]).includes(job.status) ? (
            <Btn
              variant="ghost"
              size="sm"
              icon={<LinkIcon className="h-3.5 w-3.5" />}
              onClick={() => {
                const slug = job.public_slug ?? job.id;
                void navigator.clipboard.writeText(`${window.location.origin}/vagas/${slug}`);
                toast.success("Link copiado");
              }}
            >
              Copiar link público
            </Btn>
          ) : null}
          {job.status === "encerrada" ? (
            <Btn
              variant="ghost"
              size="sm"
              icon={<RotateCcw className="h-3.5 w-3.5" />}
              disabled={setStatus.isPending}
              onClick={() => {
                if (job.confidential) {
                  toast.error("Vaga confidencial não é publicável. Desmarque confidencial antes.");
                  return;
                }
                setStatus.mutate({
                  id: job.id,
                  expectedUpdatedAt: job.updated_at,
                  nextStatus: "publicada",
                  successMessage: "Vaga reaberta e publicada",
                });
              }}
            >
              Reabrir e publicar
            </Btn>
          ) : job.status === "publicada" || job.status === "em_triagem" ? null : (
            <Btn
              variant="ghost"
              size="sm"
              icon={<Eye className="h-3.5 w-3.5" />}
              disabled={setStatus.isPending}
              onClick={() => {
                if (job.confidential) {
                  toast.error("Vaga confidencial não é publicável. Desmarque confidencial antes.");
                  return;
                }
                setStatus.mutate({
                  id: job.id,
                  expectedUpdatedAt: job.updated_at,
                  nextStatus: "publicada",
                  successMessage: "Vaga publicada",
                });
              }}
            >
              Publicar
            </Btn>
          )}
          {job.status !== "encerrada" ? (
            <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
              <DialogTrigger asChild>
                <Btn variant="ghost" size="sm" icon={<XCircle className="h-3.5 w-3.5" />}>
                  Encerrar
                </Btn>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Encerrar vaga</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <label className="space-y-1 block text-sm">
                    Motivo do encerramento
                    <Select
                      value={closeReason}
                      onValueChange={(v) => setCloseReason(v as JobCloseReason)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="contratado">Contratado</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                        <SelectItem value="congelado">Congelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </label>
                  <div className="flex justify-end gap-2">
                    <Btn variant="secondary" size="sm" onClick={() => setCloseOpen(false)}>
                      Cancelar
                    </Btn>
                    <Btn
                      variant="danger"
                      size="sm"
                      disabled={closeJob.isPending}
                      onClick={() => {
                        closeJob.mutate({
                          id: job.id,
                          currentStatus: job.status,
                          expectedUpdatedAt: job.updated_at,
                          reason: closeReason,
                        });
                        setCloseOpen(false);
                      }}
                    >
                      Encerrar
                    </Btn>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          ) : null}
          <button
            type="button"
            className="inline-flex h-[24px] w-[24px] items-center justify-center rounded hover:bg-bg-subtle text-text-muted"
            aria-label="Mais opções"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </Row>
      </div>

      {/* Body: main scroll + sticky right rail */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_280px] overflow-hidden">
        {/* Main scroll column */}
        <div className="min-w-0 min-h-0 overflow-auto scrollbar-linear">
          <div className="max-w-[960px] mx-auto px-5 lg:px-8 pt-6 pb-10 space-y-5">
            {/* Title + summary + inline properties — Linear-style compact */}
            <header className="space-y-1">
              <div className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-bg-subtle border border-border text-text-muted mb-1">
                <Icon name="briefcase" size={14} />
              </div>
              <div className="flex items-baseline gap-2 flex-wrap">
                <h1 className="text-[22px] font-semibold tracking-[-0.02em] m-0">
                  {job.title}
                  {company?.name ? (
                    <span className="text-text-muted font-medium"> — {company.name}</span>
                  ) : null}
                </h1>
                {job.confidential ? (
                  <Chip color="neutral" size="sm" icon={<Lock className="h-3 w-3" />}>
                    Confidencial
                  </Chip>
                ) : null}
              </div>
              {job.summary ? (
                <p className="text-[13px] leading-[1.5] text-text-muted">{job.summary}</p>
              ) : (
                <button
                  type="button"
                  className="text-[13px] text-text-subtle hover:text-text-muted transition-colors text-left"
                >
                  Adicionar um resumo curto…
                </button>
              )}
            </header>

            {/* Properties single-line — Linear style */}
            <div className="flex items-center gap-3 flex-wrap text-[12px]">
              <span className="text-text-subtle w-[78px] shrink-0">Propriedades</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <InlineProp icon={<StatusDot status={job.status} />}>
                  <StatusBadge kind="job" status={job.status} size="sm" />
                </InlineProp>
                {recruiter?.full_name ? (
                  <InlineProp>
                    <LinearAvatar name={recruiter.full_name} size={14} />
                    <span className="ml-1">{recruiter.full_name}</span>
                  </InlineProp>
                ) : (
                  <InlineProp icon={<Icon name="userPlus" size={11} />} muted>
                    Recrutador
                  </InlineProp>
                )}
                {targetDate ? (
                  <InlineProp icon={<Icon name="calendar" size={11} />}>
                    {targetDate.toLocaleDateString("pt-BR")}
                  </InlineProp>
                ) : (
                  <InlineProp icon={<Icon name="calendar" size={11} />} muted>
                    Prazo
                  </InlineProp>
                )}
                <InlineProp icon={<Icon name="clock" size={11} />}>{daysOpen}d</InlineProp>
                <InlineProp>{formatWorkMode(job.work_mode)}</InlineProp>
                <InlineProp>{formatContractType(job.contract_type)}</InlineProp>
                {job.sector ? <InlineProp>{job.sector}</InlineProp> : null}
              </div>
            </div>

            {/* Resources — links de vagas publicadas */}
            <div className="flex items-start gap-3 flex-wrap text-[12px]">
              <span className="text-text-subtle w-[78px] shrink-0 pt-[3px]">Resources</span>
              <div className="flex-1 min-w-0">
                <ResourcesCompact
                  jobOpeningId={job.id}
                  publications={job.job_external_publications}
                />
              </div>
            </div>

            {/* Descritivo — colapsado quando vazio */}
            <DescriptionBlock job={job} latest={latest} />
          </div>

          {/* Candidatos — centralizado com max-w maior para caber todas as etapas */}
          <section
            id="candidatos"
            className="scroll-mt-5 space-y-3 max-w-[1200px] mx-auto px-5 lg:px-8 pb-10"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SectionTitle>Candidatos</SectionTitle>
                {stats.total > 0 ? (
                  <span className="inline-flex items-center justify-center rounded bg-bg-muted px-1.5 text-[10.5px] tabular-nums text-text-muted">
                    {stats.total}
                  </span>
                ) : null}
              </div>
              <span className="text-[11.5px] text-text-subtle">
                Arraste para mover · clique para abrir
              </span>
            </div>
            <CandidatesKanban
              jobId={job.id}
              onOpenCandidate={handleOpenCandidate}
              selectedApplicationId={null}
            />
          </section>
        </div>

        {/* Right rail — sticky properties + activity */}
        <aside className="hidden lg:flex flex-col min-h-0 overflow-auto scrollbar-linear border-l border-border bg-bg">
          <div className="px-4 py-3.5 space-y-0">
            {/* Properties */}
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-text-subtle">
                Propriedades
              </span>
            </div>
            <RailRow label="Status">
              <StatusBadge kind="job" status={job.status} size="sm" />
            </RailRow>
            <RailRow label="Empresa">
              {company?.name ? (
                <div className="inline-flex items-center gap-1.5 min-w-0">
                  <Icon name="building" size={11} className="text-text-subtle shrink-0" />
                  <span className="truncate">{company.name}</span>
                </div>
              ) : (
                <RailMuted>—</RailMuted>
              )}
            </RailRow>
            <RailRow label="Área">
              {job.sector ? job.sector : <RailMuted>—</RailMuted>}
            </RailRow>
            <RailRow label="Modalidade">{formatWorkMode(job.work_mode)}</RailRow>
            <RailRow label="Contrato">{formatContractType(job.contract_type)}</RailRow>
            <RailRow label="Senioridade">
              <RailMuted>—</RailMuted>
            </RailRow>
            <RailRow label="Recrutador">
              {recruiter?.full_name ? (
                <div className="inline-flex items-center gap-1.5 min-w-0">
                  <LinearAvatar name={recruiter.full_name} size={14} />
                  <span className="truncate">{recruiter.full_name}</span>
                </div>
              ) : (
                <RailMuted>—</RailMuted>
              )}
            </RailRow>
            <RailRow label="Aberta em">
              <span className="tabular-nums">{openedAt.toLocaleDateString("pt-BR")}</span>
            </RailRow>
            <RailRow label="Prazo">
              {targetDate ? (
                <span className="tabular-nums">{targetDate.toLocaleDateString("pt-BR")}</span>
              ) : (
                <RailMuted>—</RailMuted>
              )}
            </RailRow>
            <RailRow label="Dias aberta">
              <Chip color={daysOpen > 30 ? "amber" : "neutral"} size="sm">
                {daysOpen}d
              </Chip>
            </RailRow>
            <RailRow label="Candidatos">
              <span className="tabular-nums">{stats.total}</span>
            </RailRow>
            <RailRow label="Confidencial">
              {job.confidential ? <Chip color="neutral" size="sm">Sim</Chip> : <RailMuted>Não</RailMuted>}
            </RailRow>

            {/* Skills / Labels */}
            {job.required_skills?.length ? (
              <div className="pt-3 mt-2 border-t border-border">
                <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-text-subtle mb-1.5">
                  Labels
                </div>
                <div className="flex flex-wrap gap-1">
                  {job.required_skills.map((s) => (
                    <Chip key={s} color="neutral" size="sm">
                      {s}
                    </Chip>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Activity */}
            <div className="pt-3 mt-2 border-t border-border">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-text-subtle">
                  Atividade
                </span>
              </div>
              <LinearEmpty
                icon={<Activity className="w-[14px] h-[14px]" strokeWidth={1.75} />}
                title="Em breve"
                description="Log de eventos em breve."
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ─── Small primitives local ──────────────────────────── */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[13px] font-semibold tracking-[-0.005em] text-text m-0 flex items-center gap-2">
      {children}
    </h2>
  );
}

function InlineProp({
  children,
  icon,
  muted = false,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 h-[22px] px-1.5 rounded text-[11.5px] leading-none transition-colors",
        muted
          ? "text-text-subtle border border-dashed border-border"
          : "text-text hover:bg-bg-subtle",
      )}
    >
      {icon ? <span className="text-text-subtle">{icon}</span> : null}
      {children}
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "aberta" || status === "publicada"
      ? "bg-status-green"
      : status === "triagem"
      ? "bg-status-amber"
      : status === "encerrada"
      ? "bg-text-subtle"
      : "bg-status-blue";
  return <span className={cn("inline-block h-2 w-2 rounded-full", color)} aria-hidden />;
}

function ResourcesCompact({
  jobOpeningId,
  publications,
}: {
  jobOpeningId: string;
  publications: Parameters<typeof JobExternalPublicationsList>[0]["publications"];
}) {
  const count = publications?.length ?? 0;
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="space-y-1.5">
        <JobExternalPublicationsList jobOpeningId={jobOpeningId} publications={publications} />
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-[11.5px] text-text-subtle hover:text-text transition-colors"
        >
          Fechar edição
        </button>
      </div>
    );
  }

  if (count === 0) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="inline-flex items-center gap-1 text-[12px] text-text-subtle hover:text-text transition-colors"
      >
        <Icon name="plus" size={11} />
        Adicionar link ou plataforma…
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {publications.map((p) => (
        <a
          key={p.id}
          href={p.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 h-[22px] px-2 rounded border border-border bg-surface text-[11.5px] text-text hover:bg-bg-subtle transition-colors max-w-[240px]"
          title={p.url}
        >
          <Icon name="send" size={10} className="text-text-subtle shrink-0" />
          <span className="truncate">{formatChannelLabel(p.channel)}</span>
        </a>
      ))}
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="inline-flex items-center gap-1 h-[22px] px-1.5 text-[11.5px] text-text-subtle hover:text-text transition-colors"
      >
        <Icon name="plus" size={11} />
        Adicionar
      </button>
    </div>
  );
}

function formatChannelLabel(channel: string): string {
  switch (channel) {
    case "linkedin":
      return "LinkedIn";
    case "indeed":
      return "Indeed";
    case "glassdoor":
      return "Glassdoor";
    case "gupy":
      return "Gupy";
    case "site":
      return "Site próprio";
    case "outros":
      return "Outros";
    default:
      return channel.charAt(0).toUpperCase() + channel.slice(1);
  }
}

function DescriptionBlock({
  job,
}: {
  job: Parameters<typeof JobDescriptionEditor>[0]["job"];
  latest: Parameters<typeof JobDescriptionEditor>[0]["descriptions"][number] | undefined;
}) {
  return (
    <section id="descritivo" className="scroll-mt-5 space-y-1.5 pt-2">
      <div className="text-[11px] font-medium text-text-subtle">Descrição</div>
      <JobDescriptionEditor job={job} descriptions={job.job_descriptions} />
    </section>
  );
}

function RailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-[5px] min-h-[26px]">
      <div className="text-[11.5px] text-text-subtle shrink-0">{label}</div>
      <div className="text-[12px] text-text min-w-0 text-right truncate">{children}</div>
    </div>
  );
}

function RailMuted({ children }: { children: React.ReactNode }) {
  return <span className="text-text-subtle">{children}</span>;
}
