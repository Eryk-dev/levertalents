import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Target, CheckCircle2, Clock, Play, Filter, Plus, User, Tag } from "lucide-react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
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
  const [personFilters, setPersonFilters] = useState<Set<string>>(new Set());
  const [categoryFilters, setCategoryFilters] = useState<Set<string>>(new Set());
  const { deletePlan } = useDevelopmentPlans();

  const togglePerson = (id: string) =>
    setPersonFilters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleCategory = (cat: string) =>
    setCategoryFilters((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });

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

  const personOptions = useMemo(() => {
    const map = new Map<string, string>();
    (teamPlans ?? []).forEach((p) => {
      const id = p.user?.id;
      const name = p.user?.full_name || "Sem nome";
      if (id) map.set(id, name);
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [teamPlans]);

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    (teamPlans ?? []).forEach((p) => {
      if (p.development_area) set.add(p.development_area);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [teamPlans]);

  const filteredPlans = useMemo(() => {
    if (!teamPlans) return [];
    return teamPlans.filter((p) => {
      if (personFilters.size > 0) {
        const id = p.user?.id;
        if (!id || !personFilters.has(id)) return false;
      }
      if (categoryFilters.size > 0) {
        if (!p.development_area || !categoryFilters.has(p.development_area)) return false;
      }
      return true;
    });
  }, [teamPlans, personFilters, categoryFilters]);

  const plansByStatus = (status: PlanStatus): KanbanPlan[] =>
    filteredPlans.filter((p) => p.status === status);

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
    // Source of truth is the raw query cache (teamPlans), NOT filteredPlans —
    // a filtered view can hide the card from the currently rendered subset but
    // the drop target is still valid. We also check the react-query cache as a
    // fallback to survive a transient re-render.
    const sourcePlans =
      teamPlans ?? queryClient.getQueryData<KanbanPlan[]>(["team-development-plans"]);
    const plan = sourcePlans?.find((p) => p.id === planId);
    if (!plan) {
      toast.error("Não foi possível mover o card");
      return;
    }
    if (plan.status === newStatus) return;
    updatePlanStatus.mutate({ planId, newStatus });
  };

  const total = teamPlans?.length ?? 0;
  const visibleTotal = filteredPlans.length;
  const active = plansByStatus("in_progress").length + plansByStatus("approved").length;
  const filtersActive = personFilters.size + categoryFilters.size;

  return (
    <div className="p-5 lg:p-7 font-sans text-text h-full flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.02em] m-0">
            Kanban de PDIs · meu time
          </h1>
          <div className="text-[13px] text-text-muted mt-0.5">
            {filtersActive > 0
              ? `${visibleTotal} de ${total} itens · ${active} em execução · filtro ativo`
              : `${total} itens · ${active} em execução · arraste entre colunas para mover`}
          </div>
        </div>
        <Row gap={6}>
          <Popover>
            <PopoverTrigger asChild>
              <Btn variant="ghost" size="sm" icon={<User className="w-3.5 h-3.5" />}>
                Pessoa{personFilters.size > 0 ? ` · ${personFilters.size}` : ""}
              </Btn>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-60 p-3">
              <div className="text-[10.5px] uppercase tracking-[0.08em] text-text-subtle font-semibold mb-2">
                Filtrar por pessoa
              </div>
              {personOptions.length === 0 ? (
                <div className="text-[12px] text-text-muted">Sem pessoas no time.</div>
              ) : (
                <div className="space-y-1.5 max-h-72 overflow-y-auto">
                  {personOptions.map((p) => (
                    <label
                      key={p.id}
                      className="flex items-center gap-2 text-[12.5px] cursor-pointer py-1"
                    >
                      <Checkbox
                        checked={personFilters.has(p.id)}
                        onCheckedChange={() => togglePerson(p.id)}
                      />
                      <span className="truncate">{p.name}</span>
                    </label>
                  ))}
                </div>
              )}
              {personFilters.size > 0 && (
                <button
                  onClick={() => setPersonFilters(new Set())}
                  className="text-[11.5px] text-accent-text mt-2 hover:underline"
                >
                  Limpar
                </button>
              )}
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Btn variant="ghost" size="sm" icon={<Tag className="w-3.5 h-3.5" />}>
                Categoria{categoryFilters.size > 0 ? ` · ${categoryFilters.size}` : ""}
              </Btn>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-60 p-3">
              <div className="text-[10.5px] uppercase tracking-[0.08em] text-text-subtle font-semibold mb-2">
                Filtrar por categoria
              </div>
              {categoryOptions.length === 0 ? (
                <div className="text-[12px] text-text-muted">Sem categorias atribuídas.</div>
              ) : (
                <div className="space-y-1.5 max-h-72 overflow-y-auto">
                  {categoryOptions.map((cat) => (
                    <label
                      key={cat}
                      className="flex items-center gap-2 text-[12.5px] cursor-pointer py-1"
                    >
                      <Checkbox
                        checked={categoryFilters.has(cat)}
                        onCheckedChange={() => toggleCategory(cat)}
                      />
                      <span className="truncate">{cat}</span>
                    </label>
                  ))}
                </div>
              )}
              {categoryFilters.size > 0 && (
                <button
                  onClick={() => setCategoryFilters(new Set())}
                  className="text-[11.5px] text-accent-text mt-2 hover:underline"
                >
                  Limpar
                </button>
              )}
            </PopoverContent>
          </Popover>
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
