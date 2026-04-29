// P4-V06 — import only the icons actually rendered below.
// Acceptable set: Users, DollarSign, TrendingUp, Download.
// Forbidden (flagged dead by PATTERNS.md): Activity, Target, LineChart, ArrowRight, ChevronRight, Briefcase.
import { Users, DollarSign, TrendingUp, Download } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useMemo } from "react";
import { handleSupabaseError } from "@/lib/supabaseError";
import { LoadingState } from "@/components/primitives/LoadingState";
import { useCostBreakdown } from "@/hooks/useCostBreakdown";
import { usePayrollTotal } from "@/hooks/usePayrollTotal";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useScope } from "@/app/providers/ScopeProvider";
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
  const { scope } = useScope();
  const { data: profile } = useUserProfile();
  const { data: payroll, isLoading: isLoadingPayroll, error: payrollError } = usePayrollTotal();
  const { data: cost, isLoading: isLoadingCost, error: costError } = useCostBreakdown();

  useEffect(() => {
    if (payrollError) handleSupabaseError(payrollError, "Falha ao carregar folha");
  }, [payrollError]);
  useEffect(() => {
    if (costError) handleSupabaseError(costError, "Falha ao carregar custos");
  }, [costError]);

  const firstName = (profile?.full_name || "").split(" ")[0] || "Sócio";
  const hour = new Date().getHours();
  const greeting = hour < 6 ? "Boa madrugada" : hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  const isGroup = scope?.kind === "group";
  const breakdownTitle = isGroup ? "Custo por empresa" : "Custo por departamento";
  const breakdownDetailLabel = isGroup ? "empresas" : "departamentos";

  // D-05 LOCK (P4-V04): in group scope, do NOT filter out zero-cost empresas.
  // useCostBreakdown.companies is already seeded from scope.companyIds (every empresa appears).
  const breakdownRows = useMemo(() => {
    if (isGroup) {
      return (cost?.companies ?? []).map((c) => ({
        id: c.companyId,
        name: c.companyName,
        sub: null as string | null,
        headcount: c.memberCount,
        totalCost: c.totalCost,
        avgCost: c.avgCost,
      }));
    }
    return [...(cost?.teams ?? [])]
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 6)
      .map((t) => ({
        id: t.teamId,
        name: t.teamName,
        sub: t.companyName,
        headcount: t.memberCount,
        totalCost: t.totalCost,
        avgCost: t.avgCost,
      }));
  }, [isGroup, cost?.companies, cost?.teams]);

  const maxRowCost = Math.max(0, ...breakdownRows.map((r) => r.totalCost));

  const headcountDetail = isGroup
    ? `${cost?.companies?.length ?? 0} ${breakdownDetailLabel}`
    : `${cost?.teams?.length ?? 0} ${breakdownDetailLabel}`;

  const subtitleParts = [
    payroll?.total_cost != null ? `Folha de ${formatBRL(payroll.total_cost)}` : null,
    payroll?.headcount != null ? `${payroll.headcount} pessoas` : null,
    `${(isGroup ? cost?.companies?.length : cost?.teams?.length) ?? 0} ${breakdownDetailLabel}`,
  ].filter(Boolean);

  const handleExport = () => {
    const date = new Date().toISOString().slice(0, 10);
    const filename = isGroup
      ? `custo-por-empresa-${date}.csv`
      : `custo-por-departamento-${date}.csv`;
    const rows = breakdownRows.map((r) => ({
      [isGroup ? "Empresa" : "Departamento"]: r.name,
      Pessoas: r.headcount,
      "Custo total": r.totalCost,
      "Custo médio": r.avgCost,
    }));
    downloadCSV(rows, filename);
  };

  // Render zero-cost cell as "—" em-dash for legibility; non-zero uses formatBRL.
  const renderCost = (value: number) =>
    value > 0 ? formatBRL(value) : <span className="text-text-subtle">—</span>;

  return (
    <div className="animate-fade-in p-5 lg:p-7 mx-auto max-w-[1400px] font-sans text-text">
      {/* Header */}
      <div className="mb-7">
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-subtle">
          Visão executiva
        </div>
        <Row className="mt-1" justify="between">
          <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-text m-0">
            {greeting}, {firstName}
          </h1>
          <Btn
            variant="secondary"
            size="sm"
            icon={<Download className="w-3.5 h-3.5" strokeWidth={1.75} />}
            onClick={handleExport}
          >
            Relatório
          </Btn>
        </Row>
        <p className="mt-1 text-[13px] text-text-muted m-0">{subtitleParts.join(" · ")}</p>
      </div>

      {/* KPI Tiles — exactly 3 financial */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-7">
        <KpiTile
          label="Folha"
          value={payroll?.total_cost != null && payroll.total_cost > 0 ? formatBRL(payroll.total_cost) : "—"}
          detail="mês corrente"
          icon={<DollarSign className="w-4 h-4" strokeWidth={1.75} />}
        />
        <KpiTile
          label="Pessoas ativas"
          value={
            payroll?.headcount != null && payroll.headcount > 0 ? String(payroll.headcount) : "—"
          }
          detail={headcountDetail}
          icon={<Users className="w-4 h-4" strokeWidth={1.75} />}
        />
        <KpiTile
          label="Custo médio"
          value={payroll?.avg_cost != null ? formatBRL(payroll.avg_cost) : "—"}
          detail="por pessoa / mês"
          icon={<TrendingUp className="w-4 h-4" strokeWidth={1.75} />}
        />
      </div>

      {/* Breakdown Table */}
      <Card contentClassName="p-0">
        <div className="px-3.5 pt-2.5">
          <SectionHeader title={breakdownTitle} className="mt-0" />
        </div>
        {isLoadingPayroll || isLoadingCost ? (
          <div className="p-5">
            <LoadingState variant="spinner" />
          </div>
        ) : breakdownRows.length === 0 ? (
          <div className="p-5">
            <LinearEmpty
              icon={<Users className="w-[18px] h-[18px]" strokeWidth={1.75} />}
              title="Nenhum dado de folha"
              description="Adicione colaboradores com salário cadastrado para ver os indicadores."
            />
          </div>
        ) : (
          <ul className="divide-y divide-border m-0 p-0 list-none">
            {breakdownRows.map((r) => (
              <li key={r.id} className="px-3.5 py-2.5 hover:bg-bg-subtle transition-colors">
                <Row className="gap-3" justify="between">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] text-text">{r.name}</div>
                    {r.sub ? (
                      <div className="text-[11px] text-text-subtle truncate">{r.sub}</div>
                    ) : null}
                  </div>
                  <div className="text-[11px] text-text-muted shrink-0 tabular">
                    {r.headcount} {r.headcount === 1 ? "pessoa" : "pessoas"}
                  </div>
                  <div className="w-24 hidden md:block">
                    <ProgressBar value={maxRowCost > 0 ? (r.totalCost / maxRowCost) * 100 : 0} />
                  </div>
                  <div className="text-[13px] font-semibold tabular shrink-0 w-28 text-right">
                    {renderCost(r.totalCost)}
                  </div>
                </Row>
              </li>
            ))}
          </ul>
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
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="surface-paper p-4 rounded-md border border-border bg-surface">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-[0.06em] text-text-subtle font-semibold">
          {label}
        </div>
        <span className="text-text-muted">{icon}</span>
      </div>
      <div className="text-[26px] font-semibold tabular tracking-[-0.02em] mt-2 leading-[1.05]">
        {value}
      </div>
      <div className="text-[11px] mt-1 text-text-muted">{detail}</div>
    </div>
  );
}
