---
phase: 04-dashboards-quality-polish
plan: 03
type: execute
wave: 2
depends_on:
  - 02
files_modified:
  - src/integrations/supabase/types.ts
autonomous: true
requirements:
  - DASH-01
  - DASH-02
  - DASH-03
  - DASH-04
tags:
  - schema-push
  - blocking
  - additive
  - phase-4

must_haves:
  truths:
    - "supabase db push --linked --include-all completed without errors"
    - "Pre-push column-name verification (P4-V03 / P4-V05) confirmed org_units(id, company_id) and org_unit_members(org_unit_id, user_id) exist on remote BEFORE the push"
    - "Both migrations from Plan 02 exist on remote (read_payroll_total + global_search 3-arg signature) — verified via pg_proc query AFTER push (P4-V05 — mandatory, not skippable)"
    - "src/integrations/supabase/types.ts is regenerated and reflects the new function signatures"
    - "npm run build still succeeds after types regeneration"
  artifacts:
    - path: src/integrations/supabase/types.ts
      provides: "Regenerated types post-Plan-02 schema push; read_payroll_total signature in Functions block"
      contains: "read_payroll_total"
  key_links:
    - from: "supabase remote"
      to: "src/integrations/supabase/types.ts"
      via: "npx supabase gen types typescript --linked"
      pattern: "read_payroll_total|global_search"
---

<objective>
[BLOCKING] Push Plan 02's two additive migrations to the remote Supabase project (`ehbxpbeijofxtsbezwxd`) and regenerate the canonical TypeScript types so consumers in Plans 04/05 are type-safe. The migrations are additive (CREATE OR REPLACE function + DROP+CREATE function) — fully reversible by replaying the previous signature.

Includes a pre-push column-name verification step (P4-V03 — confirms `org_units.company_id` and `org_unit_members.user_id` exist on remote) and a mandatory post-push pg_proc verification (P4-V05 — confirms both new functions are present; no silent reliance on regen).

Purpose: Ensure the live database matches the source migrations before Plan 04 (SocioDashboard) and Plan 05 (Cmd+K) call the new RPCs. Build/type checks alone would NOT catch a missing RPC at runtime — types come from this regen, not from the live DB. Schema push WITHOUT the verification gate would mask Plan 02 SQL errors until UAT.

Output: Migrations applied to remote; types.ts updated; verification of read_payroll_total and global_search 3-arg signatures captured in the SUMMARY for the operator.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/phases/04-dashboards-quality-polish/04-CONTEXT.md
@CLAUDE.md
@.planning/phases/02-r-s-refactor/02-04-SUMMARY.md
@supabase/migrations/20260430120000_dash1_read_payroll_total_rpc.sql
@supabase/migrations/20260430120100_dash4_global_search_scope_param.sql
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Pre-push column-name verification (P4-V03) + supabase db push --linked --include-all + mandatory post-push pg_proc verification (P4-V05) + regen types</name>
  <files>src/integrations/supabase/types.ts</files>
  <read_first>
    - .planning/phases/02-r-s-refactor/02-04-SUMMARY.md (the canonical Phase 2 schema push playbook — same project, same flags; reuse exactly)
    - supabase/migrations/20260430120000_dash1_read_payroll_total_rpc.sql (Plan 02 Task 1 output)
    - supabase/migrations/20260430120100_dash4_global_search_scope_param.sql (Plan 02 Task 1 output — confirm the P4-V03 pre-flight comment is present)
  </read_first>
  <action>
    1) **P4-V03 / P4-V05 — Pre-push column-name verification (do this FIRST, before pushing).**

    Confirm the column names referenced by Plan 02's global_search SQL exist on the remote DB. This catches schema drift between Phase 3 backfill and Plan 02 assumptions BEFORE the migration is applied.

    ```bash
    npx supabase db execute --linked "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name IN ('org_units','org_unit_members') ORDER BY 1, 2"
    ```

    Expected rows (at minimum):
    - `org_units` → `id`
    - `org_units` → `company_id`
    - `org_unit_members` → `org_unit_id`
    - `org_unit_members` → `user_id`

    Branch:
    - If all four expected columns are present → continue to step 2.
    - If `npx supabase db execute --linked` is unavailable in this CLI version → STOP. Do NOT skip and rely on regen. The executor MUST request operator action: either upgrade the CLI, run the equivalent query via psql against `ehbxpbeijofxtsbezwxd`, or run via the Supabase Studio SQL editor and paste results back. Record the verification output in the SUMMARY.
    - If any expected column is MISSING or RENAMED → STOP. Surface to operator: Plan 02 SQL must be adapted to the actual schema before the push.

    2) Run schema push:

    ```bash
    npx supabase db push --linked --include-all
    ```

    Expected output: prints the two new migrations and applies them. If the CLI complains about uncommitted changes, that's fine — push respects file order.

    3) **P4-V05 — Mandatory post-push pg_proc verification.**

    This is no longer optional. Confirm both new functions are present on remote:

    ```bash
    npx supabase db execute --linked "SELECT proname, pronargs FROM pg_proc WHERE proname IN ('read_payroll_total', 'global_search') ORDER BY proname, pronargs"
    ```

    Expected rows:
    - `read_payroll_total` with `pronargs = 1` (the `p_company_ids uuid[]` arg; default does not change pronargs)
    - `global_search` with `pronargs = 3` (q, max_per_kind, p_company_ids)

    Branch:
    - If both rows present with the expected arg counts → continue to step 4.
    - If `db execute --linked` is unavailable → STOP. Operator action required (psql or Studio SQL editor) BEFORE proceeding to types regen. Do NOT silently skip and "rely on regen" — that path masks SQL errors that the regen file may still parse without runtime validation. Record the verification result in the SUMMARY.
    - If either function is missing or has the wrong pronargs → STOP. Migration partially applied or signature drift; surface to operator.

    4) Regenerate types — MUST use stderr redirect to avoid "Initialising login role..." leaking into stdout (per Plan 02-04 lock):

    ```bash
    npx supabase gen types typescript --linked 2>/dev/null > src/integrations/supabase/types.ts
    ```

    5) Verify the regen contains the new function:

    ```bash
    grep -c "read_payroll_total" src/integrations/supabase/types.ts
    grep -c "global_search" src/integrations/supabase/types.ts
    ```

    Both must be at least 1 (likely 3-4 due to Args/Returns blocks).

    6) Verify TypeScript still compiles:

    ```bash
    npm run build
    ```

    If build fails with "p_company_ids" type errors elsewhere (existing global_search 2-arg call sites), fix those call sites by adding `p_company_ids: undefined` or migrating them in the appropriate plan (Plan 05 owns the Cmd+K refactor; quick scan for other callers via `grep -rn "global_search" src/` should reveal if any other code besides CmdKPalette.tsx calls the RPC — if yes, surface as blocker).
  </action>
  <verify>
    <automated>grep -c "read_payroll_total" src/integrations/supabase/types.ts</automated>
  </verify>
  <acceptance_criteria>
    - **P4-V03 pre-push verification recorded** in SUMMARY: output of `information_schema.columns` query confirms `org_units(id, company_id)` and `org_unit_members(org_unit_id, user_id)` rows are present on remote BEFORE the push
    - Command `npx supabase db push --linked --include-all` exits 0 (no errors in output)
    - **P4-V05 post-push verification recorded** in SUMMARY: output of `pg_proc` query confirms BOTH `read_payroll_total` AND `global_search` (with `pronargs = 3`) are present on remote AFTER the push. Verification did NOT fall back to "rely on regen" — it must be an explicit pg_proc result captured in the summary.
    - `grep -c "read_payroll_total" src/integrations/supabase/types.ts` returns at least 2 (Args + Returns blocks)
    - `grep -c "p_company_ids" src/integrations/supabase/types.ts` returns at least 2 (in read_payroll_total and global_search Args)
    - `wc -l src/integrations/supabase/types.ts` > 3000 (regen produced a real file, not a stub)
    - `npm run build 2>&1 | grep -E "error TS"` returns 0 lines (no TypeScript errors)
    - First line of types.ts does NOT contain "Initialising login role" (stderr redirect was correct)
  </acceptance_criteria>
  <done>Pre-push column-name verification passed (P4-V03); migrations on remote; post-push pg_proc verification confirms both functions exist with expected pronargs (P4-V05); types regenerated; build clean.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| local migrations → remote DB | Schema change applied to live system; no production users yet but data persists |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-04-03-01 | Tampering | Schema push without review | accept | Migrations are CREATE OR REPLACE / DROP+CREATE — fully reversible by replaying prior signature; no data destruction |
| T-04-03-02 | Information Disclosure | types.ts contains internal Database shape | accept | Already canonical practice (Plan 02-04); types are public symbols anyway |
| T-04-03-03 | Denial of Service | DROP FUNCTION global_search 2-arg signature | mitigate | Brief window where any cached call site might fail; mitigated by deploying Plan 05 (Cmd+K refactor) only after this push completes; existing CmdKPalette.tsx still uses 2-arg call but Plan 05 fixes it before user-facing build |
| T-04-03-04 | Repudiation | Migration silently broken (regen masks SQL error) | mitigate | P4-V05 — pg_proc verification is mandatory and recorded in SUMMARY. Fallback "rely on regen" path is removed; if the CLI cannot execute the verification, operator action is required. |
| T-04-03-05 | Tampering | Plan 02 SQL targets non-existent columns | mitigate | P4-V03 — pre-push information_schema verification confirms column names BEFORE the push. If columns drifted in Phase 3, executor stops and adapts. |
</threat_model>

<verification>
- P4-V03 pre-push column-name check passes; output captured in SUMMARY
- supabase db push exits 0
- P4-V05 post-push pg_proc check passes for both functions; output captured in SUMMARY
- types.ts updated with read_payroll_total and 3-arg global_search
- npm run build exits 0
</verification>

<success_criteria>
- Pre-push verification confirmed schema columns match Plan 02 assumptions (P4-V03)
- Both Plan 02 migrations applied to remote `ehbxpbeijofxtsbezwxd`
- Post-push pg_proc verification confirmed both new functions exist with expected signatures (P4-V05; mandatory, no fallback skip)
- types.ts regenerated; new RPCs visible in Functions block
- Build still passes
</success_criteria>

<output>
After completion, create `.planning/phases/04-dashboards-quality-polish/04-03-SUMMARY.md` documenting:
- P4-V03 pre-push: full text of the `information_schema.columns` query result (or operator-provided equivalent)
- supabase db push output (last 20 lines)
- Migrations applied (timestamps)
- P4-V05 post-push: full text of the `pg_proc` query result for both functions (mandatory; not "skipped because regen worked")
- types.ts before/after line count
- Confirmation grep for read_payroll_total and p_company_ids returned positive
- Any unexpected behavior or warnings
</output>
</output>
