-- =========================================================================
-- Migration PRE.3: SET NOT NULL company_id em 3 tabelas (contract step)
--
-- Threats: Migration FAILS by design if PRE.2 backfill deixou orphans (NULL rows).
--          Owner deve resolver manualmente ou PITR antes de re-tentar.
-- REQs: PERF-01, PERF-04, ONE-01/02
-- Reversibility: ALTER COLUMN ... DROP NOT NULL é trivial (não destrói dados)
-- DEPENDENCIES: PRE.1 + PRE.2 + (PRE.2 sanity NOTICE clean OR owner resolved orphans manually)
-- ORDER NOTE: evaluations.company_id SET NOT NULL pode ESPERAR para Plan 03-04 perf2
--             (perf2 TRUNCATE evaluations primeiro, então NOT NULL é trivial).
--             one_on_ones e climate_surveys NÃO são truncate'd — NOT NULL em pre3 é o gate.
-- =========================================================================

-- Step 1 — one_on_ones: SET NOT NULL (rows preserved through phase)
ALTER TABLE public.one_on_ones
  ALTER COLUMN company_id SET NOT NULL;

-- Step 2 — climate_surveys: SET NOT NULL (rows preserved through phase)
ALTER TABLE public.climate_surveys
  ALTER COLUMN company_id SET NOT NULL;

-- Step 3 — evaluations: deferred to perf2 (TRUNCATE happens there, then SET NOT NULL is safe)
-- Comment-only here; perf2 owns this:
--   ALTER TABLE public.evaluations ALTER COLUMN company_id SET NOT NULL; -- deferred (perf2)

-- Sanity post-constrain
DO $$
DECLARE
  v_oo_nulls    int;
  v_clima_nulls int;
BEGIN
  SELECT COUNT(*) INTO v_oo_nulls    FROM public.one_on_ones     WHERE company_id IS NULL;
  SELECT COUNT(*) INTO v_clima_nulls FROM public.climate_surveys WHERE company_id IS NULL;
  IF v_oo_nulls > 0 OR v_clima_nulls > 0 THEN
    RAISE EXCEPTION 'PRE.3 contract failed: still % one_on_ones + % climate_surveys with NULL company_id', v_oo_nulls, v_clima_nulls;
  END IF;
END $$;
