import type { PendingTask } from "@/hooks/usePendingTasks";

export function getPendingTaskRoute(task: Pick<PendingTask, "task_type" | "related_id">): string {
  switch (task.task_type) {
    case "pdi":
    case "development_plan":
    case "pdi_approval":
    case "pdi_update":
      return "/pdi";
    case "one_on_one":
    case "1on1":
    case "action_item":
      return "/11s";
    case "evaluation":
    case "self_evaluation":
      return "/avaliacoes";
    case "climate":
    case "climate_survey":
      return "/clima";
    case "hiring_job_approval":
      return task.related_id ? `/hiring/jobs/${task.related_id}` : "/hiring/jobs";
    case "hiring_job_review":
      return "/hiring/jobs";
    case "hiring_candidate_stage_change":
    case "hiring_interview_reminder":
    case "hiring_final_decision":
    case "hiring_admission_followup":
    case "hiring_fit_cultural_received":
    case "hiring_fit_cultural_expired":
      return task.related_id ? `/hiring/candidates/${task.related_id}` : "/hiring/candidates";
    default:
      return "/dashboard";
  }
}
