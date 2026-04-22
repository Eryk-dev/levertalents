-- Fix P0 bug: `admin` role is in app_role enum (since 20251009205119) but
-- only policies for companies/teams/team_members/user_roles were updated.
-- The following tables still check `rh` OR `socio` only, so an admin user
-- cannot manage them -- which is what causes "new row violates row-level
-- security policy for table 'clima_surveys'" and similar on:
--   climate_surveys, climate_questions, climate_responses,
--   evaluations, one_on_ones, one_on_one_action_items,
--   development_plans, development_plan_updates, pending_tasks.
--
-- This migration introduces a single helper `is_people_manager(uuid)` that
-- returns true for admin/socio/rh and rewrites the affected policies to
-- use it, plus backfills any missing user_roles rows (so `has_role()` checks
-- don't silently deny RLS for users created without the trigger).

-- 1) Helper -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_people_manager(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin'::app_role, 'socio'::app_role, 'rh'::app_role)
  );
$$;

COMMENT ON FUNCTION public.is_people_manager IS
  'True if the user has admin, socio, or rh role. Use in RLS policies for manage/view-all cases.';

-- 2) climate_surveys --------------------------------------------------------
DROP POLICY IF EXISTS "Everyone can view active surveys" ON public.climate_surveys;
DROP POLICY IF EXISTS "RH and Socio can manage surveys" ON public.climate_surveys;
DROP POLICY IF EXISTS "Active surveys visible to all, drafts to managers" ON public.climate_surveys;
DROP POLICY IF EXISTS "People managers manage surveys" ON public.climate_surveys;

CREATE POLICY "Active surveys visible to all, drafts to managers"
  ON public.climate_surveys FOR SELECT
  TO authenticated
  USING (status = 'active' OR public.is_people_manager(auth.uid()));

CREATE POLICY "People managers manage surveys"
  ON public.climate_surveys FOR ALL
  TO authenticated
  USING (public.is_people_manager(auth.uid()))
  WITH CHECK (public.is_people_manager(auth.uid()));

-- 3) climate_questions ------------------------------------------------------
DROP POLICY IF EXISTS "Everyone can view questions from active surveys" ON public.climate_questions;
DROP POLICY IF EXISTS "RH and Socio can manage questions" ON public.climate_questions;
DROP POLICY IF EXISTS "Questions visible based on parent survey" ON public.climate_questions;
DROP POLICY IF EXISTS "People managers manage questions" ON public.climate_questions;

CREATE POLICY "Questions visible based on parent survey"
  ON public.climate_questions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.climate_surveys cs
      WHERE cs.id = survey_id
        AND (cs.status = 'active' OR public.is_people_manager(auth.uid()))
    )
  );

CREATE POLICY "People managers manage questions"
  ON public.climate_questions FOR ALL
  TO authenticated
  USING (public.is_people_manager(auth.uid()))
  WITH CHECK (public.is_people_manager(auth.uid()));

-- 4) climate_responses ------------------------------------------------------
DROP POLICY IF EXISTS "RH and Socio can view all responses" ON public.climate_responses;
DROP POLICY IF EXISTS "People managers view all responses" ON public.climate_responses;

CREATE POLICY "People managers view all responses"
  ON public.climate_responses FOR SELECT
  TO authenticated
  USING (public.is_people_manager(auth.uid()));

-- 5) evaluations ------------------------------------------------------------
DROP POLICY IF EXISTS "RH and Socio can view all evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "People managers view all evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "People managers manage evaluations" ON public.evaluations;

CREATE POLICY "People managers view all evaluations"
  ON public.evaluations FOR SELECT
  TO authenticated
  USING (public.is_people_manager(auth.uid()));

CREATE POLICY "People managers manage evaluations"
  ON public.evaluations FOR ALL
  TO authenticated
  USING (public.is_people_manager(auth.uid()))
  WITH CHECK (public.is_people_manager(auth.uid()));

-- 6) one_on_ones ------------------------------------------------------------
DROP POLICY IF EXISTS "RH and Socio can view all 1:1s" ON public.one_on_ones;
DROP POLICY IF EXISTS "People managers view all 1:1s" ON public.one_on_ones;
DROP POLICY IF EXISTS "People managers manage 1:1s" ON public.one_on_ones;

CREATE POLICY "People managers view all 1:1s"
  ON public.one_on_ones FOR SELECT
  TO authenticated
  USING (public.is_people_manager(auth.uid()));

CREATE POLICY "People managers manage 1:1s"
  ON public.one_on_ones FOR ALL
  TO authenticated
  USING (public.is_people_manager(auth.uid()))
  WITH CHECK (public.is_people_manager(auth.uid()));

-- 7) one_on_one_action_items -----------------------------------------------
DROP POLICY IF EXISTS "RH and Socio can view all action items" ON public.one_on_one_action_items;
DROP POLICY IF EXISTS "People managers view all action items" ON public.one_on_one_action_items;
DROP POLICY IF EXISTS "People managers manage action items" ON public.one_on_one_action_items;

CREATE POLICY "People managers view all action items"
  ON public.one_on_one_action_items FOR SELECT
  TO authenticated
  USING (public.is_people_manager(auth.uid()));

CREATE POLICY "People managers manage action items"
  ON public.one_on_one_action_items FOR ALL
  TO authenticated
  USING (public.is_people_manager(auth.uid()))
  WITH CHECK (public.is_people_manager(auth.uid()));

-- 8) development_plans ------------------------------------------------------
DROP POLICY IF EXISTS "RH and Socio can view all PDIs" ON public.development_plans;
DROP POLICY IF EXISTS "People managers view all PDIs" ON public.development_plans;
DROP POLICY IF EXISTS "People managers manage all PDIs" ON public.development_plans;

CREATE POLICY "People managers view all PDIs"
  ON public.development_plans FOR SELECT
  TO authenticated
  USING (public.is_people_manager(auth.uid()));

CREATE POLICY "People managers manage all PDIs"
  ON public.development_plans FOR ALL
  TO authenticated
  USING (public.is_people_manager(auth.uid()))
  WITH CHECK (public.is_people_manager(auth.uid()));

-- 9) development_plan_updates ----------------------------------------------
DROP POLICY IF EXISTS "RH and Socio can view all updates" ON public.development_plan_updates;
DROP POLICY IF EXISTS "People managers view all updates" ON public.development_plan_updates;
DROP POLICY IF EXISTS "People managers create updates on any PDI" ON public.development_plan_updates;

CREATE POLICY "People managers view all updates"
  ON public.development_plan_updates FOR SELECT
  TO authenticated
  USING (public.is_people_manager(auth.uid()));

CREATE POLICY "People managers create updates on any PDI"
  ON public.development_plan_updates FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND public.is_people_manager(auth.uid())
  );

-- 10) pending_tasks ---------------------------------------------------------
DROP POLICY IF EXISTS "RH and Socio can view all tasks" ON public.pending_tasks;
DROP POLICY IF EXISTS "People managers view all tasks" ON public.pending_tasks;

CREATE POLICY "People managers view all tasks"
  ON public.pending_tasks FOR SELECT
  TO authenticated
  USING (public.is_people_manager(auth.uid()));

-- 11) Backfill missing user_roles ------------------------------------------
-- Ensure every auth user has at least one row in user_roles; otherwise
-- has_role() returns false and RLS silently denies.
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'colaborador'::app_role
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id
)
ON CONFLICT (user_id, role) DO NOTHING;

-- 12) Strengthen handle_new_user so it seeds user_roles on signup ----------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  desired_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  BEGIN
    desired_role := COALESCE(
      (NEW.raw_user_meta_data->>'role')::public.app_role,
      'colaborador'::public.app_role
    );
  EXCEPTION WHEN invalid_text_representation THEN
    desired_role := 'colaborador'::public.app_role;
  END;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, desired_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;
