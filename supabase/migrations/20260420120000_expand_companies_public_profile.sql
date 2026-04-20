-- Expande `public.companies` com campos de marca, sobre, endereço e sociais.
-- Esses dados alimentam a página pública de divulgação de vagas (/vagas/:id),
-- evitando duplicar informação da empresa em cada vaga aberta.

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS logo_url            TEXT,
  ADD COLUMN IF NOT EXISTS website             TEXT,
  ADD COLUMN IF NOT EXISTS tagline             TEXT,
  ADD COLUMN IF NOT EXISTS overview            TEXT,
  ADD COLUMN IF NOT EXISTS values_list         TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS differentials       TEXT,
  ADD COLUMN IF NOT EXISTS address_street      TEXT,
  ADD COLUMN IF NOT EXISTS address_number      TEXT,
  ADD COLUMN IF NOT EXISTS address_complement  TEXT,
  ADD COLUMN IF NOT EXISTS address_neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS address_city        TEXT,
  ADD COLUMN IF NOT EXISTS address_state       TEXT,
  ADD COLUMN IF NOT EXISTS address_zip         TEXT,
  ADD COLUMN IF NOT EXISTS address_country     TEXT DEFAULT 'Brasil',
  ADD COLUMN IF NOT EXISTS linkedin_url        TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url       TEXT,
  ADD COLUMN IF NOT EXISTS updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Trigger de updated_at (reaproveita função existente do hiring core).
DROP TRIGGER IF EXISTS companies_set_updated_at ON public.companies;
CREATE TRIGGER companies_set_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

COMMENT ON COLUMN public.companies.logo_url IS 'URL do logo no bucket company-assets (público).';
COMMENT ON COLUMN public.companies.values_list IS 'Array de valores/cultura em bullets para página pública.';
COMMENT ON COLUMN public.companies.overview IS 'Texto "Nosso negócio" exibido na página pública de vaga.';
