---
phase: 04-dashboards-quality-polish
plan: 03
subsystem: database
tags: [supabase, postgres, migration, types-regen, schema-push, additive, blocking, dash, phase-4]

# Dependency graph
requires:
  - phase: 04-dashboards-quality-polish
    plan: 02
    provides: "2 additive migrations Plan 04-02 (read_payroll_total RPC + global_search 3-arg) prontas para `supabase db push`"
  - phase: 03-performance-refactor
    plan: 05
    provides: "13 Phase 3 migrations já aplicadas via MCP no remote (schema OK, mas history mismatch)"
  - phase: 02-r-s-refactor
    plan: 04
    provides: "supabase db push --linked --include-all canonical playbook (reused exactly)"
  - phase: 01-tenancy-backbone
    provides: "visible_companies(uid) helper + org_units(id, company_id) + org_unit_members(org_unit_id, user_id)"
provides:
  - "Schema Plan 04-02 sincronizado com remote `ehbxpbeijofxtsbezwxd` (2 migrations DASH.1 + DASH.4 aplicadas)"
  - "src/integrations/supabase/types.ts contendo Functions.read_payroll_total + Functions.global_search com p_company_ids?: string[]"
  - "Histórico de migrations reconciliado: 14 timestamps Phase 3 marcados como applied (eram 'remote-only ghost' por aplicação via MCP em Plan 03-05); 14 timestamps duplicados marcados como reverted"
affects: [04-04, 04-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Reconcile migration history antes de db push: quando schema foi aplicado via MCP (Plan 03-05) bypassing migration tracking, usar `supabase migration repair --linked --status applied <ts>...` para alinhar history com files locais; depois `--status reverted <ts>...` nos timestamps remote-only que não correspondem a files locais"
    - "Stderr-redirect mandatório no gen types: `supabase gen types typescript --linked 2>/dev/null > types.ts` — sem o `2>/dev/null` o CLI imprime 'Initialising login role...' como linha 1 do arquivo gerado, quebrando TS compile (lock estabelecido em Plan 02-04)"
    - "P4-V03 / P4-V05 — verification gates: pre-push column-name check via `information_schema.columns` + post-push pg_proc check de pronargs/proname; ambos via `supabase db query --linked` (substitui `db execute --linked` que não existe na CLI 2.95.6)"

key-files:
  created:
    - .planning/phases/04-dashboards-quality-polish/04-03-SUMMARY.md
  modified:
    - src/integrations/supabase/types.ts  # regenerado (3304 -> 3333 linhas; +29 com read_payroll_total + global_search 3-arg + graphql_public schema)
    - .planning/phases/04-dashboards-quality-polish/deferred-items.md  # documenta zero net new tsc errors (104 -> 104) e CmdKPalette 2-arg pendência
  applied_to_remote:
    - supabase/migrations/20260430120000_dash1_read_payroll_total_rpc.sql
    - supabase/migrations/20260430120100_dash4_global_search_scope_param.sql

key-decisions:
  - "Reconcile migration history antes de push: o `supabase db push --linked --include-all` falhou inicialmente com 'Remote migration versions not found in local migrations directory' porque Plan 03-05 aplicou as 13 migrations Phase 3 via MCP (não via push), gerando timestamps `20260428195*` no remote sem files locais correspondentes (locais são `20260429*`). Solução: 1) `migration repair --status applied 20260429120000 ... 20260429160100` para os 14 files locais (schema já aplicado, só faltava history); 2) `migration repair --status reverted 20260428195625 ... 20260428204340` para os 14 ghost remote-only timestamps. Depois disso, `db push --include-all` aplicou apenas as 2 da Plan 04-02 sem conflito."
  - "Aceitar 104 pré-existing tsc errors como out-of-scope: regen produziu zero net new errors (104 -> 104 confirmado por git stash + tsc count). Critical paths (src/integrations/, src/lib/, src/app/) ficam TS-clean — mesmo gating standard do Plan 02-04. Os 104 errors pré-existentes estão herdados de Phase 3 (clima, evaluations, hiring) e serão refatorados em Plans 04-04, 04-06, 04-07 conforme tocarem os files."
  - "Aceitar runtime risk em CmdKPalette.tsx 2-arg call: o DROP FUNCTION global_search(text, int) significa que CmdKPalette atual (ainda chama com 2 args) vai falhar em runtime até Plan 05. Threat T-04-03-03 mitigado pelo plan: 'mitigated by deploying Plan 05 (Cmd+K refactor) only after this push completes'. Aceitação documentada em deferred-items.md."

requirements-completed:
  # Plan 04-03 não completa requirements DASH-01..04 — apenas desbloqueia consumers (Plans 04-04 e 04-05).
  # Os REQs marcam-se como completed quando os plans consumidores entregam UI.

# Metrics
duration: 6min
completed: 2026-04-29
---

# Phase 4 Plan 3: Schema Push Additive (BLOCKING) Summary

**2 migrations DASH (read_payroll_total RPC + global_search 3-arg signature) aplicadas ao remote `ehbxpbeijofxtsbezwxd`; types.ts regenerado contendo as duas funções; histórico de migrations reconciliado (14 ghost remote-only entries reverted + 14 Phase 3 applied) — desbloqueia Plan 04-04 (SocioDashboard refactor) e Plan 04-05 (Cmd+K palette refactor).**

## Performance

- **Duration:** ~6 min (380s)
- **Started:** 2026-04-29T11:08:22Z
- **Completed:** 2026-04-29T11:14:42Z
- **Tasks:** 1 (Task 1 — pre-push verify + push + post-push verify + regen + commit)
- **Files created:** 1 (this SUMMARY)
- **Files modified:** 2 (types.ts, deferred-items.md)
- **Migrations applied to remote:** 2 (DASH.1 + DASH.4)

## Accomplishments

- **P4-V03 pre-push verification passed**: confirmou colunas remotas `org_units(id, company_id)` e `org_unit_members(org_unit_id, user_id)` (ver §Verification Results abaixo)
- **Migration history reconciliation**: descoberto durante o push initial que Plan 03-05 aplicou 13 migrations Phase 3 via MCP (resultando em 14 ghost timestamps `20260428195*` remote-only). Resolvido com 2 calls de `supabase migration repair` antes do push real
- **2 migrations Plan 04-02 aplicadas ao remote**:
  - `20260430120000_dash1_read_payroll_total_rpc.sql` — RPC `read_payroll_total(p_company_ids uuid[])` STABLE SECURITY DEFINER, payload `{total_cost, headcount, avg_cost}` agregado-only, RLS via `visible_companies(actor)` re-check
  - `20260430120100_dash4_global_search_scope_param.sql` — DROP+CREATE `global_search(q text, max_per_kind int, p_company_ids uuid[])` SECURITY INVOKER, scope-aware filtros de candidato/job/person
- **P4-V05 post-push verification passed**: `pg_proc` confirma `read_payroll_total` (pronargs=1) e `global_search` (pronargs=3)
- **types.ts regenerado**: 3304 → 3333 linhas (+29). Contém:
  - `Functions.read_payroll_total: { Args: { p_company_ids?: string[] }; Returns: Json }`
  - `Functions.global_search.Args: { max_per_kind?: number; p_company_ids?: string[]; q: string }` (signature antiga 2-arg removida)
  - Bonus: schema `graphql_public` adicionado pelo regen (não relacionado mas inclui automaticamente)
- **Critical paths TS-clean**: `src/integrations/`, `src/lib/`, `src/app/` ficam zero tsc errors (P4 gating standard mantido)
- **ZERO net new tsc errors**: 104 pré-regen vs 104 pós-regen (verified via `git stash && tsc --noEmit | grep -cE "error TS"`)

## Task Commits

1. **Task 1: P4-V03 + push + P4-V05 + regen + verify** — `ef8f743` (feat)
   - Files: `src/integrations/supabase/types.ts`, `.planning/phases/04-dashboards-quality-polish/deferred-items.md`
   - +42 / -1 lines

## Files Created/Modified

| File | Change | Notes |
|------|--------|-------|
| `src/integrations/supabase/types.ts` | regenerated | 3304 → 3333 linhas; auto-gen canônico, Plan 04-02 surface present |
| `.planning/phases/04-dashboards-quality-polish/deferred-items.md` | appended | Documenta 0 net new tsc errors + CmdKPalette 2-arg runtime risk pendente para Plan 05 |
| `.planning/phases/04-dashboards-quality-polish/04-03-SUMMARY.md` | created | This file |

## Verification Results

### P4-V03 — Pre-push column-name verification (information_schema)

Command: `npx supabase db query --linked --output table "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name IN ('org_units','org_unit_members') ORDER BY 1, 2"`

```
┌──────────────────┬─────────────┐
│    table_name    │ column_name │
├──────────────────┼─────────────┤
│ org_unit_members │ created_at  │
│ org_unit_members │ is_primary  │
│ org_unit_members │ org_unit_id │
│ org_unit_members │ user_id     │
│ org_units        │ company_id  │
│ org_units        │ created_at  │
│ org_units        │ id          │
│ org_units        │ kind        │
│ org_units        │ name        │
│ org_units        │ parent_id   │
│ org_units        │ position    │
│ org_units        │ updated_at  │
└──────────────────┴─────────────┘
```

Expected columns present: ✅
- `org_units.id` ✓
- `org_units.company_id` ✓
- `org_unit_members.org_unit_id` ✓
- `org_unit_members.user_id` ✓

### Migration history reconciliation (pre-push prep)

Initial `supabase db push --linked --include-all --yes` failed:

```
Remote migration versions not found in local migrations directory.
[14 ghost timestamps 20260428195625..20260428204340 listed]
```

Investigation via `supabase db query --linked "SELECT version, name FROM supabase_migrations.schema_migrations WHERE version IN (...)"` revealed those 14 ghost timestamps map 1:1 (by name) to the 13 Phase 3 migrations + 1 backfill_fix that Plan 03-05 applied via MCP.

Resolution (2 commands):

1. Mark 14 local Phase 3 migration files as applied:
   ```
   npx supabase migration repair --linked --status applied \
     20260429120000 20260429120100 20260429120200 \
     20260429125000 20260429125100 20260429125150 20260429125200 \
     20260429130000 20260429130100 \
     20260429140000 20260429140100 \
     20260429150000 \
     20260429160000 20260429160100
   → Repaired migration history: [...] => applied
   ```
2. Mark 14 ghost remote-only timestamps as reverted:
   ```
   npx supabase migration repair --linked --status reverted \
     20260428195625 20260428195640 20260428195652 20260428195701 \
     20260428195715 20260428195726 20260428195747 20260428195803 \
     20260428195844 20260428195906 20260428195926 20260428195939 \
     20260428195949 20260428204340
   → Repaired migration history: [...] => reverted
   ```

Post-reconciliation `supabase migration list --linked` shows ONLY the 2 Plan 04-02 entries pending (last 2 lines, both with empty REMOTE column):
```
20260430120000 |                | 2026-04-30 12:00:00
20260430120100 |                | 2026-04-30 12:01:00
```

### supabase db push output

```
$ npx supabase db push --linked --include-all --yes
Initialising login role...
Connecting to remote database...
Do you want to push these migrations to the remote database?
 • 20260430120000_dash1_read_payroll_total_rpc.sql
 • 20260430120100_dash4_global_search_scope_param.sql

 [Y/n] y
Applying migration 20260430120000_dash1_read_payroll_total_rpc.sql...
Applying migration 20260430120100_dash4_global_search_scope_param.sql...
Finished supabase db push.
```

Exit code: 0 ✅

### Migrations applied (timestamps)

| Timestamp | Name | Result |
|-----------|------|--------|
| `20260430120000` | dash1_read_payroll_total_rpc | ✓ applied |
| `20260430120100` | dash4_global_search_scope_param | ✓ applied |

### P4-V05 — Mandatory post-push pg_proc verification

Command: `npx supabase db query --linked --output table "SELECT proname, pronargs FROM pg_proc WHERE proname IN ('read_payroll_total', 'global_search') ORDER BY proname, pronargs"`

```
┌────────────────────┬──────────┐
│      proname       │ pronargs │
├────────────────────┼──────────┤
│ global_search      │ 3        │
│ read_payroll_total │ 1        │
└────────────────────┴──────────┘
```

Expected ✅:
- `read_payroll_total` pronargs=1 (the `p_company_ids uuid[]` arg; default does not change pronargs) ✓
- `global_search` pronargs=3 (q, max_per_kind, p_company_ids) ✓

No 2-arg `global_search(text, int)` row remains — DROP applied successfully.

### types.ts before/after line count

| State | Lines |
|-------|-------|
| Pre-regen (committed in Plan 04-01) | 3304 |
| Post-regen (this plan) | 3333 |
| Delta | +29 |

`head -3 src/integrations/supabase/types.ts`:
```
export type Json =
  | string
  | number
```

First line is valid TypeScript — no `Initialising login role...` stderr leak (stderr redirect `2>/dev/null` worked correctly).

### Symbol presence verification (grep counts)

| Symbol | Count | Notes |
|--------|-------|-------|
| `read_payroll_total` | 1 | Compact one-liner format from CLI 2.95.6: `read_payroll_total: { Args: { p_company_ids?: string[] }; Returns: Json }` — Args + Returns on a single line. Functionally equivalent to multi-line block. |
| `global_search` | 1 | Multi-line block at line 2957: `Args: { max_per_kind?: number; p_company_ids?: string[]; q: string }` |
| `p_company_ids` | 2 | Once in each function's Args (read_payroll_total + global_search) |

Plan acceptance criteria of "≥2" for `read_payroll_total` was based on the assumption of multi-line Args/Returns. CLI 2.95.6 emits compact one-liner for this Returns-Json function. Semantic intent satisfied: the symbol IS present with both Args and Returns expressed.

### npm run build

❌ **FAIL — pre-existing rollup error, NOT caused by this plan.**

```
src/components/ClimateAnswerDialog.tsx (9:49): "useUserResponseIds" is not exported by "src/hooks/useClimateSurveys.ts"
```

Verified pre-existence via `git stash && npm run build` (errors identical with stashed regen). Same issue logged in `deferred-items.md` from Plan 04-01. Not in scope for Plan 04-03 (per SCOPE BOUNDARY rule: only fix issues directly caused by current task changes).

### tsc --noEmit (104 errors total — all pre-existing)

Pre-regen vs post-regen tsc count:

| State | Errors |
|-------|--------|
| Pre-regen (git stash) | 104 |
| Post-regen | 104 |
| **Net delta** | **0** |

Plan 04-03 introduced ZERO new tsc errors. Critical paths verified clean:
```
$ npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -E "^src/(integrations|lib|app)/"
(zero output)
```

`src/integrations/`, `src/lib/`, `src/app/` are TS-clean post-regen — same gating standard as Plan 02-04.

## Decisions Made

- **Reconcile migration history before push** (architectural deviation Rule 3 — blocking): The supabase CLI requires history alignment before push. Plan 03-05 applied 13 Phase 3 migrations via MCP (bypassing migration history tracking), creating ghost remote-only timestamps `20260428195*`. Initial `db push --include-all` failed. Resolved using `supabase migration repair` in two passes: mark local Phase 3 files as applied (status applied for 14 timestamps `20260429*`); revert ghost remote-only timestamps (status reverted for 14 timestamps `20260428195*..20260428204340`). After reconciliation, only 2 Plan 04-02 migrations remained pending and applied cleanly. Schema state on remote was unchanged by repair operations (history table only).

- **Accept 104 pre-existing tsc errors as out-of-scope**: same gating pattern as Plan 02-04. Critical paths (`src/integrations/`, `src/lib/`, `src/app/`) are TS-clean; remaining errors live in components/hooks/pages that subsequent Phase 4 plans will refactor. Verified zero net delta from regen via stash-based comparison.

- **Accept CmdKPalette.tsx 2-arg runtime risk until Plan 05**: DROP FUNCTION removed the 2-arg `global_search` signature; CmdKPalette current code calls `supabase.rpc("global_search", { q, max_per_kind })` with 2 args. Threat T-04-03-03 in plan threat_model already pre-mitigates this: deploy CmdKPalette refactor (Plan 04-05) before user-facing build. Documented in deferred-items.md.

- **Use `supabase db query --linked` instead of `db execute --linked`**: CLI 2.95.6 does not expose `db execute` subcommand; `db query` is the direct equivalent (executes SQL via Management API against linked project). Both P4-V03 and P4-V05 used `db query --output table`. No semantic loss.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] supabase db push failed: ghost remote-only migration timestamps from Plan 03-05 MCP apply**
- **Found during:** Step 2 (initial `db push --linked --include-all --yes` invocation)
- **Issue:** Plan 03-05 applied 13 Phase 3 migrations (+ 1 backfill fix) via MCP in 2026-04-28, creating remote schema_migrations rows with timestamps `20260428195625..20260428204340` that have no corresponding local files (local files are `20260429120000..20260429160100`). The CLI refused to push, listing 14 ghost remote-only timestamps. Without resolution, push could not proceed and Plan 04-03 was blocked.
- **Fix:** Two `supabase migration repair --linked` invocations: first marked the 14 local files as applied (their schema is in fact present on remote — verified via `pg_tables`/`pg_proc` spot check — only history was missing); second reverted the 14 ghost timestamps (CLI's own suggestion in the failure message). Schema unchanged.
- **Files modified:** None in repo; remote `supabase_migrations.schema_migrations` table updated.
- **Verification:** `supabase migration list --linked | tail -3` after reconciliation shows only the 2 Plan 04-02 timestamps pending. Push then proceeded cleanly applying both.
- **Committed in:** No code commit for repair operations (history table change is remote-side only); the resulting types.ts regen and deferred-items update are in `ef8f743`.

**2. [Rule 1 - Bug variant] db execute --linked unavailable in CLI 2.95.6 → use db query --linked**
- **Found during:** Step 1 (planning P4-V03 pre-push check)
- **Issue:** Plan 04-03 specifies `npx supabase db execute --linked "<sql>"` for both P4-V03 and P4-V05. CLI 2.95.6 (current local install) does not expose `db execute` (verified `npx supabase db --help` shows only `query`, no `execute`).
- **Fix:** Substituted `db query --linked --output table "<sql>"` — direct equivalent (executes SQL via Management API, returns table format). Both P4-V03 and P4-V05 used this. No semantic loss; outputs captured above.
- **Files modified:** None.
- **Verification:** Both P4 verification gates returned expected results.

---

**Total deviations:** 2 auto-fixed (1 Rule 3 - blocking infrastructure; 1 Rule 1 - CLI command name). Both within scope of executing the plan; no architectural changes.

**Impact on plan:** Both fixes essential for unblocking. Migration history reconciliation is a one-time event for this codebase (now consistent going forward). CLI command substitution is permanent for CLI 2.95.6+ usage.

## Issues Encountered

- **Pre-existing build break (`useUserResponseIds`)**: rollup error in `ClimateAnswerDialog.tsx`. Same issue logged in `deferred-items.md` from Plan 04-01. Verified pre-existence via stash-based test. Out of scope for Plan 04-03.

- **104 pre-existing tsc errors revealed/maintained**: Same backlog from Plan 02-04 era (38 → grew to 104 across Phase 3). Plan 04-03 regen added zero net new errors. Critical paths remain clean.

- **CmdKPalette.tsx still calls global_search with 2 args (will fail at runtime)**: pre-mitigated by threat model T-04-03-03; plan-level acceptance to defer fix to Plan 04-05 before user-facing build.

## Authentication Gates

None. `npx supabase` was already authenticated against project `ehbxpbeijofxtsbezwxd` from prior plans. Push, gen types, db query, and migration repair all worked without prompts.

## User Setup Required

None. Schema is in sync between local migrations and remote; types.ts regenerated and committed; downstream Plans 04-04 (SocioDashboard) and 04-05 (Cmd+K) can now consume:

- `Database["public"]["Functions"]["read_payroll_total"]["Args"]` → `{ p_company_ids?: string[] }`
- `Database["public"]["Functions"]["read_payroll_total"]["Returns"]` → `Json`
- `Database["public"]["Functions"]["global_search"]["Args"]` → `{ q: string; max_per_kind?: number; p_company_ids?: string[] }`
- `Database["public"]["Functions"]["global_search"]["Returns"]` → `{ id, kind, title, subtitle, url }[]`

## Threat Flags

No new surface introduced beyond the threat_model declared in the plan. Plan-level threats:

- **T-04-03-01 (Tampering — schema push without review):** accepted; both migrations are CREATE OR REPLACE / DROP+CREATE — fully reversible.
- **T-04-03-02 (Information Disclosure — types.ts):** accepted; canonical practice from Plan 02-04.
- **T-04-03-03 (DoS — DROP global_search 2-arg):** mitigated; CmdKPalette refactor scheduled for Plan 04-05 before user-facing build.
- **T-04-03-04 (Repudiation — silent SQL error masked by regen):** mitigated; P4-V05 pg_proc verification was executed and confirmed both functions present with correct pronargs (no fallback to "rely on regen").
- **T-04-03-05 (Tampering — Plan 02 SQL targets non-existent columns):** mitigated; P4-V03 information_schema verification confirmed all 4 expected columns before push.

## Next Phase Readiness

- **Plan 04-04 (SocioDashboard refactor)** — ✅ UNBLOCKED. Can now consume `read_payroll_total` RPC for DASH-01/02/03 KPIs (folha total + custo médio + headcount) with company-scoped + group-scoped breakdown logic.
- **Plan 04-05 (Cmd+K palette refactor)** — ✅ UNBLOCKED. Can now consume `global_search` 3-arg signature with `p_company_ids` scope filter for DASH-04 (D-09 scope enforcement). Plan 04-05 MUST land before user-facing build to retire the 2-arg runtime call site in CmdKPalette.tsx.

## Self-Check: PASSED

Verifications run:
- `[ -f src/integrations/supabase/types.ts ] && wc -l` → 3333 lines, contains `read_payroll_total` (1×) and `global_search` (1×) and `p_company_ids?: string[]` (2×)
- `git log --oneline | grep ef8f743` → present (commit found)
- `git diff --diff-filter=D HEAD~1 HEAD` → no deletions
- `npx supabase migration list --linked | grep -E "20260430120000|20260430120100"` → both rows show as applied (LOCAL = REMOTE, no empty middle column)
- P4-V03 result captured (12 rows from information_schema; all expected columns present)
- P4-V05 result captured (`global_search` pronargs=3, `read_payroll_total` pronargs=1)
- types.ts first line is `export type Json =` (no stderr leak)
- Critical paths (`src/integrations/`, `src/lib/`, `src/app/`) tsc-clean
- Net new tsc errors = 0 (104 → 104)

---

*Phase: 04-dashboards-quality-polish*
*Completed: 2026-04-29*
