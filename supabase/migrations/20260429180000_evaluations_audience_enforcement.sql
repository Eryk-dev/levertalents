-- Tighten evaluations RLS so only audience members can write evaluations.
--
-- Bug found in production: a user from the same company but OUTSIDE the
-- cycle's audience could insert evaluations because the existing
-- evaluations_write_self policy only checked company visibility, evaluator
-- identity and cycle status. This let any signed-in colleague seed bogus
-- evaluations.
--
-- Fix: require both evaluator_user_id AND evaluated_user_id to be members
-- of resolve_cycle_audience(cycle_id). People managers retain a
-- safety-valve override.

-- The new policy needs to call resolve_cycle_audience as `authenticated`,
-- so re-grant EXECUTE (we revoked it from the trigger-helper migration).
GRANT EXECUTE ON FUNCTION public.resolve_cycle_audience(uuid) TO authenticated;

DROP POLICY IF EXISTS evaluations_write_self ON public.evaluations;

CREATE POLICY evaluations_write_self ON public.evaluations
AS PERMISSIVE
FOR ALL
TO authenticated
USING (
  (company_id = ANY (public.visible_companies((SELECT auth.uid()))))
  AND (
    (evaluator_user_id = (SELECT auth.uid())) OR public.is_people_manager((SELECT auth.uid()))
  )
)
WITH CHECK (
  (company_id = ANY (public.visible_companies((SELECT auth.uid()))))
  AND (
    (evaluator_user_id = (SELECT auth.uid())) OR public.is_people_manager((SELECT auth.uid()))
  )
  AND EXISTS (
    SELECT 1 FROM public.evaluation_cycles c
    WHERE c.id = evaluations.cycle_id AND c.status = 'active'
  )
  AND (
    public.is_people_manager((SELECT auth.uid()))
    OR (
      EXISTS (
        SELECT 1 FROM public.resolve_cycle_audience(evaluations.cycle_id) a
        WHERE a.user_id = evaluations.evaluator_user_id
      )
      AND EXISTS (
        SELECT 1 FROM public.resolve_cycle_audience(evaluations.cycle_id) a
        WHERE a.user_id = evaluations.evaluated_user_id
      )
    )
  )
);
