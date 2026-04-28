import type { ApplicationRow } from "@/integrations/supabase/hiring-types";

export interface HistoricoTabContentProps {
  candidateId: string;
  applications: ApplicationRow[];
  activeId: string | null;
}

/**
 * Plan 02-09 Task 1b — Conteúdo da tab "Histórico" (porta da history list
 * legacy + adiciona TAL-02 tags via useCandidateTags).
 */
export function HistoricoTabContent(_props: HistoricoTabContentProps) {
  return null;
}
