import { useState, useMemo } from "react";
import { useDevelopmentPlans } from "@/hooks/useDevelopmentPlans";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Plus, Target, TrendingUp, Trash2, History, MoreVertical, ExternalLink, CheckCircle2, Filter } from "lucide-react";
import { format } from "date-fns";
import { PDIFormIntegrated } from "@/components/PDIFormIntegrated";
import type { PDIFormData } from "@/hooks/usePDIIntegrated";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ManualPDIForm } from "@/components/ManualPDIForm";
import { useAuth } from "@/hooks/useAuth";
import { LinkPDIToOneOnOne } from "@/components/LinkPDIToOneOnOne";
import { StatusBadge } from "@/components/primitives/StatusBadge";
import { LoadingState } from "@/components/primitives/LoadingState";
import { PDIUpdatesTimeline } from "@/components/PDIUpdatesTimeline";
import { cn } from "@/lib/utils";
import {
  Btn,
  Chip,
  Row,
  Col,
  Card as LinearCard,
  SectionHeader,
  LinearAvatar,
  LinearEmpty,
  ProgressBar,
} from "@/components/primitives/LinearKit";

type PlanTabValue = "active" | "pending" | "completed" | "all";

const TAB_FILTER: Record<PlanTabValue, (status: string) => boolean> = {
  active: (s) => s === "in_progress" || s === "approved",
  pending: (s) => s === "pending_approval",
  completed: (s) => s === "completed",
  all: () => true,
};

export default function DevelopmentPlans() {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PlanTabValue>("active");
  const { plans, isLoading, createPlan, deletePlan } = useDevelopmentPlans();
  const { userRole } = useAuth();
  const isLeaderOrRHSocio = userRole === "lider" || userRole === "rh" || userRole === "socio";

  // Handler da fonte única (wizard PDIFormIntegrated).
  // Mapeia PDIFormData (novo schema) para os campos legacy também,
  // mantendo compat com listagens/cards antigos.
  const handleSubmitNew = (data: PDIFormData) => {
    createPlan({
      title: `PDI - ${data.main_objective.substring(0, 60)}`,
      description: data.main_objective,
      main_objective: data.main_objective,
      committed_actions: data.committed_actions,
      required_support: data.required_support,
      success_metrics: data.success_metrics,
      anticipated_challenges: data.anticipated_challenges,
      deadline: data.deadline || null,
      development_area: "Objetivo",
      goals: data.main_objective,
      action_items: data.committed_actions,
      timeline: data.deadline || "",
      status: "in_progress",
      progress_percentage: 0,
    } as any);
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    deletePlan(id);
    setDeleteDialog(null);
    setSelectedPlan(null);
  };

  const counts = useMemo(
    () => ({
      all: plans.length,
      active: plans.filter((p) => p.status === "in_progress" || p.status === "approved").length,
      pending: plans.filter((p) => p.status === "pending_approval").length,
      completed: plans.filter((p) => p.status === "completed").length,
    }),
    [plans],
  );

  const filtered = plans.filter((p) => TAB_FILTER[activeTab](p.status));

  const tabs: Array<{ k: PlanTabValue; label: string; count: number }> = [
    { k: "active", label: "Ativos", count: counts.active },
    { k: "pending", label: "Aguardando", count: counts.pending },
    { k: "completed", label: "Concluídos", count: counts.completed },
    { k: "all", label: "Todos", count: counts.all },
  ];

  return (
    <div className="p-5 lg:p-7 font-sans text-text max-w-[1400px] mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.02em] m-0">
            Desenvolvimento · PDIs
          </h1>
          <div className="text-[13px] text-text-muted mt-0.5">
            {counts.active} ativos · {counts.pending} aguardando aprovação · {counts.completed} concluídos
          </div>
        </div>
        <Row gap={6}>
          <Btn variant="ghost" size="sm" icon={<Filter className="w-3.5 h-3.5" strokeWidth={1.75} />}>
            Filtros
          </Btn>
          {isLeaderOrRHSocio && (
            <Btn
              variant="secondary"
              size="sm"
              icon={<History className="w-3.5 h-3.5" strokeWidth={1.75} />}
              onClick={() => setShowManualForm(true)}
            >
              Retroativo
            </Btn>
          )}
          <Btn
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" strokeWidth={2} />}
            onClick={() => setShowForm(true)}
          >
            Novo PDI
          </Btn>
        </Row>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mt-5">
        <KpiMini label="Total de PDIs" value={String(counts.all)} icon={<Target className="w-4 h-4" />} />
        <KpiMini
          label="Em andamento"
          value={String(counts.active)}
          icon={<TrendingUp className="w-4 h-4" />}
          highlight
        />
        <KpiMini label="Concluídos" value={String(counts.completed)} icon={<CheckCircle2 className="w-4 h-4" />} />
      </div>

      {/* Tabs */}
      <div className="mt-5 border-b border-border flex items-center">
        {tabs.map((t) => (
          <button
            key={t.k}
            onClick={() => setActiveTab(t.k)}
            className={cn(
              "px-3 py-2 text-[12.5px] font-medium cursor-pointer -mb-px border-b-2 transition-colors",
              activeTab === t.k
                ? "text-text border-text"
                : "text-text-muted border-transparent hover:text-text",
            )}
          >
            {t.label} <span className="text-text-subtle tabular">· {t.count}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="mt-4">
        {isLoading ? (
          <LoadingState variant="skeleton" layout="cards" count={3} />
        ) : filtered.length === 0 ? (
          <LinearEmpty
            icon={<Target className="w-[18px] h-[18px]" strokeWidth={1.75} />}
            title={activeTab === "active" ? "Nenhum PDI ativo" : "Sem itens nesta aba"}
            description={
              activeTab === "active"
                ? "Crie um PDI alinhado com seu líder para começar a evoluir com método."
                : "Experimente mudar para outra aba ou criar um novo PDI."
            }
            actions={
              <Btn variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowForm(true)}>
                Novo PDI
              </Btn>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map((plan) => (
              <div
                key={plan.id}
                className="surface-paper p-3.5 cursor-pointer hover:border-border-strong transition-colors"
                onClick={() => setSelectedPlan(plan)}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-semibold leading-tight text-text line-clamp-2 tracking-[-0.01em]">
                      {plan.title}
                    </div>
                    {plan.development_area && (
                      <div className="text-[10.5px] text-text-subtle uppercase tracking-[0.05em] mt-1 font-semibold">
                        {plan.development_area}
                      </div>
                    )}
                  </div>
                  <StatusBadge kind="pdi" status={plan.status} size="sm" />
                </div>
                {plan.user?.full_name && (
                  <Row gap={6} className="mt-2">
                    <LinearAvatar name={plan.user.full_name} size={18} />
                    <span className="text-[11.5px] text-text-muted">{plan.user.full_name}</span>
                  </Row>
                )}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[11.5px] mb-1">
                    <span className="text-text-muted">Progresso</span>
                    <span className="font-semibold tabular">{plan.progress_percentage || 0}%</span>
                  </div>
                  <ProgressBar value={plan.progress_percentage || 0} />
                </div>
                {plan.timeline && (
                  <div className="text-[11.5px] text-text-subtle mt-2">Prazo: {plan.timeline}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New PDI dialog — wizard 4 steps (fonte única) */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0">
          {/* Header visual fica dentro do PDIFormIntegrated */}
          <DialogHeader className="sr-only">
            <DialogTitle>Criar novo PDI</DialogTitle>
            <DialogDescription>
              Wizard em 4 passos — objetivo, critério, ações e revisão.
            </DialogDescription>
          </DialogHeader>
          <PDIFormIntegrated onSubmit={handleSubmitNew} />
        </DialogContent>
      </Dialog>

      {/* Selected plan dialog */}
      <Dialog open={!!selectedPlan} onOpenChange={() => setSelectedPlan(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Detalhes do PDI</DialogTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Btn variant="ghost" size="sm" icon={<MoreVertical className="w-4 h-4" />}>
                    {""}
                  </Btn>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setDeleteDialog(selectedPlan?.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir PDI
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </DialogHeader>
          {selectedPlan && (
            <div className="space-y-5">
              <div className="space-y-2">
                <h3 className="text-[18px] font-semibold tracking-[-0.02em]">{selectedPlan.title}</h3>
                {selectedPlan.user && (
                  <Row gap={6}>
                    <LinearAvatar name={selectedPlan.user.full_name} size={18} />
                    <span className="text-[12px] text-text-muted">{selectedPlan.user.full_name}</span>
                  </Row>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge kind="pdi" status={selectedPlan.status} />
                  {selectedPlan.one_on_one_id && (
                    <button
                      className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded bg-accent-soft text-accent-text hover:bg-accent-soft/70 transition-colors"
                      onClick={() =>
                        navigate(`/11s`, { state: { openOneOnOneId: selectedPlan.one_on_one_id } })
                      }
                    >
                      <ExternalLink className="h-3 w-3" />
                      Ver 1:1 vinculada
                    </button>
                  )}
                </div>
                <div className="pt-2">
                  <LinkPDIToOneOnOne
                    pdiId={selectedPlan.id}
                    currentOneOnOneId={selectedPlan.one_on_one_id}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3.5 bg-bg-subtle rounded-md border border-border">
                <div>
                  <div className="text-[10.5px] text-text-subtle uppercase tracking-[0.05em] font-semibold">
                    Área
                  </div>
                  <div className="text-[13px] font-medium mt-1">{selectedPlan.development_area || "—"}</div>
                </div>
                {selectedPlan.deadline && (
                  <div>
                    <div className="text-[10.5px] text-text-subtle uppercase tracking-[0.05em] font-semibold">
                      Prazo
                    </div>
                    <div className="text-[13px] font-medium mt-1">
                      {format(new Date(selectedPlan.deadline), "dd/MM/yyyy")}
                    </div>
                  </div>
                )}
                <div className="col-span-2">
                  <div className="text-[10.5px] text-text-subtle uppercase tracking-[0.05em] font-semibold">
                    Progresso
                  </div>
                  <div className="mt-1.5">
                    <ProgressBar value={selectedPlan.progress_percentage} />
                    <div className="text-[11.5px] text-text-muted mt-1">
                      {selectedPlan.progress_percentage}% concluído
                    </div>
                  </div>
                </div>
              </div>

              {selectedPlan.main_objective ? (
                <div className="space-y-3 border-t border-border pt-4">
                  <h4 className="text-[10.5px] text-text-subtle uppercase tracking-[0.05em] font-semibold">
                    Plano estruturado
                  </h4>
                  <Question label="Objetivo principal" text={selectedPlan.main_objective} />
                  <Question label="Ações comprometidas" text={selectedPlan.committed_actions} />
                  <Question label="Apoios necessários" text={selectedPlan.required_support} />
                  <Question label="Métricas de sucesso" text={selectedPlan.success_metrics} />
                  <Question label="Desafios previstos" text={selectedPlan.anticipated_challenges} />
                </div>
              ) : (
                <div className="space-y-3 border-t border-border pt-4">
                  <Question label="Descrição" text={selectedPlan.description} />
                  <Question label="Objetivos" text={selectedPlan.goals} />
                  <Question label="Plano de ação" text={selectedPlan.action_items} />
                </div>
              )}

              <div className="space-y-2 border-t border-border pt-4">
                <h4 className="text-[10.5px] text-text-subtle uppercase tracking-[0.05em] font-semibold">
                  Histórico de atualizações
                </h4>
                <PDIUpdatesTimeline pdiId={selectedPlan.id} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showManualForm} onOpenChange={setShowManualForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar PDI antigo</DialogTitle>
            <DialogDescription>
              Cadastre um PDI com datas retroativas para manter o histórico completo.
            </DialogDescription>
          </DialogHeader>
          <ManualPDIForm
            onSuccess={() => setShowManualForm(false)}
            onCancel={() => setShowManualForm(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este PDI?</AlertDialogTitle>
            <AlertDialogDescription>
              A exclusão é permanente e o histórico de atualizações será perdido.
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
  );
}

function KpiMini({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className={cn("surface-paper p-3.5", highlight && "bg-accent-soft border-accent/20")}>
      <div className="flex items-center justify-between">
        <div
          className={cn(
            "text-[11px] uppercase tracking-[0.05em] font-semibold",
            highlight ? "text-accent-text" : "text-text-subtle",
          )}
        >
          {label}
        </div>
        <span className={cn(highlight ? "text-accent-text" : "text-text-muted")}>{icon}</span>
      </div>
      <div
        className={cn(
          "text-[26px] font-semibold tabular tracking-[-0.02em] mt-1 leading-[1.05]",
          highlight && "text-accent-text",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function Question({ label, text }: { label: string; text?: string | null }) {
  if (!text) return null;
  return (
    <div>
      <h5 className="text-[12.5px] font-semibold text-text mb-1">{label}</h5>
      <p className="text-[13px] whitespace-pre-wrap text-text-muted leading-relaxed">{text}</p>
    </div>
  );
}
