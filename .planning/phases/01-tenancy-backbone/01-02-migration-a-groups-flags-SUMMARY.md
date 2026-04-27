---
phase: 01-tenancy-backbone
plan: 02
subsystem: database
tags: [supabase, postgres, rls, migrations, multi-tenancy, ddl]

# Dependency graph
requires:
  - phase: 01-tenancy-backbone
    provides: Plan 01 — pgTAP test infrastructure (tests reference company_groups, group_id, feature flags)
provides:
  - company_groups table (uuid PK, name, slug unique, timestamps, slug_format CHECK constraint)
  - companies.performance_enabled boolean flag (NOT NULL DEFAULT false)
  - companies.rs_enabled boolean flag (NOT NULL DEFAULT false)
  - companies.group_id nullable uuid FK to company_groups(id) ON DELETE SET NULL
  - idx_companies_group_id partial index (WHERE group_id IS NOT NULL)
  - RLS enabled on company_groups with select_authenticated + mutate_managers policies
  - tg_company_groups_updated_at trigger (reuses existing tg_set_updated_at helper)
  - supabase/config.toml realigned to project ehbxpbeijofxtsbezwxd
affects: [01-03 (Migration B org_units), 01-04 (Migration C socio_memberships + backfill), 01-05 (frontend chokepoint), all later phases reading group_id / feature flags]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Multi-tenant grouping primitive via company_groups (TEN-03) — companies.group_id nullable FK keeps standalone external clients valid (NULL = no group)"
    - "Feature flags on companies (TEN-02) — performance_enabled / rs_enabled drive module visibility per company instead of an is_internal/external bool"
    - "RLS pattern for public-metadata tables — select USING (true) for authenticated, mutate gated on is_people_manager((SELECT auth.uid())); follows the RBAC-10 initPlan caching idiom"

key-files:
  created:
    - supabase/migrations/20260427120000_a_company_groups_and_feature_flags.sql
  modified:
    - supabase/config.toml

key-decisions:
  - "RLS on company_groups uses USING (true) for SELECT — group rows are public metadata; effective access is enforced at scope-resolution time via visible_companies() (Plan 04), not by row filtering on company_groups itself."
  - "Mutations on company_groups gated on the existing is_people_manager helper (admin/socio/rh) — same role gate that protects companies CRUD, so RH can manage groups without inventing a new role."
  - "Reused existing tg_set_updated_at helper (defined in 20260416193000_hiring_core_entities.sql) and is_people_manager helper (defined in 20260422130000_align_admin_role_policies.sql) — no helper duplication."
  - "Used lowercase types (uuid, boolean, text, timestamptz) matching the 20260422130000 precedent rather than the older uppercase UUID[] anti-pattern flagged in PATTERNS.md."
  - "All operations idempotent (IF NOT EXISTS on ALTER, CREATE TABLE, CREATE INDEX) — migration is rerunnable without errors if half-applied during dev."
  - "Did NOT run supabase db push from this worktree — Migration C (Plan 04) batches the push for all wave-1 migrations after the human-approval checkpoint."

patterns-established:
  - "Phase-1 migration filename convention: {YYYYMMDDHHMMSS}_{a|b|c}_{snake_case_description}.sql"
  - "Header-comment style: ===== border + objective + reversibility statement + threats-mitigated bullet list + REQ-ID footer; copied from the 20260422130000 admin-role precedent."

requirements-completed: [TEN-01, TEN-02, TEN-03]

# Metrics
duration: 1m30s
completed: 2026-04-27
---

# Phase 01 Plan 02: Migration A — `company_groups` + Feature Flags Summary

**Reversible SQL migration adding the `company_groups` grouping primitive, `companies.performance_enabled`/`rs_enabled` boolean flags, and a nullable `companies.group_id` FK — all with RLS enabled in the same migration; supabase config realigned to project `ehbxpbeijofxtsbezwxd`.**

## Performance

- **Duration:** 1m 30s
- **Started:** 2026-04-27T19:15:39Z
- **Completed:** 2026-04-27T19:17:09Z
- **Tasks:** 2 / 2
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments

- Authored Migration A SQL file at the planned timestamp `20260427120000`, ordered after the latest pre-existing migration (`20260422190000_global_search_rpc.sql`).
- Introduced `company_groups` (TEN-03) with slug-format CHECK, unique constraint, timestamps, and `tg_set_updated_at` trigger.
- Added `companies.performance_enabled` and `companies.rs_enabled` (TEN-02) defaulting to `false`, plus nullable `companies.group_id` FK with `ON DELETE SET NULL` and a partial index `idx_companies_group_id` (only when `group_id IS NOT NULL`).
- Enabled RLS on `company_groups` in the same migration that creates it (no default-allow gap); two policies: `company_groups:select_authenticated` (USING true) and `company_groups:mutate_managers` (USING/WITH CHECK `public.is_people_manager((SELECT auth.uid()))`).
- Realigned `supabase/config.toml` from the stale `wrbrbhuhsaaupqsimkqz` to the live project `ehbxpbeijofxtsbezwxd`, so subsequent `supabase db push` (in Plan 04) routes to the correct database.

## Task Commits

Each task was committed atomically with `--no-verify` (parallel-executor convention):

1. **Task 02-01: Create Migration A SQL file** — `d5c34ca` (feat)
2. **Task 02-02: Fix supabase/config.toml project_id** — `6f69c8e` (fix)

_No final metadata commit was made because per orchestrator instructions this worktree does NOT modify `.planning/STATE.md` or `.planning/ROADMAP.md`. The SUMMARY.md commit closes out the plan._

## Files Created/Modified

- `supabase/migrations/20260427120000_a_company_groups_and_feature_flags.sql` (created, 71 lines) — Migration A: feature flags on `companies`, `company_groups` table + RLS + policies, `companies.group_id` FK + partial index, `COMMENT ON COLUMN/TABLE` documentation tying each surface back to TEN-01/02/03.
- `supabase/config.toml` (modified, 1 line) — `project_id` updated to `ehbxpbeijofxtsbezwxd` (function-level `verify_jwt` settings preserved).

## Decisions Made

All decisions followed the plan as specified — no implementation choices were left to executor discretion. The plan provided the exact SQL verbatim and the exact one-line config edit. Recording the rationale of plan-level choices for traceability:

- **Slug format CHECK constraint** uses POSIX regex `^[a-z0-9]+(?:-[a-z0-9]+)*$` (kebab-case, no leading/trailing/double hyphens). Matches the typical "grupo-lever" / "client-acme" convention.
- **`group_id` is nullable** (not NOT NULL) so the migration is fully reversible and keeps standalone external clients (no group) valid — TEN-03 explicitly accepts NULL meaning "standalone."
- **Partial index `WHERE group_id IS NOT NULL`** avoids storing redundant tuples for the (expected majority) standalone clients.
- **RLS `USING (true)` on SELECT** is intentional — the user's effective access to a group is determined at scope-resolution time via `visible_companies()` (Plan 04), not by row-level filtering on `company_groups` itself. Row-level filtering here would create false negatives for admins/RH who need to see groups they don't currently belong to.

## Deviations from Plan

None — plan executed exactly as written. The plan provided verbatim SQL and a one-line edit; both went in unchanged. No Rule-1/2/3 auto-fixes were necessary, and no Rule-4 architectural decisions surfaced.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required for this plan. The `supabase db push` that applies this migration to the remote database happens in **Plan 04** (Migration C) along with the rest of wave 1, after a human-approval checkpoint.

## Next Phase Readiness

- **Plan 03 (Migration B — org_units + RLS helpers)** can be executed in parallel: it does not depend on the schema introduced here (it adds new tables) and the RLS helpers it introduces will coexist with the policies created here.
- **Plan 04 (Migration C — socio_memberships + visible_companies + backfill)** depends on this plan: the backfill in Plan 04 will set `company_groups` rows for the 7 internal Lever companies and populate `companies.group_id` for them.
- **Plan 05+** (frontend chokepoint) can read `performance_enabled`/`rs_enabled`/`group_id` once `supabase/integrations/types.ts` is regenerated post-push (regen happens in Plan 04 task chain).
- **No blockers.** Migration is reversible (DROP TABLE / DROP COLUMN); app code does not yet read the new columns, so the live database remains backwards-compatible until Plan 05 lands.

## TDD Gate Compliance

Not applicable — plan frontmatter is `type: execute`, not `type: tdd`. Coverage of these schema additions lives in the pgTAP suite established in Plan 01, which is invoked end-to-end against the live DB after Plan 04's push.

## Self-Check: PASSED

Verified file presence and commit hashes:

- `supabase/migrations/20260427120000_a_company_groups_and_feature_flags.sql` — FOUND (71 lines, all asserted patterns present)
- `supabase/config.toml` — first line is `project_id = "ehbxpbeijofxtsbezwxd"`; legacy `wrbrbhuhsaaupqsimkqz` absent
- Commit `d5c34ca` (task 02-01) — FOUND in `git log`
- Commit `6f69c8e` (task 02-02) — FOUND in `git log`
- Anti-patterns absent: no `UUID[]`, no bare `auth.uid()` (3 occurrences, all wrapped in `(SELECT ...)`)
- `supabase db push` NOT executed (verified — orchestrator owns push in Plan 04)
- `.planning/STATE.md` and `.planning/ROADMAP.md` NOT modified (verified via `git status` clean before SUMMARY commit)

---
*Phase: 01-tenancy-backbone*
*Completed: 2026-04-27*
