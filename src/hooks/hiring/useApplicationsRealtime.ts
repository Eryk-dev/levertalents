import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useScope } from "@/app/providers/ScopeProvider";
import type {
  ApplicationRow,
  ApplicationWithCandidate,
} from "@/integrations/supabase/hiring-types";

/**
 * Phase 2 Plan 02-05 — Realtime feed do board (D-04).
 *
 * Subscribe a um channel per-jobId. Quando outro RH move um candidato,
 * o payload chega aqui e atualizamos a cache do TanStack DIRETAMENTE
 * (silent re-render — sem toast, sem flash).
 *
 *  - UPDATE postgres_changes filter `job_opening_id=eq.${jobId}`
 *      → setQueryData merge silencioso por id (atualiza item por id).
 *  - INSERT mesmo filter
 *      → invalidate (rebuild join com candidate; INSERT raro).
 *  - Cleanup atomico no unmount: supabase.removeChannel(channel).
 *
 * Effect deps: [jobId, scope?.id, scope?.kind, queryClient].
 * Não cria channel sem scope nem sem jobId.
 */
export function useApplicationsRealtime(jobId: string | undefined): void {
  const queryClient = useQueryClient();
  const { scope } = useScope();

  useEffect(() => {
    if (!jobId || !scope) return;

    const channelName = `applications:job:${jobId}`;
    const queryKey = [
      "scope",
      scope.id,
      scope.kind,
      "hiring",
      "applications",
      "by-job",
      jobId,
    ] as const;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes" as unknown as never,
        {
          event: "UPDATE",
          schema: "public",
          table: "applications",
          filter: `job_opening_id=eq.${jobId}`,
        } as never,
        (payload: { new: ApplicationRow }) => {
          const updated = payload.new;
          queryClient.setQueryData<ApplicationWithCandidate[]>(
            queryKey,
            (old) => {
              if (!old) return old;
              return old.map((a) =>
                a.id === updated.id
                  ? {
                      ...a,
                      stage: updated.stage,
                      stage_entered_at: updated.stage_entered_at,
                      updated_at: updated.updated_at,
                      last_moved_by: updated.last_moved_by,
                    }
                  : a,
              );
            },
          );
        },
      )
      .on(
        "postgres_changes" as unknown as never,
        {
          event: "INSERT",
          schema: "public",
          table: "applications",
          filter: `job_opening_id=eq.${jobId}`,
        } as never,
        () => {
          void queryClient.invalidateQueries({ queryKey });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [jobId, scope?.id, scope?.kind, queryClient, scope]);
}
