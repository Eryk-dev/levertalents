import { Calendar, History, MessageCircle } from "lucide-react";
import { StatusBadge } from "@/components/primitives";
import { Btn, LinearEmpty } from "@/components/primitives/LinearKit";
import { CandidateConversationsSection } from "@/components/hiring/CandidateConversationsSection";
import { InterviewNotesEditor } from "@/components/hiring/InterviewNotesEditor";
import { InterviewTimeline } from "@/components/hiring/InterviewTimeline";
import { HiringDecisionPanel } from "@/components/hiring/HiringDecisionPanel";
import { cn } from "@/lib/utils";
import type {
  ApplicationRow,
  InterviewRow,
} from "@/integrations/supabase/hiring-types";
import { SectionTitle } from "./_primitives";

export interface CandidateApplicationsSectionProps {
  candidateId: string;
  applications: ApplicationRow[];
  active: ApplicationRow | null;
  interviews: InterviewRow[];
  job: { id: string; company_id: string; title?: string } | null;
  onPickApplication: (id: string) => void;
  onSchedule: () => void;
}

/**
 * Lista de aplicações (histórico) + entrevistas + conversas/transcrições.
 * Recebe candidate.id, lista de aplicações, ativa, entrevistas, e callbacks via props.
 * Sem fetching interno.
 */
export function CandidateApplicationsSection({
  candidateId,
  applications,
  active,
  interviews,
  job,
  onPickApplication,
  onSchedule,
}: CandidateApplicationsSectionProps) {
  return (
    <>
      <section id="conversas" className="scroll-mt-5 space-y-3">
        <SectionTitle icon={<MessageCircle className="h-3.5 w-3.5" />}>
          Conversas & Transcrições
        </SectionTitle>
        <CandidateConversationsSection candidateId={candidateId} />
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
                onClick={onSchedule}
              >
                Agendar
              </Btn>
            ) : null
          }
        >
          Entrevistas
        </SectionTitle>
        <EntrevistasInner
          active={active}
          interviews={interviews}
          job={job}
          candidateId={candidateId}
        />
      </section>

      <section id="historico" className="scroll-mt-5 space-y-3">
        <SectionTitle
          icon={<History className="h-3.5 w-3.5" />}
          count={applications.length || undefined}
        >
          Histórico de aplicações
        </SectionTitle>
        <HistoricoInner
          applications={applications}
          activeId={active?.id ?? null}
          onPick={onPickApplication}
        />
      </section>
    </>
  );
}

function EntrevistasInner({
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
        Nenhuma entrevista agendada. Use o botão "Agendar" acima para criar a
        primeira.
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
              {i.kind === "final" ? (
                <HiringDecisionPanel interview={i} />
              ) : null}
            </div>
          ))
        : null}
    </div>
  );
}

function HistoricoInner({
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
