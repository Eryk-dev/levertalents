import { ArrowRight, Calendar, Download, Sparkles } from "lucide-react";
import { Icon } from "@/components/primitives";
import {
  Btn,
  Row,
  TimelineItem,
} from "@/components/primitives/LinearKit";
import { AdmissionStatusPanel } from "@/components/hiring/AdmissionStatusPanel";
import { APPLICATION_STAGE_LABELS } from "@/lib/hiring/statusMachine";
import type {
  ApplicationRow,
  CandidateRow,
  InterviewRow,
} from "@/integrations/supabase/hiring-types";
import { SectionTitle, KVLine, formatRelative } from "./_primitives";

export interface CandidateDecisionSectionProps {
  candidate: CandidateRow;
  active: ApplicationRow | null;
  job: { id: string; company_id: string; title?: string } | null;
  interviews: InterviewRow[];
  fitResponseAt: string | null;
  onStartAdmission: () => void;
  onDownloadCv: () => void;
}

/**
 * Hiring decision panel — perfil section: resumo, timeline agregada, CTA de admissão
 * (quando stage = aprovado), painel AdmissionStatusPanel (quando em_admissao/admitido).
 *
 * O HiringDecisionPanel por entrevista fica em CandidateApplicationsSection (junto com
 * a entrevista correspondente, para preservar o vínculo visual).
 */
export function CandidateDecisionSection({
  candidate,
  active,
  job,
  interviews,
  fitResponseAt,
  onStartAdmission,
  onDownloadCv,
}: CandidateDecisionSectionProps) {
  const summary =
    (candidate as CandidateRow & { summary?: string | null; bio?: string | null })
      .summary ??
    (candidate as CandidateRow & { summary?: string | null; bio?: string | null })
      .bio ??
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
              <p className="text-[12.5px] font-medium text-text">
                Pronto para admissão
              </p>
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

      {active &&
      (active.stage === "em_admissao" || active.stage === "admitido") ? (
        <AdmissionStatusPanel application={active} />
      ) : null}
    </section>
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
      title: `${label} ${
        i.status === "realizada"
          ? "concluída"
          : i.status === "cancelada"
            ? "cancelada"
            : "agendada"
      }`,
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
          time={
            <span className="tabular-nums">{formatRelative(e.at)}</span>
          }
          active={e.active}
          last={idx === events.length - 1}
        />
      ))}
    </div>
  );
}
