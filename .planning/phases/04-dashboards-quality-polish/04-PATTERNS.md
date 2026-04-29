# Phase 4: Dashboards + Quality Polish — Pattern Map

**Mapped:** 2026-04-28
**Files analyzed:** 14 (6 modified, 8 created)
**Analogs found:** 13 / 14 (1 file — Sentry init — has no in-repo analog; uses RESEARCH.md + CLAUDE.md stack guidance)

> Concrete code excerpts with file paths + line ranges. Planner copies these directly into PLAN action sections via `<read_first>` references.

---

## File Classification

| New / Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---------------------|------|-----------|----------------|---------------|
| `src/pages/SocioDashboard.tsx` (MODIFY) | page | request-response (read-only KPI render) | self (refactor in place) + `src/hooks/useCostBreakdown.ts` | exact (in-place) |
| `src/components/CmdKPalette.tsx` (MODIFY) | component | request-response (debounced RPC) | self (refactor in place) | exact (in-place) |
| `src/hooks/useCostBreakdown.ts` (MODIFY) | hook | CRUD (read aggregate) | self (already on `useScopedQuery`) | exact (in-place) |
| `src/hooks/useOrgIndicators.ts` (MODIFY) | hook | CRUD (read aggregate) | self (already on `useScopedQuery`) | exact (in-place) |
| `src/main.tsx` (MODIFY — Sentry init) | entry-point | initialization | none (greenfield) — see RESEARCH.md `@sentry/react` 10.50 docs + `src/lib/logger.ts` for `redact()` | role-match (lib/logger PII pattern reused) |
| `src/App.tsx` (MODIFY — Sentry boundary wrap) | entry-point | wrapper | `src/components/ErrorBoundary.tsx` lines 1-50 (existing class boundary) | exact |
| `supabase/migrations/{TS}_create_payroll_total_rpc.sql` (CREATE) | migration / RPC | server-side aggregate | `supabase/migrations/20260429140100_clim2_aggregate_rpc.sql` lines 11-78 (`get_climate_aggregate`) | **exact** — same SECURITY DEFINER + visible_companies re-check + agg-only payload |
| `supabase/migrations/{TS}_migration_g_contract.sql` (CREATE) | migration / contract | DDL (drop + NOT NULL) | `supabase/migrations/20260429125200_perf_pre_company_id_constrain.sql` lines 1-37 (NOT NULL pattern + sanity guard) | **exact** — contract step pattern |
| `supabase/tests/011-payroll-total-rls.sql` (CREATE pgTAP) | test | RLS fail-test | `supabase/tests/002-cross-tenant-leakage.sql` lines 1-89 | **exact** — same socio-without-membership pattern |
| `supabase/tests/012-data-access-log-cron.sql` (CREATE pgTAP — verify cron) | test | DDL inspection | `supabase/tests/007-data-access-log.sql` lines 1-81 | exact |
| `tests/auth/firstLoginChangePassword.test.tsx` (CREATE) | test | RTL + MSW | `tests/hiring/PublicApplicationForm.test.tsx` (form + supabase mock) | role-match |
| `tests/scope/switchScopeNoFlash.test.tsx` (CREATE) | test | RTL | `tests/scope/useScopedQuery.test.tsx` lines 60-77 (D-04 cache preservation already proven) | **exact** — extend existing assertion |
| `tests/hiring/useMoveApplicationStage.conflict.test.tsx` (EXTEND or VERIFY) | test | hook + mutation | `tests/hiring/useMoveApplicationStage.test.tsx` lines 145-307 (already covers conflict/network/RLS) | **already-covered** — planner verifies, doesn't recreate |
| `tests/perf/saveEvaluationIdempotent.test.tsx` (CREATE) | test | mutation | `tests/hiring/useMoveApplicationStage.test.tsx` lines 145-307 (mutation lifecycle pattern) | role-match |
| `src/pages/hiring/CandidateProfile.tsx` (REFACTOR / SPLIT) | page | request-response (composite) | `src/features/org-structure/components/` (feature folder split — `OrgUnitTree.tsx` + `OrgUnitForm.tsx` + `useOrgUnits.ts` + `useOrgUnitMutations.ts`) | **exact** — same feature-folder pattern |
| `src/components/hiring/JobOpeningForm.tsx` (REFACTOR / SPLIT) | component | form | `src/features/org-structure/` feature folder pattern + Zod schema in `JobOpeningForm.tsx` lines 59-80 (preserve schema, lift sub-sections) | role-match |

---

## Pattern Assignments

### 1. Dashboard de sócio refactor — `src/pages/SocioDashboard.tsx`

**Analog (in-place, 423 lines):** `src/pages/SocioDashboard.tsx`

**Imports pattern to KEEP** (lines 1-31):
```typescript
import { Users, DollarSign, Building2, TrendingUp, Download } from "lucide-react";
import { toast } from "sonner";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { handleSupabaseError } from "@/lib/supabaseError";
import { LoadingState } from "@/components/primitives/LoadingState";
import { useCostBreakdown } from "@/hooks/useCostBreakdown";
import { useOrgIndicators } from "@/hooks/useOrgIndicators";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Btn, Row, Card, SectionHeader, LinearEmpty, ProgressBar } from "@/components/primitives/LinearKit";
```

**Imports to REMOVE** (line 22 + Activity, Target, LineChart, ArrowRight, ChevronRight, Briefcase):
```typescript
import { useClimateOverview } from "@/hooks/useClimateOverview"; // REMOVE — clima out
// Also drop: Activity, Target, LineChart, ArrowRight, ChevronRight, Briefcase icons
```

**KPI render pattern to PRESERVE** (lines 202-224 — keep 3, drop 2):
```typescript
<KpiTile label="Folha" value={cost?.totalCost != null ? formatBRL(cost.totalCost) : "—"} detail="mês corrente" icon={<DollarSign ... />} />
<KpiTile label="Pessoas ativas" value={String(org?.totalCollaborators ?? 0)} detail={`${cost?.teams?.length ?? 0} times`} icon={<Users ... />} />
<KpiTile label="Custo médio" value={...} detail="por pessoa/mês" icon={<TrendingUp ... />} />
// REMOVE: Performance + Clima KPIs (lines 225-254)
```

**KpiTile primitive update pattern** (lines 390-423 — `p-3.5` → `p-4` per UI-SPEC):
```typescript
function KpiTile({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: React.ReactNode }) {
  return (
    <div className="surface-paper p-4">  // <-- was p-3.5; UI-SPEC mandates 16px grid
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

**Conditional breakdown pattern (NEW logic — D-05)** — adapt based on `scope.kind`:
```typescript
import { useScope } from "@/app/providers/ScopeProvider";
const { scope } = useScope();
const isGroup = scope?.kind === 'group';

const breakdownTitle = isGroup ? "Custo por empresa" : "Custo por departamento";
const breakdownRows = isGroup
  ? (cost?.companies ?? [])  // NEW field — useCostBreakdown returns companies[] for group scope
  : (cost?.teams ?? []).slice(0, 6);  // existing behavior — top 6 departments
```

**CSV export pattern to PRESERVE** (lines 142-162):
```typescript
<Btn variant="secondary" size="sm" icon={<Download className="w-3.5 h-3.5" strokeWidth={1.75} />}
  onClick={() => {
    const rows = breakdownRows.map((t) => ({ ... }));
    const date = new Date().toISOString().slice(0, 10);
    downloadCSV(rows, isGroup ? `custo-por-empresa-${date}.csv` : `custo-por-departamento-${date}.csv`);
  }}>
  Relatório
</Btn>
```

**Sections to DELETE** (per UI-SPEC):
- Hero "Próxima ação" — lines 166-199
- Indicadores consolidados Card — lines 311-363
- Atalhos grid — lines 367-385

---

### 2. Cmd+K refactor — `src/components/CmdKPalette.tsx`

**Analog (in-place, 309 lines):** `src/components/CmdKPalette.tsx`

**Imports pattern to UPDATE — replace direct supabase import with useScopedQuery**:
```typescript
// REMOVE (line 35): import { supabase } from "@/integrations/supabase/client";
// REMOVE (line 3):  import { useQuery } from "@tanstack/react-query";
// ADD:
import { useScopedQuery } from "@/shared/data/useScopedQuery";
import { useScope } from "@/app/providers/ScopeProvider";
import { supabase } from "@/integrations/supabase/client"; // OK only inside useScopedQuery fetcher
```

**Auth/scope pattern (NEW)** — add `scope.id` to queryKey + scope companyIds to RPC:
```typescript
const { scope } = useScope();
const { data: remoteResults = [], isFetching: remoteLoading } = useScopedQuery<SearchRow[]>(
  ['global-search', debouncedQuery],
  async (companyIds) => {
    const { data, error } = await supabase.rpc(
      'global_search' as never,
      {
        q: debouncedQuery,
        max_per_kind: 6,
        scope_company_ids: companyIds,  // NEW param — RPC must accept (see RPC pattern below)
      } as never,
    );
    if (error) throw error;
    return (data ?? []) as SearchRow[];
  },
  { staleTime: 30_000, enabled: open && debouncedQuery.length >= 2 },
);
```

**Static actions pattern to UPDATE — D-06/D-07** (lines 155-194):
```typescript
const items: Entry[] = [
  // KEEP / ADD (per D-07):
  { id: "act-job", label: "Criar nova vaga", icon: Briefcase, group: "Ações", action: nav("/hiring/jobs/nova") },
  ...(canManage
    ? [{ id: "act-invite", label: "Convidar / criar pessoa", icon: UserPlus, group: "Ações" as const, action: nav("/criar-usuario") }]
    : []),

  // REMOVE (out of scope per D-07):
  // { id: "act-pdi", ... }, { id: "act-11", ... }, { id: "act-eval", ... }
];
```

**REMOTE_META pattern to UPDATE — drop PDI** (lines 57-62):
```typescript
type RemoteKind = "candidate" | "job" | "person";  // REMOVE "pdi"
const REMOTE_META: Record<RemoteKind, { label: string; icon: React.ElementType }> = {
  job:       { label: "Vagas",       icon: Briefcase },  // order: vagas → candidatos → pessoas
  candidate: { label: "Candidatos",  icon: UserSearch },
  person:    { label: "Pessoas",     icon: User },
};
```

**Spacing fixes per UI-SPEC** (lines 221, 249, 281):
```typescript
// Input row (line 221):  px-3.5 → px-4 py-3
<div className="flex items-center gap-2 px-4 py-3 border-b border-border">

// CommandItem padding (lines 249, 281):  px-2.5 → px-3
className="gap-2.5 py-2 px-3 text-[13px] data-[selected=true]:bg-bg-subtle ..."
```

**Debounce pattern to UPDATE** (line 76 — `180` → `150`):
```typescript
const debouncedQuery = useDebouncedValue(query.trim(), 150);
```

**Placeholder pattern to UPDATE** (line 225):
```typescript
placeholder="Buscar vagas, candidatos, pessoas…"
```

---

### 3. RPC: `read_payroll_total_with_log` (NEW migration)

**Analog (best match):** `supabase/migrations/20260429140100_clim2_aggregate_rpc.sql` lines 11-78 (`get_climate_aggregate`)

**Why this analog:** Same characteristics — `SECURITY DEFINER` with re-applied RLS via `visible_companies(actor)`, returns ONLY aggregate (never row-level data), `SET search_path = public`, k-anon style protection. CLIM.2 is the textbook server-side aggregate pattern post-Phase 2.

**Combined analog for log-write:** `supabase/migrations/20260428120100_f2_data_access_log_table.sql` lines 52-101 (`read_candidate_with_log`) — provides the audit-log INSERT atomic pattern (DASH-01 doesn't require log per CONTEXT, but planner may add for symmetry).

**Imports / DDL header to copy verbatim**:
```sql
-- From clim2_aggregate_rpc.sql lines 11-19
CREATE OR REPLACE FUNCTION public.read_payroll_total(
  p_company_ids uuid[] DEFAULT NULL  -- NULL = derive from scope; array = scope.companyIds passthrough
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
```

**Auth + scope re-apply pattern to copy** (clim2 lines 20-39):
```sql
DECLARE
  v_actor             uuid := (SELECT auth.uid());
  v_visible_companies uuid[];
  v_target_companies  uuid[];
  v_total             numeric;
  v_headcount         int;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;

  v_visible_companies := public.visible_companies(v_actor);

  -- Re-apply RLS: every requested company MUST be in visible_companies
  v_target_companies := COALESCE(p_company_ids, v_visible_companies);
  IF NOT (v_target_companies <@ v_visible_companies) THEN
    RAISE EXCEPTION 'Sem permissão para uma ou mais empresas' USING ERRCODE = '42501';
  END IF;
```

**Aggregate-only payload pattern (CRITICAL — never expose individual salaries)**:
```sql
  SELECT
    COALESCE(SUM(tm.cost), 0)::numeric,
    COUNT(DISTINCT tm.user_id)::int
  INTO v_total, v_headcount
  FROM public.team_members tm
  JOIN public.teams t ON t.id = tm.team_id
  WHERE t.company_id = ANY(v_target_companies);

  RETURN jsonb_build_object(
    'total_cost', v_total,
    'headcount', v_headcount,
    'avg_cost', CASE WHEN v_headcount > 0 THEN (v_total / v_headcount)::numeric(12,2) ELSE NULL END
  );
END $$;
```

**Grant pattern to copy** (clim2 line 78):
```sql
REVOKE ALL ON FUNCTION public.read_payroll_total(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.read_payroll_total(uuid[]) TO authenticated;
```

**Header comment block** — match existing convention (clim2 lines 1-9):
```sql
-- =========================================================================
-- Migration DASH.1: RPC read_payroll_total — server-side payroll aggregate
--
-- Threats: T-DASH-01 (sócio sem membership lê folha de empresa não-vinculada)
--          mitigado por v_target_companies <@ v_visible_companies (re-aplica RLS)
-- REQs: DASH-01, DASH-02, DASH-03
-- Reversibility: DROP FUNCTION (trivial)
-- DEPENDENCIES: visible_companies() helper (Phase 1, Migration B)
-- =========================================================================
```

**Note on `global_search` extension:** The existing `supabase/migrations/20260422190000_global_search_rpc.sql` (lines 1-98) is `SECURITY INVOKER` and relies on RLS — the Cmd+K refactor benefits from adding a `p_company_ids uuid[]` parameter and a `WHERE company_id = ANY(...)` pre-filter for performance (DASH-04 SLA <100ms). Pattern: same shape as `read_payroll_total` but `SECURITY INVOKER STABLE`, parameter signature additions only.

---

### 4. Sentry init — `src/main.tsx` + `src/App.tsx`

**Analog (closest in-repo):** `src/lib/logger.ts` lines 17-54 — provides the canonical `PII_KEYS` set + `redact()` function that `Sentry.beforeSend` MUST reuse (no duplication of regex/PII set).

**Why this analog:** `logger.ts` line 8-9 explicitly states: *"Phase 4 (QUAL-06) will replace this with Sentry beforeSend integration; the redact() function is the same."* — the `redact` export is the mandated shared dependency.

**`redact` pattern to import in Sentry init**:
```typescript
// from src/lib/logger.ts lines 17-54
import { redact } from "@/lib/logger";

const PII_KEYS = new Set([
  'email', 'cpf', 'full_name', 'fullName', 'name', 'nome',
  'phone', 'telefone', 'salary', 'salario',
  'birth_date', 'birthDate', 'data_nascimento',
]);
// EMAIL_RE, CPF_RE, CPF_DIGITS_RE — already in logger.ts; import only
```

**Entry point pattern to extend — `src/main.tsx`** (current 5 lines):
```typescript
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
```

**Pattern: insert Sentry.init BEFORE `createRoot(...)`** (no in-repo analog — copy from `@sentry/react` 10.50 docs + reuse `redact`):
```typescript
import * as Sentry from "@sentry/react";
import { redact } from "@/lib/logger";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  enabled: !import.meta.env.DEV,  // dev: off; prod: on
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,    // QUAL-06 LOCK — default off
  replaysOnErrorSampleRate: 0,
  integrations: [
    Sentry.replayIntegration({ maskAllText: true, maskAllInputs: true, blockAllMedia: true }),
  ],
  beforeSend(event) {
    // QUAL-06 LOCK — beforeSend MUST scrub PII before any other config
    if (event.request) event.request = redact(event.request) as typeof event.request;
    if (event.extra) event.extra = redact(event.extra) as typeof event.extra;
    if (event.user) {
      // Strip email/name from Sentry user record; keep only id + scope tags
      event.user = { id: event.user.id };
    }
    return event;
  },
});
```

**ErrorBoundary wrap pattern in `App.tsx`** — replace existing `ErrorBoundary` at line 81:
```typescript
// Existing (App.tsx line 81):
//   <ErrorBoundary>

// Replace with Sentry-wrapped boundary:
import { ErrorBoundary as SentryErrorBoundary } from "@sentry/react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Wrap once at the same site:
<SentryErrorBoundary fallback={<ErrorBoundary />}>
  {/* existing tree */}
</SentryErrorBoundary>
```

**Scope tag pattern (Claude's Discretion in CONTEXT D-58)** — set inside `ScopeProvider` after scope resolves:
```typescript
// In src/app/providers/ScopeProvider.tsx, after scope resolves:
import * as Sentry from "@sentry/react";
useEffect(() => {
  if (!scope) return;
  Sentry.setTag("scope_id", scope.id);
  Sentry.setTag("scope_kind", scope.kind);
}, [scope?.id, scope?.kind]);
```

---

### 5. Migration G — `supabase/migrations/{TS}_migration_g_contract.sql`

**Analog:** `supabase/migrations/20260429125200_perf_pre_company_id_constrain.sql` lines 1-37

**Why this analog:** Already a "contract" step (irreversible NOT NULL + sanity guard with `RAISE EXCEPTION` on residue). Migration G is the same shape applied to `allowed_companies` helpers + `teams` drop.

**Header comment pattern to copy** (perf_pre_company_id_constrain lines 1-12):
```sql
-- =========================================================================
-- Migration G: CONTRACT — drop legacy helpers + NOT NULL + drop teams (if zero readers)
--
-- IRREVERSIBLE — runs after 1+ week of Phases 1-3 stable in production.
-- Pre-conditions:
--   1. Zero incidents críticos no Sentry referenciando allowed_companies/teams
--   2. supabase/tests/002-cross-tenant-leakage.sql + 011-payroll-total-rls.sql passando
--   3. Backfill E (e2_teams_to_org_units_backfill) confirmado em produção
--   4. pg_cron data_access_log_retention_cleanup rodando ≥7 dias
-- Reversibility: NONE — owner deve PITR se houver regressão.
-- DEPENDENCIES: Phases 1, 2, 3 todas em produção
-- =========================================================================
```

**NOT NULL + sanity-guard pattern to copy** (perf_pre_company_id_constrain lines 14-37):
```sql
-- Step 1 — Drop legacy allowed_companies helper functions
DROP FUNCTION IF EXISTS public.allowed_companies(uuid);
DROP FUNCTION IF EXISTS public.allowed_companies_for_user(uuid);

-- Step 2 — SET NOT NULL onde ainda há company_id nullable (hiring tables, etc.)
ALTER TABLE public.applications     ALTER COLUMN company_id SET NOT NULL;  -- ajuste conforme schema final
ALTER TABLE public.candidates       ALTER COLUMN company_id SET NOT NULL;  -- ajuste conforme schema final

-- Step 3 — Sanity post-constrain (mesmo pattern do perf_pre_company_id_constrain)
DO $$
DECLARE v_orphans int;
BEGIN
  SELECT COUNT(*) INTO v_orphans FROM public.applications WHERE company_id IS NULL;
  IF v_orphans > 0 THEN
    RAISE EXCEPTION 'Migration G failed: % applications com company_id NULL', v_orphans;
  END IF;
END $$;

-- Step 4 — Drop teams se zero leitores (planner verifica via grep + dependent views/triggers)
-- DO NOT DROP cegamente — owner gate em PLAN.md confirma zero leitores antes deste DDL
DROP TABLE IF EXISTS public.teams CASCADE;  -- CASCADE só se planner confirmou impactos
```

**pg_cron verification pattern (read-only sanity, NOT new schedule)** — verify retention job still scheduled:
```sql
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'data_access_log_retention_cleanup') THEN
    RAISE EXCEPTION 'Migration G pre-condition violated: pg_cron retention job não está agendado';
  END IF;
END $$;
```

---

### 6. pgTAP test — `supabase/tests/011-payroll-total-rls.sql` (NEW)

**Analog:** `supabase/tests/002-cross-tenant-leakage.sql` lines 1-89 — the canonical cross-tenant fail-test.

**Why this analog:** Same threat model — sócio of company A must NOT read company B aggregate. CONTEXT D-02 explicitly references "Sócio sem membership na empresa: RLS bloqueia o call (sucesso criterion DASH-01)" — this is identical to the test 3+4 pattern in 002.

**Header / setup pattern to copy** (002 lines 1-22):
```sql
-- ========================================================================
-- 011-payroll-total-rls.sql — DASH-01 RLS gate
--
-- Mitigates: T-DASH-01 (sócio sem membership lê folha de empresa alheia)
-- Activated by: Plan 04-XX (RPC read_payroll_total)
-- REQs: DASH-01, DASH-02
-- ========================================================================
begin;
select plan(4);

select tests.create_supabase_user('socio_a@test.com');
select tests.create_supabase_user('socio_b@test.com');
select tests.authenticate_as_service_role();

insert into public.companies (id, name) values
  ('00000000-0000-0000-0000-00000000000a', 'Empresa A'),
  ('00000000-0000-0000-0000-00000000000b', 'Empresa B');

insert into public.user_roles (user_id, role) values
  (tests.get_supabase_uid('socio_a@test.com'), 'socio'::public.app_role),
  (tests.get_supabase_uid('socio_b@test.com'), 'socio'::public.app_role);

insert into public.socio_company_memberships (user_id, company_id) values
  (tests.get_supabase_uid('socio_a@test.com'), '00000000-0000-0000-0000-00000000000a');
```

**RLS-block assertion pattern to copy** (002 lines 71-77):
```sql
-- TEST 3 — socio_a chamando RPC para empresa B → 42501
select tests.authenticate_as('socio_a@test.com');
select throws_ok(
  $$select public.read_payroll_total(array['00000000-0000-0000-0000-00000000000b'::uuid])$$,
  '42501',
  null,
  'socio@A bloqueado de ler folha da empresa B (RLS via visible_companies)'
);

-- TEST 4 — socio_a chamando RPC para empresa A (com membership) → success
select lives_ok(
  $$select public.read_payroll_total(array['00000000-0000-0000-0000-00000000000a'::uuid])$$,
  'socio@A consegue ler folha da empresa A (com membership)'
);

select * from finish();
rollback;
```

---

### 7. Vitest test — Mover candidato no kanban (QUAL-03 fluxo 3)

**Analog:** `tests/hiring/useMoveApplicationStage.test.tsx` lines 145-307 — **already covers all 3 cenários** (conflict, network, RLS):

| QUAL-03 cenário | Existing test | Lines |
|-----------------|---------------|-------|
| RLS (permission) | `'onError com kind=rls faz rollback E exibe toast'` | 173-190 |
| Conflict (concurrent edit) | `'onError com kind=conflict (data null) faz rollback E exibe toast'` | 192-207 |
| Network (retry exhaustion) | `'isError=true apos erro de rede apos retries esgotarem'` | 293-307 |

**Planner verification action:** confirm test still passes; do NOT recreate. If gap exists, extend in-place using the same `maybeSingleMock.mockResolvedValue({...})` shape.

**Mock pattern to copy when extending** (lines 23-36, 52-82):
```typescript
const maybeSingleMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(() => ({ update: vi.fn(() => ({ eq: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), maybeSingle: maybeSingleMock })) })) },
}));

vi.spyOn(scopeModule, 'useScope').mockReturnValue({ scope: { kind: 'company', id: 'company:abc', companyIds: ['c1'], name: 'Empresa Teste' }, ... });
vi.spyOn(authModule, 'useAuth').mockReturnValue({ user: { id: 'u1' }, userRole: 'rh', ... });
```

---

### 8. Vitest test — Switch escopo sem flash (QUAL-03 fluxo 2)

**Analog:** `tests/scope/useScopedQuery.test.tsx` lines 60-77 — **D-04 cache preservation already proven for the chokepoint hook.**

**Cache preservation assertion to copy/reuse**:
```typescript
it('switching scope produces a new key; old cache preserved (D-04)', async () => {
  const fetcher = vi.fn().mockResolvedValue(['data']);
  const { Wrapper, client } = createWrapper();

  mockScope({ kind: 'company', id: 'c1', companyIds: ['c1'], name: 'A' });
  const { rerender } = renderHook(() => useScopedQuery(['feat'], fetcher), { wrapper: Wrapper });
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));

  mockScope({ kind: 'company', id: 'c2', companyIds: ['c2'], name: 'B' });
  rerender();
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));

  const allKeys = client.getQueryCache().getAll().map((q) => q.queryKey);
  expect(allKeys.some((k) => k[1] === 'c1')).toBe(true); // OLD cache present
  expect(allKeys.some((k) => k[1] === 'c2')).toBe(true); // NEW cache present
});
```

**Phase 4 add — full-render assertion** (no flash at component level): wrap `<SocioDashboard>` in `<ScopeProvider>`, switch scope, assert no `LoadingState` re-mount between renders. Use `tests/scope/ScopeDropdown.test.tsx` as a `<ScopeProvider>` wrapper analog.

---

### 9. Vitest test — Login + troca de senha (QUAL-03 fluxo 1)

**Analog (best partial match):** `tests/hiring/PublicApplicationForm.test.tsx` — form interaction + supabase mock pattern.

**Pattern available — RTL form fill + submit + verify toast:**
- Mock `supabase.auth.signInWithPassword` + `supabase.auth.updateUser`
- Render `<Auth />` then redirect to `<FirstLoginChangePassword />` on `must_change_password = true`
- Assert old → new password update succeeds
- Assert no PII in console (`logger.test.ts` provides redaction assertion pattern at `tests/lib/logger.test.ts`)

**No 1:1 in-repo analog for first-login flow yet — planner builds from scratch using:**
- `tests/scope/useScopedQuery.test.tsx` for `Wrapper` + `QueryClient` boilerplate
- `tests/hiring/useMoveApplicationStage.test.tsx` lines 23-36 for supabase module mock
- `src/pages/FirstLoginChangePassword.tsx` (existing component, Phase 3)

---

### 10. Vitest test — Salvar avaliação idempotente (QUAL-03 fluxo 4)

**Analog (best match):** `tests/hiring/useMoveApplicationStage.test.tsx` lines 145-307 — mutation lifecycle (mutate + onMutate optimistic + retry + idempotency).

**Pattern to mirror:**
- Mock evaluation upsert with same `client_request_id` (idempotency key — see Phase 3 plan)
- First call: returns success row
- Second call (same key): returns same row (no duplicate insert)
- Assert `client.getQueryData(EVALS_KEY)` has only 1 entry post both calls
- Assert `maybeSingleMock` was called twice but DB-side conflict handled (Phase 3 plan defines the unique index)

---

### 11. Component split — `CandidateProfile.tsx` (1169 lines) + `JobOpeningForm.tsx` (854 lines)

**Analog:** `src/features/org-structure/` — the canonical "feature folder" split established in Phase 3.

**Folder structure to mirror**:
```
src/features/org-structure/
├── components/
│   ├── OrgUnitTree.tsx     ← composite UI
│   └── OrgUnitForm.tsx     ← form
└── hooks/
    ├── useOrgUnits.ts          ← data
    └── useOrgUnitMutations.ts  ← mutations
```

**Proposed split for `CandidateProfile.tsx`** (1169 → ~5 files of ~200-300 lines each):
```
src/features/hiring-candidate-profile/
├── components/
│   ├── CandidateHeader.tsx        ← lines ~80-200 of original (identity + chips)
│   ├── CandidateApplications.tsx  ← lines ~200-450 (applications + interviews list)
│   ├── CandidateFitSection.tsx    ← lines ~450-700 (cultural fit + viewer)
│   ├── CandidateDecisionSection.tsx ← lines ~700-900 (HiringDecisionPanel + admission)
│   └── CandidateAuditSection.tsx  ← lines ~900-1169 (background check + anonymize)
└── hooks/
    └── useCandidateProfile.ts     ← composite hook combining existing useCandidate, useApplicationsByCandidate, useFitResponse, etc.
```

**Imports preservation pattern** (from current `CandidateProfile.tsx` lines 1-80) — keep all hook imports intact, route them through the new composite hook OR import directly per child component:
```typescript
// Existing imports — distribute to child components
import { useCandidate, useAnonymizeCandidate } from "@/hooks/hiring/useCandidates";
import { useApplicationsByCandidate, useJobForApplication, useMoveApplicationStage, useRejectApplication } from "@/hooks/hiring/useApplications";
import { useFitResponse, useFitSurveys, useIssueFitLink } from "@/hooks/hiring/useCulturalFit";
import { useInterviewsByApplication } from "@/hooks/hiring/useInterviews";
```

**Proposed split for `JobOpeningForm.tsx`** (854 → ~3 files):
```
src/features/hiring-job-form/
├── components/
│   ├── JobBasicsSection.tsx       ← company, title, summary, sector
│   ├── JobContractSection.tsx     ← contract_type, work_mode, hours, salary
│   └── JobAddressSection.tsx      ← address fields
└── JobOpeningForm.tsx             ← shell: zod schema (lines 59-80) + react-hook-form orchestration
```

**Zod schema preservation** — keep schema in shell (`JobOpeningForm.tsx` lines 59-80) intact; child sections receive `register`, `errors`, `watch` via props.

---

## Shared Patterns

### Authentication / Scope Enforcement

**Source:** `src/shared/data/useScopedQuery.ts` lines 26-48 (the chokepoint)
**Apply to:** Every new/modified hook touched in Phase 4 (`useCostBreakdown`, `useOrgIndicators`, Cmd+K remote search)

```typescript
export function useScopedQuery<TData>(key, fn, options) {
  const { scope, isResolving } = useScope();
  return useQuery<TData>({
    queryKey: ['scope', scope?.id ?? '__none__', scope?.kind ?? '__none__', ...key],
    queryFn: () => scope ? fn(scope.companyIds) : Promise.resolve([] as TData),
    enabled: !!scope && !isResolving && (options?.enabled ?? true),
    ...options,
  });
}
```

**Grep-verifiable acceptance:** every new hook in `src/hooks/` MUST import `useScopedQuery`. Run `grep -L "useScopedQuery" src/hooks/use{CostBreakdown,OrgIndicators}.ts` returns nothing (file MUST contain the import). Run `grep "supabase.from(" src/components/CmdKPalette.tsx` returns 0 lines after refactor (must be inside `useScopedQuery` fetcher only).

---

### Error Handling

**Source:** `src/lib/supabaseError.ts` (`handleSupabaseError`) — used 4× in `SocioDashboard.tsx` lines 70-74 and `useCostBreakdown.ts` lines 42-43
**Apply to:** All new/modified Phase 4 components and hooks

```typescript
import { handleSupabaseError } from "@/lib/supabaseError";

// In hooks:
if (res.error) throw handleSupabaseError(res.error, 'Falha ao carregar X', { silent: true });

// In components / mutation onError:
useEffect(() => {
  if (error) handleSupabaseError(error, "Falha ao carregar custos");
}, [error]);
```

**Grep-verifiable acceptance:** zero `console.error` in new files. Replace with `logger.error` (from `src/lib/logger.ts`) or `handleSupabaseError`.

---

### PII Scrubbing (Logger + Sentry)

**Source:** `src/lib/logger.ts` lines 17-54 (canonical `PII_KEYS` set + `redact()` function)
**Apply to:** Sentry `beforeSend` (Phase 4 QUAL-06) — MUST import `redact`, never re-define PII keys

**LOCK:** `src/lib/logger.ts` line 8-9 documents that `redact` IS the Sentry pre-image. Any duplication of PII keys in Phase 4 fails review.

---

### Form Pattern

**Source:** `src/components/hiring/JobOpeningForm.tsx` lines 1-80 (Zod schema + react-hook-form + zodResolver)
**Apply to:** Quick action "Criar nova vaga" target route (Cmd+K opens `/hiring/jobs/nova` which renders `JobOpeningForm`); first-login change-password test scaffold.

```typescript
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const schema = z.object({ ... });
const form = useForm({ resolver: zodResolver(schema), defaultValues: { ... } });
```

**LOCK from CLAUDE.md:** `react-hook-form` 7.73 + `@hookform/resolvers` 5.2.2 + Zod **3.25** (NEVER upgrade to Zod 4 — incompatible).

---

### Migration Pattern (expand → backfill → contract)

**Source:** `supabase/migrations/20260429125000_perf_pre_company_id_expand.sql` (expand) + `20260429125100_perf_pre_company_id_backfill.sql` (backfill) + `20260429125200_perf_pre_company_id_constrain.sql` (contract — pattern reused for Migration G)

**Apply to:** Migration G — contract phase (`20260429125200` IS the contract template). Sanity-guard `RAISE EXCEPTION` block (lines 27-37) is NON-NEGOTIABLE — it MUST run after each `ALTER` / `DROP`.

---

### pgTAP Test Pattern

**Source:** `supabase/tests/002-cross-tenant-leakage.sql` lines 1-89 (the canonical cross-tenant gate)

**Apply to:** Every new pgTAP test in Phase 4. Anatomy:
1. `begin;` + `select plan(N);`
2. `tests.create_supabase_user(...)` for each actor
3. `tests.authenticate_as_service_role()` for fixture setup
4. `insert into companies / user_roles / memberships` with deterministic UUIDs
5. `tests.authenticate_as('email')` to switch identity
6. `select results_eq(...)` or `select throws_ok(...)` for assertions
7. `select * from finish(); rollback;`

---

## No Analog Found

| File | Role | Data Flow | Reason | Fallback |
|------|------|-----------|--------|----------|
| `src/main.tsx` Sentry init block | entry-point initialization | one-time SDK setup | No prior Sentry integration in repo | Use `@sentry/react` 10.50 official docs (CLAUDE.md stack additions); reuse `redact` from `src/lib/logger.ts` |

All other Phase 4 files have at least one in-repo analog of role-match or better quality.

---

## Metadata

**Analog search scope:**
- `src/pages/`, `src/components/`, `src/hooks/`, `src/lib/`, `src/shared/data/`, `src/features/`, `src/app/providers/`
- `supabase/migrations/` (50+ files), `supabase/tests/` (11+ pgTAP files)
- `tests/` (Vitest) — `tests/hiring/`, `tests/scope/`, `tests/lib/`

**Files scanned:** ~80 source files + 50 migrations + 25 tests
**Pattern extraction date:** 2026-04-28
**Analogs by quality:**
- Exact (same role + data flow): 9
- Role-match (same role, different flow): 4
- Already-covered (existing test/code suffices): 1
- No analog (greenfield): 1 (Sentry init)

**Project skills observed:** `.claude/skills/speckit-*` directories exist but are SpecKit-specific (constitution, plan, implement) — no Lever-specific code rules to honor beyond `CLAUDE.md` working guide and `.planning/codebase/CONVENTIONS.md`.

---

*Phase: 04-dashboards-quality-polish*
*PATTERNS.md created: 2026-04-28*
*Created by: gsd-pattern-mapper*
