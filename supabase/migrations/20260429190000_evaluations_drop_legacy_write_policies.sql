-- Final form of evaluation write policies.
--
-- The previous migration 20260429180000 added evaluations_write_self with a
-- people-manager override. Two problems were then found in production:
--   1. Legacy permissive policies ("People managers manage evaluations" FOR
--      ALL, "Leaders can create evaluations for their team", "Leaders can
--      update their own evaluations") still existed from before evaluation
--      cycles were introduced. In PostgreSQL multiple PERMISSIVE policies
--      are combined with OR, so the new strict policy was useless: any one
--      of the legacy policies was enough to let an INSERT through.
--   2. Confirmed in production: a RH user inserted a new evaluation in
--      cycle "teste" right after the prior tightening, because the
--      "People managers manage evaluations" policy bypassed audience
--      enforcement.
--
-- This migration is the canonical state going forward:
--   * evaluations_insert_audience  — INSERT only by audience members.
--   * evaluations_update_self_or_pm — UPDATE by evaluator or people manager
--     (people managers retain editorial override on existing rows only,
--     not for creating new rows on someone else's behalf).
--   * "Leaders, RH and Socio can delete evaluations" — kept (moderation).
--   * The four SELECT policies — kept.

DROP POLICY IF EXISTS "People managers manage evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "Leaders can create evaluations for their team" ON public.evaluations;
DROP POLICY IF EXISTS "Leaders can update their own evaluations" ON public.evaluations;
DROP POLICY IF EXISTS evaluations_write_self ON public.evaluations;

-- Recreate to ensure correctness if migrations are replayed from zero
-- (the prior migration's CREATE was a permissive single FOR ALL policy).
DROP POLICY IF EXISTS evaluations_insert_audience ON public.evaluations;
CREATE POLICY evaluations_insert_audience ON public.evaluations
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  (company_id = ANY (public.visible_companies((SELECT auth.uid()))))
  AND (evaluator_user_id = (SELECT auth.uid()))
  AND EXISTS (
    SELECT 1 FROM public.evaluation_cycles c
    WHERE c.id = evaluations.cycle_id AND c.status = 'active'
  )
  AND EXISTS (
    SELECT 1 FROM public.resolve_cycle_audience(evaluations.cycle_id) a
    WHERE a.user_id = evaluations.evaluator_user_id
  )
  AND EXISTS (
    SELECT 1 FROM public.resolve_cycle_audience(evaluations.cycle_id) a
    WHERE a.user_id = evaluations.evaluated_user_id
  )
);

DROP POLICY IF EXISTS evaluations_update_self_or_pm ON public.evaluations;
CREATE POLICY evaluations_update_self_or_pm ON public.evaluations
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
  (company_id = ANY (public.visible_companies((SELECT auth.uid()))))
  AND (
    evaluator_user_id = (SELECT auth.uid())
    OR public.is_people_manager((SELECT auth.uid()))
  )
)
WITH CHECK (
  (company_id = ANY (public.visible_companies((SELECT auth.uid()))))
  AND (
    evaluator_user_id = (SELECT auth.uid())
    OR public.is_people_manager((SELECT auth.uid()))
  )
);
