import { cn } from "@/lib/utils";
import {
  STAGE_GROUPS,
  STAGE_GROUP_BAR_COLORS,
  type StageGroupKey,
} from "@/lib/hiring/stageGroups";

interface SparkbarDistributionProps {
  byGroup: Record<StageGroupKey, number>;
  total: number;
  className?: string;
}

/**
 * Phase 2 Plan 02-07 — sparkbar SVG/HTML inline (sem chart lib).
 *
 * D-11: cores por intencionalidade do funil (definidas em STAGE_GROUP_BAR_COLORS):
 *   - Azul → triagem + checagem (movimento inicial)
 *   - Amarelo → entrevista_rh + entrevista_final
 *   - Verde → decisão / aprovado / admissão
 *   - Vermelho → descartados
 *
 * Descartados é EXCLUÍDO da bar — chip dedicado mostra esse número à parte.
 *
 * Acessibilidade: `role="img"` + `aria-label` resume distribuição
 * ("12 candidatos · 30% em Entrevistas").
 */
export function SparkbarDistribution({
  byGroup,
  total,
  className,
}: SparkbarDistributionProps) {
  const visibleGroups = STAGE_GROUPS.filter((g) => g.key !== "descartados");
  const totalActive = visibleGroups.reduce(
    (acc, g) => acc + (byGroup[g.key] ?? 0),
    0,
  );

  if (total === 0 || totalActive === 0) {
    return (
      <div
        className={cn("h-1 w-full rounded-full bg-bg-muted", className)}
        role="img"
        aria-label="Sem candidatos ativos"
      />
    );
  }

  const summary = visibleGroups
    .filter((g) => (byGroup[g.key] ?? 0) > 0)
    .map((g) => `${byGroup[g.key]} em ${g.label}`)
    .join(", ");

  return (
    <div
      className={cn(
        "flex h-1 w-full overflow-hidden rounded-full bg-bg-muted",
        className,
      )}
      role="img"
      aria-label={`${total} candidatos · ${summary}`}
    >
      {visibleGroups.map((g) => {
        const v = byGroup[g.key] ?? 0;
        if (v === 0) return null;
        const pct = (v / totalActive) * 100;
        return (
          <span
            key={g.key}
            style={{ width: `${pct}%` }}
            className={cn("h-full", STAGE_GROUP_BAR_COLORS[g.key])}
            title={`${g.label}: ${v} (${Math.round(pct)}%)`}
          />
        );
      })}
    </div>
  );
}
