import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { useDevelopmentPlans } from "@/hooks/useDevelopmentPlans";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, Target, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function DevelopmentPlans() {
  const [showForm, setShowForm] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const { plans, isLoading, createPlan } = useDevelopmentPlans();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    development_area: "",
    goals: "",
    action_items: "",
    timeline: "",
  });

  const handleSubmit = () => {
    createPlan(formData);
    setShowForm(false);
    setFormData({ title: "", description: "", development_area: "", goals: "", action_items: "", timeline: "" });
  };

  const statusMap = {
    pending_approval: { label: "Aguardando Aprovação", variant: "secondary" as const },
    approved: { label: "Aprovado", variant: "default" as const },
    in_progress: { label: "Em Andamento", variant: "default" as const },
    completed: { label: "Concluído", variant: "outline" as const },
    cancelled: { label: "Cancelado", variant: "destructive" as const },
  };

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-8 bg-background">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Plano de Desenvolvimento Individual (PDI)</h1>
                <p className="text-muted-foreground mt-1">Gerencie seu desenvolvimento profissional</p>
              </div>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo PDI
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de PDIs</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{plans.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {plans.filter(p => p.status === 'in_progress').length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Concluídos</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {plans.filter(p => p.status === 'completed').length}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => (
                <Card key={plan.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedPlan(plan)}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{plan.title}</CardTitle>
                      <Badge variant={statusMap[plan.status].variant}>
                        {statusMap[plan.status].label}
                      </Badge>
                    </div>
                    <CardDescription>{plan.development_area}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Progresso</span>
                          <span className="font-semibold">{plan.progress_percentage}%</span>
                        </div>
                        <Progress value={plan.progress_percentage} />
                      </div>
                      {plan.timeline && (
                        <p className="text-sm text-muted-foreground">Prazo: {plan.timeline}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Criar Novo PDI</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Título</Label>
                  <Input value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} placeholder="Ex: Desenvolvimento em Liderança" />
                </div>
                <div>
                  <Label>Área de Desenvolvimento</Label>
                  <Input value={formData.development_area} onChange={(e) => setFormData({...formData, development_area: e.target.value})} placeholder="Ex: Liderança, Técnico, Comunicação" />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Descreva o contexto e objetivo..." />
                </div>
                <div>
                  <Label>Objetivos</Label>
                  <Textarea value={formData.goals} onChange={(e) => setFormData({...formData, goals: e.target.value})} placeholder="Liste os objetivos específicos..." />
                </div>
                <div>
                  <Label>Plano de Ação</Label>
                  <Textarea value={formData.action_items} onChange={(e) => setFormData({...formData, action_items: e.target.value})} placeholder="Descreva as ações necessárias..." />
                </div>
                <div>
                  <Label>Prazo</Label>
                  <Input value={formData.timeline} onChange={(e) => setFormData({...formData, timeline: e.target.value})} placeholder="Ex: 3 meses, Q2 2024" />
                </div>
                <Button onClick={handleSubmit} className="w-full">Criar PDI</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={!!selectedPlan} onOpenChange={() => setSelectedPlan(null)}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Detalhes do PDI</DialogTitle>
              </DialogHeader>
              {selectedPlan && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold">{selectedPlan.title}</h3>
                    <Badge variant={statusMap[selectedPlan.status].variant} className="mt-2">
                      {statusMap[selectedPlan.status].label}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Área: {selectedPlan.development_area}</p>
                    <p className="text-sm text-muted-foreground">Prazo: {selectedPlan.timeline}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Descrição</h4>
                    <p className="text-sm whitespace-pre-wrap">{selectedPlan.description}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Objetivos</h4>
                    <p className="text-sm whitespace-pre-wrap">{selectedPlan.goals}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Plano de Ação</h4>
                    <p className="text-sm whitespace-pre-wrap">{selectedPlan.action_items}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Progresso</h4>
                    <Progress value={selectedPlan.progress_percentage} />
                    <p className="text-sm text-muted-foreground mt-2">{selectedPlan.progress_percentage}% concluído</p>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
}
