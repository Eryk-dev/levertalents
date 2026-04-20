import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/primitives";
import type { ApplicationStage } from "@/integrations/supabase/hiring-types";

interface BottleneckAlertProps {
  bottleneck: {
    application_id: string;
    job_opening_id: string;
    job_title: string;
    candidate_name: string;
    stage: ApplicationStage;
    days_in_stage: number;
  };
}

export function BottleneckAlert({ bottleneck }: BottleneckAlertProps) {
  return (
    <li className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {bottleneck.candidate_name} · {bottleneck.job_title}
        </p>
        <p className="text-xs text-muted-foreground">
          Parada há {bottleneck.days_in_stage} dia(s) em{" "}
          <StatusBadge kind="application" status={bottleneck.stage} size="sm" />
        </p>
      </div>
      <Button asChild size="sm" variant="outline">
        <Link to={`/hiring/jobs/${bottleneck.job_opening_id}`}>Ver no Kanban</Link>
      </Button>
    </li>
  );
}
