-- =========================================================================
-- Migration CLIM.1: Drop user_id from climate_responses + ADD org_unit_id
--                   (D-09 — climate is 100% anônima, LGPD true anonymity)
--
-- ⚠️ DESTRUCTIVE: drops climate_responses.user_id column. Cannot recover respondent identity.
--                 Owner approved (D-09). Replaces with org_unit_id (aggregation granularity).
--
-- Threats: T-3-03 (CRITICAL) climate.responses preserves user_id → identity leak — MITIGATED here
-- REQs: PERF-05 (100% anônima)
-- Reversibility: NONE for user_id mapping; schema can re-add column but original data lost
-- DEPENDENCIES: e1 (companies) + pre3 (climate_surveys.company_id NOT NULL)
-- =========================================================================

BEGIN;

-- Step 1 — Add org_unit_id NULLABLE first (will populate before drop user_id)
ALTER TABLE public.climate_responses
  ADD COLUMN IF NOT EXISTS org_unit_id UUID NULL REFERENCES public.org_units(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_climate_responses_org_unit ON public.climate_responses(org_unit_id);

-- Step 2 — Backfill org_unit_id via user_id LIMIT 1 lookup (BEFORE we drop user_id)
--          Uses ROW_NUMBER to pick the primary org_unit per user (earliest joined_at)
UPDATE public.climate_responses cr
   SET org_unit_id = sub.org_unit_id
  FROM (
    SELECT oum.user_id, oum.org_unit_id,
           ROW_NUMBER() OVER (PARTITION BY oum.user_id ORDER BY oum.joined_at) AS rn
      FROM public.org_unit_members oum
  ) sub
 WHERE cr.org_unit_id IS NULL
   AND cr.user_id = sub.user_id
   AND sub.rn = 1;

-- Step 3 — Drop user_id column + supporting index + unique constraint (T-3-03 critical mitigation)
DROP INDEX IF EXISTS public.idx_climate_responses_user_id;
ALTER TABLE public.climate_responses DROP CONSTRAINT IF EXISTS unique_survey_question_user;
ALTER TABLE public.climate_responses DROP COLUMN IF EXISTS user_id;

-- Step 4 — RLS: drop legacy policies, restrict reads to admin/rh of visible companies (no SELECT for liderado).
--                Writes go through RPC submit_climate_response (clim2.sql).
ALTER TABLE public.climate_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS climate_responses_select_legacy ON public.climate_responses;
DROP POLICY IF EXISTS climate_responses_select_admin_rh ON public.climate_responses;
DROP POLICY IF EXISTS climate_responses_insert_legacy ON public.climate_responses;
DROP POLICY IF EXISTS climate_responses_update_legacy ON public.climate_responses;

-- Only admin/rh can SELECT raw responses (for moderating; aggregation goes via RPC).
CREATE POLICY climate_responses_select_admin_rh
  ON public.climate_responses FOR SELECT
  USING (
    public.is_people_manager((SELECT auth.uid()))
    AND EXISTS (
      SELECT 1 FROM public.climate_surveys s
       WHERE s.id = survey_id
         AND s.company_id = ANY(public.visible_companies((SELECT auth.uid())))
    )
  );

-- INSERT only via SECURITY DEFINER RPC submit_climate_response (no direct INSERT policy).
-- This forces all writes through the RPC, which strips actor identity.

COMMIT;

COMMENT ON TABLE public.climate_responses IS 'Phase 3 D-09: user_id dropped (LGPD true anonymity); writes only via RPC submit_climate_response';
