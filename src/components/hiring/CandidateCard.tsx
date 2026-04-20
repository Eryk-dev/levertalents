import { useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { APPLICATION_STAGE_LABELS } from "@/lib/hiring/statusMachine";
import type { ApplicationStage } from "@/integrations/supabase/hiring-types";
import { Icon } from "@/components/primitives";

export interface KanbanApplication {
  id: string;
  candidate_id: string;
  candidate_name: string;
  candidate_email?: string | null;
  desired_role?: string | null;
  job_id?: string | null;
  job_title?: string | null;
  owner_id?: string | null;
  stage: ApplicationStage;
  stage_entered_at: string;
  backgroundFlag?: "limpo" | "pendencia_leve" | "pendencia_grave" | "nao_aplicavel" | null;
  hasCv?: boolean;
  fitScore?: number | null;
  nextInterviewAt?: string | null;
}

interface CandidateCardProps {
  application: KanbanApplication;
  onOpen?: (application: KanbanApplication) => void;
  asOverlay?: boolean;
  selected?: boolean;
  /**
   * Exibe a vaga (ícone briefcase + título) abaixo do nome. Usar em visões
   * globais de candidatos, onde o contexto da vaga não é implícito. Não usar
   * no kanban dentro de uma vaga específica.
   */
  showJob?: boolean;
}

export function CandidateCard({
  application,
  onOpen,
  asOverlay = false,
  selected = false,
  showJob = false,
}: CandidateCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `app:${application.id}`,
    disabled: asOverlay,
  });

  const initials =
    application.candidate_name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0])
      .join("")
      .toUpperCase() || "?";

  const firstName = application.candidate_name.split(" ")[0] || application.candidate_name;
  const lastInitial = application.candidate_name.split(" ").slice(1)[0]?.[0];
  const display = lastInitial
    ? `${firstName} ${lastInitial}.`
    : firstName;

  const jobTitle = application.job_title;
  const stageLabel = APPLICATION_STAGE_LABELS[application.stage];

  return (
    <button
      ref={asOverlay ? undefined : setNodeRef}
      {...(asOverlay ? {} : attributes)}
      {...(asOverlay ? {} : listeners)}
      onClick={(e) => {
        if (asOverlay || isDragging) return;
        e.preventDefault();
        onOpen?.(application);
      }}
      className={cn(
        "group flex w-full rounded-[4px] border px-2 py-1.5 text-left",
        showJob ? "items-start gap-1.5" : "items-center gap-1.5",
        "transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        selected
          ? "bg-accent-soft border-accent text-accent-text"
          : "bg-bg-subtle border-border text-text hover:bg-bg-muted",
        !asOverlay && "cursor-grab",
        isDragging && !asOverlay && "opacity-30",
        asOverlay && "cursor-grabbing shadow-ds-lg ring-1 ring-accent/40",
      )}
      title={application.candidate_name}
    >
      <span
        className={cn(
          "grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full text-[9px] font-semibold",
          showJob && "mt-[1px]",
          selected
            ? "bg-accent text-white"
            : "bg-bg-muted text-text-muted",
        )}
      >
        {initials}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-[11.5px]",
            selected ? "font-medium" : "font-[450]",
          )}
        >
          {display}
        </span>
        {showJob && jobTitle ? (
          <span
            className={cn(
              "mt-0.5 flex items-center gap-1 text-[10.5px] leading-none",
              selected ? "text-accent-text/80" : "text-text-subtle",
            )}
          >
            <Icon name="briefcase" size={10} className="shrink-0" />
            <span className="truncate">{jobTitle}</span>
            <span aria-hidden className="opacity-60">·</span>
            <span className="shrink-0 whitespace-nowrap truncate">{stageLabel}</span>
          </span>
        ) : null}
      </span>
      <span className="sr-only">
        Etapa: {stageLabel}. Abrir detalhes.
      </span>
    </button>
  );
}
