import { Briefcase, Building2 } from "lucide-react";
import { StatusBadge } from "@/components/primitives";
import { cn } from "@/lib/utils";
import { useCandidateTags } from "@/hooks/hiring/useCandidateTags";
import type { ApplicationRow } from "@/integrations/supabase/hiring-types";

export interface HistoricoTabContentProps {
  candidateId: string;
  applications: ApplicationRow[];
  activeId: string | null;
}

/**
 * Plan 02-09 Task 1b — Tab "Histórico":
 *   - **TAL-02:** lista tags por empresa via useCandidateTags (cross-empresa
 *     histórico — building icon + company name + job title + last_applied_at)
 *   - History list: stage transitions desta candidatura (porta do legacy
 *     CandidateDrawer.tsx body switch ~lines 364-390).
 */
export function HistoricoTabContent({
  candidateId,
  applications,
  activeId,
}: HistoricoTabContentProps) {
  const { data: tags = [], isLoading: tagsLoading } = useCandidateTags(candidateId);

  return (
    <div className="space-y-5">
      {/* TAL-02 — tags por empresa/vaga */}
      <section>
        <div className="mb-2 text-[11px] font-semibold text-text-subtle uppercase tracking-[0.06em]">
          Histórico em empresas
        </div>
        {tagsLoading ? (
          <p className="text-[12.5px] text-text-muted">Carregando histórico...</p>
        ) : tags.length === 0 ? (
          <p className="text-[12.5px] text-text-muted">
            Esta é a primeira candidatura conhecida deste candidato no Lever.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {tags.map((tag) => (
              <li
                key={tag.company_id}
                className="flex items-start gap-2 rounded-md border border-border bg-bg-subtle p-2.5"
              >
                <Building2
                  className="h-3.5 w-3.5 mt-0.5 text-text-subtle shrink-0"
                  aria-hidden
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">
                    {tag.company_name}
                  </div>
                  <div className="text-[11.5px] text-text-muted flex items-center gap-1">
                    <Briefcase className="h-3 w-3 shrink-0" aria-hidden />
                    <span className="truncate">{tag.job_title}</span>
                  </div>
                  <div className="text-[10.5px] text-text-subtle tabular-nums mt-0.5">
                    Candidatura mais recente:{" "}
                    {new Date(tag.last_applied_at).toLocaleDateString("pt-BR")}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* History list — applications desta candidatura */}
      <section>
        <div className="mb-2 text-[11px] font-semibold text-text-subtle uppercase tracking-[0.06em]">
          Aplicações
        </div>
        {applications.length === 0 ? (
          <p className="text-[12.5px] text-text-muted">Sem aplicações.</p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border overflow-hidden">
            {applications.map((a) => (
              <li
                key={a.id}
                className={cn(
                  "flex items-center justify-between gap-2 px-3 py-2.5 text-[12.5px]",
                  activeId === a.id && "bg-accent-soft",
                )}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    Vaga {a.job_opening_id.slice(0, 8)}…
                  </p>
                  <p className="text-[11px] text-text-subtle">
                    Entrada: {new Date(a.stage_entered_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <StatusBadge kind="application" status={a.stage} size="sm" />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
