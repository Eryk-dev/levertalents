import type { ApplicationRow, CulturalFitResponseRow } from "@/integrations/supabase/hiring-types";

export interface FitTabContentProps {
  active: ApplicationRow | null;
  fitResponse: CulturalFitResponseRow | null;
}

/**
 * Plan 02-09 Task 1b — Conteúdo da tab "Fit" (porta do CulturalFitResponseViewer
 * do legacy CandidateDrawer.tsx).
 */
export function FitTabContent(_props: FitTabContentProps) {
  return null;
}
