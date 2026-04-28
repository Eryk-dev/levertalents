import type { ApplicationRow } from "@/integrations/supabase/hiring-types";

export interface AntecedentesTabContentProps {
  active: ApplicationRow | null;
  job: { id: string; company_id: string } | null;
  candidateId: string;
}

/**
 * Plan 02-09 Task 1b — Conteúdo da tab "Antecedentes" (porta do
 * BackgroundCheckUploader do legacy CandidateDrawer.tsx).
 */
export function AntecedentesTabContent(_props: AntecedentesTabContentProps) {
  return null;
}
