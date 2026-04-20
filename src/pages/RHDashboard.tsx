import {
  AlertTriangle,
  TrendingUp,
  Users,
  MessageSquare,
  Target,
  Calendar,
  CheckCircle2,
  Download,
  Activity,
  ArrowRight,
  Filter,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useOrgIndicators } from "@/hooks/useOrgIndicators";
import { useClimateOverview } from "@/hooks/useClimateOverview";
import { useNineBoxDistribution } from "@/hooks/useNineBoxDistribution";
import { useUserProfile } from "@/hooks/useUserProfile";
import { LoadingState } from "@/components/primitives/LoadingState";
import { NineBoxMatrix } from "@/components/NineBoxMatrix";
import {
  Btn,
  Chip,
  Row,
  Card,
  SectionHeader,
  LinearEmpty,
  PriorityDot,
} from "@/components/primitives/LinearKit";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

function percent(value: number | null | undefined) {
  if (value == null) return "—";
  return `${Math.round(value * 100)}%`;
}

type Signal = {
  priority: "urgent" | "high" | "med";
  title: string;
  subtitle: string;
  action: string;
  route: string;
};

export default function RHDashboard() {
  const navigate = useNavigate();
  const { data: profile } = useUserProfile();
  const { data: org, isLoading: isLoadingOrg } = useOrgIndicators();
  const { data: climate, isLoading: isLoadingClimate } = useClimateOverview();
  const { data: nineBox, isLoading: isLoadingNineBox } = useNineBoxDistribution("org");

  const firstName = (profile?.full_name || "").split(" ")[0] || "RH";
  const hour = new Date().getHours();
  const greeting = hour < 6 ? "Boa madrugada" : hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  const climateTrend = (climate?.trend || [])
    .filter((t) => t.avgScore != null)
    .map((t) => ({
      title: t.title.length > 16 ? `${t.title.slice(0, 14)}…` : t.title,
      avgScore: Number(t.avgScore),
    }));

  const signals: Signal[] = [];
  if ((org?.lowScoreCollaborators ?? 0) > 0) {
    signals.push({
      priority: "urgent",
      title: `${org?.lowScoreCollaborators} ${(org?.lowScoreCollaborators ?? 0) === 1 ? "pessoa" : "pessoas"} com score abaixo de 3,0`,
      subtitle: "Performance crítica — requer plano de ação com a liderança",
      action: "Revisar",
      route: "/avaliacoes",
    });
  }
  if ((org?.pendingApprovalPdis ?? 0) > 0) {
    signals.push({
      priority: "high",
      title: `${org?.pendingApprovalPdis} ${(org?.pendingApprovalPdis ?? 0) === 1 ? "PDI aguardando" : "PDIs aguardando"} aprovação`,
      subtitle: "Liberação pelas lideranças pendente",
      action: "Abrir PDIs",
      route: "/pdi",
    });
  }
  if (climate?.participationRate != null && climate.participationRate < 0.6 && climate.survey) {
    signals.push({
      priority: "high",
      title: `Participação em "${climate.survey.title}" abaixo de 60%`,
      subtitle: `${percent(climate.participationRate)} dos elegíveis responderam`,
      action: "Ver clima",
      route: "/clima",
    });
  }
  if (climate?.avgScore != null && climate.avgScore < 3.5) {
    signals.push({
      priority: "urgent",
      title: `Clima consolidado em ${climate.avgScore.toFixed(1)}`,
      subtitle: "Média abaixo de 3,5 na pesquisa ativa — aprofundar análise por time",
      action: "Ver clima",
      route: "/clima",
    });
  }

  const topSignal = signals[0];
  const restSignals = signals.slice(1);

  return (
    <div className="p-5 lg:p-7 font-sans text-text max-w-[1400px] mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.08em] text-text-subtle font-semibold mb-0.5">
            Pessoas
          </div>
          <h1 className="text-[20px] font-semibold tracking-[-0.02em] m-0">
            {greeting}, {firstName}
          </h1>
          <div className="text-[13px] text-text-muted mt-0.5">
            {climate?.survey?.title
              ? `${climate.survey.title} · ${climate?.distinctRespondents ?? 0} de ${climate?.totalEligible ?? 0} respondentes`
              : org?.totalCollaborators
              ? `${org.totalCollaborators} pessoas · ${signals.length} ${signals.length === 1 ? "sinal" : "sinais"} para revisar`
              : "Visão consolidada · ciclo atual"}
          </div>
        </div>
        <Row gap={6}>
          <Btn variant="ghost" size="sm" icon={<Filter className="w-3.5 h-3.5" strokeWidth={1.75} />}>
            Filtros
          </Btn>
          <Btn variant="secondary" size="sm" icon={<Download className="w-3.5 h-3.5" strokeWidth={1.75} />}>
            Relatório
          </Btn>
        </Row>
      </div>

      {/* Next action hero */}
      {topSignal && (
        <div className="mt-4 mb-5 surface-paper border-l-[3px] border-l-accent p-3.5 flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-lg bg-accent-soft text-accent-text grid place-items-center shrink-0">
            <AlertTriangle className="w-[18px] h-[18px]" strokeWidth={1.75} />
          </div>
          <div className="flex-1 min-w-0">
            <Row gap={6} className="mb-0.5">
              <span className="text-[10.5px] uppercase tracking-[0.08em] text-accent-text font-semibold">
                Próxima ação
              </span>
              <span className="text-[10.5px] text-text-subtle">·</span>
              <span className="text-[10.5px] text-text-subtle">
                {signals.length} {signals.length === 1 ? "sinal crítico" : "sinais críticos"}
              </span>
            </Row>
            <div className="text-[15px] font-medium tracking-[-0.01em] truncate">{topSignal.title}</div>
            <div className="text-[12px] text-text-muted mt-0.5 line-clamp-1">{topSignal.subtitle}</div>
          </div>
          <Row gap={6}>
            <Btn
              variant="accent"
              size="sm"
              iconRight={<ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />}
              onClick={() => navigate(topSignal.route)}
            >
              {topSignal.action}
            </Btn>
          </Row>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-5">
        <KpiTile
          label="Pessoas"
          value={String(org?.totalCollaborators ?? 0)}
          detail="alocadas em times"
          icon={<Users className="w-4 h-4" strokeWidth={1.75} />}
        />
        <KpiTile
          label="Clima"
          value={climate?.avgScore != null ? climate.avgScore.toFixed(1) : "—"}
          detail={climate?.survey?.title || "sem pesquisa ativa"}
          icon={<Activity className="w-4 h-4" strokeWidth={1.75} />}
          delta={
            climate?.avgScore != null
              ? climate.avgScore >= 4
                ? "good"
                : climate.avgScore < 3.5
                ? "bad"
                : undefined
              : undefined
          }
        />
        <KpiTile
          label="Participação"
          value={percent(climate?.participationRate)}
          detail={
            climate?.distinctRespondents != null && (climate.totalEligible ?? 0) > 0
              ? `${climate.distinctRespondents}/${climate.totalEligible}`
              : "sem respostas"
          }
          icon={<MessageSquare className="w-4 h-4" strokeWidth={1.75} />}
        />
        <KpiTile
          label="Performance"
          value={org?.avgPerformanceScore != null ? org.avgPerformanceScore.toFixed(1) : "—"}
          detail={org?.completedEvaluations ? `${org.completedEvaluations} avaliações` : "sem avaliações"}
          icon={<Target className="w-4 h-4" strokeWidth={1.75} />}
          delta={
            org?.avgPerformanceScore != null
              ? org.avgPerformanceScore >= 4
                ? "good"
                : org.avgPerformanceScore < 3
                ? "bad"
                : undefined
              : undefined
          }
        />
        <KpiTile
          label="PDIs pendentes"
          value={String(org?.pendingApprovalPdis ?? 0)}
          detail="aguardando aprovação"
          icon={<TrendingUp className="w-4 h-4" strokeWidth={1.75} />}
          delta={(org?.pendingApprovalPdis ?? 0) > 5 ? "bad" : undefined}
        />
      </div>

      {/* Sinais + Clima trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <div className="lg:col-span-2">
          <SectionHeader
            title="Sinais críticos"
            right={
              signals.length > 0 ? (
                <span className="text-[11.5px] text-text-subtle tabular">
                  {signals.length} {signals.length === 1 ? "sinal" : "sinais"}
                </span>
              ) : null
            }
          />
          {isLoadingOrg ? (
            <LoadingState variant="inline" message="Consolidando alertas…" />
          ) : signals.length === 0 ? (
            <LinearEmpty
              icon={<CheckCircle2 className="w-[18px] h-[18px]" strokeWidth={1.75} />}
              title="Nenhum sinal crítico"
              description="Os indicadores estão saudáveis no momento."
            />
          ) : restSignals.length > 0 ? (
            <div className="surface-paper">
              {restSignals.map((s, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-3.5 py-2.5 cursor-pointer hover:bg-bg-subtle transition-colors ${
                    i < restSignals.length - 1 ? "border-b border-border" : ""
                  }`}
                  onClick={() => navigate(s.route)}
                >
                  <PriorityDot level={s.priority} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-[450] text-text truncate">{s.title}</div>
                    <div className="text-[11.5px] text-text-subtle mt-0.5 line-clamp-1">{s.subtitle}</div>
                  </div>
                  <Chip color={s.priority === "urgent" ? "red" : "amber"} size="sm">
                    {s.action}
                  </Chip>
                  <ChevronRight className="w-3.5 h-3.5 text-text-subtle" strokeWidth={1.75} />
                </div>
              ))}
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
          <SectionHeader title="Evolução do clima" />
          <Card contentClassName="p-3.5">
            {isLoadingClimate ? (
              <LoadingState variant="spinner" />
            ) : climateTrend.length < 2 ? (
              <LinearEmpty
                icon={<TrendingUp className="w-[18px] h-[18px]" strokeWidth={1.75} />}
                title="Sem tendência"
                description="A evolução aparece após 2 pesquisas."
                dashed={false}
              />
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={climateTrend} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="hsl(var(--border-default))" vertical={false} />
                  <XAxis
                    dataKey="title"
                    stroke="hsl(var(--text-subtle))"
                    style={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 5]}
                    stroke="hsl(var(--text-subtle))"
                    style={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--bg-subtle))" }}
                    contentStyle={{
                      backgroundColor: "hsl(var(--surface))",
                      border: "1px solid hsl(var(--border-default))",
                      borderRadius: "6px",
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [v.toFixed(2), "Score"]}
                  />
                  <Bar dataKey="avgScore" radius={[3, 3, 0, 0]} fill="hsl(var(--accent))" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
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
