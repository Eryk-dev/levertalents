import { Calendar } from "lucide-react";
import { Btn, Row } from "@/components/primitives/LinearKit";
import { InterviewTimeline } from "@/components/hiring/InterviewTimeline";
import { InterviewNotesEditor } from "@/components/hiring/InterviewNotesEditor";
import { HiringDecisionPanel } from "@/components/hiring/HiringDecisionPanel";
import type { ApplicationRow, InterviewRow } from "@/integrations/supabase/hiring-types";

export interface EntrevistasTabContentProps {
  active: ApplicationRow | null;
  interviews: InterviewRow[];
  job: { id: string; company_id: string } | null;
  candidateId: string;
  onSchedule: () => void;
}

/**
 * Plan 02-09 Task 1b — Tab "Entrevistas": header com contagem + InterviewTimeline +
 * NotesEditor por entrevista (final mostra HiringDecisionPanel). Porta do legacy
 * CandidateDrawer.tsx InterviewsSection ~lines 799-854.
 */
export function EntrevistasTabContent({
  active,
  interviews,
  job,
  candidateId,
  onSchedule,
}: EntrevistasTabContentProps) {
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
        ? interviews.map((i) => (
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
