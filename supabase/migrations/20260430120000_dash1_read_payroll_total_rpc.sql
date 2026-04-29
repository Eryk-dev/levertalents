-- =========================================================================
-- Migration DASH.1: RPC read_payroll_total — server-side payroll aggregate
--
-- Threats: T-04-02-01 (sócio sem membership lê folha de empresa não-vinculada)
--          mitigado pela checagem de subconjunto contra visible_companies (re-aplica RLS)
-- REQs: DASH-01, DASH-02, DASH-03
-- Reversibility: DROP FUNCTION (trivial — additive only)
-- DEPENDENCIES: visible_companies() helper (Phase 1, Migration C)
-- =========================================================================

CREATE OR REPLACE FUNCTION public.read_payroll_total(
  p_company_ids uuid[] DEFAULT NULL  -- NULL = derive from visible_companies; array = scope.companyIds passthrough
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor             uuid := (SELECT auth.uid());
  v_visible_companies uuid[];
  v_target_companies  uuid[];
  v_total             numeric;
  v_headcount         int;
  v_avg               numeric(12,2);
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;

  v_visible_companies := public.visible_companies(v_actor);

  -- Re-apply RLS: every requested company MUST be in visible_companies.
  -- DASH-01 success criterion: sócio sem membership na empresa: RLS bloqueia o call.
  v_target_companies := COALESCE(p_company_ids, v_visible_companies);
  IF NOT (v_target_companies <@ v_visible_companies) THEN
    RAISE EXCEPTION 'Sem permissão para uma ou mais empresas' USING ERRCODE = '42501';
  END IF;

  -- Aggregate-only payload — NEVER expose individual salaries (D-02 LOCK).
  SELECT
    COALESCE(SUM(tm.cost), 0)::numeric,
    COUNT(DISTINCT tm.user_id)::int
  INTO v_total, v_headcount
  FROM public.team_members tm
  JOIN public.teams t ON t.id = tm.team_id
  WHERE t.company_id = ANY(v_target_companies);

  v_avg := CASE WHEN v_headcount > 0 THEN (v_total / v_headcount)::numeric(12,2) ELSE NULL END;

  RETURN jsonb_build_object(
    'total_cost', v_total,
    'headcount', v_headcount,
    'avg_cost', v_avg
  );
END $$;

REVOKE ALL ON FUNCTION public.read_payroll_total(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.read_payroll_total(uuid[]) TO authenticated;

COMMENT ON FUNCTION public.read_payroll_total(uuid[]) IS
  'DASH-01/02/03: aggregate-only payroll readout. Definer + visible_companies(actor) re-check; payload contains ONLY {total_cost, headcount, avg_cost} — never row-level salary data.';
