import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { handleSupabaseError } from "@/lib/supabaseError";
import {
  AlertTriangle,
  Users,
  Calendar,
  Target,
  TrendingUp,
  ArrowRight,
  ChevronRight,
  Filter,
  CheckCircle2,
  MessageSquare,
  BarChart3,
  Activity,
} from "lucide-react";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useLeaderAlerts } from "@/hooks/useLeaderAlerts";
import { useTeamIndicators } from "@/hooks/useTeamIndicators";
import { useNineBoxDistribution } from "@/hooks/useNineBoxDistribution";
import { LoadingState } from "@/components/primitives/LoadingState";
import { NineBoxMatrix } from "@/components/NineBoxMatrix";
import {
  Btn,
  Chip,
  Row,
  Card,
  SectionHeader,
  LinearAvatar,
  LinearEmpty,
  PriorityDot,
} from "@/components/primitives/LinearKit";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

type LeaderAlert = {
  type: "gap" | "score" | "pending";
  message: string;
  action: string;
  relatedId?: string;
};

function alertToRoute(alert: LeaderAlert): string | null {
  if (!alert.relatedId && alert.type === "score") return null;
  switch (alert.type) {
    case "score":
      return alert.relatedId ? `/colaborador/${alert.relatedId}` : null;
    case "pending":
      return alert.message.toLowerCase().includes("pdi") ? "/pdi" : "/11s";
    case "gap":
    default:
      return "/meu-time";
  }
}

function alertPriority(alert: LeaderAlert): "urgent" | "high" | "med" {
  if (alert.type === "score") return "urgent";
  if (alert.type === "pending") return "high";
  return "med";
}

type AlertTypeFilter = "score" | "pending" | "gap";
const ALERT_TYPE_LABEL: Record<AlertTypeFilter, string> = {
  score: "Score baixo",
  pending: "Pendências",
  gap: "Acompanhamento",
};

export default function GestorDashboard() {
  const { data: profile } = useUserProfile();
  const navigate = useNavigate();
  const leaderId = profile?.id;
  const [alertTypeFilters, setAlertTypeFilters] = useState<Set<AlertTypeFilter>>(new Set());
  const toggleAlertType = (t: AlertTypeFilter) =>
    setAlertTypeFilters((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });

  const { data: alerts = [], isLoading: isLoadingAlerts } = useLeaderAlerts(leaderId);
  const { data: indicators, isLoading: isLoadingIndicators } = useTeamIndicators(leaderId);
  const { data: nineBox, isLoading: isLoadingNineBox } = useNineBoxDistribution("team", leaderId);

  const { data: rawTeamMembers = [], isLoading: isLoadingTeam } = useQuery({
    queryKey: ["team-members-raw", leaderId],
    enabled: !!leaderId,
    queryFn: async () => {
      if (!leaderId) return [];
      const { data, error } = await supabase
        .from("team_members")
        .select("id, user_id, position")
        .eq("leader_id", leaderId);
      if (error) throw handleSupabaseError(error, "Falha ao carregar membros do time", { silent: true });
      return data ?? [];
    },
  });

  const userIds = rawTeamMembers.map((m: any) => m.user_id);
  const { data: memberProfiles = [] } = useQuery({
    queryKey: ["member-profiles", userIds],
    enabled: userIds.length > 0,
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);
      if (error) throw handleSupabaseError(error, "Falha ao carregar perfis do time", { silent: true });
      return data ?? [];
    },
  });

  const teamMembers = rawTeamMembers.map((tm: any) => ({
    ...tm,
    profile: memberProfiles.find((p: any) => p.id === tm.user_id),
  }));

  const firstName = (profile?.full_name || "").split(" ")[0] || "Gestor";
  const hour = new Date().getHours();
  const greeting = hour < 6 ? "Boa madrugada" : hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  const typedAlerts = (alerts as LeaderAlert[]) || [];
  const visibleAlerts =
    alertTypeFilters.size === 0
      ? typedAlerts
      : typedAlerts.filter((a) => alertTypeFilters.has(a.type as AlertTypeFilter));
  const topAlert = visibleAlerts[0];
  const restAlerts = visibleAlerts.slice(1);
  const criticalCount = typedAlerts.filter((a) => a.type === "score").length;
  const pendingCount = typedAlerts.filter((a) => a.type === "pending").length;

  const heroSubtitle =
    criticalCount > 0 && pendingCount > 0
      ? `${criticalCount} ${criticalCount === 1 ? "score baixo" : "scores baixos"} · ${pendingCount} ${pendingCount === 1 ? "pendência" : "pendências"}`
      : criticalCount > 0
      ? `${criticalCount} ${criticalCount === 1 ? "colaborador precisa" : "colaboradores precisam"} de atenção imediata`
      : pendingCount > 0
      ? `${pendingCount} ${pendingCount === 1 ? "item pendente" : "itens pendentes"} do time`
      : "";

  return (
    <div className="p-5 lg:p-7 font-sans text-text max-w-[1400px] mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-baseline justify-between mb-1">
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.08em] text-text-subtle font-semibold mb-0.5">
            Liderança
          </div>
          <h1 className="text-[20px] font-semibold tracking-[-0.02em] m-0">
            {greeting}, {firstName}
          </h1>
          <div className="text-[13px] text-text-muted mt-0.5">
            {indicators?.memberCount
              ? `${indicators.memberCount} ${indicators.memberCount === 1 ? "pessoa" : "pessoas"} no time${
                  typedAlerts.length ? ` · ${typedAlerts.length} ${typedAlerts.length === 1 ? "sinal" : "sinais"} para revisar` : ""
                }`
              : "Panorama do time"}
          </div>
        </div>
        <Row gap={6}>
          <Popover>
            <PopoverTrigger asChild>
              <Btn
                variant="ghost"
                size="sm"
                icon={<Filter className="w-3.5 h-3.5" strokeWidth={1.75} />}
              >
                Filtros{alertTypeFilters.size > 0 ? ` · ${alertTypeFilters.size}` : ""}
              </Btn>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-3">
              <div className="text-[10.5px] uppercase tracking-[0.08em] text-text-subtle font-semibold mb-2">
                Filtrar alertas
              </div>
              <div className="space-y-1.5">
                {(Object.keys(ALERT_TYPE_LABEL) as AlertTypeFilter[]).map((t) => (
                  <label
                    key={t}
                    className="flex items-center gap-2 text-[12.5px] cursor-pointer py-1"
                  >
                    <Checkbox
                      checked={alertTypeFilters.has(t)}
                      onCheckedChange={() => toggleAlertType(t)}
                    />
                    <span>{ALERT_TYPE_LABEL[t]}</span>
                  </label>
                ))}
              </div>
              {alertTypeFilters.size > 0 && (
                <button
                  onClick={() => setAlertTypeFilters(new Set())}
                  className="text-[11.5px] text-accent-text mt-2 hover:underline"
                >
                  Limpar filtros
                </button>
              )}
            </PopoverContent>
          </Popover>
          <Btn
            variant="secondary"
            size="sm"
            icon={<Calendar className="w-3.5 h-3.5" strokeWidth={1.75} />}
            onClick={() => navigate("/11s")}
          >
            Agendar 1:1
          </Btn>
        </Row>
      </div>

      {/* Next action hero */}
      {topAlert && (
        <div className="mt-4 mb-5 surface-paper border-l-[3px] border-l-accent p-3.5 flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-lg bg-accent-soft text-accent-text grid place-items-center shrink-0">
            <Target className="w-[18px] h-[18px]" strokeWidth={1.75} />
          </div>
          <div className="flex-1 min-w-0">
            <Row gap={6} className="mb-0.5">
              <span className="text-[10.5px] uppercase tracking-[0.08em] text-accent-text font-semibold">
                Próxima ação
              </span>
              {heroSubtitle && (
                <>
                  <span className="text-[10.5px] text-text-subtle">·</span>
                  <span className="text-[10.5px] text-text-subtle">{heroSubtitle}</span>
                </>
              )}
            </Row>
            <div className="text-[15px] font-medium tracking-[-0.01em] truncate">{topAlert.message}</div>
          </div>
          <Row gap={6}>
            <Btn variant="secondary" size="sm" onClick={() => navigate("/meu-time")}>
              Ver time
            </Btn>
            <Btn
              variant="accent"
              size="sm"
              iconRight={<ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />}
              disabled={!alertToRoute(topAlert)}
              onClick={() => {
                const route = alertToRoute(topAlert);
                if (route) navigate(route);
              }}
            >
              {topAlert.action || "Abrir"}
            </Btn>
          </Row>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
        <KpiTile
          label="Meu time"
          value={indicators?.memberCount != null ? String(indicators.memberCount) : isLoadingIndicators ? "—" : "0"}
          detail={
            indicators?.memberCount
              ? `${indicators.memberCount === 1 ? "pessoa" : "pessoas"} sob liderança`
              : "Sem time vinculado"
          }
          icon={<Users className="w-4 h-4" strokeWidth={1.75} />}
        />
        <KpiTile
          label="Score médio"
          value={indicators?.avgPerformanceScore != null ? indicators.avgPerformanceScore.toFixed(1) : "—"}
          detail={
            indicators?.avgPerformanceScore != null ? "avaliações concluídas" : "aguardando avaliações"
          }
          icon={<Target className="w-4 h-4" strokeWidth={1.75} />}
          delta={
            indicators?.avgPerformanceScore != null
              ? indicators.avgPerformanceScore >= 4
                ? "good"
                : indicators.avgPerformanceScore < 3
                ? "bad"
                : undefined
              : undefined
          }
        />
        <KpiTile
          label="1:1s (30d)"
          value={String(indicators?.completedOneOnOnesLast30d ?? 0)}
          detail="concluídas no período"
          icon={<Calendar className="w-4 h-4" strokeWidth={1.75} />}
        />
        <KpiTile
          label="Progresso PDI"
          value={indicators?.avgPdiProgress != null ? `${Math.round(indicators.avgPdiProgress)}%` : "—"}
          detail={
            indicators?.pendingApprovalPdis
              ? `${indicators.pendingApprovalPdis} aguarda${
                  indicators.pendingApprovalPdis === 1 ? "" : "m"
                } aprovação`
              : "Média dos PDIs ativos"
          }
          icon={<TrendingUp className="w-4 h-4" strokeWidth={1.75} />}
        />
      </div>

      {/* Alerts + Team grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <div className="lg:col-span-2">
          <SectionHeader
            title="Alertas críticos"
            right={
              visibleAlerts.length > 0 ? (
                <span className="text-[11.5px] text-text-subtle tabular">
                  {visibleAlerts.length} {visibleAlerts.length === 1 ? "sinal" : "sinais"}
                  {alertTypeFilters.size > 0 ? ` · de ${typedAlerts.length}` : ""}
                </span>
              ) : null
            }
          />
          {isLoadingAlerts ? (
            <LoadingState variant="inline" message="Analisando pendências…" />
          ) : visibleAlerts.length === 0 ? (
            <LinearEmpty
              icon={<CheckCircle2 className="w-[18px] h-[18px]" strokeWidth={1.75} />}
              title={typedAlerts.length === 0 ? "Nada crítico agora" : "Nenhum alerta com esses filtros"}
              description={
                typedAlerts.length === 0
                  ? "Scores baixos, 1:1s atrasadas ou PDIs pendentes aparecem aqui."
                  : "Ajuste o filtro para ver outros alertas."
              }
            />
          ) : restAlerts.length > 0 ? (
            <div className="surface-paper">
              {restAlerts.map((alert, idx) => {
                const prio = alertPriority(alert);
                return (
                  <div
                    key={`${alert.type}-${alert.relatedId ?? "none"}-${idx}`}
                    className={`flex items-center gap-3 px-3.5 py-2.5 cursor-pointer hover:bg-bg-subtle transition-colors ${
                      idx < restAlerts.length - 1 ? "border-b border-border" : ""
                    }`}
                    onClick={() => {
                      const route = alertToRoute(alert);
                      if (route) navigate(route);
                    }}
                  >
                    <PriorityDot level={prio} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-[450] text-text truncate">{alert.message}</div>
                      <div className="text-[11.5px] text-text-subtle mt-0.5">
                        {alert.type === "score"
                          ? "Performance abaixo do esperado"
                          : alert.type === "pending"
                          ? "Pendência do time"
                          : "Gap de acompanhamento"}
                      </div>
                    </div>
                    <Chip color={prio === "urgent" ? "red" : prio === "high" ? "amber" : "neutral"} size="sm">
                      {alert.action}
                    </Chip>
                    <ChevronRight className="w-3.5 h-3.5 text-text-subtle" strokeWidth={1.75} />
                  </div>
                );
              })}
            </div>
          ) : (
            <LinearEmpty
              icon={<CheckCircle2 className="w-[18px] h-[18px]" strokeWidth={1.75} />}
              title="Apenas o sinal acima"
              description="Resolva o alerta em destaque para limpar a caixa."
            />
          )}
        </div>

        <div>
          <SectionHeader
            title="Meu time"
            right={
              teamMembers.length > 0 ? (
                <button onClick={() => navigate("/meu-time")} className="link-accent text-[11.5px]">
                  Ver todos →
                </button>
              ) : null
            }
          />
          {isLoadingTeam ? (
            <LoadingState variant="spinner" message="Carregando…" />
          ) : teamMembers.length === 0 ? (
            <LinearEmpty
              icon={<Users className="w-[18px] h-[18px]" strokeWidth={1.75} />}
              title="Sem time vinculado"
              description="Peça ao RH para alocar pessoas ao seu time."
            />
          ) : (
            <div className="surface-paper">
              {teamMembers.slice(0, 6).map((member: any, idx: number) => {
                const name = member.profile?.full_name || "Sem nome";
                const visible = teamMembers.slice(0, 6);
                return (
                  <button
                    key={member.id}
                    onClick={() => navigate(`/colaborador/${member.user_id}`)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-bg-subtle transition-colors ${
                      idx < visible.length - 1 ? "border-b border-border" : ""
                    }`}
                  >
                    <LinearAvatar name={name} size={26} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] font-medium text-text truncate">{name}</div>
                      <div className="text-[11px] text-text-subtle truncate">
                        {member.position || "—"}
                      </div>
                    </div>
                    <ChevronRight className="w-3 h-3 text-text-subtle" strokeWidth={1.75} />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 9-Box */}
      <SectionHeader
        title="9-Box · performance × potencial"
        right={
          nineBox?.totalEvaluated ? (
            <span className="text-[11.5px] text-text-subtle tabular">
              {nineBox.totalEvaluated} avaliad{nineBox.totalEvaluated === 1 ? "o" : "os"}
            </span>
          ) : null
        }
      />
      <Card contentClassName="p-5">
        {isLoadingNineBox ? (
          <LoadingState variant="spinner" message="Calculando distribuição…" />
        ) : (
          <NineBoxMatrix distribution={nineBox} />
        )}
      </Card>
    </div>
  );
}

function KpiTile({
  label,
  value,
  detail,
  icon,
  delta,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: React.ReactNode;
  delta?: "good" | "bad";
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
      <div
        className={`text-[11.5px] mt-1 ${
          delta === "good" ? "text-status-green" : delta === "bad" ? "text-status-red" : "text-text-muted"
        }`}
      >
        {detail}
      </div>
    </div>
  );
}
