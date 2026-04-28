-- =========================================================================
-- Migration E3: user_roles socio → socio_company_memberships (BACKFILL E.3)
--
-- Threats: T-3-06 (sócio sees company without membership — RLS blocks via
--                  visible_companies(uid); but visible_companies returns empty
--                  array until membership exists here)
--          T-3-BACKFILL-02 (wrong membership grants sócio cross-company view —
--                            accepted: RLS is the boundary, not this migration)
-- REQs: RBAC-04 (sócio N:N memberships) + Phase 3 D-29
-- Reversibility: idempotent — INSERT ... ON CONFLICT DO NOTHING; re-run = 0
-- DEPENDENCIES:
--   - Migration E1 (20260429120000_e1_company_groups_seed.sql) — companies
--     populated by owner UUID; slug references here resolved via name lookup
--   - Phase 1 Migration C (socio_company_memberships table created)
--   - owner-inputs/socio-memberships.json (currently empty memberships array)
-- NOTE: user_roles rows stay (drop in Phase 4 Migration G)
-- NOTE: socio_company_memberships PK is (user_id, company_id) — column is
--       user_id (not socio_user_id) per Phase 1 Migration B2/C schema.
-- NOTE: owner-inputs/socio-memberships.json has memberships=[] at plan time.
--       When owner provides real entries before Plan 03-05 push, add rows to
--       the VALUES block in the DO $$ ... END $$ below (same idempotent
--       pattern — re-running after owner adds entries is safe).
-- =========================================================================

-- Step 1 — Insert socio memberships per owner-inputs/socio-memberships.json.
-- Source: { "memberships": [] } — empty at plan-02 time; owner will complete
-- before Plan 03-05 (supabase db push). Adding entries here uses sub-selects
-- so email→user_id and company name→company_id are resolved at runtime.
--
-- Pattern: one DO block per socio, sub-select resolves auth.users by email,
-- then one INSERT per company they belong to. ON CONFLICT DO NOTHING ensures
-- idempotency.
--
-- When owner provides memberships, add entries following the template below:
--
--   -- <socio_email>
--   SELECT id INTO v_socio_user_id FROM auth.users WHERE email = '<socio_email>' LIMIT 1;
--   IF v_socio_user_id IS NOT NULL THEN
--     INSERT INTO public.socio_company_memberships (user_id, company_id, created_at)
--     SELECT v_socio_user_id, id, NOW()
--       FROM public.companies WHERE name = '<company_name>'
--     ON CONFLICT (user_id, company_id) DO NOTHING;
--     v_inserted := v_inserted + 1;
--   END IF;

DO $$
DECLARE
  v_socio_user_id uuid;
  v_inserted      int := 0;
BEGIN
  -- memberships from owner-inputs/socio-memberships.json
  -- currently empty — owner completes before Plan 03-05 push
  -- add socio entries here following the pattern in the header comment above

  RAISE NOTICE 'Migration E3: inserted % socio_company_memberships rows', v_inserted;
END $$;

-- Step 2 — Sanity check: every user_role.role='socio' should have at least
-- 1 membership. Emitted as NOTICE (not EXCEPTION) — owner JSON may intentionally
-- exclude inactive sócios; warning is for verification during Plan 03-05.
DO $$
DECLARE
  v_orphans int;
BEGIN
  SELECT COUNT(*) INTO v_orphans
    FROM public.user_roles ur
   WHERE ur.role = 'socio'
     AND NOT EXISTS (
       SELECT 1 FROM public.socio_company_memberships scm
        WHERE scm.user_id = ur.user_id
     );

  IF v_orphans > 0 THEN
    RAISE NOTICE 'Migration E3 WARNING: % sócio(s) sem membership — verificar owner-inputs/socio-memberships.json antes do Plan 03-05 push', v_orphans;
  ELSE
    RAISE NOTICE 'Migration E3: all sócios have at least 1 company membership (or no sócios exist)';
  END IF;
END $$;
