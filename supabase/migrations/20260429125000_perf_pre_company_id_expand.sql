-- =========================================================================
-- Migration PRE.1: Add company_id NULLABLE FK to evaluations, one_on_ones, climate_surveys
--
-- Pattern: expand step of expand→backfill→contract (Pitfall §1 from RESEARCH).
-- Why this matters: hooks legacy NÃO conhecem company_id; ADD NOT NULL diretamente
--                   quebraria todos os INSERT em produção. NULLABLE primeiro = safe.
--
-- Threats: T-3-06 (cross-tenant leak via missing company_id) — fronteira virá em RLS rewrite (Plan 03-04 perf1/clim1/one1)
-- REQs: PERF-01 (ciclos por empresa), PERF-04 (visibilidade scoped), ONE-01/02 (1:1 scoped)
-- Reversibility: ALTER TABLE ... DROP COLUMN company_id; (não destrutiva — coluna é NULLABLE)
-- DEPENDENCIES: Phase 1 Migrations A+B+C (companies + org_units + org_unit_members existem)
--               Phase 3 Migrations E1+E2+E3 (Backfill E completo — companies + teams convertidos)
-- =========================================================================

-- Step 1 — evaluations
ALTER TABLE public.evaluations
  ADD COLUMN IF NOT EXISTS company_id UUID NULL REFERENCES public.companies(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_evaluations_company_id ON public.evaluations(company_id);

-- Step 2 — one_on_ones
ALTER TABLE public.one_on_ones
  ADD COLUMN IF NOT EXISTS company_id UUID NULL REFERENCES public.companies(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_one_on_ones_company_id ON public.one_on_ones(company_id);

-- Step 3 — climate_surveys
ALTER TABLE public.climate_surveys
  ADD COLUMN IF NOT EXISTS company_id UUID NULL REFERENCES public.companies(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_climate_surveys_company_id ON public.climate_surveys(company_id);

COMMENT ON COLUMN public.evaluations.company_id      IS 'Phase 3 PRE.1 expand; backfilled via PRE.2; SET NOT NULL via PRE.3';
COMMENT ON COLUMN public.one_on_ones.company_id      IS 'Phase 3 PRE.1 expand; backfilled via PRE.2; SET NOT NULL via PRE.3';
COMMENT ON COLUMN public.climate_surveys.company_id  IS 'Phase 3 PRE.1 expand; backfilled via PRE.2; SET NOT NULL via PRE.3';
