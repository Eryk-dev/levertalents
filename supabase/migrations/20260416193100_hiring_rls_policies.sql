-- T006 — RLS policies for the 17 hiring tables created in T004.
--
-- Role matrix (data-model.md):
--   admin/socio/rh — full pipeline access (rh cannot see team_members.cost, but
--     that is a separate table covered by its own existing policies).
--   lider          — can read own company's jobs/applications (respecting the
--                    confidencial gate); can INSERT/UPDATE only jobs they
--                    requested; cannot see `candidates` except via applications.
--   colaborador    — no hiring access.

-- Helper: companies the caller can see based on their app_role.
-- admin/socio/rh → all companies. lider → companies where they are a leader of
-- at least one team_member row.
CREATE OR REPLACE FUNCTION public.allowed_companies(_profile_id UUID)
RETURNS UUID[]
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.has_role(_profile_id, 'admin'::public.app_role)
      OR public.has_role(_profile_id, 'socio'::public.app_role)
      OR public.has_role(_profile_id, 'rh'::public.app_role) THEN
        (SELECT COALESCE(array_agg(id), '{}'::uuid[]) FROM public.companies)
    WHEN public.has_role(_profile_id, 'lider'::public.app_role) THEN
        (SELECT COALESCE(array_agg(DISTINCT t.company_id), '{}'::uuid[])
         FROM public.team_members tm
         JOIN public.teams t ON t.id = tm.team_id
         WHERE tm.leader_id = _profile_id)
    ELSE '{}'::uuid[]
  END;
$$;

-- --- job_openings ---------------------------------------------------------

CREATE POLICY "hiring:job_openings:select"
  ON public.job_openings FOR SELECT TO authenticated
  USING (
    (public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'socio'::public.app_role)
      OR public.has_role(auth.uid(), 'rh'::public.app_role))
    OR (
      public.has_role(auth.uid(), 'lider'::public.app_role)
      AND company_id = ANY(public.allowed_companies(auth.uid()))
      AND (NOT confidential OR auth.uid() = ANY(confidential_participant_ids) OR auth.uid() = requested_by)
    )
  );

CREATE POLICY "hiring:job_openings:insert"
  ON public.job_openings FOR INSERT TO authenticated
  WITH CHECK (
    (public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'socio'::public.app_role)
      OR public.has_role(auth.uid(), 'rh'::public.app_role)
      OR public.has_role(auth.uid(), 'lider'::public.app_role))
    AND company_id = ANY(public.allowed_companies(auth.uid()))
  );

CREATE POLICY "hiring:job_openings:update"
  ON public.job_openings FOR UPDATE TO authenticated
  USING (
    (public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'socio'::public.app_role)
      OR public.has_role(auth.uid(), 'rh'::public.app_role))
    OR (
      public.has_role(auth.uid(), 'lider'::public.app_role)
      AND company_id = ANY(public.allowed_companies(auth.uid()))
      AND (NOT confidential OR auth.uid() = ANY(confidential_participant_ids) OR auth.uid() = requested_by)
    )
  );

CREATE POLICY "hiring:job_openings:delete"
  ON public.job_openings FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'socio'::public.app_role)
    OR public.has_role(auth.uid(), 'rh'::public.app_role)
  );

-- --- job_descriptions (inherits visibility via join) ----------------------

CREATE POLICY "hiring:job_descriptions:select"
  ON public.job_descriptions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.job_openings j
      WHERE j.id = job_opening_id
    )
  );

CREATE POLICY "hiring:job_descriptions:mutate"
  ON public.job_descriptions FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.job_openings j
      WHERE j.id = job_opening_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.job_openings j
      WHERE j.id = job_opening_id
    )
  );

-- --- job_external_publications -------------------------------------------

CREATE POLICY "hiring:job_external_publications:select"
  ON public.job_external_publications FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.job_openings j
      WHERE j.id = job_opening_id
    )
  );

CREATE POLICY "hiring:job_external_publications:mutate"
  ON public.job_external_publications FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'socio'::public.app_role)
    OR public.has_role(auth.uid(), 'rh'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'socio'::public.app_role)
    OR public.has_role(auth.uid(), 'rh'::public.app_role)
  );

-- --- candidates -----------------------------------------------------------

CREATE POLICY "hiring:candidates:select_rh_socio_admin"
  ON public.candidates FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'socio'::public.app_role)
    OR public.has_role(auth.uid(), 'rh'::public.app_role)
  );

CREATE POLICY "hiring:candidates:select_lider_via_application"
  ON public.candidates FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'lider'::public.app_role)
    AND EXISTS (
      SELECT 1
      FROM public.applications a
      JOIN public.job_openings j ON j.id = a.job_opening_id
      WHERE a.candidate_id = candidates.id
        AND j.company_id = ANY(public.allowed_companies(auth.uid()))
        AND (NOT j.confidential OR auth.uid() = ANY(j.confidential_participant_ids))
    )
  );

CREATE POLICY "hiring:candidates:mutate"
  ON public.candidates FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'socio'::public.app_role)
    OR public.has_role(auth.uid(), 'rh'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'socio'::public.app_role)
    OR public.has_role(auth.uid(), 'rh'::public.app_role)
  );

-- --- applications ---------------------------------------------------------

CREATE POLICY "hiring:applications:select"
  ON public.applications FOR SELECT TO authenticated
  USING (
    (public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'socio'::public.app_role)
      OR public.has_role(auth.uid(), 'rh'::public.app_role))
    OR EXISTS (
      SELECT 1 FROM public.job_openings j
      WHERE j.id = applications.job_opening_id
        AND public.has_role(auth.uid(), 'lider'::public.app_role)
        AND j.company_id = ANY(public.allowed_companies(auth.uid()))
        AND (NOT j.confidential OR auth.uid() = ANY(j.confidential_participant_ids))
    )
  );

CREATE POLICY "hiring:applications:mutate"
  ON public.applications FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'socio'::public.app_role)
    OR public.has_role(auth.uid(), 'rh'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'socio'::public.app_role)
    OR public.has_role(auth.uid(), 'rh'::public.app_role)
  );

-- --- application_stage_history (read same scope as applications) ----------

CREATE POLICY "hiring:application_stage_history:select"
  ON public.application_stage_history FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.applications a WHERE a.id = application_id)
  );

CREATE POLICY "hiring:application_stage_history:insert"
  ON public.application_stage_history FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'socio'::public.app_role)
    OR public.has_role(auth.uid(), 'rh'::public.app_role)
  );

-- --- cultural_fit_surveys / questions -------------------------------------

CREATE POLICY "hiring:cultural_fit_surveys:select"
  ON public.cultural_fit_surveys FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'socio'::public.app_role)
    OR public.has_role(auth.uid(), 'rh'::public.app_role)
    OR public.has_role(auth.uid(), 'lider'::public.app_role)
  );

CREATE POLICY "hiring:cultural_fit_surveys:mutate"
  ON public.cultural_fit_surveys FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'socio'::public.app_role)
    OR public.has_role(auth.uid(), 'rh'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'socio'::public.app_role)
    OR public.has_role(auth.uid(), 'rh'::public.app_role)
  );

CREATE POLICY "hiring:cultural_fit_questions:select"
  ON public.cultural_fit_questions FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.cultural_fit_surveys s WHERE s.id = survey_id)
  );

CREATE POLICY "hiring:cultural_fit_questions:mutate"
  ON public.cultural_fit_questions FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'socio'::public.app_role)
    OR public.has_role(auth.uid(), 'rh'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'socio'::public.app_role)
    OR public.has_role(auth.uid(), 'rh'::public.app_role)
  );

-- --- cultural_fit_tokens: policies land in T007 (deny-all for authenticated)

-- --- cultural_fit_responses ----------------------------------------------

CREATE POLICY "hiring:cultural_fit_responses:select"
  ON public.cultural_fit_responses FOR SELECT TO authenticated
  USING (
    (public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'socio'::public.app_role)
      OR public.has_role(auth.uid(), 'rh'::public.app_role))
    OR EXISTS (
      SELECT 1
      FROM public.applications a
      JOIN public.job_openings j ON j.id = a.job_opening_id
      WHERE a.id = application_id
        AND public.has_role(auth.uid(), 'lider'::public.app_role)
        AND j.company_id = ANY(public.allowed_companies(auth.uid()))
        AND (NOT j.confidential OR auth.uid() = ANY(j.confidential_participant_ids))
    )
  );

-- No authenticated INSERT/UPDATE — service role (Edge Function) only.

-- --- background_checks ----------------------------------------------------

CREATE POLICY "hiring:background_checks:select"
  ON public.background_checks FOR SELECT TO authenticated
  USING (
    (public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'socio'::public.app_role)
      OR public.has_role(auth.uid(), 'rh'::public.app_role))
    OR EXISTS (
      SELECT 1
      FROM public.applications a
      JOIN public.job_openings j ON j.id = a.job_opening_id
      WHERE a.id = application_id
        AND public.has_role(auth.uid(), 'lider'::public.app_role)
        AND j.company_id = ANY(public.allowed_companies(auth.uid()))
    )
  );

CREATE POLICY "hiring:background_checks:mutate"
  ON public.background_checks FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'socio'::public.app_role)
    OR public.has_role(auth.uid(), 'rh'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'socio'::public.app_role)
    OR public.has_role(auth.uid(), 'rh'::public.app_role)
  );

-- --- interviews + interview_decisions ------------------------------------

CREATE POLICY "hiring:interviews:select"
  ON public.interviews FOR SELECT TO authenticated
  USING (
    (public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'socio'::public.app_role)
      OR public.has_role(auth.uid(), 'rh'::public.app_role))
    OR auth.uid() = ANY(participants)
    OR EXISTS (
      SELECT 1
      FROM public.applications a
      JOIN public.job_openings j ON j.id = a.job_opening_id
      WHERE a.id = application_id
        AND public.has_role(auth.uid(), 'lider'::public.app_role)
        AND j.company_id = ANY(public.allowed_companies(auth.uid()))
        AND (NOT j.confidential OR auth.uid() = ANY(j.confidential_participant_ids))
    )
  );

CREATE POLICY "hiring:interviews:mutate"
  ON public.interviews FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'socio'::public.app_role)
    OR public.has_role(auth.uid(), 'rh'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'socio'::public.app_role)
    OR public.has_role(auth.uid(), 'rh'::public.app_role)
  );

CREATE POLICY "hiring:interview_decisions:select"
  ON public.interview_decisions FOR SELECT TO authenticated
  USING (
    (public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'socio'::public.app_role)
      OR public.has_role(auth.uid(), 'rh'::public.app_role))
    OR evaluator_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.interviews i
      JOIN public.applications a ON a.id = i.application_id
      JOIN public.job_openings j ON j.id = a.job_opening_id
      WHERE i.id = interview_id
        AND public.has_role(auth.uid(), 'lider'::public.app_role)
        AND j.company_id = ANY(public.allowed_companies(auth.uid()))
    )
  );

CREATE POLICY "hiring:interview_decisions:insert"
  ON public.interview_decisions FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'socio'::public.app_role)
    OR public.has_role(auth.uid(), 'rh'::public.app_role)
    OR evaluator_id = auth.uid()
  );

CREATE POLICY "hiring:interview_decisions:update"
  ON public.interview_decisions FOR UPDATE TO authenticated
  USING (evaluator_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'socio'::public.app_role)
    OR public.has_role(auth.uid(), 'rh'::public.app_role)
  );

-- --- hiring_decisions (trigger-managed, readable in same scope as applications)

CREATE POLICY "hiring:hiring_decisions:select"
  ON public.hiring_decisions FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.applications a WHERE a.id = application_id)
  );

-- No direct INSERT/UPDATE/DELETE — trigger uses SECURITY DEFINER + RLS off
-- (the trigger function runs as table owner; postgres role bypasses RLS).

-- --- employee_onboarding_handoffs ----------------------------------------

CREATE POLICY "hiring:employee_onboarding_handoffs:select"
  ON public.employee_onboarding_handoffs FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'socio'::public.app_role)
    OR public.has_role(auth.uid(), 'rh'::public.app_role)
    OR profile_id = auth.uid()
    OR leader_id = auth.uid()
  );

CREATE POLICY "hiring:employee_onboarding_handoffs:mutate"
  ON public.employee_onboarding_handoffs FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'socio'::public.app_role)
    OR public.has_role(auth.uid(), 'rh'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'socio'::public.app_role)
    OR public.has_role(auth.uid(), 'rh'::public.app_role)
  );

-- --- standard_messages ---------------------------------------------------

CREATE POLICY "hiring:standard_messages:select"
  ON public.standard_messages FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'socio'::public.app_role)
    OR public.has_role(auth.uid(), 'rh'::public.app_role)
  );

CREATE POLICY "hiring:standard_messages:mutate"
  ON public.standard_messages FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'socio'::public.app_role)
    OR public.has_role(auth.uid(), 'rh'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'socio'::public.app_role)
    OR public.has_role(auth.uid(), 'rh'::public.app_role)
  );

-- --- candidate_access_log (LGPD: not every RH can read) -------------------

CREATE POLICY "hiring:candidate_access_log:select"
  ON public.candidate_access_log FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'socio'::public.app_role)
  );

-- No authenticated INSERT — triggers write as SECURITY DEFINER.
