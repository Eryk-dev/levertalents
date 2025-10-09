import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { PDIFormData } from "@/hooks/usePDIIntegrated";

interface PDIFormIntegratedProps {
  onSubmit: (data: PDIFormData) => void;
  isSubmitting?: boolean;
  initialData?: Partial<PDIFormData>;
}

export const PDIFormIntegrated = ({ onSubmit, isSubmitting, initialData }: PDIFormIntegratedProps) => {
  const [formData, setFormData] = useState<PDIFormData>({
    main_objective: initialData?.main_objective || "",
    committed_actions: initialData?.committed_actions || "",
    required_support: initialData?.required_support || "",
    success_metrics: initialData?.success_metrics || "",
    anticipated_challenges: initialData?.anticipated_challenges || "",
    deadline: initialData?.deadline || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const isFormValid = formData.main_objective.trim() && 
                      formData.committed_actions.trim() && 
                      formData.success_metrics.trim() && 
                      formData.deadline;

  return (
    <Card>
      <CardHeader>
        <CardTitle>PDI Mensal</CardTitle>
        <CardDescription>
          Plano de Desenvolvimento Individual - Defina objetivos e ações para o próximo mês
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="main_objective" className="text-base font-semibold">
              1. Qual foi o principal objetivo definido para o próximo mês? *
            </Label>
            <Textarea
              id="main_objective"
              value={formData.main_objective}
              onChange={(e) => setFormData({ ...formData, main_objective: e.target.value })}
              placeholder="Descreva o objetivo principal que será alcançado no próximo mês..."
              className="min-h-[100px]"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="committed_actions" className="text-base font-semibold">
              2. Quais ações o colaborador se compromete a realizar para alcançar esse objetivo? *
            </Label>
            <Textarea
              id="committed_actions"
              value={formData.committed_actions}
              onChange={(e) => setFormData({ ...formData, committed_actions: e.target.value })}
              placeholder="Liste as ações específicas que serão realizadas..."
              className="min-h-[100px]"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="required_support" className="text-base font-semibold">
              3. Quais apoios ou recursos o gestor/empresa devem fornecer para apoiar esse objetivo?
            </Label>
            <Textarea
              id="required_support"
              value={formData.required_support}
              onChange={(e) => setFormData({ ...formData, required_support: e.target.value })}
              placeholder="Descreva os apoios e recursos necessários..."
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="success_metrics" className="text-base font-semibold">
              4. Como será medido o sucesso desse objetivo? *
            </Label>
            <Textarea
              id="success_metrics"
              value={formData.success_metrics}
              onChange={(e) => setFormData({ ...formData, success_metrics: e.target.value })}
              placeholder="Defina as métricas e critérios de sucesso..."
              className="min-h-[100px]"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="anticipated_challenges" className="text-base font-semibold">
              5. Existe algum desafio previsto que pode dificultar o alcance desse objetivo?
            </Label>
            <Textarea
              id="anticipated_challenges"
              value={formData.anticipated_challenges}
              onChange={(e) => setFormData({ ...formData, anticipated_challenges: e.target.value })}
              placeholder="Liste os possíveis desafios e obstáculos..."
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deadline" className="text-base font-semibold">
              6. Prazo para alcançar este objetivo (data)? *
            </Label>
            <div className="relative">
              <Input
                id="deadline"
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                required
              />
              <Calendar className="absolute right-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={!isFormValid || isSubmitting}
          >
            {isSubmitting ? "Salvando..." : "Salvar PDI"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
