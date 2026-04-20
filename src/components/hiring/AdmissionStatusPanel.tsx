import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SectionCard, StatusBadge } from "@/components/primitives";
import { useHandoffByApplication, useCompleteAdmission } from "@/hooks/hiring/useOnboardingHandoff";
import type { ApplicationRow } from "@/integrations/supabase/hiring-types";

interface AdmissionStatusPanelProps {
  application: ApplicationRow;
}

export function AdmissionStatusPanel({ application }: AdmissionStatusPanelProps) {
  const { data: handoff } = useHandoffByApplication(application.id);
  const complete = useCompleteAdmission();

  if (!handoff) return null;

  return (
    <SectionCard
      title="Admissão"
      description="Dados do pré-cadastro e próximos passos."
      action={<StatusBadge kind="application" status={application.stage} showIcon />}
    >
      <dl className="grid gap-3 text-sm md:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">Pré-cadastro criado</dt>
          <dd>{new Date(handoff.created_at).toLocaleString("pt-BR")}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Colaborador</dt>
          <dd>
            <Link
              className="text-accent underline"
              to={`/colaborador/${handoff.profile_id}`}
            >
              Ver colaborador
            </Link>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Cargo final</dt>
          <dd>{handoff.final_title ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Início</dt>
          <dd>{handoff.start_date ?? "—"}</dd>
        </div>
      </dl>

      {application.stage === "em_admissao" ? (
        <div className="mt-4 flex justify-end">
          <Button
            disabled={complete.isPending}
            onClick={() =>
              complete.mutate({ handoffId: handoff.id, applicationId: application.id })
            }
          >
            {complete.isPending ? "Concluindo…" : "Concluir admissão"}
          </Button>
        </div>
      ) : null}
    </SectionCard>
  );
}
