---
phase: 03-performance-refactor
plan: "02"
subsystem: tenancy-backfill
tags: [migration, backfill, company-groups, org-units, socio-memberships, idempotent]
dependency_graph:
  requires:
    - "Phase 1 Migration A (company_groups + feature flags)"
    - "Phase 1 Migration B2 (org_units + org_unit_members + unit_leaders)"
    - "Phase 1 Migration C (socio_company_memberships + visible_companies)"
    - "owner-inputs/companies.json (7 pre-cadastro companies)"
    - "owner-inputs/socio-memberships.json (empty — owner fills before Plan 03-05)"
  provides:
    - "supabase/migrations/20260429120000_e1_company_groups_seed.sql"
    - "supabase/migrations/20260429120100_e2_teams_to_org_units_backfill.sql"
    - "supabase/migrations/20260429120200_e3_socios_to_memberships.sql"
  affects:
    - "company_groups (grupo-lever upsert)"
    - "companies (7 internal companies upserted by UUID)"
    - "org_units (root units + teams 1:1 backfill)"
    - "org_unit_members (team_members mirrored)"
    - "unit_leaders (teams.leader_id + team_members.leader_id mirrored)"
    - "socio_company_memberships (empty now; owner fills before Plan 03-05)"
tech_stack:
  added: []
  patterns:
    - "ON CONFLICT (id) DO UPDATE for UUID-keyed company upsert"
    - "INSERT ... WHERE NOT EXISTS for idempotent org_unit backfill"
    - "ON CONFLICT (org_unit_id, user_id) DO NOTHING for member/leader mirrors"
    - "RAISE NOTICE for sanity-check without fatal failure"
    - "auth.users EXISTS guard for deleted-user safety on leader inserts"
key_files:
  created:
    - "supabase/migrations/20260429120000_e1_company_groups_seed.sql"
    - "supabase/migrations/20260429120100_e2_teams_to_org_units_backfill.sql"
    - "supabase/migrations/20260429120200_e3_socios_to_memberships.sql"
  modified: []
decisions:
  - "companies table has no slug column — E1 uses UUID as conflict key; company slugs from JSON are human-readable reference only"
  - "teams.leader_id is UUID (not TEXT as PLAN interface stated) — no regex cast needed; direct UUID comparison used"
  - "E3 empty-body approach: zero INSERT rows but valid SQL + sanity NOTICE; owner adds entries following template comment before Plan 03-05 push"
  - "socio_company_memberships PK column is user_id (not socio_user_id) — aligned with Phase 1 Migration B2/C schema"
metrics:
  duration: "~15 minutes"
  completed: "2026-04-28"
  tasks_completed: 3
  tasks_total: 3
  files_created: 3
  files_modified: 0
---

# Phase 03 Plan 02: Backfill E Migrations Summary

**One-liner:** 3 idempotent SQL migrations seeding Grupo Lever + 7 real companies, converting legacy teams to org_units (1:1 with members + leaders), and preparing the socio_company_memberships backfill structure (empty now; owner fills before Plan 03-05 push).

## Tasks Executed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 2 | Migration E1 — company_groups + 7 companies seed/upsert | `63043f2` | `20260429120000_e1_company_groups_seed.sql` (74 lines) |
| 3 | Migration E2 — teams → org_units backfill 1:1 | `2a2146e` | `20260429120100_e2_teams_to_org_units_backfill.sql` (109 lines) |
| 4 | Migration E3 — socio → socio_company_memberships | `71b9560` | `20260429120200_e3_socios_to_memberships.sql` (78 lines) |

Task 1 (checkpoint: owner JSON files) was resolved by the orchestrator prior to this execution.

## Owner JSON Input Summary

**companies.json:** 7 companies confirmed by owner (pre-cadastro UUIDs):

| UUID | Name | Slug (reference only) |
|------|------|----------------------|
| `2da4f7de-...` | Netair | netair |
| `9c0c5f63-...` | Netparts | netparts |
| `04f6f2fe-...` | Unique | unique |
| `c22d26d7-...` | Easy Peasy | easypeasy |
| `d33f3c43-...` | Bellator | bellator |
| `aa82c8d6-...` | 141Air | 141air |
| `3e920f7d-...` | Lever Talents | lever-talents |

**socio-memberships.json:** `{ "memberships": [] }` — empty at plan time. Owner completes before Plan 03-05 push following the template comment in E3.

## Migration Details

### E1 — company_groups + 7 companies (74 lines)

- **Step 1:** `INSERT INTO company_groups ('grupo-lever', 'Grupo Lever') ON CONFLICT (slug) DO UPDATE` — idempotent group upsert
- **Step 2:** `INSERT INTO companies ... ON CONFLICT (id) DO UPDATE SET name, group_id, performance_enabled, rs_enabled` — 7 rows from JSON, UUID conflict key
- **Step 3:** Defensive `UPDATE companies SET group_id` where `name IN (...)` and `group_id IS NULL` — handles pre-existing rows by name that didn't match UUIDs

**Key deviation:** `companies` table has no `slug` column (not added in any Phase 1/2/3 migration). UUID used as the sole conflict key. Slugs from JSON are documentation-only.

### E2 — teams → org_units (109 lines)

- **Step 1:** Root org_unit creation per company (`NOT EXISTS` guard; `kind = 'empresa'`)
- **Step 2:** Each team → org_unit preserving `team.id` (`ON CONFLICT (id) DO NOTHING`)
- **Step 3:** `team_members` → `org_unit_members` (`ON CONFLICT (org_unit_id, user_id) DO NOTHING`; `is_primary = false`)
- **Step 4a:** `teams.leader_id` → `unit_leaders` (with `auth.users EXISTS` safety guard)
- **Step 4b:** `team_members.leader_id` → `unit_leaders` (pre-2026-04-16 legacy per-member leader data)

**Key deviation:** `teams.leader_id` is UUID (not TEXT as stated in the PLAN's `<interfaces>` block). Column was added as `UUID REFERENCES auth.users(id)` by migration `20260416192300_add_teams_leader_id.sql`. The defensive TEXT→UUID regex cast from the PLAN template was omitted; direct UUID comparison used instead.

### E3 — socio → socio_company_memberships (78 lines)

- **Step 1:** `DO $$ ... END $$` block with `v_inserted` counter — currently zero rows (empty JSON); template comment shows exact pattern for owner to add entries before Plan 03-05
- **Step 2:** Sanity `NOTICE` counting `user_roles.role = 'socio'` without any membership — non-fatal warning for Plan 03-05 verification

**Key deviation:** `socio_company_memberships` PK column is `user_id` (not `socio_user_id` as the PLAN template assumed). Aligned with Phase 1 Migration B2/C schema. All column references corrected.

## Application Status

**These migrations have NOT been applied to the remote database.** They sit in `supabase/migrations/` as SQL files awaiting Plan 03-05 (`[BLOCKING] supabase db push`).

**pgTAP test `007_backfill_e.sql`** (Wave 0, Plan 03-01): still in skip-all mode until Plan 03-05 applies and validates.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] companies table has no slug column**
- **Found during:** Task 2
- **Issue:** The PLAN template used `slug` as a column in the `INSERT INTO companies` VALUES block and in the Step 3 defensive UPDATE `WHERE slug IN (...)`. The `companies` table (verified across all Phase 1/2/3 migrations and `src/integrations/supabase/types.ts`) has no `slug` column.
- **Fix:** E1 uses `id` (UUID) as the `ON CONFLICT` key. Step 3 defensive UPDATE uses `name IN (...)` instead of `slug IN (...)`. Slugs from JSON are documentation-only comments.
- **Files modified:** `20260429120000_e1_company_groups_seed.sql`
- **Commit:** `63043f2`

**2. [Rule 1 - Bug] teams.leader_id is UUID, not TEXT**
- **Found during:** Task 3
- **Issue:** PLAN's `<interfaces>` block stated `teams.leader_id TEXT (single, nullable)`, which would require a regex-based TEXT→UUID cast before inserting into `unit_leaders`. Actual migration `20260416192300_add_teams_leader_id.sql` adds `leader_id UUID REFERENCES auth.users(id)`.
- **Fix:** E2 uses direct UUID comparison (`t.leader_id IS NOT NULL` + `EXISTS (auth.users)`) without regex filtering. The PLAN's regex guard `'^[0-9a-f]{8}-...'` was not included as it's unnecessary for a UUID-typed column.
- **Files modified:** `20260429120100_e2_teams_to_org_units_backfill.sql`
- **Commit:** `2a2146e`

**3. [Rule 1 - Bug] socio_company_memberships PK column is user_id, not socio_user_id**
- **Found during:** Task 4
- **Issue:** PLAN template used `socio_user_id` as the column name for `socio_company_memberships`. Phase 1 Migration B2 and C define this table with `user_id` as the column.
- **Fix:** All E3 INSERT and NOT EXISTS references use `user_id` consistently.
- **Files modified:** `20260429120200_e3_socios_to_memberships.sql`
- **Commit:** `71b9560`

## Known Stubs

- **E3 INSERT block is empty** (zero socio memberships): This is intentional. The `owner-inputs/socio-memberships.json` has `memberships: []` at plan time. The migration is structurally complete — it has the correct schema, idempotency, and sanity check. Owner adds real entries following the template comment before Plan 03-05 push. This does NOT prevent Plan 02's goal (writing the migration files); it defers actual socio data population to owner action.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced. These are pure data-backfill SQL files.

## Self-Check: PASSED

- `supabase/migrations/20260429120000_e1_company_groups_seed.sql` — FOUND
- `supabase/migrations/20260429120100_e2_teams_to_org_units_backfill.sql` — FOUND
- `supabase/migrations/20260429120200_e3_socios_to_memberships.sql` — FOUND
- Commits `63043f2`, `2a2146e`, `71b9560` — verified in git log
