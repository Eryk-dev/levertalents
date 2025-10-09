import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, User, Star } from "lucide-react";
import { Evaluation } from "@/hooks/useEvaluations";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface EvaluationCardProps {
  evaluation: Evaluation;
  onViewDetails: (evaluation: Evaluation) => void;
  showEvaluatedUser?: boolean;
  showEvaluator?: boolean;
}

export function EvaluationCard({ 
  evaluation, 
  onViewDetails,
  showEvaluatedUser = true,
  showEvaluator = false
}: EvaluationCardProps) {
  const statusMap = {
    draft: { label: "Rascunho", variant: "secondary" as const },
    completed: { label: "Concluída", variant: "default" as const },
    reviewed: { label: "Revisada", variant: "outline" as const },
  };

  const getScoreColor = (score: number) => {
    if (score >= 4) return "text-green-600";
    if (score >= 3) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">
              {showEvaluatedUser && evaluation.evaluated_user?.full_name}
              {showEvaluator && evaluation.evaluator_user?.full_name}
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {evaluation.period}
            </CardDescription>
          </div>
          <Badge variant={statusMap[evaluation.status].variant}>
            {statusMap[evaluation.status].label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Nota Geral</span>
            <div className={`flex items-center gap-1 font-bold text-lg ${getScoreColor(evaluation.overall_score)}`}>
              <Star className="h-5 w-5 fill-current" />
              {evaluation.overall_score.toFixed(1)}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="text-center">
              <div className="text-muted-foreground">Técnica</div>
              <div className={`font-semibold ${getScoreColor(evaluation.technical_score)}`}>
                {evaluation.technical_score.toFixed(1)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-muted-foreground">Comportamental</div>
              <div className={`font-semibold ${getScoreColor(evaluation.behavioral_score)}`}>
                {evaluation.behavioral_score.toFixed(1)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-muted-foreground">Liderança</div>
              <div className={`font-semibold ${getScoreColor(evaluation.leadership_score)}`}>
                {evaluation.leadership_score.toFixed(1)}
              </div>
            </div>
          </div>

          {showEvaluator && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              Avaliado por: {evaluation.evaluator_user?.full_name}
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            Criada em {format(new Date(evaluation.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </div>

          <Button onClick={() => onViewDetails(evaluation)} variant="outline" className="w-full">
            Ver Detalhes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
