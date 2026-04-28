import { useScopedQuery } from "@/shared/data/useScopedQuery";
import { supabase } from "@/integrations/supabase/client";

/**
 * TAL-02 — Tag por empresa/vaga em que o candidato participou (histórico
 * cross-empresa). Mesmo shape de `CandidateTag` exportado por useTalentPool —
 * ambas as fontes alimentam a mesma surface UI.
 */
export interface CandidateTag {
  company_id: string;
  company_name: string;
  job_title: string;
  last_applied_at: string;
}

interface ApplicationWithJobAndCompany {
  id: string;
  created_at: string;
  job_opening: {
    title: string | null;
    company_id: string | null;
    company: { id: string; name: string } | null;
  } | null;
}

/**
 * Plan 02-06 Task 5 — TAL-02 hook standalone.
 *
 * Agrega applications cross-empresa do candidato: para cada `company_id`
 * distinto, retorna a entrada com `job_title` e `last_applied_at` MAIS RECENTES.
 *
 * Sort final: company com `last_applied_at` DESC (mais recente primeiro).
 *
 * Usado por:
 *   - CandidateProfile / CandidateDrawer (Plan 02-09 UI) — exibe histórico no header
 *   - useTalentPool já surface tags por candidato (Task 2); este hook é o
 *     entry point standalone para casos onde só precisamos das tags de um
 *     candidato específico (sem o resto do shape de TalentPoolCandidate).
 *
 * staleTime 60s — applications mudam infrequentemente para o caso comum de
 * inspeção de histórico no drawer; query é cross-empresa e potencialmente custosa.
 */
export function useCandidateTags(candidateId: string | undefined) {
  return useScopedQuery<CandidateTag[], Error>(
    ["hiring", "candidate-tags", candidateId ?? "none"],
    async (): Promise<CandidateTag[]> => {
      if (!candidateId) return [];
      const { data, error } = await supabase
        .from("applications")
        .select(
          `
          id,
          created_at,
          job_opening:job_openings(
            title,
            company_id,
            company:companies(id, name)
          )
        `,
        )
        .eq("candidate_id", candidateId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const apps = (data ?? []) as unknown as ApplicationWithJobAndCompany[];
      const byCompany = new Map<string, CandidateTag>();

      for (const app of apps) {
        const co = app.job_opening?.company;
        const jt = app.job_opening?.title;
        if (!co || !jt) continue;
        const existing = byCompany.get(co.id);
        if (!existing || app.created_at > existing.last_applied_at) {
          byCompany.set(co.id, {
            company_id: co.id,
            company_name: co.name,
            job_title: jt,
            last_applied_at: app.created_at,
          });
        }
      }

      return Array.from(byCompany.values()).sort((a, b) =>
        b.last_applied_at.localeCompare(a.last_applied_at),
      );
    },
    { enabled: !!candidateId, staleTime: 60_000 },
  );
}
