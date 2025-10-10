import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { KanbanSquare, Target, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useDevelopmentPlans } from "@/hooks/useDevelopmentPlans";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { KanbanColumn } from "@/components/KanbanColumn";
import { KanbanCard } from "@/components/KanbanCard";
import { toast } from "sonner";

export default function DevelopmentKanban() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const { deletePlan } = useDevelopmentPlans();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

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

  const updatePlanStatus = useMutation({
    mutationFn: async ({ planId, newStatus }: { planId: string; newStatus: string }) => {
      const { error } = await supabase
        .from("development_plans")
        .update({ status: newStatus })
        .eq("id", planId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-development-plans"] });
      toast.success("Status atualizado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar o status do PDI");
    },
  });

  const handleDelete = (id: string) => {
    deletePlan(id);
    setDeleteDialog(null);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const planId = active.id as string;
    const newStatus = over.id as string;

    // Get the plan to check current status
    const plan = teamPlans?.find((p: any) => p.id === planId);
    if (!plan || plan.status === newStatus) return;

    // Update the status
    updatePlanStatus.mutate({ planId, newStatus });
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
              <DndContext
                sensors={sensors}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <div className="grid gap-6 md:grid-cols-4">
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <KanbanColumn
                      key={key}
                      id={key}
                      title={config.title}
                      icon={config.icon}
                      color={config.color}
                      plans={config.plans}
                      onDelete={(id) => setDeleteDialog(id)}
                    />
                  ))}
                </div>
                <DragOverlay>
                  {activeId ? (
                    <KanbanCard
                      plan={teamPlans?.find((p: any) => p.id === activeId)}
                      onDelete={() => {}}
                    />
                  ) : null}
                </DragOverlay>
              </DndContext>
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