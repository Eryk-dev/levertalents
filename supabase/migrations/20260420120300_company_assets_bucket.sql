-- Bucket público `company-assets` para logos de empresa (acessível via URL direta).
-- Políticas: leitura pública; upload/update/delete restrito a admin/socio/rh.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-assets',
  'company-assets',
  TRUE,
  2 * 1024 * 1024,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Leitura pública (bucket é público, mas política explícita garante).
CREATE POLICY "company_assets:public_read"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'company-assets');

-- Upload/update/delete: só admin/socio/rh.
CREATE POLICY "company_assets:admin_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'company-assets'
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'socio'::public.app_role)
      OR public.has_role(auth.uid(), 'rh'::public.app_role)
    )
  );

CREATE POLICY "company_assets:admin_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'company-assets'
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'socio'::public.app_role)
      OR public.has_role(auth.uid(), 'rh'::public.app_role)
    )
  );

CREATE POLICY "company_assets:admin_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'company-assets'
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'socio'::public.app_role)
      OR public.has_role(auth.uid(), 'rh'::public.app_role)
    )
  );
