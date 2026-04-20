-- T007 — Lock cultural_fit_tokens RLS to deny every authenticated role;
-- only the service role (via Edge Functions hiring-issue-fit-cultural-link and
-- hiring-submit-fit-cultural-public) may read/write. The Edge Functions
-- bypass RLS via service_role key.
--
-- Also declares public.validate_and_consume_fit_token(raw) used by the public
-- submit endpoint. Returns the matching token row (or empty set) after
-- atomically marking consumed_at. Raw token never touches the DB — only its
-- SHA-256 hash is stored and compared.

-- Deny-all policy (no rows match). Authenticated non-service-role callers
-- cannot SELECT, INSERT, UPDATE, or DELETE from this table.
CREATE POLICY "hiring:cultural_fit_tokens:deny_authenticated"
  ON public.cultural_fit_tokens FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

-- Deny-all for anon.
CREATE POLICY "hiring:cultural_fit_tokens:deny_anon"
  ON public.cultural_fit_tokens FOR ALL TO anon
  USING (false)
  WITH CHECK (false);

-- --- validate_and_consume_fit_token ---------------------------------------
-- Atomically validates a raw token and marks the matching row consumed.
-- Returns (token_id, application_id, survey_id) on success, empty otherwise.
-- Called by the public Edge Function with service_role, which bypasses RLS.

CREATE OR REPLACE FUNCTION public.validate_and_consume_fit_token(p_token_raw TEXT)
RETURNS TABLE (token_id UUID, application_id UUID, survey_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_hash TEXT;
BEGIN
  IF p_token_raw IS NULL OR length(p_token_raw) < 16 THEN
    RETURN;
  END IF;

  v_hash := encode(extensions.digest(p_token_raw, 'sha256'), 'hex');

  RETURN QUERY
  UPDATE public.cultural_fit_tokens t
  SET consumed_at = NOW()
  WHERE t.token_hash = v_hash
    AND t.expires_at > NOW()
    AND t.consumed_at IS NULL
    AND t.revoked_at IS NULL
  RETURNING t.id, t.application_id, t.survey_id;
END;
$$;

-- pgcrypto provides extensions.digest used above.
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;
