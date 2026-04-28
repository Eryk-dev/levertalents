import type {
  CandidateRow,
  ApplicationRow,
  CulturalFitResponseRow,
  InterviewRow,
} from "@/integrations/supabase/hiring-types";

export interface PerfilTabContentProps {
  candidate: CandidateRow;
  active: ApplicationRow | null;
  job: { id: string; company_id: string } | null;
  fitResponse: CulturalFitResponseRow | null;
  interviews: InterviewRow[];
  onDownloadCv: () => void;
  onIssueFit: () => void;
  onStartAdmission: () => void;
}

/**
 * Plan 02-09 Task 1b — Conteúdo da tab "Perfil" (será portado do legacy
 * `CandidateDrawer.tsx` ProfileSection durante Task 1b).
 */
export function PerfilTabContent(_props: PerfilTabContentProps) {
  return null;
}
