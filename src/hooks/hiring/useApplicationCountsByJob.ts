import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ApplicationStage } from "@/integrations/supabase/hiring-types";
import { STAGE_GROUP_BY_STAGE, type StageGroupKey } from "@/lib/hiring/stageGroups";

export interface JobApplicationCounts {
  total: number;
  byGroup: Record<StageGroupKey, number>;
  /** Data/hora do stage_entered_at mais recente em qualquer candidato dessa vaga. */
  lastActivity: string | null;
  /** Dias desde a última atividade (stage_entered_at) de qualquer candidato. */
  idleDays: number | null;
}

const EMPTY_COUNTS: JobApplicationCounts = {
  total: 0,
  byGroup: {
    triagem: 0,
    fit: 0,
    checagem: 0,
    entrevista_rh: 0,
    entrevista_final: 0,
    decisao: 0,
    descartados: 0,
  },
  lastActivity: null,
  idleDays: null,
};

/**
 * Busca em UM query TODAS as applications das vagas informadas
 * e agrupa em contagem por job_id + stage group.
 */
export function useApplicationCountsByJobs(jobIds: string[]) {
  return useQuery({
    queryKey: ["hiring", "application-counts-by-jobs", [...jobIds].sort().join(",")],
    enabled: jobIds.length > 0,
    queryFn: async (): Promise<Record<string, JobApplicationCounts>> => {
      if (jobIds.length === 0) return {};
      const { data, error } = await supabase
        .from("applications")
        .select("job_opening_id, stage, stage_entered_at")
        .in("job_opening_id", jobIds);
      if (error) throw error;

      const out: Record<string, JobApplicationCounts> = {};
      for (const id of jobIds) {
        out[id] = {
          total: 0,
          byGroup: { ...EMPTY_COUNTS.byGroup },
          lastActivity: null,
          idleDays: null,
        };
      }

      for (const row of (data ?? []) as Array<{
        job_opening_id: string;
        stage: ApplicationStage;
        stage_entered_at: string;
      }>) {
        const bucket = out[row.job_opening_id];
        if (!bucket) continue;
        bucket.total += 1;
        const group = STAGE_GROUP_BY_STAGE[row.stage];
        if (group) bucket.byGroup[group] += 1;
        if (!bucket.lastActivity || row.stage_entered_at > bucket.lastActivity) {
          bucket.lastActivity = row.stage_entered_at;
        }
      }

      const now = Date.now();
      for (const id of jobIds) {
        const b = out[id];
        if (b.lastActivity) {
          b.idleDays = Math.max(
            0,
            Math.floor((now - new Date(b.lastActivity).getTime()) / 86_400_000),
          );
        }
      }
      return out;
    },
  });
}
