import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { EmptyState } from "@/components/EmptyState";
import { useClimateQuestions, useUserResponseIds, useSubmitClimateResponse } from "@/hooks/useClimateSurveys";
import { handleSupabaseError } from "@/lib/supabaseError";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  surveyId: string | undefined;
  surveyTitle: string | undefined;
}

interface DraftAnswer {
  score: number;
  comment: string;
}

const SCORE_LABELS: Record<number, string> = {
  1: "Discordo totalmente",
  2: "Discordo",
  3: "Neutro",
  4: "Concordo",
  5: "Concordo totalmente",
};

export function ClimateAnswerDialog({ open, onOpenChange, surveyId, surveyTitle }: Props) {
  const submitMutation = useSubmitClimateResponse();
  const { data: questions = [], isLoading } = useClimateQuestions(open ? surveyId : undefined);
  const { data: answeredIds = [] } = useUserResponseIds(open ? surveyId : undefined);

  const [answers, setAnswers] = useState<Record<string, DraftAnswer>>({});

  useEffect(() => {
    if (!open) setAnswers({});
  }, [open]);

  const unanswered = questions.filter((q) => !answeredIds.includes(q.id));
  const allAnswered = unanswered.length === 0 && questions.length > 0;

  const setScore = (questionId: string, score: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { score, comment: prev[questionId]?.comment ?? "" },
    }));
  };

  const setComment = (questionId: string, comment: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { score: prev[questionId]?.score ?? 0, comment },
    }));
  };

  const payload = Object.entries(answers)
    .filter(([, a]) => a.score >= 1 && a.score <= 5)
    .map(([question_id, a]) => ({
      survey_id: surveyId ?? "",
      question_id,
      score: a.score,
      comment: a.comment || undefined,
    }));

  const handleSubmit = async () => {
    if (!surveyId) return;
    if (payload.length === 0) {
      toast.error("Responda ao menos uma pergunta para enviar");
      return;
    }
    try {
      for (const item of payload) {
        await submitMutation.mutateAsync(item);
      }
      onOpenChange(false);
    } catch (err) {
      handleSupabaseError(err as Error, "Erro ao enviar respostas", { silent: true });
    }
  };

  const missingScore = unanswered.some((q) => !answers[q.id]?.score);
  const hasAnyAnswer = payload.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{surveyTitle ?? "Pesquisa"}</DialogTitle>
          <DialogDescription>
            Responda cada pergunta de 1 (discordo totalmente) a 5 (concordo totalmente). Comentários são opcionais.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando perguntas...</p>
        ) : questions.length === 0 ? (
          <EmptyState
            title="Pesquisa sem perguntas"
            message="O RH ainda não cadastrou perguntas nessa pesquisa. Volte em breve."
          />
        ) : allAnswered ? (
          <EmptyState
            title="Obrigado!"
            message="Você já respondeu todas as perguntas desta pesquisa."
          />
        ) : (
          <div className="space-y-6">
            {unanswered.map((q, idx) => (
              <div key={q.id} className="space-y-3 p-4 rounded-lg border bg-card">
                <div>
                  <p className="text-sm text-muted-foreground">{q.category}</p>
                  <p className="font-medium">{idx + 1}. {q.question_text}</p>
                </div>
                <RadioGroup
                  value={answers[q.id]?.score?.toString() ?? ""}
                  onValueChange={(v) => setScore(q.id, Number(v))}
                  className="grid grid-cols-5 gap-2"
                >
                  {[1, 2, 3, 4, 5].map((score) => (
                    <div key={score} className="flex flex-col items-center gap-1">
                      <RadioGroupItem value={score.toString()} id={`${q.id}-${score}`} />
                      <Label htmlFor={`${q.id}-${score}`} className="text-xs text-center cursor-pointer">
                        {score}<br />
                        <span className="text-muted-foreground">{SCORE_LABELS[score]}</span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                <Textarea
                  placeholder="Comentário (opcional)"
                  value={answers[q.id]?.comment ?? ""}
                  onChange={(e) => setComment(q.id, e.target.value)}
                  rows={2}
                />
              </div>
            ))}
          </div>
        )}

        {questions.length > 0 && !allAnswered && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={missingScore || !hasAnyAnswer || submitMutation.isPending}>
              {submitMutation.isPending ? "Enviando..." : "Enviar respostas"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
