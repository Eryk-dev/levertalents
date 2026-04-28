-- =========================================================================
-- Migration E1: Grupo Lever + 7 internal companies (BACKFILL E.1)
--
-- Threats: T-3-01 (mismatched names — owner-inputs/companies.json is source
--                  of truth; UUIDs are owner-confirmed pre-cadastro values)
--          T-3-BACKFILL-01 (zero UUID placeholders — all 7 UUIDs from JSON)
-- REQs: TEN-04 (Grupo Lever grouping precedent Phase 1) + Phase 3 D-27/D-28
-- Reversibility: idempotent — re-run produces 0 changes; no destructive ops
-- DEPENDENCIES:
--   - Phase 1 Migration A  (20260427120000_a_company_groups_and_feature_flags.sql)
--   - Phase 1 Migration B1 (20260427120050_b1_alter_app_role_add_liderado.sql)
--   - Phase 1 Migration B2 (20260427120100_b2_org_units_and_helpers.sql)
--   - Phase 1 Migration C  (20260427120200_c_socio_memberships_rls_rewrite_and_backfill.sql)
--   - .planning/phases/03-performance-refactor/owner-inputs/companies.json (committed)
--
-- Source: owner-inputs/companies.json — 7 companies confirmed by owner (pre-cadastro).
--         NOTE: companies table has no slug column — slugs are stored in owner JSON
--         only as human-readable reference. Conflict key is (id) UUID.
-- =========================================================================

-- Step 1 — Idempotent group upsert
INSERT INTO public.company_groups (slug, name)
VALUES ('grupo-lever', 'Grupo Lever')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

-- Step 2 — Idempotent companies upsert (7 entries from owner-inputs/companies.json)
-- ON CONFLICT (id) DO UPDATE ensures re-run is safe: name + feature flags are
-- aligned with owner intent; group_id is always set to Grupo Lever.
-- NOTE: companies table has NO slug column — name is the human label only.
INSERT INTO public.companies (id, name, group_id, performance_enabled, rs_enabled, created_at)
SELECT
  c.id::uuid,
  c.name,
  (SELECT id FROM public.company_groups WHERE slug = 'grupo-lever'),
  c.performance_enabled,
  c.rs_enabled,
  NOW()
FROM (VALUES
  ('2da4f7de-9725-4887-a6d4-f700626b2a3d', 'Netair',        true, true),
  ('9c0c5f63-1d21-4061-87ff-9a6ce78ce7b5', 'Netparts',      true, true),
  ('04f6f2fe-5008-4938-9931-6ce7f29ccca9', 'Unique',        true, true),
  ('c22d26d7-3b0a-4460-a448-3755f1647800', 'Easy Peasy',    true, true),
  ('d33f3c43-43ac-4af7-ac18-7b0f5740306b', 'Bellator',      true, true),
  ('aa82c8d6-41f3-4ae3-bc72-a52f96481928', '141Air',        true, true),
  ('3e920f7d-a412-4e04-a8d6-6bf83629af4f', 'Lever Talents', true, true)
) AS c(id, name, performance_enabled, rs_enabled)
ON CONFLICT (id) DO UPDATE SET
  name                = EXCLUDED.name,
  group_id            = EXCLUDED.group_id,
  performance_enabled = EXCLUDED.performance_enabled,
  rs_enabled          = EXCLUDED.rs_enabled;

-- Step 3 — Defensive: ensure any existing company row matched by name also
-- gets group_id set (handles case where owner reused existing rows by name
-- but the UUIDs above did not match).
DO $$
DECLARE
  v_grupo_lever_id uuid;
BEGIN
  SELECT id INTO v_grupo_lever_id
    FROM public.company_groups
   WHERE slug = 'grupo-lever';

  UPDATE public.companies
     SET group_id = v_grupo_lever_id
   WHERE group_id IS NULL
     AND name IN (
       'Netair', 'Netparts', 'Unique', 'Easy Peasy',
       'Bellator', '141Air', 'Lever Talents'
     );
END $$;

COMMENT ON TABLE public.company_groups IS
  'Phase 1 schema; populated by Phase 3 Migration E1 (Grupo Lever + 7 companies)';
