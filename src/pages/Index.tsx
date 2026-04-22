import { useEffect, useState } from "react";
import {
  Calendar,
  Target,
  CheckCircle2,
  ArrowRight,
  Filter,
  Plus,
  Activity,
  BarChart3,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { handleSupabaseError } from "@/lib/supabaseError";
import { Link, useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useCollaboratorEvolution } from "@/hooks/useCollaboratorEvolution";
import { usePendingTasks } from "@/hooks/usePendingTasks";
import {
  Btn,
  Chip,
  Row,
  Col,
  Card,
  SectionHeader,
  PriorityDot,
  ProgressBar,
  LinearAvatar,
  LinearEmpty,
} from "@/components/primitives/LinearKit";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

type PriorityFilter = "urgent" | "high" | "med" | "low";
const PRIORITY_LABEL: Record<PriorityFilter, string> = {
  urgent: "Urgente",
  high: "Alta",
  med: "Média",
  low: "Sem prazo",
};

function taskTypeToRoute(type: string) {
  switch (type) {
    case "pdi":
    case "development_plan":
      return "/pdi";
    case "one_on_one":
    case "1on1":
      return "/11s";
    case "evaluation":
    case "self_evaluation":
      return "/avaliacoes";
    case "climate":
    case "climate_survey":
      return "/clima";
    default:
      return "/colaborador";
  }
}

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (error) throw handleSupabaseError(error, "Falha ao carregar perfil", { silent: true });
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: nextOneOnOne } = useQuery({
    queryKey: ["nextOneOnOne", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("one_on_ones")
        .select("*, leader:leader_id(full_name)")
        .eq("collaborator_id", user.id)
        .eq("status", "scheduled")
        .gte("scheduled_date", new Date().toISOString())
        .order("scheduled_date", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw handleSupabaseError(error, "Falha ao carregar próxima 1:1", { silent: true });
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: activePDIs = [] } = useQuery({
    queryKey: ["activePDIs", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("development_plans")
        .select("*")
        .eq("user_id", user.id)
        .in("status", ["in_progress", "approved", "pending_approval"])
        .order("created_at", { ascending: false });
      if (error) throw handleSupabaseError(error, "Falha ao carregar PDIs ativos", { silent: true });
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  const { data: pendingTasks = [], error: pendingTasksError } = usePendingTasks();
  useEffect(() => {
    if (pendingTasksError) {
      handleSupabaseError(pendingTasksError, "Falha ao carregar pendências");
    }
  }, [pendingTasksError]);
  const [priorityFilters, setPriorityFilters] = useState<Set<PriorityFilter>>(new Set());
  const togglePriority = (p: PriorityFilter) =>
    setPriorityFilters((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });

  const displayName =
    profile?.full_name ||
    (user?.user_metadata as { full_name?: string } | undefined)?.full_name ||
    user?.email?.split("@")[0] ||
    "";
  const firstName = displayName.split(" ")[0] || "novamente";
  const latestPdi = activePDIs[0];
  const today = new Date();

  const hour = today.getHours();
  const greeting = hour < 6 ? "Boa madrugada" : hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  const getDuePriorityLocal = (due: string | null | undefined): PriorityFilter => {
    if (!due) return "low";
    const diff = new Date(due).getTime() - Date.now();
    if (diff < 0) return "urgent";
    if (diff < 24 * 3600 * 1000) return "urgent";
    if (diff < 3 * 24 * 3600 * 1000) return "high";
    return "med";
  };

  const filteredPendingTasks =
    priorityFilters.size === 0
      ? pendingTasks
      : pendingTasks.filter((t) => priorityFilters.has(getDuePriorityLocal(t.due_date)));

  const nextTask = filteredPendingTasks[0];
  const restTasks = filteredPendingTasks.slice(1, 6);
  const totalPending = pendingTasks.length;
  const visiblePending = filteredPendingTasks.length;

  const averageProgress = activePDIs.length
    ? Math.round(activePDIs.reduce((acc, pdi) => acc + (pdi.progress_percentage || 0), 0) / activePDIs.length)
    : 0;

  const getDueLabel = (due: string | null | undefined) => {
    if (!due) return "Sem prazo";
    return formatDistanceToNow(new Date(due), { locale: ptBR, addSuffix: true });
  };

  const getDuePriority = (due: string | null | undefined) => {
    if (!due) return "low" as const;
    const diff = new Date(due).getTime() - Date.now();
    if (diff < 0) return "urgent" as const;
    if (diff < 24 * 3600 * 1000) return "urgent" as const;
    if (diff < 3 * 24 * 3600 * 1000) return "high" as const;
    return "med" as const;
  };

  const isEmpty = totalPending === 0 && activePDIs.length === 0;

  return (
    <div className="p-5 lg:p-7 font-sans text-text max-w-[1400px] mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-baseline justify-between mb-1">
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.02em] m-0">
            {greeting}, {firstName}
          </h1>
          <div className="text-[13px] text-text-muted mt-0.5">
            {totalPending === 0
              ? "Tudo em dia."
              : priorityFilters.size > 0
              ? `${visiblePending} de ${totalPending} pendentes · filtro ativo`
              : totalPending === 1
              ? "Você tem 1 coisa para hoje."
              : `${totalPending} itens pendentes · próxima ação já abaixo`}
          </div>
        </div>
        <Row gap={6}>
          <Popover>
            <PopoverTrigger asChild>
              <Btn
                variant="secondary"
                size="sm"
                icon={<Filter className="w-3.5 h-3.5" strokeWidth={1.75} />}
              >
                Filtros{priorityFilters.size > 0 ? ` · ${priorityFilters.size}` : ""}
              </Btn>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-3">
              <div className="text-[10.5px] uppercase tracking-[0.08em] text-text-subtle font-semibold mb-2">
                Filtrar por prazo
              </div>
              <div className="space-y-1.5">
                {(Object.keys(PRIORITY_LABEL) as PriorityFilter[]).map((p) => (
                  <label
                    key={p}
                    className="flex items-center gap-2 text-[12.5px] cursor-pointer py-1"
                  >
                    <Checkbox
                      checked={priorityFilters.has(p)}
                      onCheckedChange={() => togglePriority(p)}
                    />
                    <span>{PRIORITY_LABEL[p]}</span>
                  </label>
                ))}
              </div>
              {priorityFilters.size > 0 && (
                <button
                  onClick={() => setPriorityFilters(new Set())}
                  className="text-[11.5px] text-accent-text mt-2 hover:underline"
                >
                  Limpar filtros
                </button>
              )}
            </PopoverContent>
          </Popover>
          <Btn variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" strokeWidth={2} />} onClick={() => navigate("/pdi")}>
            Nova ação
          </Btn>
        </Row>
      </div>

      {/* Next action hero */}
      {nextTask && (
        <div className="mt-4 mb-5 surface-paper border-l-[3px] border-l-accent p-3.5 flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-lg bg-accent-soft text-accent-text grid place-items-center shrink-0">
            <Target className="w-[18px] h-[18px]" strokeWidth={1.75} />
          </div>
          <div className="flex-1 min-w-0">
            <Row gap={6} className="mb-0.5">
              <span className="text-[10.5px] uppercase tracking-[0.08em] text-accent-text font-semibold">
                Próxima ação
              </span>
              <span className="text-[10.5px] text-text-subtle">·</span>
              <span className="text-[10.5px] text-text-subtle">
                {getDueLabel(nextTask.due_date)}
              </span>
            </Row>
            <div className="text-[15px] font-medium tracking-[-0.01em]">{nextTask.title}</div>
            {nextTask.description && (
              <div className="text-[12px] text-text-muted mt-0.5 line-clamp-1">{nextTask.description}</div>
            )}
          </div>
          <Row gap={6}>
            <Btn
              variant="accent"
              size="sm"
              iconRight={<ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />}
              onClick={() => navigate(taskTypeToRoute(nextTask.task_type))}
            >
              Começar
            </Btn>
          </Row>
        </div>
      )}

      {/* Inbox de ações */}
      <SectionHeader
        title="Sua caixa de ações"
        right={
          <span className="text-[11.5px] text-text-subtle tabular">
            {visiblePending} {visiblePending === 1 ? "item" : "itens"}
            {priorityFilters.size > 0 ? ` · de ${totalPending}` : ""}
          </span>
        }
      />
      {isEmpty ? (
        <LinearEmpty
          icon={<CheckCircle2 className="w-[18px] h-[18px]" strokeWidth={1.75} />}
          title="Tudo em dia"
          description="Nenhuma pendência agora. Que tal aproveitar para revisar seu PDI ou agendar a próxima 1:1?"
          actions={
            <>
              <Btn
                variant="secondary"
                size="sm"
                icon={<Target className="w-3.5 h-3.5" strokeWidth={1.75} />}
                onClick={() => navigate("/pdi")}
              >
                Revisar PDI
              </Btn>
              <Btn
                variant="primary"
                size="sm"
                icon={<Calendar className="w-3.5 h-3.5" strokeWidth={1.75} />}
                onClick={() => navigate("/11s")}
              >
                Agendar 1:1
              </Btn>
            </>
          }
        />
      ) : restTasks.length > 0 ? (
        <div className="surface-paper">
          {restTasks.map((t, i) => {
            const prio = getDuePriority(t.due_date);
            const label = getDueLabel(t.due_date);
            const chipColor =
              prio === "urgent" ? "red" : prio === "high" ? "amber" : ("neutral" as const);
            return (
              <div
                key={t.id}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 cursor-pointer hover:bg-bg-subtle transition-colors",
                  i < restTasks.length - 1 && "border-b border-border",
                )}
                onClick={() => navigate(taskTypeToRoute(t.task_type))}
              >
                <PriorityDot level={prio} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-[450] text-text truncate">{t.title}</div>
                  {t.description && (
                    <div className="text-[11.5px] text-text-subtle mt-0.5 line-clamp-1">
                      {t.description}
                    </div>
                  )}
                </div>
                <Chip color={chipColor} size="sm">
                  {label}
                </Chip>
                <ChevronRight className="w-3.5 h-3.5 text-text-subtle" strokeWidth={1.75} />
              </div>
            );
          })}
        </div>
      ) : (
        <LinearEmpty
          icon={<CheckCircle2 className="w-[18px] h-[18px]" strokeWidth={1.75} />}
          title="Apenas a próxima ação"
          description="Sua caixa de entrada está limpa. Termine o próximo item lá em cima e ganhe o dia."
        />
      )}

      {/* Secondary: PDI mini + pulse */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        <Card title="Seu PDI atual" action={<Link to="/pdi" className="link-accent">Abrir PDI →</Link>}>
          {latestPdi ? (
            <div>
              <Row gap={6}>
                <Chip color="accent" size="sm">{latestPdi.development_area || "Desenvolvimento"}</Chip>
                <Chip color="neutral" size="sm">{latestPdi.status === "in_progress" ? "Em andamento" : latestPdi.status}</Chip>
              </Row>
              <div className="text-[13px] text-text mt-2.5 font-[450]">{latestPdi.title}</div>
              {latestPdi.target_date && (
                <div className="text-[12px] text-text-muted mt-0.5">
                  Prazo · {new Date(latestPdi.target_date).toLocaleDateString("pt-BR")}
                </div>
              )}
              <ProgressBar value={latestPdi.progress_percentage || 0} className="mt-2.5" />
              <div className="flex justify-between mt-2 text-[11.5px] text-text-muted">
                <span>Progresso</span>
                <span className="font-semibold text-text tabular">
                  {latestPdi.progress_percentage || 0}%
                </span>
              </div>
            </div>
          ) : (
            <div className="py-4 text-center">
              <div className="text-[13px] text-text-muted mb-2.5">Sem PDI ativo.</div>
              <Btn
                variant="primary"
                size="sm"
                icon={<Plus className="w-3.5 h-3.5" strokeWidth={2} />}
                onClick={() => navigate("/pdi")}
              >
                Criar primeiro PDI
              </Btn>
            </div>
          )}
        </Card>

        <Card title="Próxima 1:1" action={<Link to="/11s" className="link-accent">Ver todas →</Link>}>
          {nextOneOnOne ? (
            <div>
              <Row gap={10} align="center">
                <LinearAvatar name={nextOneOnOne.leader?.full_name || "Líder"} size={36} />
                <div>
                  <div className="text-[13px] font-medium">{nextOneOnOne.leader?.full_name || "Líder"}</div>
                  <div className="text-[11.5px] text-text-muted">
                    {formatDistanceToNow(new Date(nextOneOnOne.scheduled_date), {
                      locale: ptBR,
                      addSuffix: true,
                    })}
                    · {new Date(nextOneOnOne.scheduled_date).toLocaleDateString("pt-BR", {
                      weekday: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </Row>
              {nextOneOnOne.agenda && (
                <div className="text-[12px] text-text-muted mt-3 leading-relaxed line-clamp-3">
                  {nextOneOnOne.agenda}
                </div>
              )}
              <Btn
                variant="secondary"
                size="sm"
                className="mt-3 w-full justify-center"
                iconRight={<ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />}
                onClick={() => navigate("/11s")}
              >
                Abrir pauta
              </Btn>
            </div>
          ) : (
            <div className="py-4 text-center">
              <div className="text-[13px] text-text-muted mb-2.5">Nenhuma 1:1 agendada.</div>
              <Btn
                variant="primary"
                size="sm"
                icon={<Calendar className="w-3.5 h-3.5" strokeWidth={1.75} />}
                onClick={() => navigate("/11s")}
              >
                Agendar 1:1
              </Btn>
            </div>
          )}
        </Card>
      </div>

      {/* Resumo ciclo */}
      <SectionHeader title="Seu ciclo" right={<Link to="/avaliacoes" className="link-accent">Avaliações →</Link>} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <MiniKpi
          label="PDIs ativos"
          value={String(activePDIs.length)}
          detail={activePDIs.length ? "em andamento" : "Comece um PDI"}
          icon={<Target className="w-4 h-4" strokeWidth={1.75} />}
        />
        <MiniKpi
          label="Progresso médio"
          value={`${averageProgress}%`}
          detail={activePDIs.length ? "dos seus planos" : "sem base ainda"}
          icon={<BarChart3 className="w-4 h-4" strokeWidth={1.75} />}
        />
        <MiniKpi
          label="Pendências"
          value={String(totalPending)}
          detail={totalPending ? "para esta semana" : "Caixa limpa"}
          icon={<Activity className="w-4 h-4" strokeWidth={1.75} />}
        />
      </div>
    </div>
  );
};

function MiniKpi({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="surface-paper p-3.5">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-[0.05em] text-text-subtle font-semibold">
          {label}
        </div>
        <span className="text-text-muted">{icon}</span>
      </div>
      <div className="text-[26px] font-semibold tabular tracking-[-0.02em] mt-2 leading-[1.05]">
        {value}
      </div>
      <div className="text-[11.5px] text-text-muted mt-1">{detail}</div>
    </div>
  );
}

export default Index;
