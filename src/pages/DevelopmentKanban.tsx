import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { KanbanSquare, Target, CheckCircle2, Clock, AlertCircle, Trash2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useDevelopmentPlans } from "@/hooks/useDevelopmentPlans";

export default function DevelopmentKanban() {
  const navigate = useNavigate();
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null);
  const { deletePlan } = useDevelopmentPlans();

  const { data: teamPlans, isLoading } = useQuery({
    queryKey: ["team-development-plans"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data } = await supabase
        .from("development_plans")
        .select(`
          *,
          user:profiles!development_plans_user_id_fkey(id, full_name, avatar_url)
        `)
        .in("user_id", (
          await supabase
            .from("team_members")
            .select("user_id")
            .eq("leader_id", user.id)
        ).data?.map(tm => tm.user_id) || []);

      return data || [];
    },
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleDelete = (id: string) => {
    deletePlan(id);
    setDeleteDialog(null);
  };

  const getPlansByStatus = (status: string) => {
    return teamPlans?.filter((p: any) => p.status === status) || [];
  };

  const statusConfig = {
    pending_approval: {
      title: "Aguardando Aprovação",
      icon: Clock,
      color: "bg-yellow-500",
      plans: getPlansByStatus("pending_approval"),
    },
    approved: {
      title: "Aprovado",
      icon: CheckCircle2,
      color: "bg-green-500",
      plans: getPlansByStatus("approved"),
    },
    in_progress: {
      title: "Em Progresso",
      icon: Target,
      color: "bg-blue-500",
      plans: getPlansByStatus("in_progress"),
    },
    completed: {
      title: "Concluído",
      icon: CheckCircle2,
      color: "bg-primary",
      plans: getPlansByStatus("completed"),
    },
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
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  <KanbanSquare className="h-8 w-8" />
                  Kanban de Desenvolvimento
                </h1>
                <p className="text-muted-foreground mt-1">
                  Acompanhe o progresso dos PDIs da sua equipe
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className="grid gap-6 md:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="h-64" />
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-4">
                {Object.entries(statusConfig).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <div key={key} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className={`h-3 w-3 rounded-full ${config.color}`} />
                        <h3 className="font-semibold">{config.title}</h3>
                        <Badge variant="secondary" className="ml-auto">
                          {config.plans.length}
                        </Badge>
                      </div>

                      <div className="space-y-3">
                        {config.plans.length > 0 ? (
                          config.plans.map((plan: any) => (
                            <Card key={plan.id} className="hover:shadow-lg transition-shadow">
                              <CardHeader className="pb-3">
                                <div className="flex items-start gap-3">
                                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/pdi`)}>
                                    <div className="flex items-start gap-3">
                                      <Avatar className="h-10 w-10">
                                        <AvatarImage src={plan.user?.avatar_url} />
                                        <AvatarFallback>
                                          {plan.user?.full_name?.charAt(0)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">
                                          {plan.user?.full_name}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">
                                          {plan.title}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
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
                              </CardHeader>
                              <CardContent className="space-y-2">
                                <div className="space-y-1">
                                  <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Progresso</span>
                                    <span className="font-medium">{plan.progress_percentage}%</span>
                                  </div>
                                  <Progress value={plan.progress_percentage} className="h-1" />
                                </div>

                                {plan.deadline && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    <span>
                                      Prazo: {new Date(plan.deadline).toLocaleDateString('pt-BR')}
                                    </span>
                                  </div>
                                )}

                                <div className="pt-2">
                                  <Badge variant="outline" className="text-xs">
                                    {plan.development_area}
                                  </Badge>
                                </div>
                              </CardContent>
                            </Card>
                          ))
                        ) : (
                          <Card className="bg-muted/50">
                            <CardContent className="flex flex-col items-center justify-center py-8">
                              <Icon className="h-8 w-8 text-muted-foreground mb-2" />
                              <p className="text-xs text-muted-foreground text-center">
                                Nenhum PDI neste status
                              </p>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Legenda */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Legenda</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  <span>Aguardando sua aprovação</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Aprovado e pronto</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-500" />
                  <span>Em desenvolvimento</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>Concluído</span>
                </div>
              </CardContent>
            </Card>

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
          </div>
        </main>
      </div>
    </div>
  );
}