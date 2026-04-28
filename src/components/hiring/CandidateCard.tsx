import { useDraggable } from "@dnd-kit/core";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { APPLICATION_STAGE_LABELS } from "@/lib/hiring/statusMachine";
import type { ApplicationStage } from "@/integrations/supabase/hiring-types";
import { Icon } from "@/components/primitives";
import {
  computeSlaTone,
  daysSince,
  SLA_BORDER_CLASSES,
} from "@/lib/hiring/sla";
import { useCardPreferences } from "@/hooks/hiring/useCardPreferences";
import { isFieldEnabled } from "@/lib/hiring/cardCustomization";

export interface KanbanApplication {
  id: string;
  candidate_id: string;
  /** Legacy flat field — preserved for callers that build a denormalized shape (CandidatesKanban). */
  candidate_name?: string;
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
  /** D-08 optional embedded shape (ApplicationWithCandidate). */
  candidate?: {
    id: string;
    full_name: string;
    email?: string | null;
    cv_url?: string | null;
    anonymized_at?: string | null;
  } | null;
  /** D-07 optional embedded shape — vaga em concorrência. */
  job_opening?: {
    id?: string;
    title: string;
  } | null;
  /** D-08 next_interview_at via embed. */
  next_interview_at?: string | null;
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

/** Inicial(is) a partir de full_name — fallback para "?" quando vazio. */
function initials(fullName: string | null | undefined): string {
  if (!fullName) return "?";
  return (
    fullName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0])
      .join("")
      .toUpperCase() || "?"
  );
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

  const [prefs] = useCardPreferences();

  // D-07 — campos do mínimo fixo (sempre visíveis):
  // 1. nome
  const fullName =
    application.candidate?.full_name ??
    application.candidate_name ??
    "Candidato";
  // 2. cargo pretendido
  const desiredRole = application.desired_role ?? null;
  // 3. dias na etapa
  const days = daysSince(application.stage_entered_at);
  // 4. vaga em concorrência
  const jobTitle =
    application.job_opening?.title ?? application.job_title ?? null;

  // D-10 — SLA stripe via border-l-{tone}.
  const slaTone = computeSlaTone(application.stage_entered_at);

  const stageLabel = APPLICATION_STAGE_LABELS[application.stage];
  const initialsText = initials(fullName);

  // Display compacto do nome para o kanban dentro de uma vaga (showJob=false)
  // — mantém o pattern "primeiro nome + inicial".
  const firstName = fullName.split(" ")[0] || fullName;
  const lastInitial = fullName.split(" ").slice(1)[0]?.[0];
  const compactName = lastInitial ? `${firstName} ${lastInitial}.` : firstName;

  // Próxima entrevista (D-08 opcional).
  const nextInterview =
    application.next_interview_at ?? application.nextInterviewAt ?? null;

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
        // SLA stripe (D-10) — left-border 3px com tom semântico.
        // Posicionado APÓS border-border para que tailwind-merge preserve a
        // classe específica de left-border (border-l-* > border-color global).
        "border-l-[3px]",
        SLA_BORDER_CLASSES[slaTone],
      )}
      title={fullName}
    >
      {/* D-08: avatar opcional */}
      {isFieldEnabled(prefs, "avatar") ? (
        <span
          className={cn(
            "grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full text-[9px] font-semibold",
            showJob && "mt-[1px]",
            selected ? "bg-accent text-white" : "bg-bg-muted text-text-muted",
          )}
        >
          {initialsText}
        </span>
      ) : null}

      <span className="min-w-0 flex-1">
        {/* Linha 1 — nome (D-07 mínimo) */}
        <span
          className={cn(
            "block truncate text-[11.5px]",
            selected ? "font-medium" : "font-[450]",
          )}
        >
          {showJob ? compactName : fullName}
        </span>

        {/* Linha 2 — cargo · vaga (middle dot U+00B7). D-07 mínimo: cargo + vaga. */}
        {(desiredRole || jobTitle) && (
          <span
            className={cn(
              "mt-0.5 flex items-center gap-1 text-[10.5px] leading-none truncate",
              selected ? "text-accent-text/80" : "text-text-subtle",
            )}
          >
            {showJob && jobTitle ? (
              <>
                <Icon name="briefcase" size={10} className="shrink-0" />
                <span className="truncate">{jobTitle}</span>
                {desiredRole ? (
                  <>
                    <span aria-hidden className="opacity-60">
                      ·
                    </span>
                    <span className="shrink-0 whitespace-nowrap truncate">
                      {desiredRole}
                    </span>
                  </>
                ) : null}
              </>
            ) : (
              <>
                {desiredRole ? <span className="truncate">{desiredRole}</span> : null}
                {desiredRole && jobTitle ? (
                  <span aria-hidden className="opacity-60">
                    ·
                  </span>
                ) : null}
                {jobTitle ? <span className="truncate">{jobTitle}</span> : null}
              </>
            )}
          </span>
        )}

        {/* Linha 3 — dias na etapa (D-07 mínimo SEMPRE visível) */}
        <span className="mt-0.5 block text-[10.5px] tabular-nums text-text-subtle">
          {days}d na etapa
        </span>
      </span>

      {/* D-08: campos opcionais à direita. */}
      {isFieldEnabled(prefs, "next_interview") && nextInterview ? (
        <span
          className="shrink-0 text-[10.5px] tabular-nums text-text-subtle"
          aria-label="Próxima entrevista"
        >
          {new Date(nextInterview).toLocaleDateString("pt-BR")}
        </span>
      ) : null}
      {isFieldEnabled(prefs, "cv_icon") && application.candidate?.cv_url ? (
        <FileText
          className="shrink-0 w-3 h-3 text-text-subtle"
          aria-label="CV anexado"
        />
      ) : null}

      <span className="sr-only">
        Etapa: {stageLabel}. Abrir detalhes.
      </span>
    </button>
  );
}
