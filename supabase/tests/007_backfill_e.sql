-- =========================================================================
-- pgTAP — Phase 3 Wave 0 stub
-- Covers: INV-3-21 (e1+e2 backfill), INV-3-22 (e3 socios)
-- Implements when: Wave 1 (e1+e2+e3 migrations applied + owner-inputs/companies.json provided)
-- =========================================================================
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap;
SELECT plan(7);

SELECT skip('Wave 1 — Backfill E + owner-inputs/companies.json pending', 7);

-- TODO Wave 1:
-- 1. SELECT count(*) FROM company_groups WHERE slug='grupo-lever' = 1 [INV-3-21]
-- 2. SELECT count(*) FROM companies WHERE group_id = (SELECT id FROM company_groups WHERE slug='grupo-lever') = 7
-- 3. For each team t: assert EXISTS(SELECT 1 FROM org_units WHERE id=t.id) [e2 1:1]
-- 4. For each team t WHERE leader_id IS NOT NULL: assert EXISTS(SELECT 1 FROM unit_leaders WHERE org_unit_id=t.id AND user_id=t.leader_id)
-- 5. For each team_members tm: assert EXISTS(SELECT 1 FROM org_unit_members WHERE user_id=tm.user_id AND org_unit_id=tm.team_id)
-- 6. For each user_role role='socio': assert EXISTS(SELECT 1 FROM socio_company_memberships WHERE socio_user_id=user_id) [INV-3-22]
-- 7. SELECT count_socios = count_distinct_socios_in_memberships (no orphans, no duplicates)

SELECT * FROM finish();
ROLLBACK;
