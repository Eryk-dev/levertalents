import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Users, LayoutGrid, List } from "lucide-react";
import { LoadingState, Icon } from "@/components/primitives";
import { Btn, Chip, Row, LinearEmpty, LinearAvatar } from "@/components/primitives/LinearKit";
import { useCandidatesListWithApplications } from "@/hooks/hiring/useCandidates";
import { AllCandidatesKanban } from "@/components/hiring/AllCandidatesKanban";
import {
  CandidateQuickFilters,
  type QuickFiltersState,
} from "@/components/hiring/CandidateQuickFilters";
import type { KanbanApplication } from "@/components/hiring/CandidateCard";
import { APPLICATION_STAGE_LABELS } from "@/lib/hiring/statusMachine";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const EMPTY_QUICK_FILTERS: QuickFiltersState = {
  search: "",
  stages: [],
  jobIds: [],
  ownerIds: [],
};

export default function CandidatesList() {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const [filters, setFilters] = useState<QuickFiltersState>(EMPTY_QUICK_FILTERS);
  const [view, setView] = useState<"board" | "list">("board");
  const { data: candidates = [], isLoading } = useCandidatesListWithApplications(filters.search);

  const handleOpenCandidate = (app: KanbanApplication) => {
    navigate(`/hiring/candidates/${app.candidate_id}`);
  };

  // List-view filtering (client-side). Board view passa filters para o Kanban.
  const filteredCandidates = useMemo(() => {
    if (view !== "list") return candidates;
    return candidates.filter((c) => {
      const latest = c.latest_application;
      // Lider: só vê candidatos cujas vagas ele lidera (owner_id = user.id).
      if (userRole === "lider") {
        if (!latest?.owner_id || latest.owner_id !== user?.id) return false;
      }
      if (filters.stages.length > 0) {
        if (!latest || !filters.stages.includes(latest.stage)) return false;
      }
      if (filters.jobIds.length > 0) {
        if (!latest?.job_id || !filters.jobIds.includes(latest.job_id)) return false;
      }
      if (filters.ownerIds.length > 0) {
        if (!latest?.owner_id || !filters.ownerIds.includes(latest.owner_id)) return false;
      }
      return true;
    });
  }, [candidates, view, filters, userRole, user?.id]);

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden font-sans text-text animate-fade-in">
      {/* Header */}
      <div className="px-5 lg:px-7 pt-5 pb-0">
        <Row justify="between" align="baseline" gap={12}>
          <div className="min-w-0">
            <h1 className="text-[20px] font-semibold tracking-[-0.02em] m-0">Candidatos</h1>
            <div className="text-[12.5px] text-text-muted mt-0.5">
              Visualize por etapa do pipeline ou busque um perfil específico
            </div>
          </div>
          <Row gap={6}>
            <div className="inline-flex bg-bg-muted rounded-md p-0.5">
              {[
                { k: "board" as const, label: "Board", icon: <LayoutGrid className="w-3 h-3" /> },
                { k: "list" as const, label: "Lista", icon: <List className="w-3 h-3" /> },
              ].map(({ k, label, icon }) => (
                <button
                  key={k}
                  onClick={() => setView(k)}
                  className={cn(
                    "px-2.5 h-[22px] text-[12px] rounded inline-flex items-center gap-1.5 transition-colors",
                    view === k
                      ? "bg-surface shadow-ds-sm text-text font-medium"
                      : "text-text-muted hover:text-text",
                  )}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>
            <Btn variant="secondary" size="sm" icon={<Icon name="plus" size={12} />}>
              Adicionar
            </Btn>
          </Row>
        </Row>

        <div className="pt-3">
          <CandidateQuickFilters value={filters} onChange={setFilters} />
        </div>
      </div>

      <div className="flex-1 overflow-auto scrollbar-linear px-5 lg:px-7 py-4 min-h-0">
        {view === "board" ? (
          <AllCandidatesKanban
            onOpenCandidate={handleOpenCandidate}
            selectedApplicationId={null}
            filters={filters}
          />
        ) : isLoading ? (
          <LoadingState layout="list" count={5} />
        ) : filteredCandidates.length === 0 ? (
          <LinearEmpty
            icon={<Users className="w-[18px] h-[18px]" strokeWidth={1.75} />}
            title="Nenhum candidato encontrado"
            description="Ajuste os filtros ou adicione candidatos a uma vaga."
          />
        ) : (
          <div className="surface-paper overflow-hidden">
            {filteredCandidates.map((c, i) => {
              const latest = c.latest_application;
              const stageLabel = latest ? APPLICATION_STAGE_LABELS[latest.stage] : null;
              return (
                <Link
                  key={c.id}
                  to={`/hiring/candidates/${c.id}`}
                  className={cn(
                    "flex items-center gap-3 px-3.5 py-2.5 hover:bg-bg-subtle transition-colors",
                    i < filteredCandidates.length - 1 && "border-b border-border",
                  )}
                >
                  <LinearAvatar name={c.full_name || c.email} size={28} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium truncate">{c.full_name}</div>
                    {latest?.job_title ? (
                      <div className="mt-0.5 flex items-center gap-1 text-[11.5px] text-text-muted truncate">
                        <Icon name="briefcase" size={12} className="shrink-0" />
                        <span className="truncate">{latest.job_title}</span>
                        {stageLabel ? (
                          <>
                            <span aria-hidden className="opacity-60">
                              ·
                            </span>
                            <span className="truncate shrink-0 whitespace-nowrap">
                              {stageLabel}
                            </span>
                          </>
                        ) : null}
                        {c.other_applications_count > 0 ? (
                          <Chip color="neutral" size="sm" className="ml-1 shrink-0">
                            +{c.other_applications_count} outras
                          </Chip>
                        ) : null}
                      </div>
                    ) : (
                      <div className="text-[11.5px] text-text-subtle truncate">{c.email}</div>
                    )}
                  </div>
                  {c.anonymized_at && (
                    <Chip color="neutral" size="sm">
                      Anonimizado
                    </Chip>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
