import {
  Users,
  DollarSign,
  Building2,
  Target,
  Calendar,
  Download,
  TrendingUp,
  Activity,
  ArrowRight,
  Briefcase,
  LineChart,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { LoadingState } from "@/components/primitives/LoadingState";
import { useCostBreakdown } from "@/hooks/useCostBreakdown";
import { useOrgIndicators } from "@/hooks/useOrgIndicators";
import { useClimateOverview } from "@/hooks/useClimateOverview";
import { useUserProfile } from "@/hooks/useUserProfile";
import {
  Btn,
  Row,
  Card,
  SectionHeader,
  LinearEmpty,
  ProgressBar,
} from "@/components/primitives/LinearKit";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function downloadCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) {
    toast.error("Nada para exportar.");
    return;
  }
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SocioDashboard() {
  const navigate = useNavigate();
  const { data: profile } = useUserProfile();
  const { data: cost, isLoading: isLoadingCost } = useCostBreakdown();
  const { data: org } = useOrgIndicators();
  const { data: climate } = useClimateOverview();

  const firstName = (profile?.full_name || "").split(" ")[0] || "Sócio";
  const hour = new Date().getHours();
  const greeting = hour < 6 ? "Boa madrugada" : hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  const topTeams = (cost?.teams || []).slice(0, 6);
  const maxTeamCost = Math.max(1, ...topTeams.map((t) => t.totalCost));

  const alertsCount = (org?.lowScoreCollaborators ?? 0) + (org?.pendingApprovalPdis ?? 0);
  const heroTitle =
    (org?.lowScoreCollaborators ?? 0) > 0
      ? `${org?.lowScoreCollaborators} ${(org?.lowScoreCollaborators ?? 0) === 1 ? "pessoa abaixo" : "pessoas abaixo"} de 3,0 na última avaliação`
      : (org?.pendingApprovalPdis ?? 0) > 0
      ? `${org?.pendingApprovalPdis} ${(org?.pendingApprovalPdis ?? 0) === 1 ? "PDI aguarda" : "PDIs aguardam"} aprovação da liderança`
      : null;

  const heroSubtitle =
    (org?.lowScoreCollaborators ?? 0) > 0
      ? "Performance crítica — alinhar com RH para plano de ação"
      : (org?.pendingApprovalPdis ?? 0) > 0
      ? "Desenvolvimento parado — revisar com os líderes"
      : "";

  const shortcuts = [
    {
      label: "Gerenciar usuários",
      detail: `${org?.totalCollaborators ?? 0} pessoas`,
      icon: <Users className="w-4 h-4" strokeWidth={1.75} />,
      onClick: () => navigate("/admin"),
    },
    {
      label: "Empresas & times",
      detail: `${cost?.teams?.length ?? 0} times ativos`,
      icon: <Building2 className="w-4 h-4" strokeWidth={1.75} />,
      onClick: () => navigate("/empresas"),
    },
    {
      label: "Ciclos de avaliação",
      detail: `${org?.completedEvaluations ?? 0} concluídas`,
      icon: <Target className="w-4 h-4" strokeWidth={1.75} />,
      onClick: () => navigate("/avaliacoes"),
    },
    {
      label: "Recrutamento",
      detail: "Pipeline de vagas",
      icon: <Briefcase className="w-4 h-4" strokeWidth={1.75} />,
      onClick: () => navigate("/recrutamento"),
    },
  ];

  return (
    <div className="p-5 lg:p-7 font-sans text-text max-w-[1400px] mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.08em] text-text-subtle font-semibold mb-0.5">
            Visão executiva
          </div>
          <h1 className="text-[20px] font-semibold tracking-[-0.02em] m-0">
            {greeting}, {firstName}
          </h1>
          <div className="text-[13px] text-text-muted mt-0.5">
            {cost?.totalCost != null
              ? `Folha de ${formatBRL(cost.totalCost)} · ${org?.totalCollaborators ?? 0} pessoas · ${cost?.teams?.length ?? 0} times`
              : "Operação consolidada · custo, pessoas e clima"}
          </div>
        </div>
        <Row gap={6}>
          <Btn
            variant="secondary"
            size="sm"
            icon={<Download className="w-3.5 h-3.5" strokeWidth={1.75} />}
            onClick={() => {
              const teams = cost?.teams || [];
              const rows = teams.map((t) => ({
                time: t.teamName,
                empresa: t.companyName || "",
                pessoas: t.memberCount,
                custo_total_brl: t.totalCost,
                custo_medio_brl: t.avgCost,
              }));
              const date = new Date().toISOString().slice(0, 10);
              downloadCSV(rows, `custo-por-time-${date}.csv`);
            }}
          >
            Relatório
          </Btn>
        </Row>
      </div>

      {/* Next action hero (executivo) */}
      {heroTitle && (
        <div className="mt-4 mb-5 surface-paper border-l-[3px] border-l-accent p-3.5 flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-lg bg-accent-soft text-accent-text grid place-items-center shrink-0">
            <LineChart className="w-[18px] h-[18px]" strokeWidth={1.75} />
          </div>
          <div className="flex-1 min-w-0">
            <Row gap={6} className="mb-0.5">
              <span className="text-[10.5px] uppercase tracking-[0.08em] text-accent-text font-semibold">
                Próxima ação
              </span>
              <span className="text-[10.5px] text-text-subtle">·</span>
              <span className="text-[10.5px] text-text-subtle">
                {alertsCount} {alertsCount === 1 ? "ponto de atenção" : "pontos de atenção"}
              </span>
            </Row>
            <div className="text-[15px] font-medium tracking-[-0.01em] truncate">{heroTitle}</div>
            {heroSubtitle && (
              <div className="text-[12px] text-text-muted mt-0.5 line-clamp-1">{heroSubtitle}</div>
            )}
          </div>
          <Row gap={6}>
            <Btn
              variant="accent"
              size="sm"
              iconRight={<ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />}
              onClick={() =>
                navigate((org?.lowScoreCollaborators ?? 0) > 0 ? "/avaliacoes" : "/pdi")
              }
            >
              Revisar
            </Btn>
          </Row>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-5">
        <KpiTile
          label="Folha"
          value={cost?.totalCost != null ? formatBRL(cost.totalCost) : "—"}
          detail="mês corrente"
          icon={<DollarSign className="w-4 h-4" strokeWidth={1.75} />}
        />
        <KpiTile
          label="Pessoas ativas"
          value={String(org?.totalCollaborators ?? 0)}
          detail={`${cost?.teams?.length ?? 0} times`}
          icon={<Users className="w-4 h-4" strokeWidth={1.75} />}
        />
        <KpiTile
          label="Custo médio"
          value={
            cost?.totalCost != null && (org?.totalCollaborators ?? 0) > 0
              ? formatBRL(cost.totalCost / (org?.totalCollaborators ?? 1))
              : "—"
          }
          detail="por pessoa/mês"
          icon={<TrendingUp className="w-4 h-4" strokeWidth={1.75} />}
        />
        <KpiTile
          label="Performance"
          value={org?.avgPerformanceScore != null ? org.avgPerformanceScore.toFixed(1) : "—"}
          detail="média do ciclo"
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
          label="Clima"
          value={climate?.avgScore != null ? climate.avgScore.toFixed(1) : "—"}
          detail={climate?.survey?.title || "sem pesquisa"}
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
      </div>

      {/* Custo por time + Indicadores consolidados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        <div>
          <SectionHeader
            title="Custo por time"
            right={
              topTeams.length > 0 ? (
                <button onClick={() => navigate("/empresas")} className="link-accent text-[11.5px]">
                  Ver todos →
                </button>
              ) : null
            }
          />
          <Card contentClassName="p-0">
            {isLoadingCost ? (
              <div className="p-5">
                <LoadingState variant="spinner" />
              </div>
            ) : topTeams.length === 0 ? (
              <div className="p-5">
                <LinearEmpty
                  icon={<Building2 className="w-[18px] h-[18px]" strokeWidth={1.75} />}
                  title="Nenhum dado de custo"
                  description="Configure os custos por time para visualizar essa análise."
                />
              </div>
            ) : (
              topTeams.map((team, i) => (
                <div
                  key={team.teamId}
                  className={`px-3.5 py-2.5 ${i < topTeams.length - 1 ? "border-b border-border" : ""}`}
                >
                  <Row justify="between" className="mb-1.5">
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium truncate">{team.teamName}</div>
                      {team.companyName && (
                        <div className="text-[11px] text-text-subtle truncate">{team.companyName}</div>
                      )}
                    </div>
                    <span className="text-[13px] tabular font-semibold shrink-0">
                      {formatBRL(team.totalCost)}
                    </span>
                  </Row>
                  <ProgressBar value={(team.totalCost / maxTeamCost) * 100} color="hsl(var(--accent))" />
                  <div className="text-[11px] text-text-muted mt-1 tabular">
                    {team.memberCount} {team.memberCount === 1 ? "pessoa" : "pessoas"} ·{" "}
                    {formatBRL(team.avgCost)}/pessoa
                  </div>
                </div>
              ))
            )}
          </Card>
        </div>

        <div>
          <SectionHeader title="Indicadores consolidados" />
          <Card contentClassName="p-0">
            {[
              {
                label: "PDIs ativos",
                value:
                  org?.pendingApprovalPdis != null
                    ? String(org.pendingApprovalPdis)
                    : "—",
                hint: "aguardando aprovação",
              },
              {
                label: "Avaliações concluídas",
                value: String(org?.completedEvaluations ?? 0),
                hint: "no ciclo atual",
              },
              {
                label: "1:1s (30d)",
                value: String(org?.completedOneOnOnesLast30d ?? 0),
                hint: "realizadas com o time",
              },
              {
                label: "Participação clima",
                value:
                  climate?.participationRate != null
                    ? `${Math.round(climate.participationRate * 100)}%`
                    : "—",
                hint: climate?.survey?.title || "sem pesquisa ativa",
              },
              {
                label: "Pessoas em risco",
                value: String(org?.lowScoreCollaborators ?? 0),
                hint: "score abaixo de 3,0",
              },
            ].map((item, i, arr) => (
              <div
                key={item.label}
                className={`flex items-baseline justify-between px-3.5 py-2.5 ${
                  i < arr.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <div className="min-w-0">
                  <div className="text-[12.5px] font-medium text-text truncate">{item.label}</div>
                  <div className="text-[11.5px] text-text-muted truncate">{item.hint}</div>
                </div>
                <div className="text-[18px] font-semibold tabular tracking-[-0.015em] shrink-0">
                  {item.value}
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>

      {/* Atalhos */}
      <SectionHeader title="Atalhos" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {shortcuts.map((s) => (
          <button
            key={s.label}
            onClick={s.onClick}
            className="surface-paper p-3.5 text-left hover:bg-bg-subtle transition-colors group"
          >
            <div className="flex items-center justify-between">
              <span className="text-text-muted group-hover:text-accent-text transition-colors">
                {s.icon}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-text-subtle" strokeWidth={1.75} />
            </div>
            <div className="text-[13px] font-medium text-text mt-2.5">{s.label}</div>
            <div className="text-[11.5px] text-text-muted mt-0.5">{s.detail}</div>
          </button>
        ))}
      </div>
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
  value: string;
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
