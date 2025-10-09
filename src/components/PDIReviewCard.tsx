import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Calendar, Target, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { DevelopmentPlan } from "@/hooks/useDevelopmentPlans";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PDIReviewCardProps {
  pdi: DevelopmentPlan;
  onViewDetails?: () => void;
  onAddProgress?: () => void;
}

export const PDIReviewCard = ({ pdi, onViewDetails, onAddProgress }: PDIReviewCardProps) => {
  const isOverdue = pdi.deadline && new Date(pdi.deadline) < new Date() && pdi.status !== 'completed';
  const isNearDeadline = pdi.deadline && 
    new Date(pdi.deadline) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && 
    pdi.status !== 'completed';

  const getStatusVariant = () => {
    if (pdi.status === 'completed') return 'default';
    if (isOverdue) return 'destructive';
    if (isNearDeadline) return 'secondary';
    return 'outline';
  };

  const getStatusLabel = () => {
    if (pdi.status === 'completed') return 'Concluído';
    if (isOverdue) return 'Atrasado';
    if (isNearDeadline) return 'Próximo do prazo';
    return 'Em Progresso';
  };

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">PDI Anterior</CardTitle>
            <CardDescription>
              {pdi.deadline && format(new Date(pdi.deadline), "PPP", { locale: ptBR })}
            </CardDescription>
          </div>
          <Badge variant={getStatusVariant()}>
            {getStatusLabel()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Objective */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Target className="h-4 w-4" />
            Objetivo Principal
          </div>
          <p className="text-sm text-muted-foreground pl-6">
            {pdi.main_objective || pdi.goals}
          </p>
        </div>

        {/* Committed Actions */}
        {pdi.committed_actions && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <CheckCircle2 className="h-4 w-4" />
              Ações Comprometidas
            </div>
            <p className="text-sm text-muted-foreground pl-6 whitespace-pre-line">
              {pdi.committed_actions}
            </p>
          </div>
        )}

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <TrendingUp className="h-4 w-4" />
              Progresso
            </div>
            <span className="text-sm font-medium">{pdi.progress_percentage || 0}%</span>
          </div>
          <Progress value={pdi.progress_percentage || 0} className="h-2" />
        </div>

        {/* Anticipated Challenges */}
        {pdi.anticipated_challenges && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <AlertCircle className="h-4 w-4" />
              Desafios Previstos
            </div>
            <p className="text-sm text-muted-foreground pl-6 whitespace-pre-line">
              {pdi.anticipated_challenges}
            </p>
          </div>
        )}

        {/* Deadline Alert */}
        {(isOverdue || isNearDeadline) && pdi.deadline && (
          <div className={`flex items-center gap-2 p-3 rounded-lg ${
            isOverdue ? 'bg-destructive/10 text-destructive' : 'bg-secondary/50 text-secondary-foreground'
          }`}>
            <Calendar className="h-4 w-4" />
            <span className="text-sm font-medium">
              {isOverdue 
                ? `Prazo vencido em ${format(new Date(pdi.deadline), "dd/MM/yyyy")}`
                : `Prazo próximo: ${format(new Date(pdi.deadline), "dd/MM/yyyy")}`
              }
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {onViewDetails && (
            <Button variant="outline" size="sm" onClick={onViewDetails} className="flex-1">
              Ver Detalhes
            </Button>
          )}
          {onAddProgress && pdi.status !== 'completed' && (
            <Button variant="default" size="sm" onClick={onAddProgress} className="flex-1">
              Atualizar Progresso
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
