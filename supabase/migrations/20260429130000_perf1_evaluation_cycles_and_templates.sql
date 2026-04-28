-- =========================================================================
-- Migration PERF.1: evaluation_cycles + evaluation_templates + trigger snapshot freeze
--                   + add cycle_id/direction/responses to evaluations
--
-- Threats: T-3-TAMP-01 (template drift mid-cycle) — mitigated by BEFORE INSERT/UPDATE trigger
--          T-3-RLS-01 (cross-tenant cycles leak) — mitigated by visible_companies(uid) in RLS
-- REQs: PERF-01, PERF-02 (templates per company), PERF-03 (direction)
-- Reversibility: DROP TABLE cycles + templates; DROP TRIGGER; ALTER evaluations DROP cycle_id (data loss for new evaluations)
-- DEPENDENCIES: e1 (companies populated), pre1+pre2 (evaluations.company_id exists, NULL allowed)
-- =========================================================================

-- Step 1 — evaluation_templates (per company)
CREATE TABLE IF NOT EXISTS public.evaluation_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  schema_json JSONB NOT NULL,
  is_default  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_evaluation_templates_company ON public.evaluation_templates(company_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_evaluation_templates_default_per_company
  ON public.evaluation_templates(company_id) WHERE is_default = true;

-- Step 2 — evaluation_cycles (per company, with frozen snapshot)
CREATE TABLE IF NOT EXISTS public.evaluation_cycles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  template_id       UUID NOT NULL REFERENCES public.evaluation_templates(id) ON DELETE RESTRICT,
  name              TEXT NOT NULL,
  template_snapshot JSONB NOT NULL,  -- frozen copy of template.schema_json (D-06)
  starts_at         TIMESTAMPTZ NOT NULL,
  ends_at           TIMESTAMPTZ NOT NULL CHECK (ends_at > starts_at),
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','closed')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_evaluation_cycles_company ON public.evaluation_cycles(company_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_cycles_status_ends ON public.evaluation_cycles(status, ends_at);

-- Step 3 — Trigger: freeze snapshot on INSERT, prevent UPDATE of snapshot (D-06)
CREATE OR REPLACE FUNCTION public.tg_freeze_template_snapshot()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_schema jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.template_id IS NULL THEN
      RAISE EXCEPTION 'evaluation_cycles.template_id is required';
    END IF;
    SELECT schema_json INTO v_schema
      FROM public.evaluation_templates
     WHERE id = NEW.template_id;
    IF v_schema IS NULL THEN
      RAISE EXCEPTION 'template % not found', NEW.template_id;
    END IF;
    NEW.template_snapshot := v_schema;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.template_snapshot IS DISTINCT FROM OLD.template_snapshot THEN
    RAISE EXCEPTION 'template_snapshot is immutable after cycle creation';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tg_evaluation_cycles_freeze ON public.evaluation_cycles;
CREATE TRIGGER tg_evaluation_cycles_freeze
  BEFORE INSERT OR UPDATE OF template_snapshot ON public.evaluation_cycles
  FOR EACH ROW EXECUTE FUNCTION public.tg_freeze_template_snapshot();

-- Step 4 — Add new columns to evaluations (NULL initially; perf2 will SET NOT NULL after TRUNCATE)
ALTER TABLE public.evaluations
  ADD COLUMN IF NOT EXISTS cycle_id  UUID NULL REFERENCES public.evaluation_cycles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS direction TEXT NULL CHECK (direction IS NULL OR direction IN ('leader_to_member','member_to_leader')),
  ADD COLUMN IF NOT EXISTS responses JSONB NULL;
CREATE INDEX IF NOT EXISTS idx_evaluations_cycle_id ON public.evaluations(cycle_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_direction ON public.evaluations(direction);

-- Step 5 — RLS on new tables
ALTER TABLE public.evaluation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_cycles    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS evaluation_templates_select_visible ON public.evaluation_templates;
CREATE POLICY evaluation_templates_select_visible
  ON public.evaluation_templates FOR SELECT
  USING (company_id = ANY(public.visible_companies((SELECT auth.uid()))));

DROP POLICY IF EXISTS evaluation_templates_write_admin_rh ON public.evaluation_templates;
CREATE POLICY evaluation_templates_write_admin_rh
  ON public.evaluation_templates FOR ALL
  USING (company_id = ANY(public.visible_companies((SELECT auth.uid()))) AND public.is_people_manager((SELECT auth.uid())))
  WITH CHECK (company_id = ANY(public.visible_companies((SELECT auth.uid()))) AND public.is_people_manager((SELECT auth.uid())));

DROP POLICY IF EXISTS evaluation_cycles_select_visible ON public.evaluation_cycles;
CREATE POLICY evaluation_cycles_select_visible
  ON public.evaluation_cycles FOR SELECT
  USING (company_id = ANY(public.visible_companies((SELECT auth.uid()))));

DROP POLICY IF EXISTS evaluation_cycles_write_admin_rh ON public.evaluation_cycles;
CREATE POLICY evaluation_cycles_write_admin_rh
  ON public.evaluation_cycles FOR ALL
  USING (company_id = ANY(public.visible_companies((SELECT auth.uid()))) AND public.is_people_manager((SELECT auth.uid())))
  WITH CHECK (company_id = ANY(public.visible_companies((SELECT auth.uid()))) AND public.is_people_manager((SELECT auth.uid())));

COMMENT ON TRIGGER tg_evaluation_cycles_freeze ON public.evaluation_cycles
  IS 'D-06: template_snapshot is frozen on cycle creation; updates of snapshot raise exception';
