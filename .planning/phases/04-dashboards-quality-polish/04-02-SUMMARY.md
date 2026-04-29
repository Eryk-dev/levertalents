---
phase: 04-dashboards-quality-polish
plan: 02
subsystem: database
tags:
  - rpc
  - migration
  - dashboard
  - search
  - hooks
  - rls
  - phase-4

# Dependency graph
requires:
  - phase: 01-tenancy-backbone
    provides: "visible_companies(actor) helper, ScopeProvider + useScopedQuery chokepoint, socio_company_memberships"
  - phase: 03-performance-refactor
    provides: "org_units + org_unit_members tables (Migration B2 forward-referenced) + teams→org_units backfill (Migration E2)"
provides:
  - "RPC public.read_payroll_total(p_company_ids uuid[]) returning aggregate-only jsonb {total_cost, headcount, avg_cost}"
  - "RPC public.global_search(q, max_per_kind, p_company_ids uuid[]) with optional scope pre-filter on candidatos/vagas/pessoas"
  - "usePayrollTotal() hook (useScopedQuery consumer) with queryKey ['scope', id, kind, 'payroll-total']"
  - "useCostBreakdown() extended with companies: CostCompanyRow[] field seeded from scope.companyIds (D-05 LOCK)"
affects:
  - "04-03-payroll-and-search-schema-push (BLOCKING — pushes both migrations to remote DB + regenerates types.ts)"
  - "04-04-socio-dashboard-refactor (consumes usePayrollTotal + useCostBreakdown.companies)"
  - "04-05-cmd-k-palette-refactor (consumes global_search com p_company_ids)"

# Tech tracking
tech-stack:
  added: []  # No new libraries — additive migrations + hook composition only
  patterns:
    - "SECURITY DEFINER + visible_companies(actor) <@ subset re-check (clim2 analog)"
    - "RPC payload aggregate-only via jsonb_build_object — never SELECT row-level cost in RETURN"
    - "DROP FUNCTION + CREATE OR REPLACE para mudança de signature (Postgres não permite via CREATE OR REPLACE direto)"
    - "P4-V03 column-name pre-flight comment dentro da migration documentando schema source-of-truth"
    - "D-05 LOCK seed pattern: companyMap seedado do fetch da tabela `companies` via .in('id', companyIds), não da iteração de teams"

key-files:
  created:
    - "supabase/migrations/20260430120000_dash1_read_payroll_total_rpc.sql"
    - "supabase/migrations/20260430120100_dash4_global_search_scope_param.sql"
    - "src/hooks/usePayrollTotal.ts"
    - "src/hooks/usePayrollTotal.test.tsx"
  modified:
    - "src/hooks/useCostBreakdown.ts"

key-decisions:
  - "(Plan 04-02) read_payroll_total returns ONLY jsonb_build_object('total_cost', 'headcount', 'avg_cost'); never expõe lista de salários individuais (D-02 LOCK)"
  - "(Plan 04-02) read_payroll_total usa SECURITY DEFINER + v_target_companies <@ visible_companies(actor) — RAISE 42501 quando p_company_ids contém empresa fora do escopo do actor"
  - "(Plan 04-02) global_search ganhou 3º param opcional p_company_ids uuid[]; SECURITY INVOKER preservado (RLS continua sendo defense-in-depth); PDI block REMOVIDO (D-06 — Plan 04-05 dropa do UI)"
  - "(Plan 04-02) useCostBreakdown.companies[] seedado via fetch direto de `companies` filtrado por scope.companyIds — empresas com zero times aparecem com totalCost=0/memberCount=0/avgCost=0 (D-05 LOCK / P4-V04 mitigation)"
  - "(Plan 04-02) Schema push do par DASH.1+DASH.4 + types.ts regen acontece em Plan 04-03 (BLOCKING); este plan APENAS cria os arquivos additivos"

patterns-established:
  - "Pattern: aggregate-only RPC payload — jsonb_build_object com chaves explícitas, nunca SELECT row.* em RETURN clauses"
  - "Pattern: D-05 LOCK seed — coleção que precisa enumerar 'todas as Xs do escopo' deve ser populada do fetch da tabela canônica filtrado por scope.companyIds, NÃO da iteração de tabelas filhas (que pode estar incompleta)"
  - "Pattern: P4-V03 column-name pre-flight — quando uma RPC nova faz JOIN cross-tabela, comentar no header da migration os nomes de coluna verificados contra a migration source-of-truth"
  - "Pattern: TDD para hook novo + extensão aditiva do useScopedQuery consumer existente (P4-V12 audit antes da edição)"

requirements-completed:
  - DASH-01
  - DASH-02
  - DASH-03
  - DASH-04

# Metrics
duration: 5min
completed: 2026-04-29
---

# Phase 4 Plan 02: Payroll RPC + Search Extension Summary

**Server-side RPC `read_payroll_total` (SECURITY DEFINER + RLS subset re-check, aggregate-only payload) + extension de `global_search` com scope pre-filter + `usePayrollTotal` hook (TDD 4 tests) + `useCostBreakdown` agora retorna breakdown por empresa seedado de scope.companyIds (D-05 LOCK).**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-29T00:50:32Z
- **Completed:** 2026-04-29T00:55:37Z
- **Tasks:** 2 (4 commits — Task 2 seguiu RED→GREEN)
- **Files created:** 4 (2 migrations + 1 hook + 1 test)
- **Files modified:** 1 (useCostBreakdown.ts)

## Accomplishments

- **Migration DASH.1** (`20260430120000_dash1_read_payroll_total_rpc.sql`) — RPC server-side que agrega folha total por escopo. SECURITY DEFINER com re-check `v_target_companies <@ public.visible_companies(actor)` — sócio sem membership na empresa A é bloqueado com `42501` quando tenta `read_payroll_total(array['companyA-uuid'])`. Payload é exclusivamente `jsonb_build_object('total_cost', SUM(tm.cost), 'headcount', COUNT(DISTINCT tm.user_id), 'avg_cost', total/headcount)` — NUNCA expõe salário individual (D-02 LOCK / T-04-02-03 mitigado).
- **Migration DASH.4** (`20260430120100_dash4_global_search_scope_param.sql`) — DROP+CREATE da função `global_search` com 3º parâmetro opcional `p_company_ids uuid[]` que pre-filtra candidatos (via `applications JOIN job_openings.company_id`), vagas (direto por `j.company_id`) e pessoas (via `org_unit_members JOIN org_units.company_id`). PDI block removido (D-06 — Plan 04-05 dropa do UI). SECURITY INVOKER preservado — RLS continua sendo a fronteira de segurança; o pre-filter é apenas otimização + consistência com o escopo do header.
- **`usePayrollTotal` hook** — useScopedQuery consumer chamando `supabase.rpc('read_payroll_total', { p_company_ids: companyIds })`. queryKey shape: `['scope', scope.id, scope.kind, 'payroll-total']`. Falls back para `{total_cost: 0, headcount: 0, avg_cost: null}` quando RPC retorna null. 4 testes vitest cobrindo: (a) shape de queryKey, (b) passagem de companyIds para o RPC, (c) short-circuit quando scope é null, (d) propagação do erro 42501 para `result.current.isError`.
- **`useCostBreakdown` extension** — agora retorna `{ totalCost, totalMembers, teams, companies }`. O array `companies` é seedado a partir de fetch direto de `supabase.from('companies').select('id, name').in('id', companyIds)` ANTES da iteração de `team_members` — empresas com zero times aparecem com `totalCost=0, memberCount=0, avgCost=0` (D-05 LOCK satisfeito; T-04-02-06 mitigado). Iteração de members só ACUMULA em entries já seedadas; nunca cria novas.

## Task Commits

1. **Task 1: Migrations DASH.1 + DASH.4** — `5e4b918` (feat)
2. **Task 2 RED: failing tests for usePayrollTotal** — `00033b8` (test) — falha porque o hook ainda não existe
3. **Task 2 GREEN: usePayrollTotal hook** — `d830469` (feat) — 4/4 tests pass
4. **Task 2 ext: useCostBreakdown companies field** — `474c6c8` (feat)

_TDD gate compliance: Plan tinha um único `tdd="true"` task (Task 2). Sequência observada no git log: `test(...)` → `feat(...)` → `feat(...)` (extensão do hook irmão). Sem REFACTOR commit por não ter sido necessário._

## Files Created/Modified

- `supabase/migrations/20260430120000_dash1_read_payroll_total_rpc.sql` — RPC payroll aggregate (DASH-01/02/03)
- `supabase/migrations/20260430120100_dash4_global_search_scope_param.sql` — global_search com scope param (DASH-04)
- `src/hooks/usePayrollTotal.ts` — hook scoped + RPC consumer
- `src/hooks/usePayrollTotal.test.tsx` — 4 vitest tests (queryKey shape, RPC arg, null-scope, error)
- `src/hooks/useCostBreakdown.ts` — adicionado type `CostCompanyRow` + campo `companies` no return; companyMap seedado de `companies` table

## P4-V03 Pre-flight Comment

Quoted from `supabase/migrations/20260430120100_dash4_global_search_scope_param.sql` (linhas 10-14):

```
-- P4-V03 column-name pre-flight (verified 2026-04-28 against migration
-- 20260427120100_b2_org_units_and_helpers.sql + 20260429120100_e2_teams_to_org_units_backfill.sql):
--   public.org_units(id, company_id) — confirmed
--   public.org_unit_members(org_unit_id, user_id) — confirmed
-- If a future migration renames these columns, this RPC must be updated alongside.
```

Verificação executada: `grep -nE "CREATE TABLE.*org_units\\b|CREATE TABLE.*org_unit_members\\b|user_id\\s+uuid|org_unit_id\\s+uuid|company_id\\s+uuid" supabase/migrations/20260427120100_b2_org_units_and_helpers.sql` retornou matches confirmando exatamente os nomes assumidos.

## P4-V04 Confirmation (D-05 LOCK)

`useCostBreakdown.ts` linha 63-66:

```typescript
const { data: companiesData, error: companiesError } = await supabase
  .from('companies')
  .select('id, name')
  .in('id', companyIds);
```

E linhas 76-85 (seed sempre executa, independente de teams):

```typescript
for (const c of companiesData ?? []) {
  // Sempre seed — mesmo que zero times referenciem essa empresa,
  // ela precisa aparecer no breakdown (D-05 LOCK).
  companyMap.set(c.id, {
    id: c.id,
    name: c.name,
    totalCost: 0,
    userIds: new Set<string>(),
  });
}
```

E linhas 151-159 (acumulação só em entries já seedadas):

```typescript
// Acumula no companyMap APENAS quando a empresa já foi seedada
// (não cria novas entradas — empresas vazias já estão lá com zeros).
const team = teamMap.get(m.team_id);
const cId = team?.companyId ?? null;
if (cId && companyMap.has(cId)) {
  const cEntry = companyMap.get(cId)!;
  cEntry.totalCost += safeCost;
  cEntry.userIds.add(m.user_id);
}
```

**Sample case — zero-team empresa:** suponha grupo com `companyIds = ['cA', 'cB', 'cC']` onde apenas `cA` tem times com members. O loop em linha 76-85 seeda 3 entries em `companyMap` (cA, cB, cC) com totalCost=0/memberCount=0. A iteração de members em linha 139-160 só toca `cA`. Resultado final: `companies` array tem 3 rows ordenados por totalCost desc — `cA` no topo (com valores reais), `cB` e `cC` ao final (todos zerados). Os zerados ainda aparecem no UI (P4-V04 satisfeito).

## P4-V12 Consumer Audit Result

`grep -rln "useCostBreakdown" src/ | grep -v "src/hooks/useCostBreakdown.ts"`:

```
src/pages/SocioDashboard.tsx
```

Exatamente 1 consumer real (excluindo a definição do próprio hook). Mudança da Task 2 é puramente aditiva — `cost.teams`, `cost.totalCost`, `cost.totalMembers` (campos consumidos hoje em SocioDashboard linhas 80, 107, 138, 148, 205, 212, 219) permanecem; `cost.companies` é novo e só será consumido em Plan 04-04.

## Confirmation: Zero Row-Level Cost Exposure in DASH.1

`grep -nE "RETURN.*tm\\.cost|RETURN QUERY.*cost\\b|jsonb_build_object.*tm\\.cost" supabase/migrations/20260430120000_dash1_read_payroll_total_rpc.sql` retorna 0 linhas. A única referência a `tm.cost` está em `SUM(tm.cost)` (agregação em variável local `v_total`) — payload final usa `jsonb_build_object('total_cost', v_total, ...)` com a variável agregada. T-04-02-03 (salary row exposure) mitigado.

## Decisions Made

- **D-02 LOCK enforcement:** payload é `jsonb_build_object` com 3 chaves fixas (total_cost, headcount, avg_cost); avg_cost é `NULL` quando headcount=0 (evita divisão por zero, sinaliza "sem dados"). Decisão: NULL > 0 porque 0 mascararia "empresa sem colaboradores" como "média zero".
- **PDI removido do global_search** (em vez de deixar com pre-filter):  Plan 04-05 dropa do UI (D-06), então mantê-lo no RPC seria dead code. Removido na mesma migration que adiciona p_company_ids — mais limpo do que dois passos. Reversibilidade: revert do migration restaura PDI block + signature antiga.
- **Seed de companies via tabela canônica (não via teams):** decisão baseada na P4-V04 e D-05 LOCK. Iteração via teams falharia o invariante "toda empresa do escopo aparece" sempre que uma empresa tivesse zero times — caso comum em empresas-cliente externas recém-cadastradas no R&S.

## Deviations from Plan

None - plan executed exactly as written. Os 5 ajustes nas migrations para satisfazer regex strict do plan (`grep -c 'SECURITY DEFINER' returns 1` etc) foram cosméticos no texto do COMMENT — nenhuma mudança de lógica/comportamento.

## Issues Encountered

- Plan original sugeria `c.nome` como nome da coluna em `companies` table no snippet de useCostBreakdown. Verificação contra `src/integrations/supabase/types.ts` linha 626 mostrou que a coluna é `name` (não `nome`). Implementação usa `name`. Sem deviation registrada — é apenas correção do exemplo do plan vs schema real.

## User Setup Required

None — no external service configuration required. Schema push do par de migrations acontece em **Plan 04-03 (BLOCKING)** via `supabase db push --linked --include-all`, e regenera `src/integrations/supabase/types.ts` para que `usePayrollTotal` ganhe tipos dos args/returns sem o cast `as never`.

## Next Phase Readiness

- **Plan 04-03 (BLOCKING)** está pronto para executar: as duas migrations existem em `supabase/migrations/` com timestamps consistentes (12:00:00 e 12:01:00 do dia 2026-04-30), payload do payroll é puro additive (CREATE FUNCTION) e a global_search faz DROP+CREATE — Plan 04-03 deve fazer push em ordem de timestamp para que o DROP da assinatura antiga ocorra antes do CREATE com 3 args.
- **Plan 04-04 (SocioDashboard refactor)** pode consumir `usePayrollTotal()` e `useCostBreakdown().companies` imediatamente após Plan 04-03 (porque depende do schema real existir + types.ts regenerado para tipos do RPC).
- **Plan 04-05 (Cmd+K refactor)** pode consumir o `global_search(q, max, p_company_ids)` após Plan 04-03 — refactor do CmdKPalette já tem o backing RPC pronto.

## Self-Check: PASSED

Verifiquei:

- [x] `supabase/migrations/20260430120000_dash1_read_payroll_total_rpc.sql` existe (2.5KB)
- [x] `supabase/migrations/20260430120100_dash4_global_search_scope_param.sql` existe (4.2KB)
- [x] `src/hooks/usePayrollTotal.ts` existe
- [x] `src/hooks/usePayrollTotal.test.tsx` existe (4/4 tests passing)
- [x] `src/hooks/useCostBreakdown.ts` modificado (companies field + CostCompanyRow type)
- [x] Commit `5e4b918` existe (Task 1 — migrations)
- [x] Commit `00033b8` existe (Task 2 RED)
- [x] Commit `d830469` existe (Task 2 GREEN — usePayrollTotal hook)
- [x] Commit `474c6c8` existe (Task 2 — useCostBreakdown extension)
- [x] P4-V03 pre-flight comment quoted from migration
- [x] P4-V04 D-05 LOCK confirmation com sample
- [x] P4-V12 consumer audit retorna apenas SocioDashboard
- [x] Zero row-level cost expostos em DASH.1 (RETURN clauses)

---

*Phase: 04-dashboards-quality-polish*
*Completed: 2026-04-29*
