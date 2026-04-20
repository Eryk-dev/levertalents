import { Evaluation } from "@/hooks/useEvaluations";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Btn, LinearAvatar, Row } from "@/components/primitives/LinearKit";
import { StatusBadge } from "@/components/primitives/StatusBadge";
import { Icon } from "@/components/primitives/Icon";
import { cn } from "@/lib/utils";

interface EvaluationCardProps {
  evaluation: Evaluation;
  onViewDetails: (evaluation: Evaluation) => void;
  showEvaluatedUser?: boolean;
  showEvaluator?: boolean;
}

/**
 * Cartão de avaliação no padrão Linear denso sans
 * (sem Card shadcn, sem cream).
 */
export function EvaluationCard({
  evaluation,
  onViewDetails,
  showEvaluatedUser = true,
  showEvaluator = false,
}: EvaluationCardProps) {
  const name =
    (showEvaluatedUser && evaluation.evaluated_user?.full_name) ||
    (showEvaluator && evaluation.evaluator_user?.full_name) ||
    "—";

  return (
    <div
      onClick={() => onViewDetails(evaluation)}
      className="surface-paper p-3.5 cursor-pointer hover:border-border-strong transition-colors"
    >
      {/* Header */}
      <Row justify="between" align="start" className="gap-2">
        <div className="min-w-0 flex-1">
          <Row gap={8} align="center">
            <LinearAvatar name={name} size={22} />
            <span className="text-[14px] font-semibold text-text tracking-[-0.01em] truncate">
              {name}
            </span>
          </Row>
          <Row gap={6} className="mt-1 text-[11.5px] text-text-muted">
            <Icon name="calendar" size={11} />
            <span>{evaluation.period}</span>
          </Row>
        </div>
        <StatusBadge kind="evaluation" status={evaluation.status} size="sm" />
      </Row>

      {/* Overall */}
      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
        <span className="text-[11.5px] text-text-muted">Nota geral</span>
        <div className={cn("flex items-center gap-1 text-[18px] font-semibold tabular", scoreColor(evaluation.overall_score))}>
          <Icon name="star" size={14} />
          {evaluation.overall_score.toFixed(1)}
        </div>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-3 gap-2 mt-3 text-[11.5px]">
        <ScoreCell label="Técnica" value={evaluation.technical_score} />
        <ScoreCell label="Comportamental" value={evaluation.behavioral_score} />
        <ScoreCell label="Liderança" value={evaluation.leadership_score} />
      </div>

      {showEvaluator && evaluation.evaluator_user?.full_name && (
        <div className="text-[11.5px] text-text-subtle mt-2 pt-2 border-t border-border">
          Avaliado por{" "}
          <span className="text-text-muted">{evaluation.evaluator_user.full_name}</span>
        </div>
      )}

      <div className="text-[11px] text-text-subtle mt-2.5">
        Criada em{" "}
        {format(new Date(evaluation.created_at), "dd 'de' MMM 'de' yyyy", {
          locale: ptBR,
        })}
      </div>

      <Btn
        variant="secondary"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          onViewDetails(evaluation);
        }}
        className="w-full mt-3 justify-center"
        iconRight={<Icon name="chevRight" size={12} />}
      >
        Ver detalhes
      </Btn>
    </div>
  );
}

function ScoreCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-bg-subtle border border-border rounded-md p-2 text-center">
      <div className="text-[10px] text-text-subtle uppercase tracking-[0.05em] font-semibold">
        {label}
      </div>
      <div className={cn("text-[14px] font-semibold tabular mt-0.5", scoreColor(value))}>
        {value.toFixed(1)}
      </div>
    </div>
  );
}

function scoreColor(score: number) {
  if (score >= 4) return "text-status-green";
  if (score >= 3) return "text-status-amber";
  return "text-status-red";
}
