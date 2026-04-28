import { useScopedQuery } from "@/shared/data/useScopedQuery";
import { supabase } from "@/integrations/supabase/client";

/**
 * Phase 2 Plan 02-07 — conta `applications` com `metadata.legacy_marker NOT NULL`
 * (residual da Migration F.1 backfill). Usado por `LegacyStageWarning` banner
 * durante o cutover.
 *
 * CLAUDE.md compliance: `supabase.from()` calls live em `src/hooks/`,
 * NÃO em `src/components/`.
 *
 * @param jobId - opcional; se passado, limita a contagem ao job_opening_id;
 *                quando ausente, conta no escopo todo (current scope).
 */
export function useLegacyStageCount(jobId?: string) {
  return useScopedQuery<number, Error>(
    ["hiring", "legacy-stage-count", jobId ?? "all"],
    async (): Promise<number> => {
      let q = supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .not("metadata->>legacy_marker", "is", null);
      if (jobId) q = q.eq("job_opening_id", jobId);
      const { count, error } = await q;
      if (error) throw error;
      return count ?? 0;
    },
    { staleTime: 60_000 },
  );
}
