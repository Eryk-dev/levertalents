---
phase: 04-dashboards-quality-polish
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - supabase/migrations/20260430120000_dash1_read_payroll_total_rpc.sql
  - supabase/migrations/20260430120100_dash4_global_search_scope_param.sql
  - src/hooks/usePayrollTotal.ts
  - src/hooks/useCostBreakdown.ts
autonomous: true
requirements:
  - DASH-01
  - DASH-02
  - DASH-03
  - DASH-04
tags:
  - rpc
  - migration
  - dashboard
  - search
  - phase-4

must_haves:
  truths:
    - "RPC read_payroll_total exists and returns ONLY {total_cost, headcount, avg_cost} aggregates — never row-level salary data"
    - "RPC re-applies RLS via visible_companies(actor): if requested company_ids contain any company outside the actor's visible set, raises 42501"
    - "RPC global_search accepts an optional p_company_ids uuid[] param and pre-filters candidatos/vagas/pessoas/pdis by that scope when provided"
    - "global_search SQL is written ONLY after the executor confirms (via inline migration comment) that org_unit_members.user_id and org_units.company_id exist with those exact column names (P4-V03)"
    - "usePayrollTotal hook is a useScopedQuery consumer (queryKey starts with ['scope', scope.id, scope.kind, ...])"
    - "useCostBreakdown returns an extra `companies` field. For group scope: ALL empresas in scope.companyIds appear, even those with zero teams or zero headcount (D-05 LOCK — P4-V04)"
    - "Generated supabase types.ts is regenerated AFTER schema push so read_payroll_total signature is type-safe"
    - "useCostBreakdown has exactly ONE consumer in src/ (SocioDashboard) — additive shape change does not silently break other readers (P4-V12)"
  artifacts:
    - path: supabase/migrations/20260430120000_dash1_read_payroll_total_rpc.sql
      provides: "CREATE OR REPLACE FUNCTION public.read_payroll_total(p_company_ids uuid[]) RETURNS jsonb — STABLE SECURITY DEFINER SET search_path = public; aggregate over team_members.cost"
      contains: "CREATE OR REPLACE FUNCTION public.read_payroll_total"
    - path: supabase/migrations/20260430120100_dash4_global_search_scope_param.sql
      provides: "DROP FUNCTION + CREATE OR REPLACE FUNCTION public.global_search(q text, max_per_kind int, p_company_ids uuid[]) — adds optional scope filter, keeps SECURITY INVOKER. Migration body documents the org_units/org_unit_members column-name pre-flight check."
      contains: "p_company_ids uuid[]"
    - path: src/hooks/usePayrollTotal.ts
      provides: "useScopedQuery hook calling supabase.rpc('read_payroll_total', { p_company_ids: companyIds })"
      contains: "useScopedQuery"
    - path: src/hooks/useCostBreakdown.ts
      provides: "Returns { totalCost, totalMembers, teams, companies }. companies is seeded from scope.companyIds (every empresa appears, even empty)."
      contains: "companies:"
  key_links:
    - from: "supabase/migrations/20260430120000_dash1_read_payroll_total_rpc.sql"
      to: "public.visible_companies(actor uuid)"
      via: "RLS re-check using subset operator <@"
      pattern: "visible_companies\\("
    - from: "src/hooks/usePayrollTotal.ts"
      to: "supabase.rpc('read_payroll_total', ...)"
      via: "scoped fetcher"
      pattern: "supabase\\.rpc\\(['\\\"]read_payroll_total"
    - from: "src/hooks/useCostBreakdown.ts"
      to: "scope.kind detection"
      via: "useScope hook"
      pattern: "useScope|scope\\.kind"
---

<objective>
Create the data layer for Phase 4: a server-side payroll aggregation RPC (DASH-01/02/03) and an extension to global_search (DASH-04) so the Cmd+K palette can pre-filter by scope before RLS. Also add a `companies` breakdown column to useCostBreakdown so SocioDashboard can render the group-scope view (D-05). Schema push happens in Plan 03; consumer wiring happens in Plans 04 and 05.

Purpose: Move the salary aggregation server-side (never expose row-level salary data), and add scope-aware search filtering before the per-row RLS gate fires. Honor D-05 LOCK exactly: every empresa in the group scope appears in the breakdown — no silent drops for empty teams.
Output: Two additive migrations + new hook + extended hook + regenerated types.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/04-dashboards-quality-polish/04-CONTEXT.md
@.planning/phases/04-dashboards-quality-polish/04-PATTERNS.md
@CLAUDE.md
@supabase/migrations/20260429140100_clim2_aggregate_rpc.sql
@supabase/migrations/20260422190000_global_search_rpc.sql
@supabase/migrations/20260427120100_b2_org_units_and_helpers.sql
@supabase/migrations/20260429120100_e2_teams_to_org_units_backfill.sql
@src/shared/data/useScopedQuery.ts
@src/hooks/useCostBreakdown.ts

<interfaces>
<!-- Existing helper from Phase 1 — DO NOT redefine -->
public.visible_companies(actor uuid) RETURNS uuid[] -- STABLE SECURITY DEFINER SET search_path=public

<!-- Source data tables for payroll aggregation -->
public.team_members (user_id uuid, team_id uuid, cost numeric)
public.teams (id uuid, name text, company_id uuid)

<!-- Source-of-truth schema for org_units/org_unit_members (P4-V03) -->
-- From supabase/migrations/20260427120100_b2_org_units_and_helpers.sql:
-- public.org_units (id uuid PRIMARY KEY, company_id uuid NOT NULL, parent_id uuid, ...)
-- public.org_unit_members (org_unit_id uuid NOT NULL, user_id uuid NOT NULL, is_primary bool, ...)
-- The Phase 3 backfill (20260429120100_e2_teams_to_org_units_backfill.sql) populated both.

<!-- Existing scoped chokepoint -->
src/shared/data/useScopedQuery.ts:
export function useScopedQuery<TData, TError>(
  key: QueryKey,
  fn: (companyIds: string[]) => Promise<TData>,
  options?: ...
);

<!-- Existing global_search signature (will be replaced) -->
public.global_search(q text, max_per_kind int DEFAULT 5)
RETURNS TABLE (kind text, id uuid, title text, subtitle text, url text)
LANGUAGE plpgsql SECURITY INVOKER STABLE SET search_path = public;

<!-- D-05 LOCK from CONTEXT.md -->
-- "Lógica de 'top 6' não se aplica ao grupo — todas as empresas do grupo aparecem."
-- Even with zero teams / zero headcount, an empresa in scope.companyIds MUST appear in the breakdown.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Migration DASH.1 — read_payroll_total RPC + Migration DASH.4 — global_search scope param</name>
  <files>supabase/migrations/20260430120000_dash1_read_payroll_total_rpc.sql, supabase/migrations/20260430120100_dash4_global_search_scope_param.sql</files>
  <read_first>
    - supabase/migrations/20260429140100_clim2_aggregate_rpc.sql (lines 1-78 — exact pattern to clone for read_payroll_total: SECURITY DEFINER + visible_companies re-check + jsonb_build_object aggregate-only payload)
    - supabase/migrations/20260422190000_global_search_rpc.sql (full file — current global_search to extend)
    - **P4-V03 — schema source of truth for column names (MANDATORY before writing the global_search SQL):**
      - supabase/migrations/20260427120100_b2_org_units_and_helpers.sql (CREATE TABLE for `org_units` and `org_unit_members` — the canonical column names: `org_unit_members.user_id`, `org_unit_members.org_unit_id`, `org_units.id`, `org_units.company_id`)
      - The latest Phase 3 backfill migration found via: `ls supabase/migrations/ | grep -iE 'backfill|teams.*org_units|e2_'` (currently `20260429120100_e2_teams_to_org_units_backfill.sql`). Read this to confirm the backfill produced rows with the expected column names.
    - .planning/phases/04-dashboards-quality-polish/04-PATTERNS.md (section 3 "RPC: read_payroll_total_with_log" lines 195-276 — verbatim DDL header + auth/scope re-apply pattern)
    - .planning/phases/04-dashboards-quality-polish/04-CONTEXT.md (D-02: payload returns only the total — never lista de salários individuais)
  </read_first>
  <action>
    1) Create supabase/migrations/20260430120000_dash1_read_payroll_total_rpc.sql:

    ```sql
    -- =========================================================================
    -- Migration DASH.1: RPC read_payroll_total — server-side payroll aggregate
    --
    -- Threats: T-04-02-01 (sócio sem membership lê folha de empresa não-vinculada)
    --          mitigado por v_target_companies <@ v_visible_companies (re-aplica RLS)
    -- REQs: DASH-01, DASH-02, DASH-03
    -- Reversibility: DROP FUNCTION (trivial — additive only)
    -- DEPENDENCIES: visible_companies() helper (Phase 1, Migration C)
    -- =========================================================================

    CREATE OR REPLACE FUNCTION public.read_payroll_total(
      p_company_ids uuid[] DEFAULT NULL  -- NULL = derive from visible_companies; array = scope.companyIds passthrough
    )
    RETURNS jsonb
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
    DECLARE
      v_actor             uuid := (SELECT auth.uid());
      v_visible_companies uuid[];
      v_target_companies  uuid[];
      v_total             numeric;
      v_headcount         int;
      v_avg               numeric(12,2);
    BEGIN
      IF v_actor IS NULL THEN
        RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
      END IF;

      v_visible_companies := public.visible_companies(v_actor);

      -- Re-apply RLS: every requested company MUST be in visible_companies.
      -- DASH-01 success criterion: sócio sem membership na empresa: RLS bloqueia o call.
      v_target_companies := COALESCE(p_company_ids, v_visible_companies);
      IF NOT (v_target_companies <@ v_visible_companies) THEN
        RAISE EXCEPTION 'Sem permissão para uma ou mais empresas' USING ERRCODE = '42501';
      END IF;

      -- Aggregate-only payload — NEVER expose individual salaries (D-02 LOCK).
      SELECT
        COALESCE(SUM(tm.cost), 0)::numeric,
        COUNT(DISTINCT tm.user_id)::int
      INTO v_total, v_headcount
      FROM public.team_members tm
      JOIN public.teams t ON t.id = tm.team_id
      WHERE t.company_id = ANY(v_target_companies);

      v_avg := CASE WHEN v_headcount > 0 THEN (v_total / v_headcount)::numeric(12,2) ELSE NULL END;

      RETURN jsonb_build_object(
        'total_cost', v_total,
        'headcount', v_headcount,
        'avg_cost', v_avg
      );
    END $$;

    REVOKE ALL ON FUNCTION public.read_payroll_total(uuid[]) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.read_payroll_total(uuid[]) TO authenticated;
    ```

    2) **P4-V03 PRE-FLIGHT CHECK (do this BEFORE writing global_search SQL):**

    Confirm the canonical column names by re-reading the schema source of truth:

    ```bash
    grep -nE "CREATE TABLE.*org_units\b|CREATE TABLE.*org_unit_members\b" supabase/migrations/20260427120100_b2_org_units_and_helpers.sql
    grep -nE "user_id\s+uuid|org_unit_id\s+uuid|company_id\s+uuid" supabase/migrations/20260427120100_b2_org_units_and_helpers.sql
    ```

    Expected (from Phase 1 Migration B2):
    - `public.org_units.id uuid PRIMARY KEY`
    - `public.org_units.company_id uuid NOT NULL`
    - `public.org_unit_members.org_unit_id uuid NOT NULL REFERENCES public.org_units(id)`
    - `public.org_unit_members.user_id uuid NOT NULL`

    If any column name DIFFERS from the assumption above, the executor MUST adapt the global_search SQL to match the actual schema before committing the file. The migration body MUST contain a comment that documents this confirmation, e.g.:

    ```sql
    -- P4-V03 column-name pre-flight (verified 2026-04-28 against migration b2_org_units_and_helpers):
    --   public.org_units(id, company_id) — confirmed
    --   public.org_unit_members(org_unit_id, user_id) — confirmed
    -- If a future migration renames these columns, this RPC must be updated alongside.
    ```

    3) Create supabase/migrations/20260430120100_dash4_global_search_scope_param.sql:

    Note: PostgreSQL does not allow changing function signatures via CREATE OR REPLACE if the parameter list differs. We must DROP first, then CREATE.

    ```sql
    -- =========================================================================
    -- Migration DASH.4: extend global_search with optional scope filter
    --
    -- Threats: T-04-02-02 (Cmd+K scope leakage — candidatos de empresas fora do escopo)
    --          mitigado por p_company_ids pre-filter ANTES de RLS, garantindo
    --          consistência entre o scope selecionado no header e os resultados.
    -- REQs: DASH-04
    -- Reversibility: DROP + CREATE com signature antiga (3-arg → 2-arg revert).
    --
    -- P4-V03 column-name pre-flight (verified against migration b2_org_units_and_helpers
    -- + e2_teams_to_org_units_backfill before this file was written):
    --   public.org_units(id, company_id) — confirmed
    --   public.org_unit_members(org_unit_id, user_id) — confirmed
    -- If a future migration renames these columns, this RPC must be updated alongside.
    -- =========================================================================

    DROP FUNCTION IF EXISTS public.global_search(text, int);

    CREATE OR REPLACE FUNCTION public.global_search(
      q text,
      max_per_kind int DEFAULT 5,
      p_company_ids uuid[] DEFAULT NULL  -- NULL = no scope filter (back-compat); array = restrict to those companies
    )
    RETURNS TABLE (
      kind     text,
      id       uuid,
      title    text,
      subtitle text,
      url      text
    )
    LANGUAGE plpgsql
    SECURITY INVOKER  -- RLS still applies; this is just a pre-filter for performance + scope consistency
    STABLE
    SET search_path = public
    AS $$
    DECLARE
      needle text := '%' || trim(q) || '%';
      has_scope boolean := p_company_ids IS NOT NULL AND array_length(p_company_ids, 1) > 0;
    BEGIN
      IF q IS NULL OR length(trim(q)) < 2 THEN
        RETURN;
      END IF;

      -- Candidatos (excluindo anonimizados). Scope: an applicação do candidato em uma vaga das company_ids
      -- (candidatos não têm company_id direto; vínculo é via applications.job → job.company_id).
      RETURN QUERY
      SELECT
        'candidate'::text,
        c.id,
        c.full_name,
        NULLIF(c.email::text, ''),
        '/hiring/candidates/' || c.id::text
      FROM public.candidates c
      WHERE c.anonymized_at IS NULL
        AND (
          c.full_name ILIKE needle
          OR c.email::text ILIKE needle
          OR COALESCE(c.phone, '') ILIKE needle
        )
        AND (
          NOT has_scope
          OR EXISTS (
            SELECT 1
              FROM public.applications a
              JOIN public.job_openings j ON j.id = a.job_opening_id
             WHERE a.candidate_id = c.id
               AND j.company_id = ANY(p_company_ids)
          )
        )
      ORDER BY c.updated_at DESC
      LIMIT max_per_kind;

      -- Vagas (filtradas direto por company_id quando há scope).
      RETURN QUERY
      SELECT
        'job'::text,
        j.id,
        j.title,
        NULLIF(
          CONCAT_WS(
            ' · ',
            NULLIF(j.sector, ''),
            j.status::text
          ),
          ''
        ),
        '/hiring/jobs/' || j.id::text
      FROM public.job_openings j
      WHERE
        (
          j.title ILIKE needle
          OR COALESCE(j.summary, '') ILIKE needle
          OR COALESCE(j.sector, '') ILIKE needle
        )
        AND (NOT has_scope OR j.company_id = ANY(p_company_ids))
      ORDER BY j.updated_at DESC
      LIMIT max_per_kind;

      -- Pessoas (colaboradores) — filtra por org_unit_members vinculados a uma org_unit das company_ids quando há scope.
      -- Column names verified per P4-V03 pre-flight at the top of this migration.
      RETURN QUERY
      SELECT
        'person'::text,
        pr.id,
        pr.full_name,
        NULL::text,
        '/colaborador/' || pr.id::text
      FROM public.profiles pr
      WHERE pr.full_name ILIKE needle
        AND (
          NOT has_scope
          OR EXISTS (
            SELECT 1
              FROM public.org_unit_members oum
              JOIN public.org_units ou ON ou.id = oum.org_unit_id
             WHERE oum.user_id = pr.id
               AND ou.company_id = ANY(p_company_ids)
          )
        )
      ORDER BY pr.full_name
      LIMIT max_per_kind;
    END;
    $$;

    GRANT EXECUTE ON FUNCTION public.global_search(text, int, uuid[]) TO authenticated;
    ```

    Note on PDI removal: Cmd+K refactor (Plan 05) drops the "pdi" RemoteKind from the UI per D-06. Migration leaves the PDI block out — global_search post-Plan 02 returns only candidate/job/person. This is intentional; if a future iteration re-adds PDI to Cmd+K, the migration can be amended.
  </action>
  <verify>
    <automated>find supabase/migrations -name '20260430120000*.sql' -size +500c -size -10000c | wc -l # exists and is reasonable size; deeper validation in Plan 03 schema push</automated>
  </verify>
  <acceptance_criteria>
    - File supabase/migrations/20260430120000_dash1_read_payroll_total_rpc.sql exists; `grep -c "CREATE OR REPLACE FUNCTION public.read_payroll_total" supabase/migrations/20260430120000_dash1_read_payroll_total_rpc.sql` returns 1
    - `grep -c "v_target_companies <@ v_visible_companies" supabase/migrations/20260430120000_dash1_read_payroll_total_rpc.sql` returns 1 (RLS re-check)
    - `grep -c "SECURITY DEFINER" supabase/migrations/20260430120000_dash1_read_payroll_total_rpc.sql` returns 1
    - `grep -c "GRANT EXECUTE.*read_payroll_total.*authenticated" supabase/migrations/20260430120000_dash1_read_payroll_total_rpc.sql` returns 1
    - `grep -c "tm.cost\|tm\.user_id\|teams\b\|t.company_id" supabase/migrations/20260430120000_dash1_read_payroll_total_rpc.sql` is at least 4 (joins teams + team_members)
    - File supabase/migrations/20260430120100_dash4_global_search_scope_param.sql exists; `grep -c "p_company_ids uuid\[\]" supabase/migrations/20260430120100_dash4_global_search_scope_param.sql` is at least 2
    - `grep -c "DROP FUNCTION IF EXISTS public.global_search" supabase/migrations/20260430120100_dash4_global_search_scope_param.sql` returns 1
    - `grep -c "SECURITY INVOKER" supabase/migrations/20260430120100_dash4_global_search_scope_param.sql` returns 1 (matches existing semantics — RLS still gates per-row)
    - **P4-V03 — pre-flight comment present:** `grep -cE "P4-V03 column-name pre-flight|column-name pre-flight" supabase/migrations/20260430120100_dash4_global_search_scope_param.sql` returns at least 1; AND the comment block names BOTH `org_units(id, company_id)` and `org_unit_members(org_unit_id, user_id)` — verified via `grep -E "org_units\\(id, company_id\\)|org_unit_members\\(org_unit_id, user_id\\)" supabase/migrations/20260430120100_dash4_global_search_scope_param.sql | wc -l` returns at least 2.
    - Both files end with a newline; SQL is syntactically plausible (no obvious unmatched parens via `awk -F'\\(' '{print NF}' file.sql | awk '{s+=$1-1} END {print s}'` should equal close-paren count, but skipping deep linting — Plan 03 push will fail loud)
  </acceptance_criteria>
  <done>Two additive migrations created. read_payroll_total returns aggregate-only payload with RLS re-check. global_search now accepts optional p_company_ids and pre-filters candidates/jobs/people accordingly, with explicit column-name pre-flight comment per P4-V03.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: usePayrollTotal hook (new) + extend useCostBreakdown with companies field for group scope (D-05 LOCK)</name>
  <files>src/hooks/usePayrollTotal.ts, src/hooks/usePayrollTotal.test.tsx, src/hooks/useCostBreakdown.ts</files>
  <read_first>
    - src/hooks/useCostBreakdown.ts (full 90 lines — current shape; we ADD a `companies` field, KEEP teams)
    - src/shared/data/useScopedQuery.ts (full file — chokepoint signature)
    - tests/hiring/useApplicationCountsByJob.test.tsx (existing useScopedQuery hook test pattern — copy structure for usePayrollTotal.test.tsx)
    - .planning/phases/04-dashboards-quality-polish/04-CONTEXT.md (D-02: RPC; **D-05: group scope = breakdown por empresa, todas as empresas do grupo aparecem — even with zero teams**)
    - .planning/phases/04-dashboards-quality-polish/04-PATTERNS.md (section 1 — `cost?.companies ?? []` is the consumer contract for group scope)
    - **P4-V12 — useCostBreakdown consumer audit (run BEFORE editing the hook):**
      ```bash
      grep -rln "useCostBreakdown" src/
      ```
      Expected: exactly 1 match (src/pages/SocioDashboard.tsx). If >1, surface as a blocker for operator review (other consumers may break with the additive shape change) before proceeding.
  </read_first>
  <behavior>
    For usePayrollTotal:
    - Test 1: when scope is set (company kind), useScopedQuery is called with key starting with ['scope', scope.id, scope.kind, 'payroll-total']
    - Test 2: fetcher calls supabase.rpc('read_payroll_total', { p_company_ids: companyIds }) and returns the parsed payload
    - Test 3: when RPC returns 42501 error, the hook surfaces an error (handleSupabaseError silent)
    - Test 4: hook does not invoke fetcher when scope is null (delegated to useScopedQuery; verify by checking the rpc spy is not called)

    For useCostBreakdown extension (P4-V04 — D-05 LOCK):
    - The existing teams[] array stays populated for company scope
    - **D-05 LOCK:** companies[] is SEEDED from scope.companyIds via a `companies` table fetch — every empresa in the group scope appears in the breakdown, even when teams=[] (zero-team empresas appear with totalCost=0, memberCount=0, avgCost=0). The seed comes from `companies` table, NOT from teams iteration.
    - When teams iteration finds team_members for a seeded company, it ACCUMULATES cost/headcount on the already-seeded entry (does not create new entries).
    - For company scope, companies[] still seeded from scope.companyIds (typically a single empresa); the consumer (SocioDashboard, Plan 04) decides which to render based on scope.kind.
  </behavior>
  <action>
    1) Run the P4-V12 audit BEFORE editing useCostBreakdown:

    ```bash
    grep -rln "useCostBreakdown" src/
    ```

    Acceptance: exactly 1 line of output (src/pages/SocioDashboard.tsx). If >1, STOP and surface to operator — additional consumers may need parallel updates.

    2) Create src/hooks/usePayrollTotal.ts:

    ```typescript
    import { useScopedQuery } from '@/shared/data/useScopedQuery';
    import { supabase } from '@/integrations/supabase/client';
    import { handleSupabaseError } from '@/lib/supabaseError';

    export type PayrollTotal = {
      total_cost: number;
      headcount: number;
      avg_cost: number | null;
    };

    /**
     * Aggregate payroll for the current scope. Server-side RPC enforces
     * RLS via visible_companies(actor); never returns row-level salary.
     *
     * REQs: DASH-01, DASH-02, DASH-03
     * D-02 LOCK: payload contains ONLY {total_cost, headcount, avg_cost}.
     * queryKey: ['scope', scope.id, scope.kind, 'payroll-total']
     */
    export function usePayrollTotal() {
      return useScopedQuery<PayrollTotal>(
        ['payroll-total'],
        async (companyIds) => {
          const { data, error } = await supabase.rpc(
            'read_payroll_total' as never,
            { p_company_ids: companyIds } as never,
          );
          if (error) {
            throw handleSupabaseError(error, 'Falha ao carregar folha total', { silent: true });
          }
          // RPC returns jsonb; supabase-js types it as Json
          const payload = (data ?? { total_cost: 0, headcount: 0, avg_cost: null }) as PayrollTotal;
          return payload;
        },
        { staleTime: 5 * 60 * 1000 },
      );
    }
    ```

    3) Create src/hooks/usePayrollTotal.test.tsx:

    ```typescript
    import { describe, it, expect, vi, beforeEach } from 'vitest';
    import { renderHook, waitFor } from '@testing-library/react';
    import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
    import React from 'react';
    import * as scopeModule from '@/app/providers/ScopeProvider';

    const rpcMock = vi.fn();
    vi.mock('@/integrations/supabase/client', () => ({
      supabase: { rpc: (...args: unknown[]) => rpcMock(...args) },
    }));

    import { usePayrollTotal } from './usePayrollTotal';

    function createWrapper() {
      const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
      const Wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client }, children);
      return { client, Wrapper };
    }

    function mockScope(scope: { kind: 'company' | 'group'; id: string; companyIds: string[]; name: string } | null, isResolving = false) {
      vi.spyOn(scopeModule, 'useScope').mockReturnValue({
        scope: scope as never,
        setScope: vi.fn(),
        pendingScope: null,
        confirmPendingScope: vi.fn(),
        cancelPendingScope: vi.fn(),
        isFixed: false,
        visibleCompanies: [],
        visibleGroups: [],
        isResolving,
      });
    }

    describe('usePayrollTotal (DASH-01/02/03)', () => {
      beforeEach(() => {
        rpcMock.mockReset();
        vi.restoreAllMocks();
      });

      it('queryKey starts with [scope, id, kind, payroll-total]', async () => {
        mockScope({ kind: 'company', id: 'c1', companyIds: ['c1'], name: 'A' });
        rpcMock.mockResolvedValue({ data: { total_cost: 10000, headcount: 5, avg_cost: 2000 }, error: null });
        const { Wrapper, client } = createWrapper();
        renderHook(() => usePayrollTotal(), { wrapper: Wrapper });
        await waitFor(() => expect(rpcMock).toHaveBeenCalled());
        const keys = client.getQueryCache().getAll().map((q) => q.queryKey);
        expect(keys[0]).toEqual(['scope', 'c1', 'company', 'payroll-total']);
      });

      it('passes companyIds to read_payroll_total RPC', async () => {
        mockScope({ kind: 'group', id: 'g1', companyIds: ['c1', 'c2', 'c3'], name: 'Grupo' });
        rpcMock.mockResolvedValue({ data: { total_cost: 30000, headcount: 12, avg_cost: 2500 }, error: null });
        const { Wrapper } = createWrapper();
        renderHook(() => usePayrollTotal(), { wrapper: Wrapper });
        await waitFor(() => expect(rpcMock).toHaveBeenCalledTimes(1));
        const args = rpcMock.mock.calls[0];
        expect(args[0]).toBe('read_payroll_total');
        expect(args[1]).toEqual({ p_company_ids: ['c1', 'c2', 'c3'] });
      });

      it('does not call rpc when scope is null', () => {
        mockScope(null);
        const { Wrapper } = createWrapper();
        renderHook(() => usePayrollTotal(), { wrapper: Wrapper });
        expect(rpcMock).not.toHaveBeenCalled();
      });

      it('surfaces RPC error to React Query error state', async () => {
        mockScope({ kind: 'company', id: 'c1', companyIds: ['c1'], name: 'A' });
        rpcMock.mockResolvedValue({ data: null, error: { code: '42501', message: 'Sem permissão' } });
        const { Wrapper } = createWrapper();
        const { result } = renderHook(() => usePayrollTotal(), { wrapper: Wrapper });
        await waitFor(() => expect(result.current.isError).toBe(true));
      });
    });
    ```

    4) Edit src/hooks/useCostBreakdown.ts to add a `companies` field. Read the file first; the change preserves the existing `teams` field and adds a parallel aggregation by company_id.

    **P4-V04 — D-05 LOCK fix:** companies[] MUST be seeded from `scope.companyIds` via a direct fetch on the `companies` table — NOT from `(teamsRes.data ?? []).forEach(...)`. Empresas with zero teams must still appear (with totalCost=0, headcount=0, avgCost=0).

    Update the type and aggregation:

    ```typescript
    // Add to types:
    export type CostCompanyRow = {
      companyId: string;
      companyName: string;
      memberCount: number;
      totalCost: number;
      avgCost: number;
    };

    export type CostBreakdown = {
      totalCost: number;
      totalMembers: number;
      teams: CostTeamRow[];
      companies: CostCompanyRow[]; // populated for group scope; for company scope contains the single empresa
    };
    ```

    Then in the hook, REPLACE the team-iteration-based companyMap seed with a `companies` table fetch keyed on `scope.companyIds`:

    ```typescript
    // ----- D-05 LOCK (P4-V04): seed companyMap from scope.companyIds, NOT from teams iteration -----
    // This guarantees that empresas with zero teams still appear in the group breakdown.

    // companyIds is the input the useScopedQuery fetcher receives (= scope.companyIds).
    const { data: companiesData, error: companiesError } = await supabase
      .from('companies')
      .select('id, nome')
      .in('id', companyIds);

    if (companiesError) {
      throw handleSupabaseError(companiesError, 'Falha ao carregar empresas do escopo', { silent: true });
    }

    type CompanyAgg = { id: string; name: string; totalCost: number; userIds: Set<string>; memberCount: number };
    const companyMap = new Map<string, CompanyAgg>();
    for (const c of companiesData ?? []) {
      // Always seed — even if zero teams will reference this empresa, it must appear (D-05 LOCK).
      companyMap.set(c.id, { id: c.id, name: c.nome, totalCost: 0, userIds: new Set(), memberCount: 0 });
    }

    // Now fetch teams (existing logic, but be sure SELECT includes company_id for the join below):
    let teamsQuery = supabase
      .from('teams')
      .select('id, name, company_id, company:companies(id, nome)');
    // ... apply existing scope filter to teamsQuery (companyIds.in(...) etc.)

    // While iterating members for team aggregate, also accumulate company totals
    // ON THE ALREADY-SEEDED entries (do not create new entries — empty empresas are already there):
    members.forEach((m) => {
      uniqueMembers.add(m.user_id);
      const cost = m.cost != null ? Number(m.cost) : 0;
      const safeCost = Number.isFinite(cost) ? cost : 0;
      totalCost += safeCost;
      if (!m.team_id) return;
      const entry = aggregate.get(m.team_id) ?? { totalCost: 0, count: 0 };
      entry.totalCost += safeCost;
      entry.count += 1;
      aggregate.set(m.team_id, entry);

      // Company aggregate — only mutate if the empresa was seeded (which it always should be for in-scope companies).
      const team = (teamsRes.data ?? []).find((t) => t.id === m.team_id);
      const cId = team ? (team as { company_id?: string }).company_id : null;
      if (cId && companyMap.has(cId)) {
        const cEntry = companyMap.get(cId)!;
        cEntry.totalCost += safeCost;
        cEntry.userIds.add(m.user_id);
        cEntry.memberCount = cEntry.userIds.size;
      }
    });

    const companyRows: CostCompanyRow[] = [];
    for (const agg of companyMap.values()) {
      companyRows.push({
        companyId: agg.id,
        companyName: agg.name,
        memberCount: agg.userIds.size,
        totalCost: agg.totalCost,
        avgCost: agg.userIds.size ? agg.totalCost / agg.userIds.size : 0,
      });
    }
    companyRows.sort((a, b) => b.totalCost - a.totalCost);

    return { totalCost, totalMembers: uniqueMembers.size, teams: rows, companies: companyRows };
    ```

    Note: companies[] is populated regardless of scope.kind; the consumer (SocioDashboard, Plan 04) decides which to render based on scope.kind. This avoids a coupling where the hook needs to know the consumer's intent.
  </action>
  <verify>
    <automated>npm test -- src/hooks/usePayrollTotal.test.tsx 2>&1 | tail -20 # 4 tests pass; useCostBreakdown.ts compiles</automated>
  </verify>
  <acceptance_criteria>
    - File src/hooks/usePayrollTotal.ts exists; `grep -c "useScopedQuery" src/hooks/usePayrollTotal.ts` returns at least 2 (import + usage)
    - `grep -c "read_payroll_total" src/hooks/usePayrollTotal.ts` returns 1
    - `grep -c "p_company_ids: companyIds" src/hooks/usePayrollTotal.ts` returns 1
    - File src/hooks/usePayrollTotal.test.tsx exists; `npm test -- src/hooks/usePayrollTotal.test.tsx 2>&1 | grep -E "Tests" | head -1` shows 4 passed and 0 failed
    - `grep -c "companies:" src/hooks/useCostBreakdown.ts` is at least 1 (in the type and/or in the return)
    - `grep -c "CostCompanyRow" src/hooks/useCostBreakdown.ts` is at least 2 (type + array type)
    - **P4-V04 — D-05 LOCK companyMap seeded from scope.companyIds:** `grep -cE "from\\(['\\\"]companies['\\\"]\\)|\\.from\\('companies'\\)" src/hooks/useCostBreakdown.ts` returns at least 1 (companies table fetch present); AND `grep -cE "\\.in\\(['\\\"]id['\\\"], companyIds\\)" src/hooks/useCostBreakdown.ts` returns at least 1 (seed scoped to companyIds).
    - **P4-V12 — useCostBreakdown consumer count:** `grep -rln "useCostBreakdown" src/ | wc -l` returns exactly 1 (only SocioDashboard). If >1, the executor surfaced a blocker before editing.
    - `npm run lint 2>&1 | tail -5` does not report new errors in usePayrollTotal.ts or useCostBreakdown.ts
  </acceptance_criteria>
  <done>usePayrollTotal hook with 4 passing tests; useCostBreakdown returns extended { teams, companies } shape with companyMap seeded from scope.companyIds (D-05 LOCK — every empresa appears, including zero-team ones); single consumer audit confirmed; lint clean.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| client → Postgres RPC | Untrusted p_company_ids may attempt cross-tenant access |
| RPC → tables (SECURITY DEFINER) | Definer privilege bypasses table RLS — re-check via visible_companies is mandatory |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-04-02-01 | Information Disclosure | read_payroll_total RPC | mitigate | v_target_companies <@ v_visible_companies subset check; RAISE 42501 on mismatch. pgTAP test in Plan 07 verifies socio-without-membership is blocked. |
| T-04-02-02 | Information Disclosure | global_search scope leakage | mitigate | p_company_ids pre-filter on candidatos (via applications JOIN), vagas (direct company_id), pessoas (org_unit_members JOIN). RLS still applies as defense-in-depth (SECURITY INVOKER). Column-name pre-flight (P4-V03) prevents SQL drift if Phase 3 schema renames. |
| T-04-02-03 | Information Disclosure | salary row exposure | mitigate | RPC returns jsonb_build_object with ONLY {total_cost, headcount, avg_cost} — never SELECT cost AS row in any return. Code review checkpoint: grep returns no "tm.cost" in RETURN clause. |
| T-04-02-04 | Tampering | RPC param injection | accept | uuid[] is strictly typed by Postgres; non-UUID strings raise 22P02 (invalid_text_representation) automatically. |
| T-04-02-05 | Repudiation | unaudited payroll reads | accept | DASH-01 success criterion does NOT require audit log on payroll reads (CONTEXT D-02 — payload is aggregate). Future iteration may add a data_access_log entry; out of scope here. |
| T-04-02-06 | Information Disclosure | empresa do grupo silenciosamente omitida no breakdown (D-05 violation) | mitigate | companyMap seed comes from `companies` table fetch keyed on scope.companyIds — every in-scope empresa appears regardless of team count (P4-V04). Plan 04 SocioDashboard test 2b asserts zero-team empresas render. |
</threat_model>

<verification>
- Both migrations exist with required signatures (grep checks above)
- npm test passes for usePayrollTotal.test.tsx (4 tests)
- useCostBreakdown.ts compiles and lint-clean
- companyMap seeded from `companies` table; D-05 LOCK honored
- P4-V03 column-name pre-flight comment present in Migration DASH.4
- P4-V12 consumer audit confirms single consumer (SocioDashboard)
- No code path returns row-level salary data (grep "cost AS\|SELECT.*cost.*FROM.*team_members" in migrations returns 0 in RETURN clauses)
</verification>

<success_criteria>
- read_payroll_total RPC defined with SECURITY DEFINER + visible_companies re-check + aggregate-only payload
- global_search RPC accepts p_company_ids uuid[] with pre-filter on candidatos/vagas/pessoas; pre-flight comment documents column-name verification (P4-V03)
- usePayrollTotal hook is a useScopedQuery consumer with 4 passing tests
- useCostBreakdown returns extended shape including `companies` array seeded from scope.companyIds (D-05 LOCK; P4-V04)
- Audit confirms exactly one consumer of useCostBreakdown (P4-V12)
</success_criteria>

<output>
After completion, create `.planning/phases/04-dashboards-quality-polish/04-02-SUMMARY.md` documenting:
- Migration filenames and purposes
- Aggregate payload shape (must be jsonb_build_object only)
- usePayrollTotal queryKey shape
- useCostBreakdown new return type
- Test results (4 tests pass)
- P4-V03 pre-flight comment quoted from Migration DASH.4
- P4-V04 confirmation: companyMap seeded from `companies` table; sample of zero-team empresa appearing in result
- P4-V12 consumer audit result (`grep -rln "useCostBreakdown" src/` output)
- Confirmation: zero RETURN clauses in DASH.1 expose row-level cost data
</output>
</output>
