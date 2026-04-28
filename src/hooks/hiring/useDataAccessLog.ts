import { useScopedQuery } from "@/shared/data/useScopedQuery";
import { supabase } from "@/integrations/supabase/client";
import type { DataAccessLogEntry } from "@/integrations/supabase/hiring-types";

/**
 * Plan 02-06 — Lista entradas de `data_access_log` para uma entidade (TAL-05 / TAL-07).
 *
 * Alimenta `AuditLogPanel.tsx` (Plan 02-09 UI). Visível apenas para RH/admin
 * via RLS policy do data_access_log (`is_people_manager((select auth.uid()))`).
 *
 * Append-only — nenhum hook de mutation aqui (writes acontecem só dentro de
 * RPCs SECURITY DEFINER tipo `read_candidate_with_log`).
 *
 * staleTime 60s: log cresce devagar e UI raramente precisa atualização instantânea.
 */
export function useDataAccessLog(
  entityType: "candidate" | "application" | "cultural_fit_response" | "profile" | "salary",
  entityId: string | undefined,
  limit: number = 50,
) {
  return useScopedQuery<DataAccessLogEntry[], Error>(
    ["hiring", "data-access-log", entityType, entityId ?? "none", limit],
    async (): Promise<DataAccessLogEntry[]> => {
      if (!entityId) return [];
      const { data, error } = await supabase
        .from("data_access_log")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as DataAccessLogEntry[];
    },
    { enabled: !!entityId, staleTime: 60_000 },
  );
}
