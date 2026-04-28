import { Skeleton } from '@/components/ui/skeleton';
import { Users } from 'lucide-react';
import { useClimateAggregate } from '@/hooks/useClimateAggregate';

export interface ClimateAggregateCardProps {
  surveyId: string;
  orgUnitId?: string | null;
  surveyName: string;
  orgUnitName?: string;
}

/**
 * D-10 / T-3-02 mitigation: k-anonymity-aware aggregate card.
 * When useClimateAggregate returns insufficient_data:true, renders an empty state
 * WITHOUT exposing any partial count (Pitfall §3 — prevents combination attack).
 * No CTA on empty state — it's a wait state.
 * Both states share min-h-[160px] to prevent layout shift.
 */
export function ClimateAggregateCard({
  surveyId,
  orgUnitId = null,
  surveyName,
  orgUnitName,
}: ClimateAggregateCardProps) {
  const { data, isLoading } = useClimateAggregate(surveyId, orgUnitId);

  if (isLoading) {
    return (
      <div className="surface-paper p-3.5 min-h-[160px]">
        <Skeleton className="h-4 w-2/3 mb-2" />
        <Skeleton className="h-8 w-full mt-2" />
      </div>
    );
  }

  // K-anonymity empty state — Pitfall §3: NEVER show count when insufficient_data:true
  if (!data || ('insufficient_data' in data && data.insufficient_data)) {
    return (
      <div className="surface-paper p-3.5 min-h-[160px] flex flex-col items-center justify-center text-center">
        <Users className="size-6 text-text-subtle mb-2" aria-hidden="true" />
        <h3 className="text-[13px] font-semibold text-text tracking-[-0.005em]">
          Dados insuficientes para garantir anonimato
        </h3>
        <p className="text-sm text-text-subtle mt-1 max-w-xs">
          Aguarde no mínimo 3 respostas para esta unidade. Esta pesquisa é 100% anônima.
        </p>
        {/* No CTA — wait state (UI-SPEC §k-anonymity rendering) */}
      </div>
    );
  }

  return (
    <div className="surface-paper p-3.5 min-h-[160px]">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-[13px] font-semibold text-text tracking-[-0.005em]">{surveyName}</h3>
        {orgUnitName && <span className="text-xs text-text-subtle">{orgUnitName}</span>}
      </div>
      <div className="flex items-baseline gap-3">
        <span className="text-[26px] font-semibold tabular tracking-[-0.02em] leading-[1.05]">
          {data.avg.toFixed(1)}
        </span>
        <span className="text-xs text-text-subtle">média ({data.count} respostas)</span>
      </div>
      <div className="mt-3 grid grid-cols-5 gap-1">
        {([1, 2, 3, 4, 5] as const).map((score) => {
          const cnt = data.distribution[String(score)] ?? 0;
          const pct = data.count > 0 ? (cnt / data.count) * 100 : 0;
          return (
            <div key={score} className="flex flex-col items-center">
              <div className="w-full bg-bg-subtle rounded relative h-12">
                <div
                  className="absolute bottom-0 left-0 right-0 bg-accent rounded"
                  style={{ height: `${pct}%` }}
                />
              </div>
              <span className="text-xs mt-1">{score}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
