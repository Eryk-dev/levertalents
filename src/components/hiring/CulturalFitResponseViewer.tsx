import { SectionCard, ScoreDisplay, EmptyState } from "@/components/primitives";
import { Sparkles } from "lucide-react";
import { useFitQuestions, useFitResponse } from "@/hooks/hiring/useCulturalFit";
import type { CulturalFitQuestionRow } from "@/integrations/supabase/hiring-types";

interface CulturalFitResponseViewerProps {
  applicationId: string;
  surveyId?: string | null;
  /** optional copy of the empresa's cultura/valores to display side-by-side */
  cultura?: string | null;
}

export function CulturalFitResponseViewer({
  applicationId,
  surveyId,
  cultura,
}: CulturalFitResponseViewerProps) {
  const { data: response } = useFitResponse(applicationId);
  const { data: questions = [] } = useFitQuestions(surveyId ?? response?.survey_id);

  if (!response) {
    return (
      <SectionCard title="Fit Cultural" description="Ainda sem respostas para essa candidatura.">
        <EmptyState
          variant="compact"
          icon={Sparkles}
          title="Sem respostas"
          message="Envie o link público para receber as respostas do candidato."
        />
      </SectionCard>
    );
  }

  const payload = (response.payload as Record<string, unknown>) ?? {};
  const questionsById = new Map<string, CulturalFitQuestionRow>();
  for (const q of questions) questionsById.set(q.id, q);

  return (
    <SectionCard
      title="Fit Cultural"
      description={`Submetido em ${new Date(response.submitted_at).toLocaleString("pt-BR")}`}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          {questions.length === 0 && (
            <p className="text-sm text-text-muted">Nenhuma pergunta encontrada para este questionário.</p>
          )}
          {questions.map((q) => {
            const ans = payload[q.id];
            return (
              <div key={q.id} className="rounded-md border border-border bg-bg-subtle p-3">
                <p className="text-sm font-medium">{q.prompt}</p>
                <div className="mt-2">
                  {q.kind === "scale" && typeof ans === "number" ? (
                    <ScoreDisplay score={ans} max={q.scale_max ?? 5} variant="bar" />
                  ) : q.kind === "multi_choice" ? (
                    <p className="text-sm">{String(ans ?? "—")}</p>
                  ) : (
                    <p className="whitespace-pre-wrap text-sm">{String(ans ?? "—")}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {cultura ? (
          <aside className="space-y-2">
            <h3 className="text-sm font-semibold">Cultura / valores da empresa</h3>
            <div className="rounded-md border border-border bg-accent-soft p-3 text-sm leading-relaxed">
              {cultura}
            </div>
          </aside>
        ) : null}
      </div>
    </SectionCard>
  );
}
