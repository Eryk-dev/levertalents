import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Target, CheckCircle2, Clock, Play, Filter, Plus } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDevelopmentPlans } from "@/hooks/useDevelopmentPlans";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { KanbanColumn } from "@/components/KanbanColumn";
import { KanbanCard, type KanbanPlan } from "@/components/KanbanCard";
import { toast } from "sonner";
import { LoadingState, LinearEmpty, Btn, Row } from "@/components/primitives";
import { useNavigate } from "react-router-dom";

type PlanStatus = "pending_approval" | "approved" | "in_progress" | "completed";

const COLUMNS: {
  key: PlanStatus;
  title: string;
  icon: typeof Clock;
  tone: "neutral" | "info" | "warning" | "success";
}[] = [
  { key: "pending_approval", title: "Aguardando aprovação", icon: Clock, tone: "warning" },
  { key: "approved", title: "Aprovado", icon: CheckCircle2, tone: "neutral" },
  { key: "in_progress", title: "Em progresso", icon: Play, tone: "info" },
  { key: "completed", title: "Concluído", icon: CheckCircle2, tone: "success" },
];

export default function DevelopmentKanban() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null);
  const [activePlan, setActivePlan] = useState<KanbanPlan | null>(null);
  const { deletePlan } = useDevelopmentPlans();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const { data: teamPlans, isLoading } = useQuery({
    queryKey: ["team-development-plans"],
    queryFn: async (): Promise<KanbanPlan[]> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const teamIds =
        (
          await supabase.from("team_members").select("user_id").eq("leader_id", user.id)
        ).data?.map((tm) => tm.user_id) ?? [];

      const { data } = await supabase
        .from("development_plans")
        .select(`*, user:profiles!development_plans_user_id_fkey(id, full_name, avatar_url)`)
        .in("user_id", teamIds);

      return (data as unknown as KanbanPlan[]) ?? [];
    },
  });

  const updatePlanStatus = useMutation({
    mutationFn: async ({ planId, newStatus }: { planId: string; newStatus: PlanStatus }) => {
      const { error } = await supabase
        .from("development_plans")
        .update({ status: newStatus })
        .eq("id", planId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-development-plans"] });
      toast.success("Status atualizado");
    },
    onError: () => toast.error("Erro ao atualizar o status do PDI"),
  });

  const plansByStatus = (status: PlanStatus): KanbanPlan[] =>
    teamPlans?.filter((p) => p.status === status) ?? [];

  const handleDragStart = (event: DragStartEvent) => {
    const id = event.active.id as string;
    if (!id.startsWith("plan:")) return;
    const planId = id.slice("plan:".length);
    const plan = teamPlans?.find((p) => p.id === planId);
    if (plan) setActivePlan(plan);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActivePlan(null);
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id as string;
    if (!activeId.startsWith("plan:")) return;
    const planId = activeId.slice("plan:".length);
    const newStatus = over.id as PlanStatus;
    const plan = teamPlans?.find((p) => p.id === planId);
    if (!plan || plan.status === newStatus) return;
    updatePlanStatus.mutate({ planId, newStatus });
  };

  const total = teamPlans?.length ?? 0;
  const active = plansByStatus("in_progress").length + plansByStatus("approved").length;

  return (
    <div className="p-5 lg:p-7 font-sans text-text h-full flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.02em] m-0">
            Kanban de PDIs · meu time
          </h1>
          <div className="text-[13px] text-text-muted mt-0.5">
            {total} itens · {active} em execução · arraste entre colunas para mover
          </div>
        </div>
        <Row gap={6}>
          <Btn variant="ghost" size="sm" icon={<Filter className="w-3.5 h-3.5" />}>
            Pessoa
          </Btn>
          <Btn variant="ghost" size="sm" icon={<Filter className="w-3.5 h-3.5" />}>
            Categoria
          </Btn>
          <Btn
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" strokeWidth={2} />}
            onClick={() => navigate("/pdi")}
          >
            Novo PDI
          </Btn>
        </Row>
      </div>

      {isLoading ? (
        <LoadingState layout="cards" count={4} />
      ) : total === 0 ? (
        <LinearEmpty
          icon={<Target className="w-[18px] h-[18px]" strokeWidth={1.75} />}
          title="Nenhum PDI ativo no time"
          description="Assim que seus liderados criarem PDIs, os cards aparecem aqui para aprovação e acompanhamento."
        />
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActivePlan(null)}
        >
          <div className="flex-1 grid grid-cols-4 gap-2.5 min-h-0">
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col.key}
                id={col.key}
                title={col.title}
                icon={col.icon}
                tone={col.tone}
                plans={plansByStatus(col.key)}
                onDelete={(id) => setDeleteDialog(id)}
              />
            ))}
          </div>
          <DragOverlay dropAnimation={null}>
            {activePlan ? <KanbanCard plan={activePlan} asOverlay /> : null}
          </DragOverlay>
        </DndContext>
      )}

      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este PDI? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteDialog) {
                  deletePlan(deleteDialog);
                  setDeleteDialog(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
