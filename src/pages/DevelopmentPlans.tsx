import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { useDevelopmentPlans } from "@/hooks/useDevelopmentPlans";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, Target, TrendingUp, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function DevelopmentPlans() {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null);
  const { plans, isLoading, createPlan, deletePlan } = useDevelopmentPlans();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };
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

  const handleDelete = (id: string) => {
    deletePlan(id);
    setDeleteDialog(null);
    setSelectedPlan(null);
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
        <Header onLogout={handleLogout} />
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
                <Card key={plan.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 cursor-pointer" onClick={() => setSelectedPlan(plan)}>
                        <CardTitle className="text-lg">{plan.title}</CardTitle>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={statusMap[plan.status].variant}>
                          {statusMap[plan.status].label}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteDialog(plan.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
                <div className="flex items-center justify-between">
                  <DialogTitle>Detalhes do PDI</DialogTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      setDeleteDialog(selectedPlan?.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </DialogHeader>
              {selectedPlan && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-xl">{selectedPlan.title}</h3>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={statusMap[selectedPlan.status].variant}>
                        {statusMap[selectedPlan.status].label}
                      </Badge>
                      {selectedPlan.one_on_one_id && (
                        <Badge variant="outline">Vinculado a 1:1</Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-xs text-muted-foreground">Área de Desenvolvimento</p>
                      <p className="font-medium">{selectedPlan.development_area}</p>
                    </div>
                    {selectedPlan.deadline && (
                      <div>
                        <p className="text-xs text-muted-foreground">Prazo</p>
                        <p className="font-medium">{format(new Date(selectedPlan.deadline), "dd/MM/yyyy")}</p>
                      </div>
                    )}
                  </div>

                  {/* PDI Specific Questions */}
                  {selectedPlan.main_objective && (
                    <div className="space-y-4 border-t pt-4">
                      <h4 className="font-semibold text-sm text-muted-foreground uppercase">Perguntas do PDI</h4>
                      
                      <div>
                        <h5 className="font-semibold mb-2">1. Objetivo Principal</h5>
                        <p className="text-sm whitespace-pre-wrap">{selectedPlan.main_objective}</p>
                      </div>

                      {selectedPlan.committed_actions && (
                        <div>
                          <h5 className="font-semibold mb-2">2. Ações Comprometidas</h5>
                          <p className="text-sm whitespace-pre-wrap">{selectedPlan.committed_actions}</p>
                        </div>
                      )}

                      {selectedPlan.required_support && (
                        <div>
                          <h5 className="font-semibold mb-2">3. Apoios Necessários</h5>
                          <p className="text-sm whitespace-pre-wrap">{selectedPlan.required_support}</p>
                        </div>
                      )}

                      {selectedPlan.success_metrics && (
                        <div>
                          <h5 className="font-semibold mb-2">4. Métricas de Sucesso</h5>
                          <p className="text-sm whitespace-pre-wrap">{selectedPlan.success_metrics}</p>
                        </div>
                      )}

                      {selectedPlan.anticipated_challenges && (
                        <div>
                          <h5 className="font-semibold mb-2">5. Desafios Previstos</h5>
                          <p className="text-sm whitespace-pre-wrap">{selectedPlan.anticipated_challenges}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Legacy Fields (if new fields don't exist) */}
                  {!selectedPlan.main_objective && (
                    <>
                      {selectedPlan.description && (
                        <div>
                          <h4 className="font-semibold mb-2">Descrição</h4>
                          <p className="text-sm whitespace-pre-wrap">{selectedPlan.description}</p>
                        </div>
                      )}
                      <div>
                        <h4 className="font-semibold mb-2">Objetivos</h4>
                        <p className="text-sm whitespace-pre-wrap">{selectedPlan.goals}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Plano de Ação</h4>
                        <p className="text-sm whitespace-pre-wrap">{selectedPlan.action_items}</p>
                      </div>
                    </>
                  )}

                  <div>
                    <h4 className="font-semibold mb-2">Progresso</h4>
                    <Progress value={selectedPlan.progress_percentage} />
                    <p className="text-sm text-muted-foreground mt-2">{selectedPlan.progress_percentage}% concluído</p>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir este PDI? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteDialog && handleDelete(deleteDialog)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </main>
      </div>
    </div>
  );
}
