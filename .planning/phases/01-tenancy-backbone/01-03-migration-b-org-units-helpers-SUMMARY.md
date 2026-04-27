---
phase: 1
plan: 03
subsystem: tenancy-backbone
tags: [supabase, migration, rls, org-units, helpers, security-definer]
requires:
  - companies (created earlier in 20251009193314_*)
  - profiles (created earlier)
  - app_role enum (created earlier; B1 extends with 'liderado')
  - has_role(uuid, app_role) (existing helper, used by visible_org_units)
  - is_people_manager(uuid) (existing helper, used in mutate_managers policies)
  - tg_set_updated_at() (existing trigger fn)
  - socio_company_memberships (forward reference; created in Migration C / Plan 04 — visible_org_units resolves at execution time)
provides:
  - public.org_units (adjacency-list tree per company)
  - public.org_unit_members (PK org_unit_id+user_id; is_primary flag)
  - public.unit_leaders (PK org_unit_id+user_id)
  - public.org_unit_descendants(uuid) -> uuid[] (recursive CTE, depth<20)
  - public.visible_org_units(uuid) -> uuid[] (5-branch role CASE)
  - public.tg_org_units_no_cycle() trigger function (depth-50 chain walk)
  - public.tg_org_units_same_company_as_parent() trigger function
  - app_role enum value 'liderado' (B1)
  - RLS enabled on org_units / org_unit_members / unit_leaders
  - 6 RLS policies (select_visible + mutate_managers per table)
  - 4 indexes (idx_org_units_company_parent, idx_org_units_parent partial, idx_org_unit_members_user, idx_unit_leaders_user)
affects:
  - tenancy boundary for líder/liderado access (RBAC-05/06/09)
  - performance characteristics of recursive descendants traversal (P6 mitigation)
  - app_role enum (additive, non-breaking; coexistence with 'colaborador')
tech-stack:
  added:
    - PostgreSQL recursive CTE pattern with depth guard
    - SECURITY DEFINER helpers returning uuid[] for RLS
  patterns:
    - "(SELECT auth.uid()) initPlan caching idiom (RBAC-10)"
    - "Adjacency-list tree (parent_id self-ref) over ltree"
    - "BEFORE INSERT/UPDATE trigger anti-cycle"
key-files:
  created:
    - supabase/migrations/20260427120050_b1_alter_app_role_add_liderado.sql
    - supabase/migrations/20260427120100_b2_org_units_and_helpers.sql
  modified: []
decisions:
  - "B split into B1 (ALTER TYPE enum) and B2 (everything else) per RESEARCH.md Pitfall 6 — ALTER TYPE ADD VALUE cannot run inside a transaction block"
  - "'liderado' coexists with 'colaborador' in Phase 1 (Open Question Q1 path); rename happens in Phase 4 contract migration G"
  - "Adjacency list (parent_id) over ltree (Anti-Pattern AP-8) — mutation-heavy + shallow + low cardinality"
  - "Helpers STABLE SECURITY DEFINER SET search_path = public (Anti-Pattern AP-3) — bypasses RLS recursion + initPlan caching"
  - "kind column is free-form text (D-discretion) — empresas externas têm nomenclaturas heterogêneas"
  - "Anti-cycle trigger walks parent chain BEFORE INSERT/UPDATE OF parent_id, hard cap 50 steps"
  - "Same-company-as-parent enforced via BEFORE trigger (CHECK can't reference other rows)"
  - "Recursive CTE has WHERE depth < 20 termination guard (P6 mitigation)"
  - "visible_org_units uses 5-branch CASE: admin/rh = all; sócio = via socio_company_memberships; líder = lateral unnest of org_unit_descendants for each led unit; liderado/colaborador = own units only"
  - "All policies use (SELECT auth.uid()) — no bare auth.uid() (RBAC-10 initPlan caching)"
metrics:
  duration: "2m 30s"
  completed_date: "2026-04-27"
  tasks_completed: 2
  files_changed: 2
  commits: 2
  requirements_addressed: [ORG-01, ORG-02, ORG-03, ORG-04, ORG-05, ORG-06, ORG-07, RBAC-09]
  threats_mitigated: [T-1-01, T-1-02, T-1-07]
---

# Phase 1 Plan 03: Migration B — `org_units` Tree + Helpers + Anti-Cycle Summary

`org_units` adjacency-list tree + members/leaders tables + SECURITY DEFINER helpers (`org_unit_descendants`, `visible_org_units`) + anti-cycle/same-company triggers + RLS, with `'liderado'` enum addition split into a standalone B1 file to dodge the ALTER-TYPE-in-transaction trap.

## What Shipped

**Migration B1** (`20260427120050_b1_alter_app_role_add_liderado.sql`) — single DDL line, `ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'liderado'`, no `BEGIN`/`COMMIT` blocks, just the header comment block. Standalone because Postgres forbids `ALTER TYPE ... ADD VALUE` inside a transaction; Supabase CLI wraps each migration in BEGIN/COMMIT, so splitting B avoids the rollback trap (RESEARCH.md Pitfall 6).

**Migration B2** (`20260427120100_b2_org_units_and_helpers.sql`) — 271 lines, contains:

- **3 tables**: `org_units` (id/company_id/parent_id/name/kind/position/timestamps + `CHECK (id <> parent_id)`), `org_unit_members` (PK `(org_unit_id, user_id)`, `is_primary boolean`), `unit_leaders` (PK `(org_unit_id, user_id)`).
- **4 indexes**: `idx_org_units_company_parent ON (company_id, parent_id)` (P6 mitigation), `idx_org_units_parent ON (parent_id) WHERE parent_id IS NOT NULL` (partial), `idx_org_unit_members_user ON (user_id)`, `idx_unit_leaders_user ON (user_id)`.
- **3 triggers**: `tg_org_units_anti_cycle` (BEFORE INSERT/UPDATE OF parent_id; walks chain with hard 50-step cap), `tg_org_units_same_company` (BEFORE INSERT/UPDATE OF parent_id, company_id; rejects cross-company parent), `tg_org_units_updated_at` (BEFORE UPDATE → `tg_set_updated_at()`).
- **2 trigger functions**: `tg_org_units_no_cycle()` (LANGUAGE plpgsql), `tg_org_units_same_company_as_parent()` (LANGUAGE plpgsql).
- **2 helper functions**: `org_unit_descendants(_unit_id uuid) RETURNS uuid[]` (LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public; `WITH RECURSIVE` + `WHERE t.depth < 20`), `visible_org_units(_uid uuid) RETURNS uuid[]` (same modifier set; 5-branch CASE: admin/rh → all; sócio → via `socio_company_memberships`; líder → lateral `unnest(org_unit_descendants(...))`; liderado/colaborador → own units; ELSE empty).
- **3 RLS enables**: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` on all three new tables.
- **6 RLS policies**: per table, `select_visible` (membership check via helpers + `OR user_id = (SELECT auth.uid())` for self-row visibility on members/leaders) and `mutate_managers` (delegates to `is_people_manager`).
- **REVOKE/GRANT**: `REVOKE ALL ON FUNCTION ... FROM PUBLIC` + `GRANT EXECUTE ON FUNCTION ... TO authenticated` on both helpers.

The migration is **not** pushed in this plan — Plan 04 (Migration C) batches the push after wave-1 worktrees merge back. The forward reference to `socio_company_memberships` inside `visible_org_units` is safe because PostgreSQL resolves table refs at execution time, not function-creation time, and the helper is not called until Plan 04.

## How It Works

**Adjacency list, not ltree.** `org_units.parent_id` is a self-referential FK with `ON DELETE RESTRICT`. Roots have `parent_id IS NULL`. Recursive descendants traversal lives in `org_unit_descendants(uuid) → uuid[]`:

```sql
WITH RECURSIVE tree AS (
  SELECT id, 0 AS depth FROM public.org_units WHERE id = _unit_id
  UNION ALL
  SELECT ou.id, t.depth + 1
    FROM public.org_units ou
    JOIN tree t ON ou.parent_id = t.id
   WHERE t.depth < 20  -- termination guard
)
SELECT COALESCE(array_agg(id), '{}'::uuid[]) FROM tree;
```

The `WHERE t.depth < 20` clause is the P6 termination guard — defense in depth alongside the anti-cycle trigger. The composite index `(company_id, parent_id)` keeps the recursive join sub-millisecond on small trees.

**Anti-cycle trigger** walks the parent chain on every insert/update of `parent_id`, raising if it ever encounters `NEW.id` (would be a cycle), capped at 50 steps so a corrupted graph can't hang the trigger:

```sql
WHILE cur_id IS NOT NULL AND steps < 50 LOOP
  IF cur_id = NEW.id THEN RAISE EXCEPTION 'cycle detected ...'; END IF;
  SELECT parent_id INTO cur_id FROM public.org_units WHERE id = cur_id;
  steps := steps + 1;
END LOOP;
```

**Same-company-as-parent** is a separate trigger (a CHECK can't reference other rows) — when `parent_id IS NOT NULL`, it loads the parent's `company_id` and rejects the row if it differs from `NEW.company_id`.

**Role-driven visibility.** `visible_org_units(_uid)` is a single CASE expression returning the `uuid[]` of org_units the user can see:

| Role(s) | Returns |
|---|---|
| `admin` OR `rh` | all `org_units` (managers see everything) |
| `socio` | `org_units` whose `company_id` is in the user's `socio_company_memberships` |
| `lider` | `LATERAL unnest(org_unit_descendants(led.org_unit_id))` for every row in `unit_leaders` where `user_id = _uid` (transitive subtree) |
| `liderado` OR `colaborador` | `org_unit_id`s from `org_unit_members` where `user_id = _uid` |
| else | `'{}'::uuid[]` |

`SECURITY DEFINER` bypasses RLS on the lookup tables (`user_roles`, `socio_company_memberships`, `unit_leaders`, `org_unit_members`), which is what prevents the RLS-recursion deadlock (P3). `SET search_path = public` is the AP-3 safety net.

**Policy shape**: `select_visible` uses `id = ANY(public.visible_org_units((SELECT auth.uid())))` (with the join tables also accepting `user_id = (SELECT auth.uid())` so a user can always see their own membership rows). `mutate_managers` delegates to the existing `is_people_manager` helper. Every reference to `auth.uid()` is wrapped in `(SELECT ...)` for initPlan caching (RBAC-10) — verified zero bare `auth.uid()` calls in the file.

## Decisions Made

- **Split B into B1 + B2.** `ALTER TYPE ADD VALUE` is the only DDL that genuinely cannot share a migration file with anything else; B1 is a single statement plus header comment.
- **`'liderado'` coexists with `'colaborador'`.** Phase 1 keeps both valid (Open Question Q1 path); helpers treat them as synonymous in the visibility CASE. Phase 4 Migration G performs the contract rename.
- **`kind` is free-form `text`, not an enum.** Empresas externas têm nomenclaturas distintas (`departamento`, `time`, `squad`, `célula`); a fixed enum would force migrations whenever a new client arrives. UI supplies suggestions via datalist (D-discretion from CONTEXT.md).
- **`is_primary` is not enforced unique.** The comment explains: backfill may leave it unset until RH UI fills; enforcing exactly-one-true would block the bootstrap path.
- **Forward reference to `socio_company_memberships` is fine.** Postgres resolves table refs at execution time; Plan 04 ships the table before any caller invokes `visible_org_units`. Documented in the file's section-10 comment block.
- **`SELECT user_id = (SELECT auth.uid())` self-row escape hatch on members/leaders policies.** Even if the user's role doesn't grant org-unit visibility, they can always see the rows that name them — keeps "who am I a member of?" queries cheap and avoids surprising emptiness.

## Deviations from Plan

None — the plan provided exact SQL content, and it was written verbatim. Acceptance criteria and the plan's `<automated>` check both pass with `ALL PASS`. Structural counts match the success_criteria expectations exactly (3 tables, 4 indexes, 3 triggers, 2 trigger functions, 2 helper functions, 6 policies, 3 RLS enables).

## Authentication Gates

None — pure DDL plan, no auth-dependent commands ran.

## Verification

- `supabase/migrations/20260427120050_b1_alter_app_role_add_liderado.sql` exists. Contains exactly the single `ALTER TYPE` DDL line plus header comment. No `BEGIN;`/`COMMIT;`.
- `supabase/migrations/20260427120100_b2_org_units_and_helpers.sql` exists. Plan's `<automated>` check returns `ALL PASS`.
- Anti-pattern grep clean:
  - `grep -E '[^(]auth\.uid\(\)[^)]'` returns 0 matches (no bare `auth.uid()`).
  - `grep -q 'UUID\[\]'` returns no match (no uppercase array type).
- `(SELECT auth.uid())` count: 12 (≥ 6 required).
- All `REFERENCES` use `public.profiles(id) ON DELETE CASCADE` (canonical FK target, not `auth.users`).
- Both helpers declared with `LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public` (matches `is_people_manager` analog signature).
- Both helpers granted `EXECUTE TO authenticated` after `REVOKE ALL FROM PUBLIC`.

pgTAP tests `001-helpers-smoke.sql`, `003-org-unit-descendants.sql`, `004-anti-cycle-trigger.sql` (created in Plan 01) will validate behavior after the Plan 04 push.

## Self-Check: PASSED

- FOUND: supabase/migrations/20260427120050_b1_alter_app_role_add_liderado.sql
- FOUND: supabase/migrations/20260427120100_b2_org_units_and_helpers.sql
- FOUND: commit f3a1987 (B1)
- FOUND: commit 9fa5887 (B2)
