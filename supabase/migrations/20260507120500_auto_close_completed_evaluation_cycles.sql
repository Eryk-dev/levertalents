-- Auto-close evaluation cycles when every expected assignment has a submitted
-- evaluation. Date-based closing still happens through the existing pg_cron job.

CREATE OR REPLACE FUNCTION public.close_evaluation_cycle_when_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expected_count int;
  submitted_count int;
BEGIN
  IF NEW.status <> 'submitted' THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.evaluation_cycles c
    WHERE c.id = NEW.cycle_id
      AND c.status = 'active'
  ) THEN
    RETURN NEW;
  END IF;

  WITH expected AS (
    SELECT DISTINCT
      a.evaluator_user_id,
      a.evaluated_user_id,
      a.direction
    FROM public.resolve_cycle_evaluation_assignments(NEW.cycle_id) a
  ),
  submitted AS (
    SELECT DISTINCT
      e.evaluator_user_id,
      e.evaluated_user_id,
      e.direction
    FROM public.evaluations e
    JOIN expected x
      ON x.evaluator_user_id = e.evaluator_user_id
     AND x.evaluated_user_id = e.evaluated_user_id
     AND x.direction = e.direction
    WHERE e.cycle_id = NEW.cycle_id
      AND e.status = 'submitted'
  )
  SELECT
    (SELECT count(*) FROM expected),
    (SELECT count(*) FROM submitted)
  INTO expected_count, submitted_count;

  IF expected_count > 0 AND submitted_count >= expected_count THEN
    UPDATE public.evaluation_cycles
    SET status = 'closed',
        updated_at = now()
    WHERE id = NEW.cycle_id
      AND status = 'active';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_close_evaluation_cycle_when_complete ON public.evaluations;
CREATE TRIGGER trg_close_evaluation_cycle_when_complete
AFTER INSERT OR UPDATE OF status ON public.evaluations
FOR EACH ROW EXECUTE FUNCTION public.close_evaluation_cycle_when_complete();

REVOKE EXECUTE ON FUNCTION public.close_evaluation_cycle_when_complete()
  FROM PUBLIC, anon, authenticated;

-- Backfill cycles that are already complete at migration time.
WITH completion AS (
  SELECT
    c.id,
    expected.expected_count,
    submitted.submitted_count
  FROM public.evaluation_cycles c
  CROSS JOIN LATERAL (
    SELECT count(*)::int AS expected_count
    FROM (
      SELECT DISTINCT
        a.evaluator_user_id,
        a.evaluated_user_id,
        a.direction
      FROM public.resolve_cycle_evaluation_assignments(c.id) a
    ) expected_rows
  ) expected
  CROSS JOIN LATERAL (
    SELECT count(*)::int AS submitted_count
    FROM (
      SELECT DISTINCT
        e.evaluator_user_id,
        e.evaluated_user_id,
        e.direction
      FROM public.evaluations e
      JOIN public.resolve_cycle_evaluation_assignments(c.id) a
        ON a.evaluator_user_id = e.evaluator_user_id
       AND a.evaluated_user_id = e.evaluated_user_id
       AND a.direction = e.direction
      WHERE e.cycle_id = c.id
        AND e.status = 'submitted'
    ) submitted_rows
  ) submitted
  WHERE c.status = 'active'
)
UPDATE public.evaluation_cycles c
SET status = 'closed',
    updated_at = now()
FROM completion
WHERE c.id = completion.id
  AND completion.expected_count > 0
  AND completion.submitted_count >= completion.expected_count
  AND c.status = 'active';
