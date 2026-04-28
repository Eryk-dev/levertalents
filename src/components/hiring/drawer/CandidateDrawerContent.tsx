import type { DrawerTab } from "./CandidateDrawerTabs";
import type {
  CandidateRow,
  ApplicationRow,
  CulturalFitResponseRow,
  InterviewRow,
} from "@/integrations/supabase/hiring-types";
import { PerfilTabContent } from "./PerfilTabContent";
import { EntrevistasTabContent } from "./EntrevistasTabContent";
import { FitTabContent } from "./FitTabContent";
import { AntecedentesTabContent } from "./AntecedentesTabContent";
import { HistoricoTabContent } from "./HistoricoTabContent";
import { AuditLogPanel } from "@/components/hiring/AuditLogPanel";

interface CandidateDrawerContentProps {
  activeTab: DrawerTab;
  candidate: CandidateRow;
  active: ApplicationRow | null;
  applications: ApplicationRow[];
  job: { id: string; company_id: string } | null;
  fitResponse: CulturalFitResponseRow | null;
  interviews: InterviewRow[];
  onDownloadCv: () => void;
  onIssueFit: () => void;
  onSchedule: () => void;
  onStartAdmission: () => void;
}

/**
 * Plan 02-09 Task 1a/1b — Switch sobre activeTab renderizando o *TabContent
 * apropriado. Audit log é renderizado pelo AuditLogPanel (Plan 02-09 Task 4).
 */
export function CandidateDrawerContent({
  activeTab,
  candidate,
  active,
  applications,
  job,
  fitResponse,
  interviews,
  onDownloadCv,
  onIssueFit,
  onSchedule,
  onStartAdmission,
}: CandidateDrawerContentProps) {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-linear px-4 py-4">
      {activeTab === "perfil" && (
        <PerfilTabContent
          candidate={candidate}
          active={active}
          job={job}
          fitResponse={fitResponse}
          interviews={interviews}
          onDownloadCv={onDownloadCv}
          onIssueFit={onIssueFit}
          onStartAdmission={onStartAdmission}
        />
      )}

      {activeTab === "entrevistas" && (
        <EntrevistasTabContent
          active={active}
          interviews={interviews}
          job={job}
          candidateId={candidate.id}
          onSchedule={onSchedule}
        />
      )}

      {activeTab === "fit" && (
        <FitTabContent active={active} fitResponse={fitResponse} />
      )}

      {activeTab === "antecedentes" && (
        <AntecedentesTabContent active={active} job={job} candidateId={candidate.id} />
      )}

      {activeTab === "historico" && (
        <HistoricoTabContent
          candidateId={candidate.id}
          applications={applications}
          activeId={active?.id ?? null}
        />
      )}

      {activeTab === "audit" && <AuditLogPanel candidateId={candidate.id} />}
    </div>
  );
}
