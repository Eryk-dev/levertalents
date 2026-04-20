-- T012 — Triggers that populate/close pending_tasks for the hiring flows,
-- mirroring the existing create_pending_tasks_for_one_on_one / close_…
-- pattern (research R7).

-- --- Job approval: RH enviou descritivo → gestor solicitante recebe task ---

CREATE OR REPLACE FUNCTION public.tg_hiring_job_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'aguardando_aprovacao_do_gestor' THEN
      INSERT INTO public.pending_tasks (
        user_id, title, description, task_type, related_id, priority
      )
      VALUES (
        NEW.requested_by,
        'Descritivo aguardando sua aprovação',
        NEW.title,
        'hiring_job_approval',
        NEW.id,
        'high'
      )
      ON CONFLICT DO NOTHING;

    ELSIF TG_OP = 'UPDATE' AND OLD.status = 'aguardando_aprovacao_do_gestor' THEN
      UPDATE public.pending_tasks
        SET status = CASE WHEN NEW.status = 'pronta_para_publicar' THEN 'completed' ELSE 'cancelled' END,
            completed_at = NOW()
        WHERE task_type = 'hiring_job_approval'
          AND related_id = NEW.id
          AND status IN ('pending', 'in_progress');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tg_hiring_job_approval_ins
  AFTER INSERT ON public.job_openings
  FOR EACH ROW EXECUTE FUNCTION public.tg_hiring_job_approval();

CREATE TRIGGER tg_hiring_job_approval_upd
  AFTER UPDATE OF status ON public.job_openings
  FOR EACH ROW EXECUTE FUNCTION public.tg_hiring_job_approval();

-- --- Job review: gestor rejeitou → RH recebe task "precisa revisar" -------

CREATE OR REPLACE FUNCTION public.tg_hiring_job_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rh UUID;
BEGIN
  IF NEW.approval_state = 'rejeitado'
     AND (OLD.approval_state IS DISTINCT FROM NEW.approval_state) THEN
    -- Pick any RH as owner; fallback to author_id if none exist.
    SELECT ur.user_id INTO v_rh
    FROM public.user_roles ur
    WHERE ur.role = 'rh'
    LIMIT 1;

    IF v_rh IS NULL THEN v_rh := NEW.author_id; END IF;

    INSERT INTO public.pending_tasks (
      user_id, title, description, task_type, related_id, priority
    )
    VALUES (
      v_rh,
      'Descritivo rejeitado pelo gestor',
      COALESCE(NEW.rejection_reason, 'Revisar descritivo.'),
      'hiring_job_review',
      NEW.job_opening_id,
      'high'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  IF NEW.approval_state = 'aprovado'
     AND (OLD.approval_state IS DISTINCT FROM NEW.approval_state) THEN
    UPDATE public.pending_tasks
      SET status = 'completed', completed_at = NOW()
      WHERE task_type = 'hiring_job_review'
        AND related_id = NEW.job_opening_id
        AND status IN ('pending', 'in_progress');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER tg_hiring_job_review
  AFTER UPDATE OF approval_state ON public.job_descriptions
  FOR EACH ROW EXECUTE FUNCTION public.tg_hiring_job_review();

-- --- Fit cultural received / expired --------------------------------------

CREATE OR REPLACE FUNCTION public.tg_hiring_fit_received()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rh UUID;
BEGIN
  SELECT ur.user_id INTO v_rh FROM public.user_roles ur WHERE ur.role = 'rh' LIMIT 1;
  IF v_rh IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.pending_tasks (
    user_id, title, description, task_type, related_id, priority
  )
  VALUES (
    v_rh,
    'Fit cultural recebido',
    'Revisar respostas do Fit Cultural.',
    'hiring_fit_cultural_received',
    NEW.application_id,
    'medium'
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tg_hiring_fit_received
  AFTER INSERT ON public.cultural_fit_responses
  FOR EACH ROW EXECUTE FUNCTION public.tg_hiring_fit_received();

-- --- Final decision: RH recebe task quando interview realizada → gestores decidem ---

CREATE OR REPLACE FUNCTION public.tg_hiring_final_decision()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_participant UUID;
BEGIN
  IF NEW.kind = 'final'
     AND NEW.status = 'realizada'
     AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    FOREACH v_participant IN ARRAY NEW.participants LOOP
      INSERT INTO public.pending_tasks (
        user_id, title, description, task_type, related_id, priority
      )
      VALUES (
        v_participant,
        'Decisão final pendente',
        'Registre sua decisão sobre o candidato após a entrevista final.',
        'hiring_final_decision',
        NEW.application_id,
        'high'
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tg_hiring_final_decision
  AFTER UPDATE OF status ON public.interviews
  FOR EACH ROW EXECUTE FUNCTION public.tg_hiring_final_decision();

-- Close final_decision tasks once the decision is in.
CREATE OR REPLACE FUNCTION public.tg_hiring_close_final_decision()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_application_id UUID;
BEGIN
  IF NEW.decision = 'pendente' THEN
    RETURN NEW;
  END IF;

  SELECT i.application_id INTO v_application_id
  FROM public.interviews i WHERE i.id = NEW.interview_id;

  UPDATE public.pending_tasks
    SET status = 'completed', completed_at = NOW()
    WHERE task_type = 'hiring_final_decision'
      AND related_id = v_application_id
      AND user_id = NEW.evaluator_id
      AND status IN ('pending', 'in_progress');
  RETURN NEW;
END;
$$;

CREATE TRIGGER tg_hiring_close_final_decision
  AFTER UPDATE OF decision ON public.interview_decisions
  FOR EACH ROW EXECUTE FUNCTION public.tg_hiring_close_final_decision();

-- --- Admission follow-up: applications → aprovado ------------------------

CREATE OR REPLACE FUNCTION public.tg_hiring_admission_followup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rh UUID;
BEGIN
  IF NEW.stage = 'aprovado' AND (OLD.stage IS DISTINCT FROM NEW.stage) THEN
    SELECT ur.user_id INTO v_rh FROM public.user_roles ur WHERE ur.role = 'rh' LIMIT 1;
    IF v_rh IS NULL THEN RETURN NEW; END IF;

    INSERT INTO public.pending_tasks (
      user_id, title, description, task_type, related_id, priority
    )
    VALUES (
      v_rh,
      'Iniciar admissão',
      'Candidato aprovado, pronto para pré-cadastro.',
      'hiring_admission_followup',
      NEW.id,
      'high'
    )
    ON CONFLICT DO NOTHING;

  ELSIF NEW.stage = 'em_admissao' AND (OLD.stage IS DISTINCT FROM NEW.stage) THEN
    UPDATE public.pending_tasks
      SET status = 'completed', completed_at = NOW()
      WHERE task_type = 'hiring_admission_followup'
        AND related_id = NEW.id
        AND status IN ('pending', 'in_progress');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tg_hiring_admission_followup
  AFTER UPDATE OF stage ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.tg_hiring_admission_followup();
