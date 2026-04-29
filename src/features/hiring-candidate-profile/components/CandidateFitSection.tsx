import { Sparkles } from "lucide-react";
import { Btn, Chip, LinearEmpty } from "@/components/primitives/LinearKit";
import { CulturalFitResponseViewer } from "@/components/hiring/CulturalFitResponseViewer";
import type {
  ApplicationRow,
  CulturalFitResponseRow,
} from "@/integrations/supabase/hiring-types";
import { SectionTitle } from "./_primitives";

export interface CandidateFitSectionProps {
  active: ApplicationRow | null;
  fitResponse: CulturalFitResponseRow | null;
  onIssueFit: () => void;
}

/**
 * Cultural fit scores + viewer.
 * Renderiza o card de Fit Cultural com botão "Enviar Fit" e o viewer de respostas.
 * O dialog de geração de link é controlado pelo shell (props onIssueFit abre o dialog).
 */
export function CandidateFitSection({
  active,
  fitResponse,
  onIssueFit,
}: CandidateFitSectionProps) {
  const fitDone = !!fitResponse?.submitted_at;

  return (
    <section id="fit" className="scroll-mt-5 space-y-3">
      <SectionTitle
        icon={<Sparkles className="h-3.5 w-3.5" />}
        right={
          fitDone ? (
            <Chip color="green" size="sm">
              Concluído
            </Chip>
          ) : active ? (
            <Btn
              variant="accent"
              size="xs"
              icon={<Sparkles className="h-3 w-3" />}
              onClick={onIssueFit}
            >
              Enviar Fit
            </Btn>
          ) : null
        }
      >
        Fit cultural
      </SectionTitle>
      {active ? (
        <CulturalFitResponseViewer
          applicationId={active.id}
          surveyId={fitResponse?.survey_id ?? null}
        />
      ) : (
        <LinearEmpty
          icon={<Sparkles className="w-[18px] h-[18px]" />}
          title="Sem aplicação ativa"
          description="Sem uma aplicação, não é possível enviar ou ver o Fit Cultural."
        />
      )}
    </section>
  );
}
