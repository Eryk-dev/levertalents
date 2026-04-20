-- T008 — Private `hiring` bucket + RLS policies on storage.objects scoped to
-- `companies/<company_id>/…` prefix and the caller's allowed_companies()
-- (research R6). Confidencial vagas check their participant list.

INSERT INTO storage.buckets (id, name, public)
VALUES ('hiring', 'hiring', false)
ON CONFLICT (id) DO NOTHING;

-- Helper — extracts the company_id UUID from the second path segment of a
-- hiring object name (`companies/<company_id>/...`).
CREATE OR REPLACE FUNCTION public.hiring_object_company(p_object_name TEXT)
RETURNS UUID
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT CASE
    WHEN split_part(p_object_name, '/', 1) = 'companies'
         AND split_part(p_object_name, '/', 2) <> ''
    THEN NULLIF(split_part(p_object_name, '/', 2), '')::uuid
    ELSE NULL
  END;
$$;

-- SELECT: caller must be hiring-qualified AND the company_id in the path must
-- be in their allowed_companies().
CREATE POLICY "hiring_bucket:select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'hiring'
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'socio'::public.app_role)
      OR public.has_role(auth.uid(), 'rh'::public.app_role)
      OR (
        public.has_role(auth.uid(), 'lider'::public.app_role)
        AND public.hiring_object_company(name) = ANY(public.allowed_companies(auth.uid()))
      )
    )
  );

CREATE POLICY "hiring_bucket:insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'hiring'
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'socio'::public.app_role)
      OR public.has_role(auth.uid(), 'rh'::public.app_role)
      OR (
        public.has_role(auth.uid(), 'lider'::public.app_role)
        AND public.hiring_object_company(name) = ANY(public.allowed_companies(auth.uid()))
      )
    )
  );

CREATE POLICY "hiring_bucket:update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'hiring'
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'socio'::public.app_role)
      OR public.has_role(auth.uid(), 'rh'::public.app_role)
    )
  );

CREATE POLICY "hiring_bucket:delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'hiring'
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'socio'::public.app_role)
      OR public.has_role(auth.uid(), 'rh'::public.app_role)
    )
  );
