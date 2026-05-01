-- The integrated PDI flow stores canonical content in main_objective and
-- committed_actions. Keep legacy columns nullable so new PDIs do not depend on
-- duplicated fallback text.

ALTER TABLE public.development_plans
  ALTER COLUMN goals DROP NOT NULL,
  ALTER COLUMN action_items DROP NOT NULL;
