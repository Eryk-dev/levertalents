import { cn } from "@/lib/utils";
import {
  computeSlaTone,
  daysSince,
  SLA_DOT_CLASSES,
  type SlaTone,
} from "@/lib/hiring/sla";

interface SlaBadgeProps {
  stageEnteredAt: string | Date | null | undefined;
  className?: string;
}

const TONE_TEXT_CLASS: Record<SlaTone, string> = {
  ok: "text-text-muted",
  warning: "text-status-amber",
  critical: "text-status-red",
};

/**
 * Phase 2 Plan 02-07 — badge "{N} dias na etapa" com tom semântico (D-10).
 *
 * - 0..1 dia: tom neutro (ok)
 * - 2..4 dias: amber (warning)
 * - >=5 dias: red (critical)
 *
 * Tabular nums via `tabular-nums` utility (Phase 0 typography lock).
 */
export function SlaBadge({ stageEnteredAt, className }: SlaBadgeProps) {
  if (!stageEnteredAt) return null;
  const days = daysSince(stageEnteredAt);
  const tone = computeSlaTone(stageEnteredAt);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] tabular-nums",
        TONE_TEXT_CLASS[tone],
        className,
      )}
      aria-label={`Parado há ${days} dias`}
      title={`Parado há ${days} dias. Considere mover ou descartar.`}
    >
      <span
        className={cn("w-1.5 h-1.5 rounded-full", SLA_DOT_CLASSES[tone])}
        aria-hidden
      />
      {days}d na etapa
    </span>
  );
}
