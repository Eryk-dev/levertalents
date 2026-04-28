---
plan: 03-05
phase: 03-performance-refactor
status: complete
completed_at: 2026-04-28
---

## Summary

Applied 13 Phase 3 migrations to Supabase remote (ehbxpbeijofxtsbezwxd) via MCP and regenerated types.ts.

## Migrations Applied

| # | Name | Result |
|---|------|--------|
| 1 | e1_company_groups_seed | ✓ Grupo Lever + 7 companies |
| 2 | e2_teams_to_org_units_backfill | ✓ teams→org_units 1:1 + members + leaders |
| 3 | e3_socios_to_memberships | ✓ empty (owner completes before first use) |
| 4 | perf_pre_company_id_expand | ✓ company_id NULLABLE on evaluations/1:1/climate |
| 5 | perf_pre_company_id_backfill | ✓ backfilled via user→org_unit→company |
| 6 | perf_pre_company_id_constrain | ✓ NOT NULL on one_on_ones + climate_surveys |
| 7 | perf1_evaluation_cycles_and_templates | ✓ new tables + RLS + freeze trigger |
| 8 | perf2_drop_evaluations_history | ✓ TRUNCATE + schema rewrite + new RLS |
| 9 | clim1_drop_user_id_from_responses | ✓ LGPD anonymity (1 fix: joined_at→created_at, drop legacy policies first) |
| 10 | clim2_aggregate_rpc | ✓ get_climate_aggregate + submit_climate_response |
| 11 | one1_one_on_ones_extensions | ✓ one_on_one_rh_notes + RLS rewrite |
| 12 | auth1_must_change_password | ✓ must_change_password + temp_password_expires_at |
| 13 | cron1_evaluation_cycles_auto_close | ✓ pg_cron daily 06:00 UTC |

## Deviations

- clim1: `oum.joined_at` → `oum.created_at` (column name mismatch in plan template)
- clim1: legacy policies "Users can view/create/update their own responses" referenced user_id — dropped before column drop

## Types Regen

- `src/integrations/supabase/types.ts` regenerated (105k chars, 238 lines added)
- TypeScript compile: clean (0 errors)
- New types: evaluation_cycles, evaluation_templates, one_on_one_rh_notes, must_change_password, temp_password_expires_at

## Self-Check: PASSED
