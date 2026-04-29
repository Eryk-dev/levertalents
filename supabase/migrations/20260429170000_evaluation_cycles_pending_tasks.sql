-- Pending tasks for evaluation cycles.
--
-- When an evaluation cycle is opened (status active/draft), every user in
-- the audience that owes at least one evaluation gets a pending_task in
-- their inbox. The task auto-closes when:
--   * the evaluator submits all expected evaluations for the cycle, or
--   * the cycle status changes to 'closed' (completed) / 'cancelled'.
-- Deleting a cycle cancels related pending tasks.
--
-- Audience resolution mirrors the client-side useCycleAudienceUsers hook
-- (manual / company / org_unit + descendants).

-- Helper: resolve the user audience of an evaluation cycle into user_ids.
CREATE OR REPLACE FUNCTION public.resolve_cycle_audience(_cycle_id uuid)
RETURNS TABLE(user_id uuid)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.evaluation_cycles%ROWTYPE;
  unit_ids uuid[];
BEGIN
  SELECT * INTO c FROM public.evaluation_cycles WHERE id = _cycle_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF c.audience_kind = 'manual' THEN
    RETURN QUERY SELECT DISTINCT unnest(c.audience_ids);
    RETURN;
  END IF;

  IF c.audience_kind = 'company' THEN
    SELECT array_agg(id) INTO unit_ids
    FROM public.org_units
    WHERE company_id = c.company_id;
  ELSIF c.audience_kind = 'org_unit' THEN
    unit_ids := c.audience_ids;
    IF c.include_descendants AND cardinality(unit_ids) > 0 THEN
      SELECT array_agg(DISTINCT u) INTO unit_ids
      FROM (
        SELECT unnest(unit_ids) AS u
        UNION
        SELECT d.descendant
        FROM unnest(unit_ids) AS root_id,
             LATERAL public.org_unit_descendants(root_id) AS d(descendant)
      ) x;
    END IF;
  END IF;

  IF unit_ids IS NULL OR cardinality(unit_ids) = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT DISTINCT m.user_id
    FROM public.org_unit_members m
    WHERE m.org_unit_id = ANY(unit_ids);
END;
$$;

-- Helper: how many evaluations the given user is expected to submit in a cycle.
-- Simplified: each user evaluates everyone else if any non-self direction is
-- selected, plus themselves if 'self' direction is selected.
CREATE OR REPLACE FUNCTION public.expected_evaluations_for_user(
  _cycle_id uuid,
  _user_id uuid
)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.evaluation_cycles%ROWTYPE;
  audience_size int;
  in_audience boolean;
  has_self boolean;
  has_others boolean;
BEGIN
  SELECT * INTO c FROM public.evaluation_cycles WHERE id = _cycle_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  SELECT count(*) INTO audience_size FROM public.resolve_cycle_audience(_cycle_id);
  SELECT EXISTS (
    SELECT 1 FROM public.resolve_cycle_audience(_cycle_id) WHERE user_id = _user_id
  ) INTO in_audience;

  IF NOT in_audience OR audience_size = 0 THEN
    RETURN 0;
  END IF;

  has_self := 'self' = ANY(c.directions);
  has_others := EXISTS (SELECT 1 FROM unnest(c.directions) d WHERE d <> 'self');

  IF has_others AND has_self THEN
    RETURN audience_size; -- self + (audience_size - 1) others
  ELSIF has_others THEN
    RETURN GREATEST(audience_size - 1, 0);
  ELSIF has_self THEN
    RETURN 1;
  ELSE
    RETURN 0;
  END IF;
END;
$$;

-- Create pending_tasks for every audience member of a new cycle.
CREATE OR REPLACE FUNCTION public.create_pending_tasks_for_evaluation_cycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('active', 'draft') THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.pending_tasks (
    user_id, title, description, task_type, related_id, priority, due_date
  )
  SELECT
    a.user_id,
    'Avaliações: ' || NEW.name,
    'Você precisa enviar suas avaliações deste ciclo até ' ||
      to_char(NEW.ends_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY') || '.',
    'evaluation',
    NEW.id,
    'medium',
    NEW.ends_at::date
  FROM public.resolve_cycle_audience(NEW.id) a
  WHERE public.expected_evaluations_for_user(NEW.id, a.user_id) > 0
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_pending_tasks_evaluation_cycle ON public.evaluation_cycles;
CREATE TRIGGER trg_create_pending_tasks_evaluation_cycle
AFTER INSERT ON public.evaluation_cycles
FOR EACH ROW EXECUTE FUNCTION public.create_pending_tasks_for_evaluation_cycle();

-- Close pending_tasks when cycle is closed/cancelled, recreate when reopened.
CREATE OR REPLACE FUNCTION public.sync_pending_tasks_on_cycle_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status IN ('closed', 'cancelled') THEN
      UPDATE public.pending_tasks
      SET status = CASE WHEN NEW.status = 'closed' THEN 'completed' ELSE 'cancelled' END,
          completed_at = CASE WHEN NEW.status = 'closed' THEN now() ELSE completed_at END
      WHERE related_id = NEW.id
        AND task_type = 'evaluation'
        AND status IN ('pending', 'in_progress');
    ELSIF NEW.status IN ('active', 'draft')
          AND OLD.status NOT IN ('active', 'draft') THEN
      INSERT INTO public.pending_tasks (
        user_id, title, description, task_type, related_id, priority, due_date
      )
      SELECT
        a.user_id,
        'Avaliações: ' || NEW.name,
        'Você precisa enviar suas avaliações deste ciclo até ' ||
          to_char(NEW.ends_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY') || '.',
        'evaluation',
        NEW.id,
        'medium',
        NEW.ends_at::date
      FROM public.resolve_cycle_audience(NEW.id) a
      WHERE public.expected_evaluations_for_user(NEW.id, a.user_id) > 0
        AND NOT EXISTS (
          SELECT 1 FROM public.pending_tasks pt
          WHERE pt.related_id = NEW.id
            AND pt.task_type = 'evaluation'
            AND pt.user_id = a.user_id
            AND pt.status IN ('pending', 'in_progress')
        );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_pending_tasks_on_cycle_status ON public.evaluation_cycles;
CREATE TRIGGER trg_sync_pending_tasks_on_cycle_status
AFTER UPDATE OF status ON public.evaluation_cycles
FOR EACH ROW EXECUTE FUNCTION public.sync_pending_tasks_on_cycle_status();

-- Cancel pending_tasks if a cycle is deleted.
CREATE OR REPLACE FUNCTION public.cancel_pending_tasks_on_cycle_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.pending_tasks
  SET status = 'cancelled', completed_at = now()
  WHERE related_id = OLD.id
    AND task_type = 'evaluation'
    AND status IN ('pending', 'in_progress');
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_cancel_pending_tasks_on_cycle_delete ON public.evaluation_cycles;
CREATE TRIGGER trg_cancel_pending_tasks_on_cycle_delete
AFTER DELETE ON public.evaluation_cycles
FOR EACH ROW EXECUTE FUNCTION public.cancel_pending_tasks_on_cycle_delete();

-- Auto-close a user's pending_task once they finish all expected evaluations.
CREATE OR REPLACE FUNCTION public.close_pending_tasks_on_evaluation_submit()
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
  IF TG_OP = 'UPDATE' AND OLD.status = 'submitted' THEN
    RETURN NEW;
  END IF;

  expected_count := public.expected_evaluations_for_user(NEW.cycle_id, NEW.evaluator_user_id);
  IF expected_count = 0 THEN RETURN NEW; END IF;

  SELECT count(*) INTO submitted_count
  FROM public.evaluations
  WHERE cycle_id = NEW.cycle_id
    AND evaluator_user_id = NEW.evaluator_user_id
    AND status = 'submitted';

  IF submitted_count >= expected_count THEN
    UPDATE public.pending_tasks
    SET status = 'completed', completed_at = now()
    WHERE related_id = NEW.cycle_id
      AND task_type = 'evaluation'
      AND user_id = NEW.evaluator_user_id
      AND status IN ('pending', 'in_progress');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_close_pending_tasks_on_evaluation_submit ON public.evaluations;
CREATE TRIGGER trg_close_pending_tasks_on_evaluation_submit
AFTER INSERT OR UPDATE OF status ON public.evaluations
FOR EACH ROW EXECUTE FUNCTION public.close_pending_tasks_on_evaluation_submit();

-- These helper functions are only for trigger use; nobody should be able to
-- call them via PostgREST RPC.
REVOKE EXECUTE ON FUNCTION public.resolve_cycle_audience(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expected_evaluations_for_user(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_pending_tasks_for_evaluation_cycle() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_pending_tasks_on_cycle_status() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cancel_pending_tasks_on_cycle_delete() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.close_pending_tasks_on_evaluation_submit() FROM PUBLIC, anon, authenticated;

-- Backfill: create pending_tasks for any existing active/draft cycles that
-- don't yet have them (idempotent).
INSERT INTO public.pending_tasks (
  user_id, title, description, task_type, related_id, priority, due_date
)
SELECT
  a.user_id,
  'Avaliações: ' || c.name,
  'Você precisa enviar suas avaliações deste ciclo até ' ||
    to_char(c.ends_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY') || '.',
  'evaluation',
  c.id,
  'medium',
  c.ends_at::date
FROM public.evaluation_cycles c
CROSS JOIN LATERAL public.resolve_cycle_audience(c.id) a
WHERE c.status IN ('active', 'draft')
  AND public.expected_evaluations_for_user(c.id, a.user_id) > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.pending_tasks pt
    WHERE pt.related_id = c.id
      AND pt.task_type = 'evaluation'
      AND pt.user_id = a.user_id
      AND pt.status IN ('pending', 'in_progress', 'completed')
  );
