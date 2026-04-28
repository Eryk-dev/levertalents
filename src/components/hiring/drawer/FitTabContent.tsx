import { CulturalFitResponseViewer } from "@/components/hiring/CulturalFitResponseViewer";
import type { ApplicationRow, CulturalFitResponseRow } from "@/integrations/supabase/hiring-types";

export interface FitTabContentProps {
  active: ApplicationRow | null;
  fitResponse: CulturalFitResponseRow | null;
}

/**
 * Plan 02-09 Task 1b — Tab "Fit Cultural": invoca CulturalFitResponseViewer existente
 * (porta do legacy CandidateDrawer.tsx body switch ~lines 336-347).
 */
export function FitTabContent({ active, fitResponse }: FitTabContentProps) {
  if (!active) {
    return (
      <p className="text-[12.5px] text-text-muted">
        Selecione uma aplicação para ver o Fit Cultural.
      </p>
    );
  }
  return (
    <CulturalFitResponseViewer
      applicationId={active.id}
      surveyId={fitResponse?.survey_id ?? null}
    />
  );
}
