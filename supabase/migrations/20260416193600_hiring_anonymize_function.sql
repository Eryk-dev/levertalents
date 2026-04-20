-- T011 — public.anonymize_candidate(p_candidate_id) — idempotent LGPD wipe
-- per data-model §Anonymization contract and research R3.
-- Rewrites PII sentinels and nulls artefact columns. Storage deletion is the
-- responsibility of the caller (the hiring-anonymize-candidate Edge Function).

CREATE OR REPLACE FUNCTION public.anonymize_candidate(p_candidate_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_already TIMESTAMPTZ;
BEGIN
  SELECT anonymized_at INTO v_already FROM public.candidates WHERE id = p_candidate_id;

  IF v_already IS NOT NULL THEN
    -- Idempotent — already anonymized.
    RETURN;
  END IF;

  UPDATE public.candidates
    SET full_name = '[anonymized]',
        email = 'anon-' || id::text || '@anon.invalid',
        phone = NULL,
        cpf = NULL,
        document_number = NULL,
        cv_storage_path = NULL,
        anonymized_at = NOW(),
        anonymization_reason = COALESCE(anonymization_reason, 'solicitacao'::public.anonymization_reason_enum)
    WHERE id = p_candidate_id;

  -- Wipe fit cultural responses payloads.
  UPDATE public.cultural_fit_responses r
    SET payload = '{}'::jsonb, anonymized_at = NOW()
    FROM public.applications a
    WHERE a.id = r.application_id
      AND a.candidate_id = p_candidate_id
      AND r.anonymized_at IS NULL;

  -- Wipe background check artefacts.
  UPDATE public.background_checks bc
    SET file_path = NULL, note = NULL
    FROM public.applications a
    WHERE a.id = bc.application_id
      AND a.candidate_id = p_candidate_id;

  -- Wipe interview transcripts and summaries.
  UPDATE public.interviews i
    SET summary = NULL, transcript_text = NULL, transcript_path = NULL
    FROM public.applications a
    WHERE a.id = i.application_id
      AND a.candidate_id = p_candidate_id;
END;
$$;

-- Only allow privileged callers to invoke (RLS bypass via SECURITY DEFINER —
-- the function checks nothing beyond the candidate id, so we revoke public
-- execute and grant only to authenticated. The Edge Functions using
-- service_role bypass this layer.).
REVOKE ALL ON FUNCTION public.anonymize_candidate(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.anonymize_candidate(UUID) TO service_role;
