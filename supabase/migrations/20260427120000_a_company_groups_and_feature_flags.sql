-- =========================================================================
-- Migration A: company_groups + companies feature flags + nullable group_id
--
-- Adds the multi-tenant grouping primitive WITHOUT changing app behavior.
-- Existing app code does not read group_id or feature flags yet — Plan 05
-- (frontend chokepoint) will start consuming them.
--
-- Reversibility: DROP TABLE company_groups; ALTER TABLE companies DROP COLUMN
-- group_id, performance_enabled, rs_enabled. All backwards-safe.
--
-- Threats mitigated:
--   T-1-01 (cross-tenant leakage): RLS enabled on company_groups in same
--     migration that creates it. mutate restricted to is_people_manager.
--   T-1-02 (RLS recursion): policies use (SELECT auth.uid()) initPlan idiom
--     and call existing SECURITY DEFINER helper is_people_manager.
--
-- REQs: TEN-01 (contract), TEN-02 (flags), TEN-03 (table + group_id).
-- =========================================================================

-- 1) Feature flags on existing companies table
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS performance_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rs_enabled          boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.companies.performance_enabled IS
  'When true, this company has the Performance module (1:1, evaluations, climate) active. Default false; RH/Admin liga ao cadastrar uma empresa que vai usar Performance. TEN-02.';

COMMENT ON COLUMN public.companies.rs_enabled IS
  'When true, this company has Recrutamento & Seleção active. Default false; RH/Admin liga ao cadastrar. TEN-02.';

-- 2) company_groups table (TEN-03)
CREATE TABLE IF NOT EXISTS public.company_groups (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text NOT NULL UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT NOW(),
  updated_at  timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

COMMENT ON TABLE public.company_groups IS
  'Generic grouping of companies (e.g., "Grupo Lever" gathers the 7 internal Lever companies). External clients can have their own groups. TEN-03.';

CREATE TRIGGER tg_company_groups_updated_at
  BEFORE UPDATE ON public.company_groups
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.company_groups ENABLE ROW LEVEL SECURITY;

-- Group rows are visible to any authenticated user (the user's effective access
-- to a group is determined at scope-resolution time via visible_companies(), not
-- via row-level filtering on this table). Mutations restricted to people managers.
CREATE POLICY "company_groups:select_authenticated"
  ON public.company_groups FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "company_groups:mutate_managers"
  ON public.company_groups FOR ALL TO authenticated
  USING (public.is_people_manager((SELECT auth.uid())))
  WITH CHECK (public.is_people_manager((SELECT auth.uid())));

-- 3) Optional group_id on companies (TEN-03)
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.company_groups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_companies_group_id
  ON public.companies(group_id)
  WHERE group_id IS NOT NULL;

COMMENT ON COLUMN public.companies.group_id IS
  'Optional grouping (e.g., Grupo Lever for the 7 internal companies). NULL = standalone external client. TEN-03.';
