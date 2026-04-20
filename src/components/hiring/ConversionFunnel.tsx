import { SectionCard } from "@/components/primitives";
import { APPLICATION_STAGE_LABELS } from "@/lib/hiring/statusMachine";
import type { ApplicationStage } from "@/integrations/supabase/hiring-types";

interface ConversionFunnelProps {
  data: Array<{ from_stage: ApplicationStage | null; to_stage: ApplicationStage; transitions: number }>;
}

export function ConversionFunnel({ data }: ConversionFunnelProps) {
  // Aggregate transitions per destination stage.
  const totals = new Map<ApplicationStage, number>();
  for (const row of data) {
    totals.set(row.to_stage, (totals.get(row.to_stage) ?? 0) + row.transitions);
  }
  const ordered: ApplicationStage[] = [
    "recebido",
    "em_interesse",
    "antecedentes_ok",
    "apto_entrevista_rh",
    "entrevista_rh_feita",
    "apto_entrevista_final",
    "aguardando_decisao_dos_gestores",
    "aprovado",
    "admitido",
  ];
  const max = Math.max(1, ...ordered.map((s) => totals.get(s) ?? 0));

  return (
    <SectionCard title="Conversão por etapa" description="Quantas transições chegaram em cada estágio no período.">
      <ul className="space-y-1">
        {ordered.map((stage) => {
          const count = totals.get(stage) ?? 0;
          const pct = Math.round((count / max) * 100);
          return (
            <li key={stage} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span>{APPLICATION_STAGE_LABELS[stage]}</span>
                <span className="tabular-nums text-muted-foreground">{count}</span>
              </div>
              <div className="h-2 rounded-full bg-bg-muted">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}
