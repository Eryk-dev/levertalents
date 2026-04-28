import { useScopedQuery } from "@/shared/data/useScopedQuery";
import { supabase } from "@/integrations/supabase/client";
import {
  STAGE_GROUP_BY_STAGE,
  type StageGroupKey,
} from "@/lib/hiring/stageGroups";
import type { ApplicationStage } from "@/integrations/supabase/hiring-types";

export interface JobApplicationCounts {
  total: number;
  byGroup: Record<StageGroupKey, number>;
  /** Data/hora da atividade mais recente (stage_entered_at ou updated_at) em qualquer candidato. */
  lastActivity: string | null;
  /** Dias desde a última atividade. */
  idleDays: number | null;
}

const EMPTY_BY_GROUP: Record<StageGroupKey, number> = {
  triagem: 0,
  checagem: 0,
  entrevista_rh: 0,
  entrevista_final: 0,
  decisao: 0,
  descartados: 0,
};

/**
 * Phase 2 Plan 02-05: porta useApplicationCountsByJobs para useScopedQuery
 * (chokepoint Phase 1). queryKey final: ['scope', scope.id, scope.kind,
 * 'hiring', 'application-counts-by-jobs', jobIdsKey].
 *
 * Alimenta o sparkbar de distribuição (D-11) no JobCard (Plan 02-07).
 */
export function useApplicationCountsByJobs(jobIds: string[]) {
  const sortedKey = [...jobIds].sort().join(",");
  return useScopedQuery<Record<string, JobApplicationCounts>, Error>(
    ["hiring", "application-counts-by-jobs", sortedKey],
    async (): Promise<Record<string, JobApplicationCounts>> => {
      if (jobIds.length === 0) return {};

      const { data, error } = await supabase
        .from("applications")
        .select("id, job_opening_id, stage, stage_entered_at, updated_at")
        .in("job_opening_id", jobIds);

      if (error) throw error;

      const result: Record<string, JobApplicationCounts> = {};
      for (const id of jobIds) {
        result[id] = {
          total: 0,
          byGroup: { ...EMPTY_BY_GROUP },
          lastActivity: null,
          idleDays: null,
        };
      }

      for (const row of (data ?? []) as Array<{
        job_opening_id: string;
        stage: ApplicationStage;
        stage_entered_at: string;
        updated_at: string | null;
      }>) {
        const bucket = result[row.job_opening_id];
        if (!bucket) continue;
        bucket.total += 1;

        const group = STAGE_GROUP_BY_STAGE[row.stage] as StageGroupKey | undefined;
        if (group && bucket.byGroup[group] !== undefined) {
          bucket.byGroup[group] += 1;
        }

        const activityAt = row.updated_at ?? row.stage_entered_at;
        if (activityAt && (!bucket.lastActivity || activityAt > bucket.lastActivity)) {
          bucket.lastActivity = activityAt;
        }
      }

      const now = Date.now();
      for (const id of jobIds) {
        const b = result[id];
        if (b.lastActivity) {
          b.idleDays = Math.max(
            0,
            Math.floor((now - new Date(b.lastActivity).getTime()) / 86_400_000),
          );
        }
      }

      return result;
    },
    { enabled: jobIds.length > 0, staleTime: 30_000 },
  );
}
