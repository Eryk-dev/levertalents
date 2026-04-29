-- =========================================================================
-- Migration PRE.2: Backfill company_id em 3 tabelas via lookup user→org_unit→company
--
-- Strategy: Para cada row sem company_id, buscar 1 org_unit_membership do user que CRIOU
--           a row (evaluator/leader/created_by) e copiar org_units.company_id.
--           Se user tem 0 memberships → row fica com NULL (escalation manual).
--           Se user tem N memberships em N companies → escolher LIMIT 1 (determinístico via ORDER BY).
--
-- Threats: T-3-06 (wrong company_id assigned) — accepted: PITR window cobre rollback se erro detectado pós-push.
-- REQs: PERF-01, PERF-04, ONE-01/02
-- Reversibility: UPDATE ... SET company_id = NULL para reverter; ou PITR.
-- DEPENDENCIES: Migration PRE.1 (column exists) + Migration E2 (org_unit_members populado).
-- =========================================================================

-- Step 1 — evaluations: backfill via evaluator_user_id
-- ROW_NUMBER deterministically picks primary membership (earliest created_at) for multi-company users.
UPDATE public.evaluations e
   SET company_id = sub.company_id
  FROM (
    SELECT oum.user_id,
           ou.company_id,
           ROW_NUMBER() OVER (PARTITION BY oum.user_id ORDER BY oum.created_at) AS rn
      FROM public.org_unit_members oum
      JOIN public.org_units ou ON ou.id = oum.org_unit_id
  ) sub
 WHERE e.company_id IS NULL
   AND e.evaluator_user_id = sub.user_id
   AND sub.rn = 1;

-- Step 2 — one_on_ones: backfill via leader_id (D-26 mantém current schema; leader é canonical)
UPDATE public.one_on_ones o
   SET company_id = sub.company_id
  FROM (
    SELECT oum.user_id,
           ou.company_id,
           ROW_NUMBER() OVER (PARTITION BY oum.user_id ORDER BY oum.created_at) AS rn
      FROM public.org_unit_members oum
      JOIN public.org_units ou ON ou.id = oum.org_unit_id
  ) sub
 WHERE o.company_id IS NULL
   AND o.leader_id = sub.user_id
   AND sub.rn = 1;

-- Fallback step 2.b — se leader não tem org_unit_membership, tenta collaborator_id
UPDATE public.one_on_ones o
   SET company_id = sub.company_id
  FROM (
    SELECT oum.user_id,
           ou.company_id,
           ROW_NUMBER() OVER (PARTITION BY oum.user_id ORDER BY oum.created_at) AS rn
      FROM public.org_unit_members oum
      JOIN public.org_units ou ON ou.id = oum.org_unit_id
  ) sub
 WHERE o.company_id IS NULL
   AND o.collaborator_id = sub.user_id
   AND sub.rn = 1;

-- Step 3 — climate_surveys: backfill via created_by
UPDATE public.climate_surveys cs
   SET company_id = sub.company_id
  FROM (
    SELECT oum.user_id,
           ou.company_id,
           ROW_NUMBER() OVER (PARTITION BY oum.user_id ORDER BY oum.created_at) AS rn
      FROM public.org_unit_members oum
      JOIN public.org_units ou ON ou.id = oum.org_unit_id
  ) sub
 WHERE cs.company_id IS NULL
   AND cs.created_by = sub.user_id
   AND sub.rn = 1;

-- Step 4 — Sanity report (NOTICE only; doesn't fail)
DO $$
DECLARE
  v_eval_orphans   int;
  v_oo_orphans     int;
  v_clima_orphans  int;
BEGIN
  SELECT COUNT(*) INTO v_eval_orphans   FROM public.evaluations     WHERE company_id IS NULL;
  SELECT COUNT(*) INTO v_oo_orphans     FROM public.one_on_ones     WHERE company_id IS NULL;
  SELECT COUNT(*) INTO v_clima_orphans  FROM public.climate_surveys WHERE company_id IS NULL;

  IF v_eval_orphans > 0 THEN
    RAISE NOTICE 'PRE.2 WARNING: % evaluations sem company_id após backfill — verificar evaluator_user_id sem org_unit_membership', v_eval_orphans;
  END IF;
  IF v_oo_orphans > 0 THEN
    RAISE NOTICE 'PRE.2 WARNING: % one_on_ones sem company_id — verificar leader_id E collaborator_id sem memberships', v_oo_orphans;
  END IF;
  IF v_clima_orphans > 0 THEN
    RAISE NOTICE 'PRE.2 WARNING: % climate_surveys sem company_id — verificar created_by sem membership', v_clima_orphans;
  END IF;
END $$;

-- Step 5 — D-08 forecast: evaluations será TRUNCATE'd em Plan 03-04 perf2.
-- Backfill aqui ainda é importante para que pgTAP test 003/004 confirme schema funcional;
-- TRUNCATE em perf2 limpa as rows com company_id já populadas → não há retrabalho.
