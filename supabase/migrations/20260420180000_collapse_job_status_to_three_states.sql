-- Reduz job_status_enum para 3 estados:
--   aguardando_publicacao | publicada | fechada
--
-- Mapeamento dos valores antigos:
--   aguardando_descritivo, em_ajuste_pelo_rh,
--   aguardando_aprovacao_do_gestor, pronta_para_publicar → aguardando_publicacao
--   publicada, em_triagem                               → publicada
--   encerrada                                            → fechada
--
-- Postgres não permite remover valores de ENUM in-place, então criamos um
-- novo tipo, remapeamos as colunas e descartamos o antigo. Views / policies
-- / triggers que referenciam os valores antigos são recriadas.

BEGIN;

-- 1. Remove objetos dependentes que referenciam valores do enum antigo ----
DROP VIEW IF EXISTS public.jobs_public CASCADE;
DROP VIEW IF EXISTS public.companies_public CASCADE;
DROP VIEW IF EXISTS public.job_descriptions_public CASCADE;
DROP VIEW IF EXISTS public.v_hiring_jobs_by_status CASCADE;
DROP VIEW IF EXISTS public.v_hiring_avg_time_per_job CASCADE;

DROP POLICY IF EXISTS "companies:anon_public_profile"    ON public.companies;
DROP POLICY IF EXISTS "job_openings:anon_public"         ON public.job_openings;
DROP POLICY IF EXISTS "job_descriptions:anon_public"     ON public.job_descriptions;

DROP TRIGGER IF EXISTS tg_enforce_job_status_transition ON public.job_openings;
DROP TRIGGER IF EXISTS tg_hiring_job_approval_ins       ON public.job_openings;
DROP TRIGGER IF EXISTS tg_hiring_job_approval_upd       ON public.job_openings;

-- 2. Cria enum novo + swap da coluna --------------------------------------
CREATE TYPE public.job_status_enum_new AS ENUM (
  'aguardando_publicacao',
  'publicada',
  'fechada'
);

ALTER TABLE public.job_openings
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.job_openings
  ALTER COLUMN status TYPE public.job_status_enum_new
  USING (
    CASE status::text
      WHEN 'aguardando_descritivo'          THEN 'aguardando_publicacao'
      WHEN 'em_ajuste_pelo_rh'              THEN 'aguardando_publicacao'
      WHEN 'aguardando_aprovacao_do_gestor' THEN 'aguardando_publicacao'
      WHEN 'pronta_para_publicar'           THEN 'aguardando_publicacao'
      WHEN 'publicada'                      THEN 'publicada'
      WHEN 'em_triagem'                     THEN 'publicada'
      WHEN 'encerrada'                      THEN 'fechada'
      ELSE 'aguardando_publicacao'
    END
  )::public.job_status_enum_new;

ALTER TABLE public.job_openings
  ALTER COLUMN status SET DEFAULT 'aguardando_publicacao'::public.job_status_enum_new;

DROP TYPE public.job_status_enum;
ALTER TYPE public.job_status_enum_new RENAME TO job_status_enum;

-- 3. Recria o trigger de transição (permissivo; controla closed_at) -------
CREATE OR REPLACE FUNCTION public.tg_enforce_job_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'fechada' AND NEW.closed_at IS NULL THEN
    NEW.closed_at := NOW();
  END IF;

  IF OLD.status = 'fechada' AND NEW.status <> 'fechada' THEN
    NEW.closed_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER tg_enforce_job_status_transition
  BEFORE UPDATE OF status ON public.job_openings
  FOR EACH ROW EXECUTE FUNCTION public.tg_enforce_job_status_transition();

-- 4. Remove trigger/func de pending_tasks do fluxo antigo de aprovação ----
-- Aprovação do descritivo agora vive 100% em job_descriptions.approval_state.
DROP FUNCTION IF EXISTS public.tg_hiring_job_approval();

-- 5. Views públicas recriadas referenciando o novo enum -------------------
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
  j.updated_at,
  j.cultural_fit_survey_id
FROM public.job_openings j
WHERE j.status = 'publicada'
  AND j.confidential = FALSE
  AND j.closed_at IS NULL;

COMMENT ON VIEW public.jobs_public IS 'Vagas expostas publicamente (sem auth) para /vagas/:id.';

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
WHERE EXISTS (
  SELECT 1 FROM public.jobs_public jp WHERE jp.company_id = c.id
);

COMMENT ON VIEW public.companies_public IS 'Perfil público de empresa (mostrado junto à vaga).';

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

-- Views de dashboard que referenciavam valores antigos --------------------
CREATE OR REPLACE VIEW public.v_hiring_jobs_by_status AS
SELECT
  company_id,
  status,
  COUNT(*) AS count
FROM public.job_openings
GROUP BY company_id, status;

CREATE OR REPLACE VIEW public.v_hiring_avg_time_per_job AS
SELECT
  company_id,
  AVG(EXTRACT(EPOCH FROM (COALESCE(closed_at, NOW()) - opened_at)) / 86400.0)::numeric(10,2) AS avg_days_open
FROM public.job_openings
WHERE status <> 'aguardando_publicacao'
GROUP BY company_id;

GRANT SELECT ON public.jobs_public              TO anon, authenticated;
GRANT SELECT ON public.companies_public         TO anon, authenticated;
GRANT SELECT ON public.job_descriptions_public  TO anon, authenticated;

-- 6. Policies de acesso público recriadas ---------------------------------
CREATE POLICY "companies:anon_public_profile"
  ON public.companies FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.job_openings j
      WHERE j.company_id = companies.id
        AND j.status = 'publicada'
        AND j.confidential = FALSE
        AND j.closed_at IS NULL
    )
  );

CREATE POLICY "job_openings:anon_public"
  ON public.job_openings FOR SELECT TO anon
  USING (
    status = 'publicada'
    AND confidential = FALSE
    AND closed_at IS NULL
  );

CREATE POLICY "job_descriptions:anon_public"
  ON public.job_descriptions FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.job_openings j
      WHERE j.id = job_descriptions.job_opening_id
        AND j.status = 'publicada'
        AND j.confidential = FALSE
        AND j.closed_at IS NULL
    )
  );

COMMIT;
