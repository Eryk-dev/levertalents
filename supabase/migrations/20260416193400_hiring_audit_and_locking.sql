-- T009 — Audit (candidate_access_log) + state-machine guards +
-- interview-decision fanout.

-- --- candidate_access_log trigger on mutation of key tables ---------------

CREATE OR REPLACE FUNCTION public.tg_log_candidate_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_candidate_id UUID;
BEGIN
  IF TG_TABLE_NAME = 'candidates' THEN
    v_candidate_id := NEW.id;
  ELSIF TG_TABLE_NAME = 'applications' THEN
    v_candidate_id := NEW.candidate_id;
  ELSIF TG_TABLE_NAME = 'interviews' THEN
    SELECT a.candidate_id INTO v_candidate_id
    FROM public.applications a
    WHERE a.id = NEW.application_id;
  ELSE
    RETURN NEW;
  END IF;

  IF v_candidate_id IS NOT NULL AND auth.uid() IS NOT NULL THEN
    INSERT INTO public.candidate_access_log (
      candidate_id, actor_id, action, resource, resource_id, actual_version
    )
    VALUES (
      v_candidate_id,
      auth.uid(),
      'update',
      TG_TABLE_NAME,
      NEW.id,
      NEW.updated_at
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tg_log_candidates_update
  AFTER UPDATE ON public.candidates
  FOR EACH ROW EXECUTE FUNCTION public.tg_log_candidate_access();

CREATE TRIGGER tg_log_applications_update
  AFTER UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.tg_log_candidate_access();

CREATE TRIGGER tg_log_interviews_update
  AFTER UPDATE ON public.interviews
  FOR EACH ROW EXECUTE FUNCTION public.tg_log_candidate_access();

-- --- Enforce job_openings.status transitions ------------------------------

CREATE OR REPLACE FUNCTION public.tg_enforce_job_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- Allowed transitions (data-model §1)
  IF NOT (
    (OLD.status = 'aguardando_descritivo' AND NEW.status = 'em_ajuste_pelo_rh')
    OR (OLD.status = 'em_ajuste_pelo_rh' AND NEW.status = 'aguardando_aprovacao_do_gestor')
    OR (OLD.status = 'aguardando_aprovacao_do_gestor' AND NEW.status IN ('em_ajuste_pelo_rh', 'pronta_para_publicar'))
    OR (OLD.status = 'pronta_para_publicar' AND NEW.status = 'publicada')
    OR (OLD.status = 'publicada' AND NEW.status IN ('em_triagem', 'encerrada'))
    OR (OLD.status = 'em_triagem' AND NEW.status = 'encerrada')
    -- Admin escape: encerrar a qualquer momento.
    OR (NEW.status = 'encerrada')
  ) THEN
    RAISE EXCEPTION 'Invalid job_openings.status transition % -> %',
      OLD.status, NEW.status USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.status = 'encerrada' AND NEW.closed_at IS NULL THEN
    NEW.closed_at := NOW();
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER tg_enforce_job_status_transition
  BEFORE UPDATE OF status ON public.job_openings
  FOR EACH ROW EXECUTE FUNCTION public.tg_enforce_job_status_transition();

-- --- Enforce applications.stage transitions -------------------------------
-- Most stage moves come from the UI's guarded UPDATE (R4); this trigger just
-- blocks moves that are obviously nonsensical. The Kanban UI owns the
-- pragmatic ordering.

CREATE OR REPLACE FUNCTION public.tg_enforce_application_stage_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.stage IS NOT DISTINCT FROM NEW.stage THEN
    RETURN NEW;
  END IF;

  -- Cannot move OUT of `admitido` (final state).
  IF OLD.stage = 'admitido' THEN
    RAISE EXCEPTION 'applications.stage=admitido is terminal';
  END IF;

  -- Closed states cannot come back alive (except via anonymization reset,
  -- which doesn't change stage).
  IF OLD.stage IN ('reprovado_pelo_gestor', 'recusado')
     AND NEW.stage NOT IN ('reprovado_pelo_gestor', 'recusado', 'admitido') THEN
    RAISE EXCEPTION 'applications.stage % is terminal', OLD.stage;
  END IF;

  NEW.stage_entered_at := NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER tg_enforce_application_stage_transition
  BEFORE UPDATE OF stage ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.tg_enforce_application_stage_transition();

-- --- Append to application_stage_history on every stage change ------------

CREATE OR REPLACE FUNCTION public.tg_append_application_stage_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.application_stage_history (application_id, from_stage, to_stage, moved_by, note)
    VALUES (NEW.id, NULL, NEW.stage, COALESCE(NEW.last_moved_by, auth.uid(), NEW.id), NEW.notes);
    RETURN NEW;
  END IF;

  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    INSERT INTO public.application_stage_history (application_id, from_stage, to_stage, moved_by, note)
    VALUES (NEW.id, OLD.stage, NEW.stage, COALESCE(NEW.last_moved_by, auth.uid(), NEW.id), NULL);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tg_append_application_stage_history_ins
  AFTER INSERT ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.tg_append_application_stage_history();

CREATE TRIGGER tg_append_application_stage_history_upd
  AFTER UPDATE OF stage ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.tg_append_application_stage_history();

-- --- Fanout from interview_decisions to applications.stage + hiring_decisions

CREATE OR REPLACE FUNCTION public.tg_fanout_interview_decision()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_application_id UUID;
  v_kind public.interview_kind_enum;
  v_pending_count INT;
  v_approved_count INT;
  v_reprovado_count INT;
  v_summary TEXT;
BEGIN
  IF NEW.decision = 'pendente' THEN
    RETURN NEW;
  END IF;

  SELECT i.application_id, i.kind
    INTO v_application_id, v_kind
  FROM public.interviews i
  WHERE i.id = NEW.interview_id;

  IF v_kind <> 'final' THEN
    RETURN NEW;
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE decision = 'pendente'),
    COUNT(*) FILTER (WHERE decision = 'aprovado'),
    COUNT(*) FILTER (WHERE decision = 'reprovado')
    INTO v_pending_count, v_approved_count, v_reprovado_count
  FROM public.interview_decisions
  WHERE interview_id = NEW.interview_id;

  -- First reprovação → terminal reprovado.
  IF v_reprovado_count > 0 THEN
    UPDATE public.applications
      SET stage = 'reprovado_pelo_gestor', closed_at = NOW()
      WHERE id = v_application_id AND stage NOT IN ('reprovado_pelo_gestor', 'admitido', 'recusado');

    SELECT string_agg(
             p.full_name || ': ' || d.decision ||
             COALESCE(' — ' || d.comments, ''),
             E'\n')
      INTO v_summary
    FROM public.interview_decisions d
    JOIN public.profiles p ON p.id = d.evaluator_id
    WHERE d.interview_id = NEW.interview_id;

    INSERT INTO public.hiring_decisions (application_id, outcome, summary)
    VALUES (v_application_id, 'reprovado', v_summary)
    ON CONFLICT (application_id) DO UPDATE
      SET outcome = EXCLUDED.outcome, summary = EXCLUDED.summary, decided_at = NOW();
    RETURN NEW;
  END IF;

  -- Unanimous approval → aprovado.
  IF v_pending_count = 0 AND v_approved_count > 0 THEN
    UPDATE public.applications
      SET stage = 'aprovado'
      WHERE id = v_application_id AND stage NOT IN ('aprovado', 'em_admissao', 'admitido', 'reprovado_pelo_gestor', 'recusado');

    SELECT string_agg(p.full_name || ': ' || d.decision, E'\n')
      INTO v_summary
    FROM public.interview_decisions d
    JOIN public.profiles p ON p.id = d.evaluator_id
    WHERE d.interview_id = NEW.interview_id;

    INSERT INTO public.hiring_decisions (application_id, outcome, summary)
    VALUES (v_application_id, 'aprovado', v_summary)
    ON CONFLICT (application_id) DO UPDATE
      SET outcome = EXCLUDED.outcome, summary = EXCLUDED.summary, decided_at = NOW();
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER tg_fanout_interview_decision
  AFTER INSERT OR UPDATE OF decision ON public.interview_decisions
  FOR EACH ROW EXECUTE FUNCTION public.tg_fanout_interview_decision();

-- When an interviews.status is set to 'realizada' and kind='final', seed one
-- pendente row per participant if not already present.
CREATE OR REPLACE FUNCTION public.tg_seed_final_interview_decisions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_participant UUID;
BEGIN
  IF NEW.kind = 'final' THEN
    FOREACH v_participant IN ARRAY NEW.participants LOOP
      INSERT INTO public.interview_decisions (interview_id, evaluator_id, decision)
      VALUES (NEW.id, v_participant, 'pendente')
      ON CONFLICT (interview_id, evaluator_id) DO NOTHING;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tg_seed_final_interview_decisions
  AFTER INSERT ON public.interviews
  FOR EACH ROW EXECUTE FUNCTION public.tg_seed_final_interview_decisions();
