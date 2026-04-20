import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useVisibleCompanies } from "@/lib/hiring/rlsScope";
import type {
  ApplicationStage,
  JobStatus,
} from "@/integrations/supabase/hiring-types";

export interface HiringMetricsFilters {
  companyId?: string | null;
  managerId?: string | null;
  start?: string | null;
  end?: string | null;
}

export interface HiringMetrics {
  jobsByStatus: Array<{ status: JobStatus; count: number }>;
  applicationsByStage: Array<{ stage: ApplicationStage; count: number }>;
  bottlenecks: Array<{
    application_id: string;
    stage: ApplicationStage;
    stage_entered_at: string;
    days_in_stage: number;
    job_opening_id: string;
    job_title: string;
    candidate_name: string;
  }>;
  avgDaysPerJob: number | null;
  conversionByStage: Array<{
    from_stage: ApplicationStage | null;
    to_stage: ApplicationStage;
    transitions: number;
  }>;
  finalApprovalRate: number | null;
}

export function useHiringMetrics(filters: HiringMetricsFilters = {}) {
  const { companyIds, canSeeAll } = useVisibleCompanies();
  const scopedCompanyIds = filters.companyId && filters.companyId !== "all"
    ? [filters.companyId]
    : canSeeAll
      ? null
      : companyIds;

  return useQuery({
    queryKey: [
      "hiring-metrics",
      { ...filters, scope: scopedCompanyIds ?? "all" },
    ],
    staleTime: 60_000,
    queryFn: async (): Promise<HiringMetrics> => {
      const scope = (q: ReturnType<typeof supabase.from<never, never>>) =>
        scopedCompanyIds && scopedCompanyIds.length > 0
          ? q.in("company_id", scopedCompanyIds)
          : q;

      const [jobsByStatus, appsByStage, bottlenecks, avgDays, conversion, finalApprovalRate] = await Promise.all([
        scope(supabase.from("v_hiring_jobs_by_status").select("status,count")).then((r) => r.data ?? []),
        scope(supabase.from("v_hiring_applications_by_stage").select("stage,count")).then((r) => r.data ?? []),
        scope(
          supabase
            .from("v_hiring_bottlenecks")
            .select("application_id, stage, stage_entered_at, days_in_stage, job_opening_id, job_title, candidate_name")
            .order("days_in_stage", { ascending: false })
            .limit(20),
        ).then((r) => r.data ?? []),
        scope(supabase.from("v_hiring_avg_time_per_job").select("avg_days_open")).then((r) => {
          const sum = (r.data ?? []).reduce((acc, row) => acc + Number((row as { avg_days_open: number | null }).avg_days_open ?? 0), 0);
          const count = (r.data ?? []).length;
          return count > 0 ? sum / count : null;
        }),
        scope(supabase.from("v_hiring_stage_conversion").select("from_stage, to_stage, transitions")).then(
          (r) => r.data ?? [],
        ),
        scope(supabase.from("v_hiring_final_approval_rate").select("aprovados, reprovados, approval_rate")).then(
          (r) => {
            const rows = (r.data ?? []) as Array<{ approval_rate: number | null }>;
            if (rows.length === 0) return null;
            const mean = rows.reduce((acc, row) => acc + Number(row.approval_rate ?? 0), 0) / rows.length;
            return mean;
          },
        ),
      ]);

      return {
        jobsByStatus: jobsByStatus as HiringMetrics["jobsByStatus"],
        applicationsByStage: appsByStage as HiringMetrics["applicationsByStage"],
        bottlenecks: bottlenecks as HiringMetrics["bottlenecks"],
        avgDaysPerJob: avgDays,
        conversionByStage: conversion as HiringMetrics["conversionByStage"],
        finalApprovalRate,
      };
    },
  });
}
