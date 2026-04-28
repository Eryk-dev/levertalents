import { useMemo } from "react";
import {
  useApplicationsByJob,
  type ApplicationWithCandidate,
} from "@/hooks/hiring/useApplications";
import type { ApplicationStage } from "@/integrations/supabase/hiring-types";

/**
 * Phase 2 Plan 02-10 (gap closure RS-10) — stages terminais reais do enum
 * APPLICATION_STAGE_TRANSITIONS (os 3 com array vazio em
 * src/lib/hiring/statusMachine.ts: admitido | reprovado_pelo_gestor |
 * recusado). Não inclui `reprovado` ou `descartado` — esses NÃO existem
 * no enum atual (verificação 02-VERIFICATION.md SC-3 PARTIAL).
 */
export const TERMINAL_STAGES = [
  "admitido",
  "reprovado_pelo_gestor",
  "recusado",
] as const satisfies readonly ApplicationStage[];

export type TerminalStage = (typeof TERMINAL_STAGES)[number];

export function isTerminalStage(s: ApplicationStage): s is TerminalStage {
  return (TERMINAL_STAGES as readonly ApplicationStage[]).includes(s);
}

/**
 * Deriva applications com stage terminal a partir de useApplicationsByJob
 * (sem query DB extra — o board já carrega todas as applications da vaga
 * via mesma queryKey ["scope", scope.id, scope.kind, "hiring",
 * "applications", "by-job", jobId]; cache compartilhado entre board e
 * lista de Encerradas). Ordenação: stage_entered_at DESC (mais recentes
 * primeiro — RH normalmente quer ver fechadas recentes).
 */
export function useTerminalApplications(jobId: string | undefined) {
  const query = useApplicationsByJob(jobId);
  const data = useMemo<ApplicationWithCandidate[]>(() => {
    const all = query.data ?? [];
    return all
      .filter((a) => isTerminalStage(a.stage))
      .sort((a, b) =>
        (b.stage_entered_at ?? "").localeCompare(a.stage_entered_at ?? ""),
      );
  }, [query.data]);
  return { ...query, data };
}
