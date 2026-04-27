---
phase: 1
plan: 02
type: execute
wave: 1
depends_on: [01]
files_modified:
  - supabase/migrations/20260427120000_a_company_groups_and_feature_flags.sql
  - supabase/config.toml
autonomous: true
requirements: [TEN-01, TEN-02, TEN-03]
---

# Plan 02: Migration A — `company_groups` + Feature Flags

<objective>
Ship Migration A: introduce `company_groups` table (genéric grouping primitive), add `performance_enabled`/`rs_enabled` boolean flags to `companies`, and add nullable `companies.group_id` foreign key. All changes are reversible (DROP TABLE / DROP COLUMN); app code does not yet read these new columns. Also fix `supabase/config.toml` `project_id` (currently still pointing at the old project per memory `project_supabase_migration.md`).
</objective>

<requirements_addressed>
- **TEN-01**: Empresa é entidade única (`companies`) — no schema change required, but Migration A's documentation comment confirms the contract (no `is_internal`/`is_external` flag).
- **TEN-02**: `companies.performance_enabled` and `companies.rs_enabled` flags added with `default false`.
- **TEN-03**: `company_groups` table created (id, slug, name, timestamps); `companies.group_id` column added (nullable, FK).
</requirements_addressed>

<threat_model>
- **T-1-01 (HIGH) — Cross-tenant data leakage during retrofit:** `company_groups` ships with `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` immediately after `CREATE TABLE` and explicit policies in the SAME migration — never default-allow gap. The `select_authenticated` policy is `USING (true)` (groups are inherently public metadata since the user's group affiliation is filtered at scope-resolution time, not row-by-row), but `mutate_managers` requires `is_people_manager` — only admin/socio/rh can mutate group rows.
- **T-1-02 (HIGH) — RLS recursion / privilege bypass:** Policies use `(SELECT auth.uid())` initPlan caching pattern (RBAC-10) and call existing `public.is_people_manager((SELECT auth.uid()))` helper which is already `STABLE SECURITY DEFINER SET search_path = public`.
- **T-1-04 (MEDIUM) — PII in logs:** No PII is added by this migration. Comments and column descriptions reference Grupo Lever by name — that's not PII.
</threat_model>

<tasks>

<task id="02-01">
<action>
Create the SQL migration file `supabase/migrations/20260427120000_a_company_groups_and_feature_flags.sql`. Use the timestamp `20260427120000` to ensure ordering AFTER existing migrations (the latest existing per `ls supabase/migrations/` is `20260422130000_align_admin_role_policies.sql`).

The file MUST include the header comment, all schema additions, RLS enablement + 2 policies, and `COMMENT ON COLUMN/TABLE` documentation. Use `IF NOT EXISTS` everywhere for idempotency.

Exact content (copy verbatim):

```sql
-- =========================================================================
-- Migration A: company_groups + companies feature flags + nullable group_id
--
-- Adds the multi-tenant grouping primitive WITHOUT changing app behavior.
-- Existing app code does not read group_id or feature flags yet — Plan 05
-- (frontend chokepoint) will start consuming them.
--
-- Reversibility: DROP TABLE company_groups; ALTER TABLE companies DROP COLUMN
-- group_id, performance_enabled, rs_enabled. All backwards-safe.
--
-- Threats mitigated:
--   T-1-01 (cross-tenant leakage): RLS enabled on company_groups in same
--     migration that creates it. mutate restricted to is_people_manager.
--   T-1-02 (RLS recursion): policies use (SELECT auth.uid()) initPlan idiom
--     and call existing SECURITY DEFINER helper is_people_manager.
--
-- REQs: TEN-01 (contract), TEN-02 (flags), TEN-03 (table + group_id).
-- =========================================================================

-- 1) Feature flags on existing companies table
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS performance_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rs_enabled          boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.companies.performance_enabled IS
  'When true, this company has the Performance module (1:1, evaluations, climate) active. Default false; RH/Admin liga ao cadastrar uma empresa que vai usar Performance. TEN-02.';

COMMENT ON COLUMN public.companies.rs_enabled IS
  'When true, this company has Recrutamento & Seleção active. Default false; RH/Admin liga ao cadastrar. TEN-02.';

-- 2) company_groups table (TEN-03)
CREATE TABLE IF NOT EXISTS public.company_groups (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text NOT NULL UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT NOW(),
  updated_at  timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

COMMENT ON TABLE public.company_groups IS
  'Generic grouping of companies (e.g., "Grupo Lever" gathers the 7 internal Lever companies). External clients can have their own groups. TEN-03.';

CREATE TRIGGER tg_company_groups_updated_at
  BEFORE UPDATE ON public.company_groups
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.company_groups ENABLE ROW LEVEL SECURITY;

-- Group rows are visible to any authenticated user (the user's effective access
-- to a group is determined at scope-resolution time via visible_companies(), not
-- via row-level filtering on this table). Mutations restricted to people managers.
CREATE POLICY "company_groups:select_authenticated"
  ON public.company_groups FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "company_groups:mutate_managers"
  ON public.company_groups FOR ALL TO authenticated
  USING (public.is_people_manager((SELECT auth.uid())))
  WITH CHECK (public.is_people_manager((SELECT auth.uid())));

-- 3) Optional group_id on companies (TEN-03)
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.company_groups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_companies_group_id
  ON public.companies(group_id)
  WHERE group_id IS NOT NULL;

COMMENT ON COLUMN public.companies.group_id IS
  'Optional grouping (e.g., Grupo Lever for the 7 internal companies). NULL = standalone external client. TEN-03.';
```

**Important pattern notes (from PATTERNS.md and existing codebase):**
- Helper function `tg_set_updated_at()` already exists in the schema (used by all `*_updated_at` triggers in prior migrations). Do not redefine it.
- Helper `is_people_manager((SELECT auth.uid()))` already exists from migration `20260422130000_align_admin_role_policies.sql` — use it as-is. The `(SELECT ...)` wrap is the RBAC-10 initPlan caching idiom (mandatory).
- Use lowercase `uuid`, `boolean`, `text`, `timestamptz` (matches `20260422130000` precedent — anti-pattern PATTERNS.md flagged the uppercase `UUID[]` style of the older `20260416193100`).
- Policy naming follows the canonical `<table>:<action>:<role>` style (e.g., `company_groups:select_authenticated`, `company_groups:mutate_managers`) per PATTERNS.md.

DO NOT push the migration in this task — push happens in Plan 04 task 04-05 (single batched push). This task only writes the file.
</action>
<read_first>
- `supabase/migrations/20260422130000_align_admin_role_policies.sql` — full file. Confirms `is_people_manager` signature, `(SELECT auth.uid())` pattern, policy naming convention.
- `supabase/migrations/20260416193000_hiring_core_entities.sql` — reference for header comment style and multi-table migration pattern.
- `.planning/phases/01-tenancy-backbone/01-RESEARCH.md` lines 1043-1107 — full Migration A SQL spec.
- `.planning/phases/01-tenancy-backbone/01-PATTERNS.md` lines 90-129 — analog references and anti-patterns to avoid.
- `ls supabase/migrations/` — verify no migration with timestamp `20260427120000` already exists.
- Quick grep `grep -n "tg_set_updated_at" supabase/migrations/*.sql | head -3` — confirms helper already exists in earlier migrations.
</read_first>
<acceptance_criteria>
- File `supabase/migrations/20260427120000_a_company_groups_and_feature_flags.sql` exists.
- File contains `ALTER TABLE public.companies` followed by `ADD COLUMN IF NOT EXISTS performance_enabled boolean NOT NULL DEFAULT false`.
- File contains `ADD COLUMN IF NOT EXISTS rs_enabled          boolean NOT NULL DEFAULT false` (note 2-space alignment is non-mandatory, but `rs_enabled` boolean default false MUST be present).
- File contains `CREATE TABLE IF NOT EXISTS public.company_groups`.
- File contains `slug` column with `text NOT NULL UNIQUE`.
- File contains `CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')`.
- File contains `ALTER TABLE public.company_groups ENABLE ROW LEVEL SECURITY`.
- File contains EXACTLY two policies on `company_groups`: `"company_groups:select_authenticated"` (FOR SELECT, USING true) and `"company_groups:mutate_managers"` (FOR ALL, using `is_people_manager((SELECT auth.uid()))`).
- File contains `ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.company_groups(id) ON DELETE SET NULL` on the `companies` table.
- File contains `CREATE INDEX IF NOT EXISTS idx_companies_group_id`.
- File contains `(SELECT auth.uid())` (NOT bare `auth.uid()`).
- File does NOT contain uppercase `UUID[]` (anti-pattern from `20260416193100`).
- `psql --dry-run` style validation (manual): file is parseable PostgreSQL — verify by `cat supabase/migrations/20260427120000_a_company_groups_and_feature_flags.sql | head -10` shows the header comment.
</acceptance_criteria>
<files>
- `supabase/migrations/20260427120000_a_company_groups_and_feature_flags.sql`
</files>
<automated>
test -f supabase/migrations/20260427120000_a_company_groups_and_feature_flags.sql && grep -q "performance_enabled" supabase/migrations/20260427120000_a_company_groups_and_feature_flags.sql && grep -q "rs_enabled" supabase/migrations/20260427120000_a_company_groups_and_feature_flags.sql && grep -q "company_groups" supabase/migrations/20260427120000_a_company_groups_and_feature_flags.sql && grep -q "(SELECT auth.uid())" supabase/migrations/20260427120000_a_company_groups_and_feature_flags.sql && grep -q "ENABLE ROW LEVEL SECURITY" supabase/migrations/20260427120000_a_company_groups_and_feature_flags.sql && ! grep -q "UUID\[\]" supabase/migrations/20260427120000_a_company_groups_and_feature_flags.sql
</automated>
</task>

<task id="02-02">
<action>
Fix `supabase/config.toml` to use the correct project_id `ehbxpbeijofxtsbezwxd` (per memory `project_supabase_migration.md`, the project was migrated 2026-04-23 from `wrbrbhuhsaaupqsimkqz` to `ehbxpbeijofxtsbezwxd`). The current `config.toml` still has the old id at line 1: `project_id = "wrbrbhuhsaaupqsimkqz"`. Replace that line ONLY with `project_id = "ehbxpbeijofxtsbezwxd"`. Preserve all other lines (function-level `verify_jwt` settings, etc.).

This is a one-line surgical edit. Do NOT delete or reorder anything else.
</action>
<read_first>
- `supabase/config.toml` — read the entire file (likely <50 lines) to see current structure and confirm only line 1 needs to change.
- Memory file `project_supabase_migration.md` referenced via the global memory at the top of this prompt — confirms migration target is `ehbxpbeijofxtsbezwxd`.
- `.env` file (if readable) — verify `VITE_SUPABASE_PROJECT_ID="ehbxpbeijofxtsbezwxd"`.
</read_first>
<acceptance_criteria>
- File `supabase/config.toml` first non-empty line is exactly `project_id = "ehbxpbeijofxtsbezwxd"`.
- File `supabase/config.toml` does NOT contain the string `wrbrbhuhsaaupqsimkqz` anywhere.
- File still contains `[functions.transcribe-audio]`, `[functions.summarize-meeting]`, `[functions.create-user]`, `[functions.list-users]` (all preserved per `head -30` review).
</acceptance_criteria>
<files>
- `supabase/config.toml`
</files>
<automated>
grep -q '^project_id = "ehbxpbeijofxtsbezwxd"$' supabase/config.toml && ! grep -q "wrbrbhuhsaaupqsimkqz" supabase/config.toml
</automated>
</task>

</tasks>

<verification>
1. Migration file exists, is named correctly, and is parseable: `head -1 supabase/migrations/20260427120000_a_company_groups_and_feature_flags.sql` shows the header comment.
2. `grep "company_groups" supabase/migrations/20260427120000_*.sql | wc -l` returns ≥ 4 (table CREATE, 2 policies, FK reference).
3. `supabase/config.toml` correctly references the new project: `head -1 supabase/config.toml` shows `project_id = "ehbxpbeijofxtsbezwxd"`.
4. No syntax errors visible by inspection (manual scan of header → 8 lines containing `--` comment → ALTER TABLE → CREATE TABLE → triggers → policies → ALTER TABLE 2nd time).

Final DB push happens in Plan 04 (which depends on this plan). Local-DB unit tests for this migration are part of the pgTAP suite (Plan 01 created them; they reference `company_groups`).
</verification>

<must_haves>
- `company_groups` table exists with id (uuid PK), name, slug (unique, format constrained), timestamps.
- `companies.performance_enabled` and `companies.rs_enabled` columns exist with `boolean NOT NULL DEFAULT false`.
- `companies.group_id` column exists as nullable uuid FK to `company_groups(id)` with `ON DELETE SET NULL`.
- RLS enabled on `company_groups` with select_authenticated + mutate_managers policies.
- `idx_companies_group_id` partial index on non-null group_id.
- `supabase/config.toml` references the correct project (`ehbxpbeijofxtsbezwxd`).
- Migration is reversible (no NOT NULL added to existing columns; no data backfill yet — backfill happens in Plan 04 Migration C).
</must_haves>

<success_criteria>
- Migration file `20260427120000_a_company_groups_and_feature_flags.sql` is the only Phase-1 migration file present after this plan completes (B and C come in Plans 03 and 04).
- File passes basic SQL inspection: starts with `--` comment, contains all 3 ALTER/CREATE blocks, ends with `COMMENT ON COLUMN ... group_id`.
- Anti-patterns absent: no bare `auth.uid()`, no uppercase `UUID[]`, no inline `EXISTS` for tenant scoping.
- `supabase/config.toml` references `ehbxpbeijofxtsbezwxd`.
- Plan 04 (Migration C) can build on this migration's schema (group_id, company_groups exist for backfill).
</success_criteria>
</content>
</invoke>