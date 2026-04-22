import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/EmptyState";
import { useClimateSurveys, useClimateQuestions } from "@/hooks/useClimateSurveys";
import { Trash2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  surveyId: string | undefined;
  surveyTitle: string | undefined;
}

export function ClimateQuestionsDialog({ open, onOpenChange, surveyId, surveyTitle }: Props) {
  const { createQuestion, deleteQuestion } = useClimateSurveys();
  const { data: questions = [], isLoading } = useClimateQuestions(open ? surveyId : undefined);

  const [text, setText] = useState("");
  const [category, setCategory] = useState("");

  const handleAdd = () => {
    if (!surveyId || !text.trim() || !category.trim()) return;
    createQuestion(
      { survey_id: surveyId, question_text: text.trim(), category: category.trim() },
      {
        onSuccess: () => {
          setText("");
          setCategory("");
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Perguntas — {surveyTitle ?? ""}</DialogTitle>
          <DialogDescription>
            As perguntas aparecem para colaboradores na ordem em que são adicionadas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nova pergunta</Label>
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ex: Você se sente apoiado pela sua liderança?"
            />
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Categoria (ex: Liderança, Cultura, Bem-estar)"
            />
            <Button onClick={handleAdd} disabled={!text.trim() || !category.trim()}>
              Adicionar pergunta
            </Button>
          </div>

          <div className="border-t pt-4 space-y-2 max-h-72 overflow-auto">
            <h4 className="font-medium text-sm">
              Perguntas atuais ({questions.length})
            </h4>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : questions.length === 0 ? (
              <EmptyState message="Ainda sem perguntas. Adicione pelo menos uma antes de ativar a pesquisa." />
            ) : (
              <ul className="space-y-2">
                {questions.map((q, idx) => (
                  <li key={q.id} className="flex items-start justify-between gap-3 p-3 rounded border bg-card">
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {idx + 1}. {q.question_text}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{q.category}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => surveyId && deleteQuestion({ id: q.id, survey_id: surveyId })}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
