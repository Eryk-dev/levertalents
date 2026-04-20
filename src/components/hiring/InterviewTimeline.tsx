import { SectionCard, StatusBadge, EmptyState } from "@/components/primitives";
import { Calendar } from "lucide-react";
import type { InterviewRow } from "@/integrations/supabase/hiring-types";

interface InterviewTimelineProps {
  interviews: InterviewRow[];
}

export function InterviewTimeline({ interviews }: InterviewTimelineProps) {
  if (interviews.length === 0) {
    return (
      <SectionCard title="Entrevistas">
        <EmptyState variant="compact" icon={Calendar} title="Nenhuma entrevista ainda" />
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Entrevistas" description="Linha do tempo das entrevistas agendadas e realizadas.">
      <ol className="relative space-y-4 border-l border-border pl-4">
        {interviews.map((i) => (
          <li key={i.id} className="space-y-1">
            <span
              aria-hidden
              className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-surface bg-accent"
            />
            <div className="flex items-center justify-between text-sm">
              <div>
                <p className="font-medium">
                  {i.kind === "final" ? "Entrevista final" : "Entrevista RH"} · {i.mode}
                </p>
                <p className="text-xs text-text-muted">
                  {new Date(i.scheduled_at).toLocaleString("pt-BR")}
                </p>
              </div>
              <StatusBadge
                kind="task"
                status={i.status === "realizada" ? "completed" : i.status === "cancelada" ? "cancelled" : "pending"}
              />
            </div>
            {i.summary ? <p className="text-xs text-text-muted">{i.summary}</p> : null}
          </li>
        ))}
      </ol>
    </SectionCard>
  );
}
