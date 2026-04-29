---
phase: 04-dashboards-quality-polish
plan: 04
type: execute
wave: 3
depends_on:
  - 03
files_modified:
  - src/pages/SocioDashboard.tsx
autonomous: true
requirements:
  - DASH-01
  - DASH-02
  - DASH-03
tags:
  - dashboard
  - ui-refactor
  - phase-4

must_haves:
  truths:
    - "Sócio loga, seleciona empresa, e vê dashboard com 3 KPIs financeiros (Folha, Pessoas ativas, Custo médio) baseados no RPC read_payroll_total + useCostBreakdown"
    - "Quando scope.kind === 'group', breakdown table mostra TODAS as empresas-membro do grupo (não top 6); título: 'Custo por empresa'. Empresas com zero teams aparecem como linhas com valor formatado de zero (D-05 LOCK + P4-V04)."
    - "Quando scope.kind === 'company', breakdown table mostra os top 6 departamentos; título: 'Custo por departamento'"
    - "Seções de clima e indicadores org foram removidas (PROJECT.md lock: 'Performance e R&S ficam em telas dedicadas')"
    - "CSV export funciona para ambas as visões (filename custo-por-empresa-{date}.csv para grupo, custo-por-departamento-{date}.csv para empresa)"
    - "KpiTile usa p-4 (16px) — corrigido do p-3.5 anterior por UI-SPEC mandate"
    - "Empty state quando headcount === 0 renderiza '—' nos KPIs e LinearEmpty no breakdown"
    - "Imports de lucide-react contêm APENAS os ícones efetivamente usados — sem dead imports (P4-V06)"
  artifacts:
    - path: src/pages/SocioDashboard.tsx
      provides: "Página refatorada que consome usePayrollTotal + useCostBreakdown (com .companies para grupo) + useScope para detectar kind"
      contains: "usePayrollTotal"
      max_lines: 350
  key_links:
    - from: "src/pages/SocioDashboard.tsx"
      to: "src/hooks/usePayrollTotal.ts"
      via: "import + render"
      pattern: "usePayrollTotal\\("
    - from: "src/pages/SocioDashboard.tsx"
      to: "src/app/providers/ScopeProvider.tsx"
      via: "useScope() hook for scope.kind detection"
      pattern: "useScope\\(\\)"
    - from: "src/pages/SocioDashboard.tsx"
      to: "useCostBreakdown.companies / useCostBreakdown.teams"
      via: "conditional render based on isGroup"
      pattern: "scope\\?\\.kind\\s*===\\s*['\\\"]group['\\\"]"
---

<objective>
Refactor `src/pages/SocioDashboard.tsx` (423 lines) into a focused financial dashboard per CONTEXT D-01..D-05 and UI-SPEC Surface 1. Wires the new `usePayrollTotal` hook (Plan 02) and the extended `useCostBreakdown.companies` field. Removes clima and org-indicators sections (PROJECT.md lock). Adapts the breakdown table conditionally based on `scope.kind`. Preserves CSV export with adaptive filename. Honors D-05 LOCK by rendering zero-cost empresas in group scope (P4-V04 downstream).

Purpose: Deliver the locked vision: a dashboard that is exclusively financial, scoped per empresa or grupo, no scope mixing.
Output: Refactored SocioDashboard.tsx ≤ 350 lines, exact UI-SPEC Surface 1 visual contract, KpiTile padding fixed, no dead icon imports.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/phases/04-dashboards-quality-polish/04-CONTEXT.md
@.planning/phases/04-dashboards-quality-polish/04-PATTERNS.md
@.planning/phases/04-dashboards-quality-polish/04-UI-SPEC.md
@CLAUDE.md
@src/pages/SocioDashboard.tsx
@src/hooks/usePayrollTotal.ts
@src/hooks/useCostBreakdown.ts
@src/hooks/useUserProfile.ts
@src/app/providers/ScopeProvider.tsx
@src/components/primitives/LinearKit.tsx

<interfaces>
<!-- Hooks consumed by this page (Plan 02 outputs) -->
import { usePayrollTotal, type PayrollTotal } from '@/hooks/usePayrollTotal';
// returns { data: PayrollTotal | undefined, isLoading, error }
// PayrollTotal = { total_cost: number; headcount: number; avg_cost: number | null }

import { useCostBreakdown, type CostTeamRow, type CostCompanyRow, type CostBreakdown } from '@/hooks/useCostBreakdown';
// returns CostBreakdown = { totalCost, totalMembers, teams: CostTeamRow[], companies: CostCompanyRow[] }
// D-05 LOCK: companies[] contains EVERY empresa in scope.companyIds (zero-team empresas appear with totalCost=0).

import { useScope } from '@/app/providers/ScopeProvider';
// scope.kind: 'company' | 'group'
// scope.id, scope.companyIds, scope.name

<!-- Primitives -->
import { Btn, Row, Card, SectionHeader, LinearEmpty, ProgressBar } from '@/components/primitives/LinearKit';
import { LoadingState } from '@/components/primitives/LoadingState';
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Refactor SocioDashboard.tsx — wire usePayrollTotal + remove clima/org + conditional breakdown</name>
  <files>src/pages/SocioDashboard.tsx, src/pages/SocioDashboard.test.tsx</files>
  <read_first>
    - src/pages/SocioDashboard.tsx (full 423 lines — current state, identify exact line ranges to delete: hero "Próxima ação" 166-199, indicadores consolidados 311-363, atalhos 367-385, KpiTile 390-423)
    - .planning/phases/04-dashboards-quality-polish/04-PATTERNS.md (section 1 — exact imports to KEEP/REMOVE, KPI render pattern, KpiTile p-3.5→p-4 fix, conditional breakdown pattern; flagged dead icons: Activity, Target, LineChart, ArrowRight, ChevronRight, Briefcase)
    - .planning/phases/04-dashboards-quality-polish/04-UI-SPEC.md (Surface 1 — single-column scroll layout, exact copy table, eyebrow "Visão executiva", greeting h1, KPI tiles grid grid-cols-2 lg:grid-cols-3)
    - src/components/primitives/LinearKit.tsx (so we know exact APIs of Btn, Card, SectionHeader, LinearEmpty, ProgressBar)
    - src/hooks/usePayrollTotal.ts (Plan 02 output — confirm hook return shape)
    - src/hooks/useCostBreakdown.ts (Plan 02 extended — confirm companies[] shape AND that companies are seeded from scope.companyIds)
  </read_first>
  <behavior>
    Test 1 (company scope): renders 3 KPI tiles ("Folha", "Pessoas ativas", "Custo médio"), section title "Custo por departamento", and N rows ≤ 6 from teams[]. CSV export filename matches `custo-por-departamento-YYYY-MM-DD.csv`.

    Test 2 (group scope, populated): renders the same 3 KPI tiles but section title is "Custo por empresa" and rows are from companies[] (no top-N cap). CSV filename is `custo-por-empresa-YYYY-MM-DD.csv`.

    Test 2b (P4-V04 — D-05 LOCK zero-cost group rendering): when scope.kind === 'group' and useCostBreakdown returns `companies: [{...zero-cost} x 3]` (all three empresas have totalCost=0, memberCount=0, avgCost=0), the breakdown renders 3 rows. Each row displays the empresa name AND a formatted zero-cost value (either "R$ 0" via formatBRL or a "—" em-dash placeholder, depending on the chosen empty-cell convention — both are acceptable as long as ALL three rows are visible). The empty-state LinearEmpty MUST NOT render in this case (rows.length > 0).

    Test 3 (empty data): when headcount === 0 AND breakdownRows is empty, KPIs show "—" and breakdown shows LinearEmpty empty state with the exact UI-SPEC copy.

    Test 4 (no clima/org sections): asserts NO "Indicadores consolidados", NO "Próxima ação", NO "Atalhos" headings exist in the DOM.
  </behavior>
  <action>
    Rewrite src/pages/SocioDashboard.tsx as a focused financial dashboard. The structure (matching UI-SPEC Surface 1):

    ```typescript
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
    import { Btn, Row, Card, SectionHeader, LinearEmpty, ProgressBar } from "@/components/primitives/LinearKit";

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

      const isGroup = scope?.kind === 'group';
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
        return (cost?.teams ?? []).slice(0, 6).map((t) => ({
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
        const filename = isGroup ? `custo-por-empresa-${date}.csv` : `custo-por-departamento-${date}.csv`;
        const rows = breakdownRows.map((r) => ({
          [isGroup ? "Empresa" : "Departamento"]: r.name,
          "Pessoas": r.headcount,
          "Custo total": r.totalCost,
          "Custo médio": r.avgCost,
        }));
        downloadCSV(rows, filename);
      };

      // Render zero-cost cell as "—" em-dash for legibility; total cost still uses formatBRL.
      const renderCost = (value: number) =>
        value > 0 ? formatBRL(value) : <span className="text-text-subtle">—</span>;

      return (
        <div className="animate-fade-in p-5 lg:p-7 mx-auto max-w-[1400px]">
          {/* Header */}
          <div className="mb-7">
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-subtle">
              Visão executiva
            </div>
            <Row className="mt-1 items-center justify-between">
              <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-text">
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
            <p className="mt-1 text-[13px] text-text-muted">{subtitleParts.join(" · ")}</p>
          </div>

          {/* KPI Tiles — exactly 3 financial */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-7">
            <KpiTile
              label="Folha"
              value={payroll?.total_cost != null ? formatBRL(payroll.total_cost) : "—"}
              detail="mês corrente"
              icon={<DollarSign className="w-4 h-4" strokeWidth={1.75} />}
            />
            <KpiTile
              label="Pessoas ativas"
              value={String(payroll?.headcount ?? 0)}
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
          <Card>
            <SectionHeader title={breakdownTitle} />
            {isLoadingPayroll || isLoadingCost ? (
              <LoadingState variant="spinner" />
            ) : breakdownRows.length === 0 ? (
              <LinearEmpty
                icon={<Users className="w-[18px] h-[18px]" strokeWidth={1.75} />}
                heading="Nenhum dado de folha"
                description="Adicione colaboradores com salário cadastrado para ver os indicadores."
              />
            ) : (
              <ul className="divide-y divide-border">
                {breakdownRows.map((r) => (
                  <li key={r.id} className="px-3 py-2 hover:bg-bg-subtle transition-colors">
                    <Row className="items-center gap-3">
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

    function KpiTile({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: React.ReactNode }) {
      return (
        <div className="surface-paper p-4 rounded-md border border-border bg-surface">
          <div className="flex items-center justify-between">
            <div className="text-[11px] uppercase tracking-[0.06em] text-text-subtle font-semibold">{label}</div>
            <span className="text-text-muted">{icon}</span>
          </div>
          <div className="text-[26px] font-semibold tabular tracking-[-0.02em] mt-2 leading-[1.05]">{value}</div>
          <div className="text-[11px] mt-1 text-text-muted">{detail}</div>
        </div>
      );
    }
    ```

    Now create src/pages/SocioDashboard.test.tsx covering the 5 behaviors (Tests 1, 2, 2b, 3, 4). Use the same wrapper/mock pattern from tests/scope/useScopedQuery.test.tsx and tests/hiring/useApplicationCountsByJob.test.tsx:

    ```typescript
    import { describe, it, expect, vi, beforeEach } from 'vitest';
    import { render, screen } from '@testing-library/react';
    import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
    import { MemoryRouter } from 'react-router-dom';
    import React from 'react';
    import * as scopeModule from '@/app/providers/ScopeProvider';
    import * as payrollModule from '@/hooks/usePayrollTotal';
    import * as costModule from '@/hooks/useCostBreakdown';
    import * as profileModule from '@/hooks/useUserProfile';
    import SocioDashboard from './SocioDashboard';

    function wrap(ui: React.ReactNode) {
      const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      return render(
        <QueryClientProvider client={client}>
          <MemoryRouter>{ui}</MemoryRouter>
        </QueryClientProvider>,
      );
    }

    function mockScope(kind: 'company' | 'group') {
      vi.spyOn(scopeModule, 'useScope').mockReturnValue({
        scope: { kind, id: 's1', companyIds: ['c1'], name: kind === 'group' ? 'Grupo Lever' : 'Empresa A' },
        setScope: vi.fn(),
        pendingScope: null,
        confirmPendingScope: vi.fn(),
        cancelPendingScope: vi.fn(),
        isFixed: false,
        visibleCompanies: [],
        visibleGroups: [],
        isResolving: false,
      } as never);
    }

    function mockPayroll(payload: { total_cost: number; headcount: number; avg_cost: number | null } | null) {
      vi.spyOn(payrollModule, 'usePayrollTotal').mockReturnValue({
        data: payload ?? undefined,
        isLoading: false,
        error: null,
      } as never);
    }

    function mockCost(teams: unknown[], companies: unknown[]) {
      vi.spyOn(costModule, 'useCostBreakdown').mockReturnValue({
        data: { totalCost: 0, totalMembers: 0, teams, companies },
        isLoading: false,
        error: null,
      } as never);
    }

    beforeEach(() => {
      vi.restoreAllMocks();
      vi.spyOn(profileModule, 'useUserProfile').mockReturnValue({ data: { full_name: 'Eryk Owner' } } as never);
    });

    describe('SocioDashboard (DASH-01/02/03)', () => {
      it('Test 1 — company scope: 3 KPIs + Custo por departamento + ≤6 rows', () => {
        mockScope('company');
        mockPayroll({ total_cost: 50000, headcount: 10, avg_cost: 5000 });
        mockCost(
          Array.from({ length: 8 }).map((_, i) => ({
            teamId: `t${i}`, teamName: `Time ${i}`, companyName: 'Empresa A',
            memberCount: 2, totalCost: 1000 * (i + 1), avgCost: 500,
          })),
          [],
        );

        wrap(<SocioDashboard />);
        expect(screen.getByText('Folha')).toBeInTheDocument();
        expect(screen.getByText('Pessoas ativas')).toBeInTheDocument();
        expect(screen.getByText('Custo médio')).toBeInTheDocument();
        expect(screen.getByText('Custo por departamento')).toBeInTheDocument();
        // Top 6 cap: rows 0..5 visible, 6 and 7 NOT
        expect(screen.getByText('Time 7')).toBeInTheDocument();   // sorted desc, biggest first
      });

      it('Test 2 — group scope: section title is Custo por empresa, all companies shown', () => {
        mockScope('group');
        mockPayroll({ total_cost: 250000, headcount: 50, avg_cost: 5000 });
        mockCost(
          [],
          [
            { companyId: 'c1', companyName: 'Empresa A', memberCount: 10, totalCost: 50000, avgCost: 5000 },
            { companyId: 'c2', companyName: 'Empresa B', memberCount: 20, totalCost: 100000, avgCost: 5000 },
            { companyId: 'c3', companyName: 'Empresa C', memberCount: 20, totalCost: 100000, avgCost: 5000 },
          ],
        );

        wrap(<SocioDashboard />);
        expect(screen.getByText('Custo por empresa')).toBeInTheDocument();
        expect(screen.getByText('Empresa A')).toBeInTheDocument();
        expect(screen.getByText('Empresa B')).toBeInTheDocument();
        expect(screen.getByText('Empresa C')).toBeInTheDocument();
      });

      it('Test 2b — P4-V04 D-05 LOCK: zero-cost group empresas still render', () => {
        mockScope('group');
        // Headcount/folha total NOT zero (group has data overall), but every per-company row is zero
        // (e.g., teams not yet seeded but empresas exist in scope.companyIds).
        mockPayroll({ total_cost: 0, headcount: 0, avg_cost: null });
        mockCost(
          [],
          [
            { companyId: 'c1', companyName: 'Empresa A', memberCount: 0, totalCost: 0, avgCost: 0 },
            { companyId: 'c2', companyName: 'Empresa B', memberCount: 0, totalCost: 0, avgCost: 0 },
            { companyId: 'c3', companyName: 'Empresa C', memberCount: 0, totalCost: 0, avgCost: 0 },
          ],
        );

        wrap(<SocioDashboard />);
        // All 3 empresa rows render — D-05 LOCK
        expect(screen.getByText('Empresa A')).toBeInTheDocument();
        expect(screen.getByText('Empresa B')).toBeInTheDocument();
        expect(screen.getByText('Empresa C')).toBeInTheDocument();
        // Empty-state must NOT render (rows.length > 0 means breakdown is populated)
        expect(screen.queryByText(/Nenhum dado de folha/)).not.toBeInTheDocument();
        // Headcount cell uses singular/plural rule for 0 -> "0 pessoas"
        expect(screen.getAllByText(/0 pessoas/).length).toBeGreaterThanOrEqual(3);
      });

      it('Test 3 — empty data: KPIs show — and breakdown shows empty state', () => {
        mockScope('company');
        mockPayroll({ total_cost: 0, headcount: 0, avg_cost: null });
        mockCost([], []);

        wrap(<SocioDashboard />);
        expect(screen.getByText(/Nenhum dado de folha/)).toBeInTheDocument();
        expect(
          screen.getByText('Adicione colaboradores com salário cadastrado para ver os indicadores.'),
        ).toBeInTheDocument();
      });

      it('Test 4 — no clima/org sections rendered (PROJECT lock)', () => {
        mockScope('company');
        mockPayroll({ total_cost: 1, headcount: 1, avg_cost: 1 });
        mockCost([], []);
        wrap(<SocioDashboard />);
        expect(screen.queryByText(/Indicadores consolidados/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Próxima ação/)).not.toBeInTheDocument();
        expect(screen.queryByText(/^Atalhos$/)).not.toBeInTheDocument();
      });
    });
    ```
  </action>
  <verify>
    <automated>npm test -- src/pages/SocioDashboard.test.tsx 2>&1 | tail -30</automated>
  </verify>
  <acceptance_criteria>
    - File src/pages/SocioDashboard.tsx is ≤ 350 lines (`wc -l < src/pages/SocioDashboard.tsx`)
    - `grep -c "useClimateOverview\|useOrgIndicators" src/pages/SocioDashboard.tsx` returns 0 (clima/org hooks removed)
    - `grep -c "Indicadores consolidados\|Próxima ação\|alertsCount" src/pages/SocioDashboard.tsx` returns 0 (UI sections removed)
    - `grep -c "usePayrollTotal" src/pages/SocioDashboard.tsx` returns at least 2 (import + usage)
    - `grep -c "useScope" src/pages/SocioDashboard.tsx` returns at least 2 (import + usage)
    - `grep -c "scope?.kind === 'group'\|scope\\.kind === 'group'" src/pages/SocioDashboard.tsx` returns at least 1 (conditional logic)
    - `grep -c "p-4" src/pages/SocioDashboard.tsx` returns at least 1 (KpiTile padding fixed)
    - `grep -c "p-3.5" src/pages/SocioDashboard.tsx` returns 0 (old padding removed)
    - `grep -c "Custo por empresa\|Custo por departamento" src/pages/SocioDashboard.tsx` returns at least 2
    - `grep -c "custo-por-empresa-\|custo-por-departamento-" src/pages/SocioDashboard.tsx` returns at least 2 (CSV filenames)
    - **P4-V06 — dead icon imports removed:** `grep -cE 'import.*\\b(Activity|Target|LineChart|ArrowRight|ChevronRight|Briefcase)\\b.*lucide-react' src/pages/SocioDashboard.tsx` returns 0
    - **P4-V04 — Test 2b passes:** all 3 zero-cost empresas render and the empty state does NOT render in group scope when companies[] has 3 zero rows
    - `npm test -- src/pages/SocioDashboard.test.tsx 2>&1 | grep -E "Tests" | head -1` shows 5 passed and 0 failed
  </acceptance_criteria>
  <done>SocioDashboard refactored to ≤ 350 lines, 3 financial KPIs, conditional breakdown (with D-05 LOCK zero-cost empresas rendering), no clima/org, KpiTile p-4, no dead lucide imports, 5 tests passing.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| client UI → useScopedQuery hooks | UI must not bypass the chokepoint (already guarded by ESLint rule) |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-04-04-01 | Information Disclosure | dashboard renders cross-tenant data | mitigate | All data hooks (usePayrollTotal, useCostBreakdown) use useScopedQuery; queryKey includes scope.id; switching scope produces a new key. RLS on RPC enforces server-side. |
| T-04-04-02 | Information Disclosure | salary visible per individual | mitigate | usePayrollTotal returns aggregate-only payload (Plan 02 RPC contract); useCostBreakdown aggregates server-side via team_members.cost SUM (no individual cost exposure in UI). |
| T-04-04-03 | Information Disclosure | clima/org sections leaking secondary data | mitigate | Sections deleted entirely (PROJECT.md lock). Test 4 asserts absence. |
| T-04-04-04 | Tampering | CSV export of cross-tenant rows | accept | Export uses the same scoped data already filtered by the hooks; filename is a string, not a security boundary |
| T-04-04-05 | Repudiation | empresa silently omitida (D-05 violation) | mitigate | Test 2b asserts that 3 zero-cost empresas all render; companies[] is seeded upstream from scope.companyIds (Plan 02). |
</threat_model>

<verification>
- npm test -- src/pages/SocioDashboard.test.tsx — 5 tests pass (incl. Test 2b for D-05 LOCK)
- npm run lint — no new errors in SocioDashboard.tsx
- npm run build — passes
- File size ≤ 350 lines
- Zero dead lucide-react icons (P4-V06)
</verification>

<success_criteria>
- SocioDashboard renders 3 financial KPIs only
- Breakdown adapts to scope.kind (companies for group, teams for company)
- Group breakdown renders ALL empresas in scope.companyIds — including zero-cost ones (D-05 LOCK; P4-V04)
- CSV filename adapts
- No clima/org sections
- KpiTile p-4 padding (UI-SPEC fix)
- No dead lucide imports (P4-V06)
- 5 component tests passing
</success_criteria>

<output>
After completion, create `.planning/phases/04-dashboards-quality-polish/04-04-SUMMARY.md` documenting:
- File line count before/after
- Test results (5 passed)
- Confirmation greps for removed sections
- Confirmation grep for absent dead icon imports (P4-V06)
- Snapshot of Test 2b output proving D-05 LOCK zero-cost rendering (P4-V04 downstream)
- Any deviation from the planned action
</output>
</output>
