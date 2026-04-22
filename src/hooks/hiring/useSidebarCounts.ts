import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import "@/integrations/supabase/hiring-types";

/**
 * Contagens para badges do sidebar de Recrutamento.
 * - vagas: job_openings não encerradas (inbox-like)
 * - candidatos: candidates ativos (não anonimizados)
 *
 * Respeita RLS automaticamente. `head: true` evita trazer as rows.
 */
export function useSidebarHiringCounts() {
  return useQuery({
    queryKey: ["sidebar", "hiring-counts"],
    staleTime: 60_000,
    queryFn: async () => {
      const [jobs, candidates] = await Promise.all([
        supabase
          .from("job_openings")
          .select("*", { count: "exact", head: true })
          .neq("status", "fechada"),
        supabase
          .from("candidates")
          .select("*", { count: "exact", head: true })
          .is("anonymized_at", null),
      ]);
      return {
        jobs: jobs.count ?? 0,
        candidates: candidates.count ?? 0,
      };
    },
  });
}
