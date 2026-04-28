import type { ApplicationRow, InterviewRow } from "@/integrations/supabase/hiring-types";

export interface EntrevistasTabContentProps {
  active: ApplicationRow | null;
  interviews: InterviewRow[];
  job: { id: string; company_id: string } | null;
  candidateId: string;
  onSchedule: () => void;
}

/**
 * Plan 02-09 Task 1b — Conteúdo da tab "Entrevistas" (será portado da legacy
 * InterviewsSection do CandidateDrawer.tsx).
 */
export function EntrevistasTabContent(_props: EntrevistasTabContentProps) {
  return null;
}
