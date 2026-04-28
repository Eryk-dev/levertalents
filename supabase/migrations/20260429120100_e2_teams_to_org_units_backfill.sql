-- =========================================================================
-- Migration E2: teams → org_units backfill (1:1 com members + leaders)
--
-- Threats: T-3-06 (cross-tenant leak via missing company_id mapping —
--                  covered by NOT EXISTS guard + company_id preserved 1:1)
--          T-3-BACKFILL-03 (teams.leader_id corrupt data — defensive EXISTS
--                            check against auth.users before INSERT)
-- REQs: ORG-09 (teams legacy permanece read-only) + Phase 3 D-28
-- Reversibility: idempotent — INSERT ... WHERE NOT EXISTS; re-run = 0 changes
-- DEPENDENCIES:
--   - Migration E1 (20260429120000_e1_company_groups_seed.sql) — companies +
--     company_groups populated first
--   - Phase 1 Migration B2 (org_units, org_unit_members, unit_leaders tables)
--   - Phase 1 Migration C (teams backfill precedent — 5.4/5.5/5.6)
-- NOTE: teams table is PRESERVED (ORG-09 read-only); drop is Phase 4
--       Migration G (irreversible, runs after 1+ week of stability)
-- NOTE: teams.leader_id is UUID (not TEXT) — added by
--       20260416192300_add_teams_leader_id.sql; no regex cast required.
--       team_members.leader_id is also UUID (per-member leader, legacy).
-- =========================================================================

-- Step 1 — Ensure each company has a root org_unit (parent_id IS NULL).
-- Phase 1 Migration C (5.3) may have created these; this is defensive.
-- Uses company.name as the root unit name (consistent with Phase 1 pattern).
INSERT INTO public.org_units (id, company_id, parent_id, name, kind, position, created_at)
SELECT gen_random_uuid(), c.id, NULL, c.name, 'empresa', 0, NOW()
  FROM public.companies c
 WHERE NOT EXISTS (
   SELECT 1 FROM public.org_units ou
    WHERE ou.company_id = c.id AND ou.parent_id IS NULL
 );

-- Step 2 — Convert each team into 1 org_unit (preserving team.id as org_unit.id).
-- Attaches as child of the company root (parent_id = root ou).
-- Phase 1 Migration C (5.4) used ON CONFLICT (id) DO NOTHING for same pattern.
-- COALESCE on created_at guards against legacy rows with NULL timestamp.
INSERT INTO public.org_units (id, company_id, parent_id, name, kind, position, created_at)
SELECT
  t.id,
  t.company_id,
  (SELECT ou.id
     FROM public.org_units ou
    WHERE ou.company_id = t.company_id AND ou.parent_id IS NULL
    LIMIT 1),
  t.name,
  'time',
  0,
  COALESCE(t.created_at, NOW())
  FROM public.teams t
 WHERE NOT EXISTS (
   SELECT 1 FROM public.org_units ou WHERE ou.id = t.id
 )
ON CONFLICT (id) DO NOTHING;

-- Step 3 — Convert team_members → org_unit_members (1:1).
-- org_unit_members PK is (org_unit_id, user_id); is_primary defaults false
-- (RH UI will set primary via Phase 4 chokepoint). Uses ON CONFLICT DO NOTHING
-- per Phase 1 Migration C (5.5) pattern.
INSERT INTO public.org_unit_members (org_unit_id, user_id, is_primary, created_at)
SELECT
  tm.team_id,
  tm.user_id,
  false,
  COALESCE(tm.created_at, NOW())
  FROM public.team_members tm
 WHERE EXISTS (
   SELECT 1 FROM public.org_units ou WHERE ou.id = tm.team_id
 )
ON CONFLICT (org_unit_id, user_id) DO NOTHING;

-- Step 4a — Convert teams.leader_id → unit_leaders.
-- teams.leader_id is UUID (added by 20260416192300_add_teams_leader_id.sql).
-- Defensive EXISTS against auth.users ensures deleted users are not inserted.
-- unit_leaders PK is (org_unit_id, user_id).
INSERT INTO public.unit_leaders (org_unit_id, user_id, created_at)
SELECT
  t.id,
  t.leader_id,
  NOW()
  FROM public.teams t
 WHERE t.leader_id IS NOT NULL
   AND EXISTS (
     SELECT 1 FROM public.org_units ou WHERE ou.id = t.id
   )
   AND EXISTS (
     SELECT 1 FROM auth.users au WHERE au.id = t.leader_id
   )
ON CONFLICT (org_unit_id, user_id) DO NOTHING;

-- Step 4b — Also mirror team_members.leader_id → unit_leaders (per-member
-- leader column in legacy schema). Covers teams where teams.leader_id was NULL
-- but a per-member leader_id was set (pre-2026-04-16 data).
INSERT INTO public.unit_leaders (org_unit_id, user_id, created_at)
SELECT DISTINCT
  tm.team_id,
  tm.leader_id,
  NOW()
  FROM public.team_members tm
 WHERE tm.leader_id IS NOT NULL
   AND EXISTS (
     SELECT 1 FROM public.org_units ou WHERE ou.id = tm.team_id
   )
   AND EXISTS (
     SELECT 1 FROM auth.users au WHERE au.id = tm.leader_id
   )
ON CONFLICT (org_unit_id, user_id) DO NOTHING;

COMMENT ON TABLE public.org_units IS
  'Phase 1 schema; root units created defensively by Phase 3 E1; teams backfilled 1:1 by Phase 3 Migration E2';
