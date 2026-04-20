-- Views e políticas para exposição pública da página de divulgação da vaga.
-- Estratégia: duas views filtradas (companies_public, jobs_public) com SECURITY INVOKER
-- e GRANT SELECT a anon + authenticated. Isso evita abrir as tabelas inteiras ao anon.

-- 1. Vagas públicas: só status aberto/publicado e não confidencial.
CREATE OR REPLACE VIEW public.jobs_public AS
SELECT
  j.id,
  j.company_id,
  j.title,
  j.summary,
  j.sector,
  j.work_mode,
  j.contract_type,
  j.hours_per_week,
  j.required_skills,
  j.salary_min_cents,
  j.salary_max_cents,
  j.benefits,
  j.num_openings,
  j.shift,
  j.override_address,
  j.address_street,
  j.address_number,
  j.address_complement,
  j.address_neighborhood,
  j.address_city,
  j.address_state,
  j.address_zip,
  j.public_slug,
  j.opened_at,
  j.target_deadline,
  j.status,
  j.updated_at
FROM public.job_openings j
WHERE j.status IN ('publicada', 'em_triagem', 'pronta_para_publicar')
  AND j.confidential = FALSE
  AND j.closed_at IS NULL;

COMMENT ON VIEW public.jobs_public IS 'Vagas expostas publicamente (sem auth) para /vagas/:id.';

-- 2. Empresas (apenas dados de marketing, sem cnpj/info sensível).
CREATE OR REPLACE VIEW public.companies_public AS
SELECT
  c.id,
  c.name,
  c.logo_url,
  c.website,
  c.tagline,
  c.overview,
  c.values_list,
  c.differentials,
  c.address_street,
  c.address_number,
  c.address_complement,
  c.address_neighborhood,
  c.address_city,
  c.address_state,
  c.address_zip,
  c.address_country,
  c.linkedin_url,
  c.instagram_url
FROM public.companies c
-- só expõe empresas que têm ao menos uma vaga pública
WHERE EXISTS (
  SELECT 1 FROM public.jobs_public jp WHERE jp.company_id = c.id
);

COMMENT ON VIEW public.companies_public IS 'Perfil público de empresa (mostrado junto à vaga).';

-- 3. Descritivos estruturados públicos — última versão aprovada ou rascunho mais recente.
CREATE OR REPLACE VIEW public.job_descriptions_public AS
SELECT DISTINCT ON (d.job_opening_id)
  d.id,
  d.job_opening_id,
  d.version,
  d.content_md,
  d.daily_routine,
  d.requirements,
  d.expectations,
  d.work_schedule,
  d.benefits_list
FROM public.job_descriptions d
JOIN public.jobs_public jp ON jp.id = d.job_opening_id
ORDER BY d.job_opening_id, d.version DESC;

COMMENT ON VIEW public.job_descriptions_public IS 'Última versão do descritivo estruturado para vagas públicas.';

-- --- GRANTs para anon + authenticated ------------------------------------

GRANT SELECT ON public.jobs_public              TO anon, authenticated;
GRANT SELECT ON public.companies_public         TO anon, authenticated;
GRANT SELECT ON public.job_descriptions_public  TO anon, authenticated;

-- As views herdam as políticas das tabelas-base por padrão (SECURITY INVOKER).
-- Precisamos então liberar SELECT nas tabelas base para anon com WHERE restritivo.

-- companies: anon só lê quando a empresa tem vaga pública ativa.
CREATE POLICY "companies:anon_public_profile"
  ON public.companies FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.job_openings j
      WHERE j.company_id = companies.id
        AND j.status IN ('publicada', 'em_triagem', 'pronta_para_publicar')
        AND j.confidential = FALSE
        AND j.closed_at IS NULL
    )
  );

-- job_openings: anon só lê vagas ativas, não confidenciais, não encerradas.
CREATE POLICY "job_openings:anon_public"
  ON public.job_openings FOR SELECT TO anon
  USING (
    status IN ('publicada', 'em_triagem', 'pronta_para_publicar')
    AND confidential = FALSE
    AND closed_at IS NULL
  );

-- job_descriptions: anon lê descritivo da vaga se a vaga for pública.
CREATE POLICY "job_descriptions:anon_public"
  ON public.job_descriptions FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.job_openings j
      WHERE j.id = job_descriptions.job_opening_id
        AND j.status IN ('publicada', 'em_triagem', 'pronta_para_publicar')
        AND j.confidential = FALSE
        AND j.closed_at IS NULL
    )
  );

-- Index pra busca por slug.
CREATE INDEX IF NOT EXISTS idx_job_openings_public_slug
  ON public.job_openings (public_slug)
  WHERE public_slug IS NOT NULL;
