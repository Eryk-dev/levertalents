-- Estrutura os campos de descrição da vaga (antes só markdown livre em content_md).
-- Mantém content_md como fallback/legado. Form de vaga passa a preencher seções fixas.

ALTER TABLE public.job_descriptions
  ADD COLUMN IF NOT EXISTS daily_routine   TEXT,
  ADD COLUMN IF NOT EXISTS requirements    TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS expectations    TEXT,
  ADD COLUMN IF NOT EXISTS work_schedule   TEXT,
  ADD COLUMN IF NOT EXISTS benefits_list   TEXT[] NOT NULL DEFAULT '{}';

-- content_md passa a ser opcional (legado).
ALTER TABLE public.job_descriptions
  ALTER COLUMN content_md DROP NOT NULL;

-- Campos da vaga que são específicos da oferta (não herdam da empresa).
ALTER TABLE public.job_openings
  ADD COLUMN IF NOT EXISTS num_openings         INTEGER NOT NULL DEFAULT 1 CHECK (num_openings > 0),
  ADD COLUMN IF NOT EXISTS shift                TEXT,
  ADD COLUMN IF NOT EXISTS override_address     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS address_street       TEXT,
  ADD COLUMN IF NOT EXISTS address_number       TEXT,
  ADD COLUMN IF NOT EXISTS address_complement   TEXT,
  ADD COLUMN IF NOT EXISTS address_neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS address_city         TEXT,
  ADD COLUMN IF NOT EXISTS address_state        TEXT,
  ADD COLUMN IF NOT EXISTS address_zip          TEXT,
  ADD COLUMN IF NOT EXISTS public_slug          TEXT UNIQUE;

COMMENT ON COLUMN public.job_openings.shift IS 'Turno da vaga: manhã, tarde, noite, integral, livre.';
COMMENT ON COLUMN public.job_openings.override_address IS 'Quando TRUE, usa endereço próprio da vaga em vez do endereço da empresa.';
COMMENT ON COLUMN public.job_openings.public_slug IS 'Slug opcional para URL amigável (/vagas/slug). Fallback: ID.';
COMMENT ON COLUMN public.job_descriptions.requirements IS 'Lista de requisitos em bullets.';
COMMENT ON COLUMN public.job_descriptions.benefits_list IS 'Benefícios em bullets (substitui benefits como texto livre no job_openings).';
