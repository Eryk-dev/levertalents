-- =========================================================================
-- Migration NINE.1: 9box cycle/template kind + scale_1_3 + seed default template
--
-- Purpose: introduce a fixed 9box template (2 questions: desempenho + potencial)
--          that lives alongside the per-company custom templates. Cycles can be
--          opened in two flavors: 'custom' (existing) or 'nine_box' (new).
--
-- Threats:
--   T-NINE-01 (multiple 9box templates per company) — mitigated by partial unique index
--   T-NINE-02 (custom cycle pollutes 9box matrix) — kind column lets the matrix
--             query filter strictly to nine_box cycles
--
-- REQs: PERF-01 (template per company), PERF-04 (9box matrix accuracy)
-- Reversibility: DROP COLUMN kind from both tables; DROP partial index
-- Dependencies: perf1 (evaluation_templates + evaluation_cycles exist)
-- =========================================================================

-- Step 1 — kind column on evaluation_templates
ALTER TABLE public.evaluation_templates
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'custom'
    CHECK (kind IN ('custom', 'nine_box'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_evaluation_templates_one_nine_box_per_company
  ON public.evaluation_templates(company_id) WHERE kind = 'nine_box';

COMMENT ON COLUMN public.evaluation_templates.kind IS
  'Template flavor: custom = RH builds questions; nine_box = fixed 2-question template (desempenho+potencial scale 1-3) used by the 9box matrix.';

-- Step 2 — kind column on evaluation_cycles
ALTER TABLE public.evaluation_cycles
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'custom'
    CHECK (kind IN ('custom', 'nine_box'));

CREATE INDEX IF NOT EXISTS idx_evaluation_cycles_kind
  ON public.evaluation_cycles(kind, company_id);

COMMENT ON COLUMN public.evaluation_cycles.kind IS
  'Cycle flavor mirrors template.kind. NineBoxPage filters strictly on kind=nine_box to avoid mixing custom evaluations into the matrix.';

-- Step 3 — Seed: ensure every existing company has a default 9box template.
-- Schema: 3 sections (performance, potential, comments). Section ids are stable
-- contracts that the matrix hook (useNineBoxDistribution) reads to extract scores.
-- Using ON CONFLICT-style insert via NOT EXISTS (no unique constraint on (company_id, name)).
INSERT INTO public.evaluation_templates (company_id, name, kind, is_default, schema_json)
SELECT
  c.id,
  '9box · Desempenho × Potencial',
  'nine_box',
  false,
  jsonb_build_object(
    'version', 1,
    'sections', jsonb_build_array(
      jsonb_build_object(
        'id', 'performance',
        'title', 'Desempenho',
        'weight', 0.5,
        'questions', jsonb_build_array(
          jsonb_build_object(
            'id', 'performance',
            'label', 'Como foram as entregas e resultados nesse ciclo?',
            'type', 'scale_1_3',
            'required', true
          )
        )
      ),
      jsonb_build_object(
        'id', 'potential',
        'title', 'Potencial',
        'weight', 0.5,
        'questions', jsonb_build_array(
          jsonb_build_object(
            'id', 'potential',
            'label', 'Qual o potencial de crescimento para os próximos ciclos?',
            'type', 'scale_1_3',
            'required', true
          )
        )
      ),
      jsonb_build_object(
        'id', 'comments',
        'title', 'Comentário',
        'weight', 0,
        'questions', jsonb_build_array(
          jsonb_build_object(
            'id', 'comments',
            'label', 'Conte um pouco sobre as notas que você deu (opcional).',
            'type', 'text',
            'required', false
          )
        )
      )
    )
  )
FROM public.companies c
WHERE NOT EXISTS (
  SELECT 1 FROM public.evaluation_templates t
   WHERE t.company_id = c.id AND t.kind = 'nine_box'
);

-- Step 4 — Trigger: when a NEW company is created, auto-seed its 9box template
-- (so RH/Admin doesn't have to manually create one). Idempotent via ON CONFLICT.
CREATE OR REPLACE FUNCTION public.tg_seed_nine_box_template_for_company()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  INSERT INTO public.evaluation_templates (company_id, name, kind, is_default, schema_json)
  VALUES (
    NEW.id,
    '9box · Desempenho × Potencial',
    'nine_box',
    false,
    jsonb_build_object(
      'version', 1,
      'sections', jsonb_build_array(
        jsonb_build_object(
          'id', 'performance',
          'title', 'Desempenho',
          'weight', 0.5,
          'questions', jsonb_build_array(
            jsonb_build_object(
              'id', 'performance',
              'label', 'Como foram as entregas e resultados nesse ciclo?',
              'type', 'scale_1_3',
              'required', true
            )
          )
        ),
        jsonb_build_object(
          'id', 'potential',
          'title', 'Potencial',
          'weight', 0.5,
          'questions', jsonb_build_array(
            jsonb_build_object(
              'id', 'potential',
              'label', 'Qual o potencial de crescimento para os próximos ciclos?',
              'type', 'scale_1_3',
              'required', true
            )
          )
        ),
        jsonb_build_object(
          'id', 'comments',
          'title', 'Comentário',
          'weight', 0,
          'questions', jsonb_build_array(
            jsonb_build_object(
              'id', 'comments',
              'label', 'Conte um pouco sobre as notas que você deu (opcional).',
              'type', 'text',
              'required', false
            )
          )
        )
      )
    )
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tg_companies_seed_nine_box_template ON public.companies;
CREATE TRIGGER tg_companies_seed_nine_box_template
  AFTER INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.tg_seed_nine_box_template_for_company();

COMMENT ON TRIGGER tg_companies_seed_nine_box_template ON public.companies IS
  'NINE.1: every new company gets a default 9box template auto-seeded so RH can open a 9box cycle immediately without setup.';
