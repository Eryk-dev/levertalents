-- T13: popular pending_tasks a partir de eventos reais.
--
-- Antes: tabela existia mas ninguém inseria; o bloco "Ações Pendentes"
-- no dashboard do colaborador ficava sempre vazio. Agora triggers
-- cobrem os dois fluxos principais da cadeia 1:1 → PDI (Princípio V):
--
-- 1. Agendar 1:1 cria pending_task 'one_on_one' para líder + colaborador;
--    concluir/cancelar o 1:1 marca a task como completed/cancelled.
-- 2. Criar PDI com status 'pending_approval' cria pending_task
--    'pdi_approval' para o líder; sair de 'pending_approval' (aprovado,
--    cancelado, etc.) fecha a task.

-- --- 1:1 tasks ---------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_pending_tasks_for_one_on_one()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'scheduled' THEN
    INSERT INTO public.pending_tasks (user_id, title, description, task_type, related_id, priority, due_date)
    VALUES (
      NEW.leader_id,
      '1:1 agendado com colaborador',
      'Preparar roteiro e conduzir a reunião 1:1.',
      'one_on_one',
      NEW.id,
      'medium',
      NEW.scheduled_date::date
    );

    INSERT INTO public.pending_tasks (user_id, title, description, task_type, related_id, priority, due_date)
    VALUES (
      NEW.collaborator_id,
      '1:1 agendado com líder',
      'Participar da reunião 1:1 com seu líder.',
      'one_on_one',
      NEW.id,
      'medium',
      NEW.scheduled_date::date
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.close_pending_tasks_for_one_on_one()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status
     AND NEW.status IN ('completed', 'cancelled') THEN
    UPDATE public.pending_tasks
    SET status = CASE WHEN NEW.status = 'completed' THEN 'completed' ELSE 'cancelled' END,
        completed_at = CASE WHEN NEW.status = 'completed' THEN NOW() ELSE completed_at END
    WHERE related_id = NEW.id
      AND task_type = 'one_on_one'
      AND status IN ('pending', 'in_progress');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_pending_tasks_one_on_one ON public.one_on_ones;
CREATE TRIGGER trg_create_pending_tasks_one_on_one
AFTER INSERT ON public.one_on_ones
FOR EACH ROW EXECUTE FUNCTION public.create_pending_tasks_for_one_on_one();

DROP TRIGGER IF EXISTS trg_close_pending_tasks_one_on_one ON public.one_on_ones;
CREATE TRIGGER trg_close_pending_tasks_one_on_one
AFTER UPDATE OF status ON public.one_on_ones
FOR EACH ROW EXECUTE FUNCTION public.close_pending_tasks_for_one_on_one();

-- --- PDI approval tasks ------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_pending_task_for_pdi_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_leader UUID;
BEGIN
  IF NEW.status = 'pending_approval' THEN
    IF NEW.one_on_one_id IS NOT NULL THEN
      SELECT leader_id INTO target_leader
      FROM public.one_on_ones
      WHERE id = NEW.one_on_one_id;
    END IF;

    IF target_leader IS NULL THEN
      SELECT leader_id INTO target_leader
      FROM public.team_members
      WHERE user_id = NEW.user_id
        AND leader_id IS NOT NULL
      LIMIT 1;
    END IF;

    IF target_leader IS NOT NULL THEN
      INSERT INTO public.pending_tasks (user_id, title, description, task_type, related_id, priority)
      VALUES (
        target_leader,
        'PDI aguardando aprovação',
        'Revisar e aprovar o PDI submetido pelo colaborador.',
        'pdi_approval',
        NEW.id,
        'high'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.close_pending_task_for_pdi_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'pending_approval'
     AND NEW.status IS DISTINCT FROM 'pending_approval' THEN
    UPDATE public.pending_tasks
    SET status = CASE WHEN NEW.status = 'approved' THEN 'completed' ELSE 'cancelled' END,
        completed_at = CASE WHEN NEW.status = 'approved' THEN NOW() ELSE completed_at END
    WHERE related_id = NEW.id
      AND task_type = 'pdi_approval'
      AND status IN ('pending', 'in_progress');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_pending_task_pdi_approval ON public.development_plans;
CREATE TRIGGER trg_create_pending_task_pdi_approval
AFTER INSERT ON public.development_plans
FOR EACH ROW EXECUTE FUNCTION public.create_pending_task_for_pdi_approval();

DROP TRIGGER IF EXISTS trg_close_pending_task_pdi_approval ON public.development_plans;
CREATE TRIGGER trg_close_pending_task_pdi_approval
AFTER UPDATE OF status ON public.development_plans
FOR EACH ROW EXECUTE FUNCTION public.close_pending_task_for_pdi_approval();
