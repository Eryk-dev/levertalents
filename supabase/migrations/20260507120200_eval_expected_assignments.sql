-- Evaluation assignment correctness for directional cycles.
--
-- Fixes 9box/manual audience cases where the evaluated person is in the
-- audience, but their direct leader is not. Pending tasks and RLS now use the
-- actual expected evaluator/evaluated pairs instead of "audience member owes
-- one task".

-- Local-replay compatibility: these RPCs exist in production but were missing
-- from the checked-in migrations.
CREATE OR REPLACE FUNCTION public.resolve_cycle_participants(
  p_company_id uuid,
  p_audience_kind text,
  p_audience_ids uuid[],
  p_include_descendants boolean
)
RETURNS uuid[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_units uuid[] := '{}'::uuid[];
  v_users uuid[] := '{}'::uuid[];
  v_id uuid;
BEGIN
  IF p_audience_kind = 'company' THEN
    SELECT array_agg(DISTINCT oum.user_id) INTO v_users
    FROM public.org_unit_members oum
    JOIN public.org_units ou ON ou.id = oum.org_unit_id
    WHERE ou.company_id = p_company_id;

  ELSIF p_audience_kind = 'org_unit' THEN
    IF p_include_descendants THEN
      FOREACH v_id IN ARRAY COALESCE(p_audience_ids, '{}'::uuid[]) LOOP
        v_units := v_units || public.org_unit_descendants(v_id);
      END LOOP;
    ELSE
      v_units := COALESCE(p_audience_ids, '{}'::uuid[]);
    END IF;

    SELECT array_agg(DISTINCT oum.user_id) INTO v_users
    FROM public.org_unit_members oum
    JOIN public.org_units ou ON ou.id = oum.org_unit_id
    WHERE oum.org_unit_id = ANY(v_units)
      AND ou.company_id = p_company_id;

  ELSIF p_audience_kind = 'manual' THEN
    v_users := COALESCE(p_audience_ids, '{}'::uuid[]);
  END IF;

  RETURN COALESCE(v_users, '{}'::uuid[]);
END;
$$;

CREATE OR REPLACE FUNCTION public.preview_cycle_audience(
  p_company_id uuid,
  p_audience_kind text,
  p_audience_ids uuid[],
  p_include_descendants boolean,
  p_directions text[]
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_participants uuid[];
  v_self_count int := 0;
  v_l2m_count int := 0;
  v_m2l_count int := 0;
  v_peer_count int := 0;
  v_missing_leader_count int := 0;
  v_missing_team_count int := 0;
BEGIN
  v_participants := public.resolve_cycle_participants(
    p_company_id, p_audience_kind, p_audience_ids, p_include_descendants
  );

  IF array_length(v_participants, 1) IS NULL THEN
    RETURN jsonb_build_object(
      'participants_count', 0,
      'by_direction', jsonb_build_object('self',0,'leader_to_member',0,'member_to_leader',0,'peer',0),
      'missing_leader', 0,
      'missing_team', 0
    );
  END IF;

  IF 'self' = ANY(p_directions) THEN
    v_self_count := array_length(v_participants, 1);
  END IF;

  IF 'leader_to_member' = ANY(p_directions) THEN
    SELECT COUNT(*) INTO v_l2m_count
    FROM unnest(v_participants) AS p(user_id)
    JOIN public.org_unit_members oum
      ON oum.user_id = p.user_id AND oum.is_primary = true
    JOIN public.unit_leaders ul
      ON ul.org_unit_id = oum.org_unit_id
     AND ul.user_id <> p.user_id;
  END IF;

  IF 'member_to_leader' = ANY(p_directions) THEN
    SELECT COUNT(*) INTO v_m2l_count
    FROM unnest(v_participants) AS p(user_id)
    JOIN public.org_unit_members oum
      ON oum.user_id = p.user_id AND oum.is_primary = true
    JOIN public.unit_leaders ul
      ON ul.org_unit_id = oum.org_unit_id
     AND ul.user_id <> p.user_id;
  END IF;

  IF 'peer' = ANY(p_directions) THEN
    SELECT COUNT(*) INTO v_peer_count
    FROM public.org_unit_members a
    JOIN public.org_unit_members b
      ON a.org_unit_id = b.org_unit_id
     AND a.is_primary = true
     AND b.is_primary = true
     AND a.user_id <> b.user_id
    WHERE a.user_id = ANY(v_participants)
      AND b.user_id = ANY(v_participants);
  END IF;

  SELECT COUNT(*) INTO v_missing_team_count
  FROM unnest(v_participants) AS p(user_id)
  LEFT JOIN public.org_unit_members oum
    ON oum.user_id = p.user_id AND oum.is_primary = true
  WHERE oum.user_id IS NULL;

  SELECT COUNT(*) INTO v_missing_leader_count
  FROM unnest(v_participants) AS p(user_id)
  JOIN public.org_unit_members oum
    ON oum.user_id = p.user_id AND oum.is_primary = true
  LEFT JOIN public.unit_leaders ul
    ON ul.org_unit_id = oum.org_unit_id
   AND ul.user_id <> p.user_id
  WHERE ul.user_id IS NULL;

  RETURN jsonb_build_object(
    'participants_count', array_length(v_participants, 1),
    'by_direction', jsonb_build_object(
      'self', v_self_count,
      'leader_to_member', v_l2m_count,
      'member_to_leader', v_m2l_count,
      'peer', v_peer_count
    ),
    'missing_leader', v_missing_leader_count,
    'missing_team', v_missing_team_count
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_cycle_evaluation_assignments(_cycle_id uuid)
RETURNS TABLE(evaluator_user_id uuid, evaluated_user_id uuid, direction text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.evaluation_cycles%ROWTYPE;
  participants uuid[];
BEGIN
  SELECT * INTO c FROM public.evaluation_cycles WHERE id = _cycle_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF (SELECT auth.uid()) IS NOT NULL
     AND NOT (c.company_id = ANY(public.visible_companies((SELECT auth.uid())))) THEN
    RETURN;
  END IF;

  participants := public.resolve_cycle_participants(
    c.company_id, c.audience_kind, c.audience_ids, c.include_descendants
  );

  IF array_length(participants, 1) IS NULL THEN
    RETURN;
  END IF;

  IF 'self' = ANY(c.directions) THEN
    RETURN QUERY
    SELECT DISTINCT p.user_id, p.user_id, 'self'::text
    FROM unnest(participants) AS p(user_id);
  END IF;

  IF 'leader_to_member' = ANY(c.directions) THEN
    RETURN QUERY
    SELECT DISTINCT ul.user_id, p.user_id, 'leader_to_member'::text
    FROM unnest(participants) AS p(user_id)
    JOIN public.org_unit_members oum
      ON oum.user_id = p.user_id AND oum.is_primary = true
    JOIN public.unit_leaders ul
      ON ul.org_unit_id = oum.org_unit_id
     AND ul.user_id <> p.user_id;
  END IF;

  IF 'member_to_leader' = ANY(c.directions) THEN
    RETURN QUERY
    SELECT DISTINCT p.user_id, ul.user_id, 'member_to_leader'::text
    FROM unnest(participants) AS p(user_id)
    JOIN public.org_unit_members oum
      ON oum.user_id = p.user_id AND oum.is_primary = true
    JOIN public.unit_leaders ul
      ON ul.org_unit_id = oum.org_unit_id
     AND ul.user_id <> p.user_id;
  END IF;

  IF 'peer' = ANY(c.directions) THEN
    RETURN QUERY
    SELECT DISTINCT a.user_id, b.user_id, 'peer'::text
    FROM public.org_unit_members a
    JOIN public.org_unit_members b
      ON a.org_unit_id = b.org_unit_id
     AND a.is_primary = true
     AND b.is_primary = true
     AND a.user_id <> b.user_id
    WHERE a.user_id = ANY(participants)
      AND b.user_id = ANY(participants);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.my_cycle_evaluation_assignments(_cycle_id uuid)
RETURNS TABLE(evaluator_user_id uuid, evaluated_user_id uuid, direction text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.evaluator_user_id, a.evaluated_user_id, a.direction
  FROM public.resolve_cycle_evaluation_assignments(_cycle_id) a
  JOIN public.evaluation_cycles c ON c.id = _cycle_id
  WHERE c.company_id = ANY(public.visible_companies((SELECT auth.uid())))
    AND a.evaluator_user_id = (SELECT auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.expected_evaluations_for_user(
  _cycle_id uuid,
  _user_id uuid
)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.resolve_cycle_evaluation_assignments(_cycle_id) a
  WHERE a.evaluator_user_id = _user_id;
$$;

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
  SELECT DISTINCT
    a.evaluator_user_id,
    'Avaliações: ' || NEW.name,
    'Você precisa enviar suas avaliações deste ciclo até ' ||
      to_char(NEW.ends_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY') || '.',
    'evaluation',
    NEW.id,
    'medium',
    NEW.ends_at::date
  FROM public.resolve_cycle_evaluation_assignments(NEW.id) a
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pending_tasks pt
    WHERE pt.related_id = NEW.id
      AND pt.task_type = 'evaluation'
      AND pt.user_id = a.evaluator_user_id
      AND pt.status IN ('pending', 'in_progress', 'completed')
  );

  RETURN NEW;
END;
$$;

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
      SELECT DISTINCT
        a.evaluator_user_id,
        'Avaliações: ' || NEW.name,
        'Você precisa enviar suas avaliações deste ciclo até ' ||
          to_char(NEW.ends_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY') || '.',
        'evaluation',
        NEW.id,
        'medium',
        NEW.ends_at::date
      FROM public.resolve_cycle_evaluation_assignments(NEW.id) a
      WHERE NOT EXISTS (
        SELECT 1 FROM public.pending_tasks pt
        WHERE pt.related_id = NEW.id
          AND pt.task_type = 'evaluation'
          AND pt.user_id = a.evaluator_user_id
          AND pt.status IN ('pending', 'in_progress', 'completed')
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS evaluations_insert_audience ON public.evaluations;
CREATE POLICY evaluations_insert_audience ON public.evaluations
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  (company_id = ANY(public.visible_companies((SELECT auth.uid()))))
  AND (evaluator_user_id = (SELECT auth.uid()))
  AND EXISTS (
    SELECT 1 FROM public.evaluation_cycles c
    WHERE c.id = evaluations.cycle_id AND c.status = 'active'
  )
  AND EXISTS (
    SELECT 1
    FROM public.resolve_cycle_evaluation_assignments(evaluations.cycle_id) a
    WHERE a.evaluator_user_id = evaluations.evaluator_user_id
      AND a.evaluated_user_id = evaluations.evaluated_user_id
      AND a.direction = evaluations.direction
  )
);

GRANT EXECUTE ON FUNCTION public.resolve_cycle_participants(uuid, text, uuid[], boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.preview_cycle_audience(uuid, text, uuid[], boolean, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_cycle_evaluation_assignments(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_cycle_evaluation_assignments(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.resolve_cycle_evaluation_assignments(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.expected_evaluations_for_user(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_pending_tasks_for_evaluation_cycle() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_pending_tasks_on_cycle_status() FROM PUBLIC, anon, authenticated;

-- Repair existing active/draft cycles, including the production case where
-- only the evaluated employee was selected manually.
INSERT INTO public.pending_tasks (
  user_id, title, description, task_type, related_id, priority, due_date
)
SELECT DISTINCT
  a.evaluator_user_id,
  'Avaliações: ' || c.name,
  'Você precisa enviar suas avaliações deste ciclo até ' ||
    to_char(c.ends_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY') || '.',
  'evaluation',
  c.id,
  'medium',
  c.ends_at::date
FROM public.evaluation_cycles c
CROSS JOIN LATERAL public.resolve_cycle_evaluation_assignments(c.id) a
WHERE c.status IN ('active', 'draft')
  AND NOT EXISTS (
    SELECT 1 FROM public.pending_tasks pt
    WHERE pt.related_id = c.id
      AND pt.task_type = 'evaluation'
      AND pt.user_id = a.evaluator_user_id
      AND pt.status IN ('pending', 'in_progress', 'completed')
  );
