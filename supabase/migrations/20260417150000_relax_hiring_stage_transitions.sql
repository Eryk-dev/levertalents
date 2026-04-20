-- Relax hiring stage/status transitions to allow free movement in the Kanban.
-- Rationale: product decision — recruiters/admins can move cards to any column,
-- including backwards. Previous strict forward-only machine was overly rigid.

-- 1) job_openings.status: replace strict enforcer with permissive function
--    that only auto-fills closed_at when moving to 'encerrada'.
CREATE OR REPLACE FUNCTION public.tg_enforce_job_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'encerrada' AND NEW.closed_at IS NULL THEN
    NEW.closed_at := NOW();
  END IF;

  -- Moving back out of 'encerrada' clears closed_at.
  IF OLD.status = 'encerrada' AND NEW.status <> 'encerrada' THEN
    NEW.closed_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- 2) applications.stage: allow moving out of terminal states too.
CREATE OR REPLACE FUNCTION public.tg_enforce_application_stage_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.stage IS NOT DISTINCT FROM NEW.stage THEN
    RETURN NEW;
  END IF;

  NEW.stage_entered_at := NOW();

  -- Moving out of rejected/terminal states clears closed_at so the card
  -- goes back to active flow.
  IF OLD.stage IN ('reprovado_pelo_gestor', 'recusado')
     AND NEW.stage NOT IN ('reprovado_pelo_gestor', 'recusado') THEN
    NEW.closed_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;
