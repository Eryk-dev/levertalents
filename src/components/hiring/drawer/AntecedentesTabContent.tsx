import { BackgroundCheckUploader } from "@/components/hiring/BackgroundCheckUploader";
import type { ApplicationRow } from "@/integrations/supabase/hiring-types";

export interface AntecedentesTabContentProps {
  active: ApplicationRow | null;
  job: { id: string; company_id: string } | null;
  candidateId: string;
}

/**
 * Plan 02-09 Task 1b — Tab "Antecedentes": invoca BackgroundCheckUploader existente
 * (porta do legacy CandidateDrawer.tsx body switch ~lines 349-362).
 */
export function AntecedentesTabContent({
  active,
  job,
  candidateId,
}: AntecedentesTabContentProps) {
  if (!active || !job) {
    return (
      <p className="text-[12.5px] text-text-muted">
        Selecione uma aplicação para enviar antecedentes.
      </p>
    );
  }
  return (
    <BackgroundCheckUploader
      applicationId={active.id}
      candidateId={candidateId}
      companyId={job.company_id}
      jobOpeningId={job.id}
    />
  );
}
