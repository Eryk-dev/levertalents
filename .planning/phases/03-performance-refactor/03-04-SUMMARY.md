---
phase: 03-performance-refactor
plan: "04"
subsystem: schema-migrations
tags: [migrations, rls, evaluation-cycles, templates, climate-anonymity, one-on-ones, auth, pg-cron]
dependency_graph:
  requires:
    - "03-02 (Backfill E — companies + org_units + memberships)"
    - "03-03 (pre company_id expand→backfill→constrain)"
  provides:
    - "evaluation_templates table"
    - "evaluation_cycles table with immutable template_snapshot"
    - "evaluations schema rewrite (cycle_id + direction + responses)"
    - "climate_responses.user_id dropped (LGPD true anonymity)"
    - "get_climate_aggregate RPC (k-anon ≥3)"
    - "submit_climate_response RPC (anonymous write)"
    - "one_on_one_rh_notes table (admin/rh-only)"
    - "profiles.must_change_password + temp_password_expires_at"
    - "pg_cron job evaluation_cycles_auto_close"
  affects:
    - "Plan 03-05 (BLOCKING db push applies all these migrations)"
    - "Plan 03-06+ (hooks migration to useScopedQuery uses new schema)"
tech_stack:
  added: []
  patterns:
    - "BEFORE INSERT/UPDATE trigger for JSONB snapshot freeze (D-06)"
    - "RPC SECURITY DEFINER with re-applied visible_companies check (T-3-RPC-01)"
    - "k-anonymity gate: returns {insufficient_data:true} WITHOUT count when <3"
    - "Idempotent cron: unschedule-first pattern from Phase 2 f2 migration"
    - "Separate table for RLS-isolated content (Pitfall §5 decision A3)"
key_files:
  created:
    - supabase/migrations/20260429130000_perf1_evaluation_cycles_and_templates.sql
    - supabase/migrations/20260429130100_perf2_drop_evaluations_history.sql
    - supabase/migrations/20260429140000_clim1_drop_user_id_from_responses.sql
    - supabase/migrations/20260429140100_clim2_aggregate_rpc.sql
    - supabase/migrations/20260429150000_one1_one_on_ones_extensions.sql
    - supabase/migrations/20260429160000_auth1_must_change_password.sql
    - supabase/migrations/20260429160100_cron1_evaluation_cycles_auto_close.sql
  modified: []
decisions:
  - "D-06: template_snapshot frozen via BEFORE INSERT trigger tg_freeze_template_snapshot — DB-level guarantee independent of RPC callers"
  - "D-08: TRUNCATE evaluations in explicit BEGIN/COMMIT transaction — rollback if NOT NULL steps fail"
  - "D-09: user_id dropped AFTER backfilling org_unit_id from org_unit_members (LIMIT 1 per user)"
  - "D-10: k-anon returns {insufficient_data:true} WITHOUT count when <3 — prevents combination attack (Pitfall §3)"
  - "D-17: one_on_one_rh_notes as SEPARATE TABLE (Pitfall §5 / A3) — not a column; defense-in-depth vs SELECT * leak"
  - "D-22: profiles.must_change_password BOOLEAN NOT NULL DEFAULT false + temp_password_expires_at TIMESTAMPTZ NULL"
  - "CRON schedule: '0 6 * * *' (06:00 UTC = 03:00 BRT) — Claude's Discretion lock per CONTEXT.md"
  - "[Bug fix] submit_climate_response INSERT uses created_at (existing legacy column) not submitted_at"
metrics:
  duration: "4m 8s"
  completed_date: "2026-04-28"
  tasks: 3
  files_created: 7
  files_modified: 0
---

# Phase 3 Plan 04: Wave 2 Schema Migrations Summary

**One-liner:** 7 SQL migrations writing evaluation_cycles + templates with JSONB snapshot freeze trigger, LGPD-compliant climate anonymization (user_id drop + k-anon RPC), separate RH notes table, auth password-flag columns, and idempotent pg_cron auto-close job.

---

## Tasks Executed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Migration perf1 + perf2 | `70eb514` | 20260429130000_perf1_evaluation_cycles_and_templates.sql, 20260429130100_perf2_drop_evaluations_history.sql |
| 2 | Migration clim1 + clim2 | `18db3b4` | 20260429140000_clim1_drop_user_id_from_responses.sql, 20260429140100_clim2_aggregate_rpc.sql |
| 3 | Migration one1 + auth1 + cron1 | `3334bc5` | 20260429150000_one1_one_on_ones_extensions.sql, 20260429160000_auth1_must_change_password.sql, 20260429160100_cron1_evaluation_cycles_auto_close.sql |

---

## Migrations Written (Dependency Order)

All 7 migrations are written but NOT applied. Plan 03-05 [BLOCKING] runs `supabase db push`.

| Order | File | Depends On | Provides |
|-------|------|-----------|---------|
| 1 | `20260429130000_perf1_evaluation_cycles_and_templates.sql` | e1 (companies), pre1+pre2 (evaluations.company_id) | evaluation_templates + evaluation_cycles + trigger + new evaluations columns |
| 2 | `20260429130100_perf2_drop_evaluations_history.sql` | perf1 | TRUNCATE evaluations + drop 8 legacy cols + SET NOT NULL on cycle_id/direction/company_id |
| 3 | `20260429140000_clim1_drop_user_id_from_responses.sql` | e1, pre3 | org_unit_id backfill + DROP user_id + RLS rewrite |
| 4 | `20260429140100_clim2_aggregate_rpc.sql` | clim1 | get_climate_aggregate + submit_climate_response RPCs |
| 5 | `20260429150000_one1_one_on_ones_extensions.sql` | e1, pre3 | one_on_one_rh_notes table + one_on_ones RLS rewrite |
| 6 | `20260429160000_auth1_must_change_password.sql` | (independent) | profiles.must_change_password + temp_password_expires_at |
| 7 | `20260429160100_cron1_evaluation_cycles_auto_close.sql` | perf1 | pg_cron job evaluation_cycles_auto_close |

---

## RLS Policies Created (by table)

| Table | Policies Created |
|-------|-----------------|
| `evaluation_templates` | `evaluation_templates_select_visible` (visible_companies), `evaluation_templates_write_admin_rh` (visible_companies + is_people_manager) |
| `evaluation_cycles` | `evaluation_cycles_select_visible` (visible_companies), `evaluation_cycles_write_admin_rh` (visible_companies + is_people_manager) |
| `evaluations` | `evaluations_select_visible` (D-03: RH all / leader via visible_org_units / liderado own), `evaluations_write_self` (evaluator + RH; WITH CHECK requires cycle.status='active') |
| `climate_responses` | `climate_responses_select_admin_rh` (is_people_manager + survey's company); no INSERT policy (forced via RPC) |
| `one_on_one_rh_notes` | `one_on_one_rh_notes_admin_rh_all` (is_people_manager + visible_companies JOIN) |
| `one_on_ones` | `one_on_ones_select_visible` (visible_companies + pair), `one_on_ones_write_pair` (visible_companies + pair) |

---

## RPCs Created

| Function | Signature | Modifier | GRANT |
|----------|-----------|---------|-------|
| `get_climate_aggregate` | `(p_survey_id uuid, p_org_unit_id uuid DEFAULT NULL) RETURNS jsonb` | STABLE SECURITY DEFINER | EXECUTE TO authenticated |
| `submit_climate_response` | `(p_survey_id uuid, p_question_id uuid, p_score int, p_comment text DEFAULT NULL) RETURNS void` | VOLATILE SECURITY DEFINER | EXECUTE TO authenticated |

Both RPCs REVOKE ALL FROM PUBLIC before granting to authenticated. Both re-apply `visible_companies` check inside body (T-3-RPC-01 mitigation).

---

## Trigger

**`tg_evaluation_cycles_freeze`** on `evaluation_cycles` — BEFORE INSERT OR UPDATE OF template_snapshot:
- INSERT: reads `evaluation_templates.schema_json` and forces `NEW.template_snapshot := v_schema` (ignores caller-supplied value)
- UPDATE: raises exception if `NEW.template_snapshot IS DISTINCT FROM OLD.template_snapshot`

---

## pg_cron Job

**`evaluation_cycles_auto_close`** — schedule `'0 6 * * *'` (06:00 UTC = 03:00 BRT):

```sql
UPDATE public.evaluation_cycles
   SET status = 'closed', updated_at = NOW()
 WHERE status = 'active' AND ends_at <= NOW();
```

Idempotent: `cron.unschedule` runs first if job exists (Phase 2 f2 pattern).

---

## Threat Coverage

| Threat | Mitigation | Migration |
|--------|-----------|----------|
| T-3-TAMP-01 (template drift mid-cycle) | trigger tg_freeze_template_snapshot | perf1 |
| T-3-RLS-01 (cross-tenant cycle leak) | visible_companies in all RLS | perf1/perf2 |
| T-3-OPS-01 (TRUNCATE data loss) | accepted (D-08 owner decision); PITR 7d | perf2 |
| T-3-02 (k-anon bypass) | {insufficient_data:true} without count when <3 | clim2 |
| T-3-03 CRITICAL (climate user_id identity leak) | DROP COLUMN user_id | clim1 |
| T-3-01 (liderado sees rh_notes) | separate table + is_people_manager RLS | one1 |
| T-3-RPC-01 (RPC bypasses RLS) | re-applies visible_companies inside RPC body | clim2 |
| T-3-CRON-01 (cron fails, cycles stay active) | accepted; UI checks ends_at on read | cron1 |

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed column name in submit_climate_response INSERT**
- **Found during:** Task 2 — writing clim2 RPC
- **Issue:** RPC INSERT referenced `submitted_at` column which does not exist in `climate_responses`; legacy table uses `created_at` (confirmed in `src/integrations/supabase/types.ts` line 524)
- **Fix:** Changed INSERT column list from `submitted_at` to `created_at`
- **Files modified:** `supabase/migrations/20260429140100_clim2_aggregate_rpc.sql`
- **Commit:** `18db3b4`

**2. [Rule 2 - Missing Critical] D-17 resolution: separate table not column**
- **Context:** CONTEXT.md D-17 says "coluna nova `one_on_ones.rh_notes` TEXT NULL" but plan's `must_haves.truths` and Pitfall §5 / A3 decision explicitly require separate table for defense-in-depth. Plan is authoritative.
- **Decision:** Created `one_on_one_rh_notes` as separate table (plan artifact path, plan truths, Pitfall §5 all consistent). CONTEXT.md D-17 column mention superseded by plan-level resolution.
- **Files modified:** `supabase/migrations/20260429150000_one1_one_on_ones_extensions.sql`

---

## Confirmation: Migrations NOT Applied

All 7 migrations are written to `supabase/migrations/` but have NOT been pushed to the remote Supabase project. Plan 03-05 [BLOCKING] owns the `supabase db push` apply step. No migration was executed against the database during this plan.

---

## Self-Check: PASSED

Files present:
- supabase/migrations/20260429130000_perf1_evaluation_cycles_and_templates.sql — FOUND
- supabase/migrations/20260429130100_perf2_drop_evaluations_history.sql — FOUND
- supabase/migrations/20260429140000_clim1_drop_user_id_from_responses.sql — FOUND
- supabase/migrations/20260429140100_clim2_aggregate_rpc.sql — FOUND
- supabase/migrations/20260429150000_one1_one_on_ones_extensions.sql — FOUND
- supabase/migrations/20260429160000_auth1_must_change_password.sql — FOUND
- supabase/migrations/20260429160100_cron1_evaluation_cycles_auto_close.sql — FOUND

Commits present:
- 70eb514 — feat(03-04): Migration perf1 + perf2
- 18db3b4 — feat(03-04): Migration clim1 + clim2
- 3334bc5 — feat(03-04): Migration one1 + auth1 + cron1
