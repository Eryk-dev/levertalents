import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Download,
  Sparkles,
} from "lucide-react";
import {
  Btn,
  Chip,
  ProgressBar,
  Row,
  TimelineItem,
} from "@/components/primitives/LinearKit";
import { AdmissionStatusPanel } from "@/components/hiring/AdmissionStatusPanel";
import { APPLICATION_STAGE_LABELS } from "@/lib/hiring/statusMachine";
import type {
  ApplicationRow,
  ApplicationStage,
  CandidateRow,
  CulturalFitResponseRow,
  InterviewRow,
} from "@/integrations/supabase/hiring-types";

export interface PerfilTabContentProps {
  candidate: CandidateRow;
  active: ApplicationRow | null;
  job: { id: string; company_id: string } | null;
  fitResponse: CulturalFitResponseRow | null;
  interviews: InterviewRow[];
  onDownloadCv: () => void;
  onIssueFit: () => void;
  onStartAdmission: () => void;
}

/**
 * Plan 02-09 Task 1b — Tab "Perfil": resumo + KV (documento, origem, telefone, CV) +
 * Fit cultural progress + Timeline agregada + CTAs admissão (porta do legacy
 * `CandidateDrawer.tsx` ProfileSection ~lines 560-700).
 */
export function PerfilTabContent({
  candidate,
  active,
  job,
  fitResponse,
  interviews,
  onDownloadCv,
  onIssueFit,
  onStartAdmission,
}: PerfilTabContentProps) {
  const summary =
    (candidate as CandidateRow & { summary?: string | null; bio?: string | null }).summary ??
    (candidate as CandidateRow & { summary?: string | null; bio?: string | null }).bio ??
    null;

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
            active={active}
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

/* ─── Timeline agregada (porta do legacy AggregatedTimeline) ─────── */

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
  active: { id: string; stage: ApplicationStage; stage_entered_at?: string | null };
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
