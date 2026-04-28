-- =========================================================================
-- Migration CLIM.2: RPC get_climate_aggregate (k-anon ≥3) + RPC submit_climate_response (anonymous)
--
-- Threats: T-3-02 (HIGH) k-anon bypass count=2 leaks — mitigated: RPC returns ONLY
--          {insufficient_data: true} (Pitfall §3 — sem count exato quando <3).
-- REQs: PERF-05, PERF-06, D-10/D-11
-- Reversibility: DROP FUNCTION
-- DEPENDENCIES: clim1 (org_unit_id present, user_id dropped)
-- =========================================================================

CREATE OR REPLACE FUNCTION public.get_climate_aggregate(
  p_survey_id   uuid,
  p_org_unit_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor           uuid := (SELECT auth.uid());
  v_count           int;
  v_avg             numeric(4,2);
  v_distribution    jsonb;
  v_visible_companies uuid[];
  v_survey_company  uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;

  -- Re-apply RLS: actor must see this survey's company
  v_visible_companies := public.visible_companies(v_actor);
  SELECT company_id INTO v_survey_company
    FROM public.climate_surveys
   WHERE id = p_survey_id;
  IF NOT (v_survey_company = ANY(v_visible_companies)) THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE = '42501';
  END IF;

  -- Count first; then decide whether to compute aggregate
  SELECT COUNT(*) INTO v_count
    FROM public.climate_responses cr
   WHERE cr.survey_id = p_survey_id
     AND (
       p_org_unit_id IS NULL
       OR cr.org_unit_id = ANY(public.org_unit_descendants(p_org_unit_id))
     );

  IF v_count < 3 THEN
    -- Pitfall §3: NÃO retorna count exato (avoid combination attack via knowing count=1 or 2)
    RETURN jsonb_build_object('insufficient_data', true);
  END IF;

  SELECT
    AVG(cr.score)::numeric(4,2),
    jsonb_object_agg(score::text, cnt)
  INTO v_avg, v_distribution
  FROM (
    SELECT score, COUNT(*) AS cnt
      FROM public.climate_responses cr
     WHERE cr.survey_id = p_survey_id
       AND (
         p_org_unit_id IS NULL
         OR cr.org_unit_id = ANY(public.org_unit_descendants(p_org_unit_id))
       )
     GROUP BY score
  ) cr;

  RETURN jsonb_build_object(
    'count', v_count,
    'avg', v_avg,
    'distribution', v_distribution
  );
END $$;

REVOKE ALL ON FUNCTION public.get_climate_aggregate(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_climate_aggregate(uuid, uuid) TO authenticated;

-- ----------------------------------------------------------------------------
-- RPC submit_climate_response (D-11: receives ONLY survey_id, question_id, score, comment)
-- Actor's org_unit derived server-side; user_id NEVER persisted.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_climate_response(
  p_survey_id   uuid,
  p_question_id uuid,
  p_score       int,
  p_comment     text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor          uuid := (SELECT auth.uid());
  v_survey_company uuid;
  v_actor_org_unit uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;

  IF p_score IS NULL OR p_score < 1 OR p_score > 5 THEN
    RAISE EXCEPTION 'Score inválido (esperado 1..5)' USING ERRCODE = '22023';
  END IF;

  -- Verify caller is in an active survey's company (RLS-equivalent check)
  SELECT company_id INTO v_survey_company
    FROM public.climate_surveys
   WHERE id = p_survey_id AND status = 'active';
  IF v_survey_company IS NULL THEN
    RAISE EXCEPTION 'Pesquisa não encontrada ou encerrada' USING ERRCODE = '42704';
  END IF;
  IF NOT (v_survey_company = ANY(public.visible_companies(v_actor))) THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE = '42501';
  END IF;

  -- Resolve actor's primary org_unit (LIMIT 1) — used for aggregation only, NOT stored as identity
  SELECT org_unit_id INTO v_actor_org_unit
    FROM public.org_unit_members
   WHERE user_id = v_actor
   LIMIT 1;

  -- Insert WITHOUT user_id (D-11 — payload is survey + question + score + comment + org_unit derived only)
  -- NOTE: column is 'created_at' (legacy name preserved; clim1 did not rename it)
  INSERT INTO public.climate_responses (id, survey_id, question_id, score, comment, org_unit_id, created_at)
  VALUES (gen_random_uuid(), p_survey_id, p_question_id, p_score, p_comment, v_actor_org_unit, NOW());
END $$;

REVOKE ALL ON FUNCTION public.submit_climate_response(uuid, uuid, int, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_climate_response(uuid, uuid, int, text) TO authenticated;

COMMENT ON FUNCTION public.get_climate_aggregate(uuid, uuid)
  IS 'D-10: k-anonymity ≥3; returns {insufficient_data:true} WITHOUT count when <3 (Pitfall §3 — no combination attack)';
COMMENT ON FUNCTION public.submit_climate_response(uuid, uuid, int, text)
  IS 'D-11: anonymous submit; never persists actor user_id; uses caller''s primary org_unit for aggregation only';
