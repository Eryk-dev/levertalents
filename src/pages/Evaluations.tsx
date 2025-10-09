import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { useEvaluations, Evaluation } from "@/hooks/useEvaluations";
import { useNavigate } from "react-router-dom";
import { EvaluationForm } from "@/components/EvaluationForm";
import { EvaluationCard } from "@/components/EvaluationCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, FileText, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { OneOnOnesTab } from "@/components/OneOnOnesTab";

export default function Evaluations() {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);
  const { evaluations, isLoading } = useEvaluations();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const { data: userRole } = useQuery({
    queryKey: ["user-role"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      return data?.role;
    },
  });

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const isLeader = userRole === "lider";
  const isRHorSocio = userRole === "rh" || userRole === "socio";
  const isCollaborator = userRole === "colaborador";

  const filteredEvaluations = isCollaborator
    ? evaluations.filter(e => e.evaluated_user_id === currentUser?.id)
    : evaluations;

  const averageScore = filteredEvaluations.length > 0
    ? (filteredEvaluations.reduce((sum, e) => sum + e.overall_score, 0) / filteredEvaluations.length).toFixed(1)
    : "0.0";

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header onLogout={handleLogout} />
        <main className="flex-1 p-8 bg-background">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Avaliações</h1>
                <p className="text-muted-foreground mt-1">
                  {isCollaborator && "Acompanhe suas avaliações, 1:1s e seu desenvolvimento"}
                  {isLeader && "Gerencie as avaliações e 1:1s da sua equipe"}
                  {isRHorSocio && "Visão geral de todas as avaliações e 1:1s"}
                </p>
              </div>
              {isLeader && (
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Avaliação
                </Button>
              )}
            </div>

            <Tabs defaultValue="evaluations" className="space-y-4">
              <TabsList>
                <TabsTrigger value="evaluations">Avaliações de Desempenho</TabsTrigger>
                <TabsTrigger value="11s">1:1s</TabsTrigger>
              </TabsList>

              <TabsContent value="evaluations" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total de Avaliações</CardTitle>
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{filteredEvaluations.length}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Média Geral</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{averageScore}</div>
                      <p className="text-xs text-muted-foreground">De 5.0</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {filteredEvaluations.filter(e => e.status === 'completed').length}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {isLoading ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-[300px]" />
                    ))}
                  </div>
                ) : filteredEvaluations.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground text-center">
                        {isLeader && "Nenhuma avaliação criada ainda. Comece criando uma nova avaliação."}
                        {isCollaborator && "Você ainda não possui avaliações registradas."}
                        {isRHorSocio && "Nenhuma avaliação encontrada no sistema."}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredEvaluations.map((evaluation) => (
                      <EvaluationCard
                        key={evaluation.id}
                        evaluation={evaluation}
                        onViewDetails={setSelectedEvaluation}
                        showEvaluatedUser={!isCollaborator}
                        showEvaluator={isCollaborator}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="11s" className="space-y-4">
                <OneOnOnesTab 
                  isLeader={isLeader} 
                  isRHorSocio={isRHorSocio} 
                  isCollaborator={isCollaborator}
                  currentUserId={currentUser?.id}
                />
              </TabsContent>
            </Tabs>
          </div>

          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Criar Nova Avaliação</DialogTitle>
                <DialogDescription>
                  Preencha o formulário para criar uma avaliação de desempenho
                </DialogDescription>
              </DialogHeader>
              <EvaluationForm onSuccess={() => setShowForm(false)} />
            </DialogContent>
          </Dialog>

          <Dialog open={!!selectedEvaluation} onOpenChange={() => setSelectedEvaluation(null)}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Detalhes da Avaliação</DialogTitle>
              </DialogHeader>
              {selectedEvaluation && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Avaliado</p>
                      <p className="font-semibold">{selectedEvaluation.evaluated_user?.full_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Avaliador</p>
                      <p className="font-semibold">{selectedEvaluation.evaluator_user?.full_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Período</p>
                      <p className="font-semibold">{selectedEvaluation.period}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <p className="font-semibold capitalize">{selectedEvaluation.status}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2">Pontuações</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground">Geral</p>
                          <p className="text-2xl font-bold">{selectedEvaluation.overall_score}</p>
                        </div>
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground">Técnica</p>
                          <p className="text-2xl font-bold">{selectedEvaluation.technical_score}</p>
                        </div>
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground">Comportamental</p>
                          <p className="text-2xl font-bold">{selectedEvaluation.behavioral_score}</p>
                        </div>
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground">Liderança</p>
                          <p className="text-2xl font-bold">{selectedEvaluation.leadership_score}</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">Pontos Fortes</h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {selectedEvaluation.strengths}
                      </p>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">Áreas de Melhoria</h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {selectedEvaluation.areas_for_improvement}
                      </p>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">Comentários Gerais</h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {selectedEvaluation.comments}
                      </p>
                    </div>
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
