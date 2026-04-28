-- =========================================================================
-- Migration PERF.2: TRUNCATE evaluations + drop legacy columns + SET NOT NULL (D-08)
--
-- ⚠️ DESTRUCTIVE: drops ALL evaluations rows. Owner explicitly approved (D-08).
--                 No CSV export prior. PITR window (7 days) is the only restore path.
--
-- Threats: T-3-OPS-01 (data loss accepted) — accept (owner decision)
-- REQs: PERF-01, PERF-03, PERF-04 + D-08 lock
-- Reversibility: NONE for the data; schema can be reverted by re-adding old columns
-- DEPENDENCIES: perf1 (cycle_id/direction/responses columns added)
-- =========================================================================

BEGIN;

-- Step 1 — TRUNCATE (single transaction; rollback if subsequent steps fail)
TRUNCATE TABLE public.evaluations CASCADE;

-- Step 2 — Drop legacy columns
ALTER TABLE public.evaluations
  DROP COLUMN IF EXISTS period,
  DROP COLUMN IF EXISTS overall_score,
  DROP COLUMN IF EXISTS technical_score,
  DROP COLUMN IF EXISTS behavioral_score,
  DROP COLUMN IF EXISTS leadership_score,
  DROP COLUMN IF EXISTS comments,
  DROP COLUMN IF EXISTS strengths,
  DROP COLUMN IF EXISTS areas_for_improvement;

-- Step 3 — SET NOT NULL on new columns (now safe — table is empty)
ALTER TABLE public.evaluations
  ALTER COLUMN cycle_id   SET NOT NULL,
  ALTER COLUMN direction  SET NOT NULL,
  ALTER COLUMN company_id SET NOT NULL;

-- Step 4 — Drop + recreate RLS policies (legacy policies likely reference dropped columns)
DROP POLICY IF EXISTS evaluations_select_legacy ON public.evaluations;
DROP POLICY IF EXISTS evaluations_insert_legacy ON public.evaluations;
DROP POLICY IF EXISTS evaluations_update_legacy ON public.evaluations;
DROP POLICY IF EXISTS evaluations_delete_legacy ON public.evaluations;
DROP POLICY IF EXISTS evaluations_select_visible ON public.evaluations;
DROP POLICY IF EXISTS evaluations_write_admin_rh ON public.evaluations;
DROP POLICY IF EXISTS evaluations_write_self ON public.evaluations;

ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

-- D-03: RH (people_manager) sees all in visible companies; líder sees descendants; liderado sees own.
CREATE POLICY evaluations_select_visible
  ON public.evaluations FOR SELECT
  USING (
    company_id = ANY(public.visible_companies((SELECT auth.uid())))
    AND (
      public.is_people_manager((SELECT auth.uid()))
      OR evaluator_user_id = (SELECT auth.uid())
      OR evaluated_user_id = (SELECT auth.uid())
      OR evaluated_user_id IN (
        SELECT oum.user_id FROM public.org_unit_members oum
         WHERE oum.org_unit_id = ANY(public.visible_org_units((SELECT auth.uid())))
      )
    )
  );

-- INSERT/UPDATE: evaluator (or RH for admin override) writes own evaluation.
CREATE POLICY evaluations_write_self
  ON public.evaluations FOR ALL
  USING (
    company_id = ANY(public.visible_companies((SELECT auth.uid())))
    AND (evaluator_user_id = (SELECT auth.uid()) OR public.is_people_manager((SELECT auth.uid())))
  )
  WITH CHECK (
    company_id = ANY(public.visible_companies((SELECT auth.uid())))
    AND (evaluator_user_id = (SELECT auth.uid()) OR public.is_people_manager((SELECT auth.uid())))
    AND EXISTS (
      SELECT 1 FROM public.evaluation_cycles c
       WHERE c.id = cycle_id AND c.status = 'active'
    )  -- evaluation_cycles must be 'active' (not 'closed') for write
  );

COMMIT;

COMMENT ON TABLE public.evaluations IS 'Phase 3 D-08: legacy schema TRUNCATEd; new schema cycle_id+direction+responses+company_id';
