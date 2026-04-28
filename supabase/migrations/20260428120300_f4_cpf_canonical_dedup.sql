-- =========================================================================
-- Migration F.4: CPF como chave canonical de dedup (TAL-09)
--
-- Motivacao: o schema atual tem UNIQUE (document_type, document_number)
-- mas isso nao obriga unicidade quando document_type='cpf'. CPF e a chave
-- canonical brasileira; queremos partial UNIQUE em candidates.cpf
-- (nullable; NULL e nao-unico quando candidato externo sem CPF).
--
-- Pattern: normalize-then-constrain (alinha com PITFALL §F.4 da RESEARCH).
-- Threats:
--   T-02-04-01 (UNIQUE breaking on existing duplicates) — mitigado por:
--     1) normalizar todos os CPFs ANTES;
--     2) validar zero duplicatas residuais;
--     3) so entao criar UNIQUE (com mensagem explicita se aborta).
-- REQs: TAL-09
-- =========================================================================

-- 1. Funcao normalize_cpf (IMMUTABLE para uso em indexes/checks)
CREATE OR REPLACE FUNCTION public.normalize_cpf(input text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT NULLIF(regexp_replace(COALESCE(input, ''), '[^0-9]', '', 'g'), '');
$$;

-- 2. Normalizar dados existentes ANTES de criar UNIQUE (idempotente)
UPDATE public.candidates
   SET cpf = public.normalize_cpf(cpf)
 WHERE cpf IS NOT NULL
   AND cpf <> public.normalize_cpf(cpf);

-- 3. Validacao: abortar migration se houver duplicatas pos-normalizacao
DO $$
DECLARE v_dupes INT;
BEGIN
  SELECT count(*) INTO v_dupes FROM (
    SELECT cpf, count(*) AS c
      FROM public.candidates
     WHERE cpf IS NOT NULL AND anonymized_at IS NULL
     GROUP BY cpf HAVING count(*) > 1
  ) sub;
  IF v_dupes > 0 THEN
    RAISE EXCEPTION 'Migration F.4 abortada: % CPF duplicado(s) pos-normalizacao. Faca merge manual antes de re-aplicar.', v_dupes;
  END IF;
END $$;

-- 4. UNIQUE partial index: CPF e unico quando NOT NULL E NOT anonimizado
CREATE UNIQUE INDEX IF NOT EXISTS idx_candidates_cpf_unique
  ON public.candidates (cpf)
  WHERE cpf IS NOT NULL AND anonymized_at IS NULL;

-- 5. Trigger normaliza CPF em INSERT/UPDATE + valida 11 digitos
CREATE OR REPLACE FUNCTION public.tg_normalize_candidate_cpf()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.cpf IS NOT NULL THEN
    NEW.cpf := public.normalize_cpf(NEW.cpf);
    IF NEW.cpf IS NULL OR length(NEW.cpf) <> 11 THEN
      RAISE EXCEPTION 'CPF invalido: deve ter 11 digitos numericos (recebeu: %)', NEW.cpf
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tg_candidates_normalize_cpf ON public.candidates;
CREATE TRIGGER tg_candidates_normalize_cpf
  BEFORE INSERT OR UPDATE OF cpf ON public.candidates
  FOR EACH ROW EXECUTE FUNCTION public.tg_normalize_candidate_cpf();

COMMENT ON INDEX public.idx_candidates_cpf_unique IS
  'Phase 2 Migration F.4 — CPF como chave canonical de dedup (TAL-09). Partial: NOT NULL E NOT anonimizado.';
COMMENT ON FUNCTION public.normalize_cpf(text) IS
  'Phase 2 Migration F.4 — remove pontuacao CPF; retorna NULL se vazio.';
COMMENT ON FUNCTION public.tg_normalize_candidate_cpf() IS
  'Phase 2 Migration F.4 — BEFORE INSERT/UPDATE OF cpf; normaliza e valida 11 digitos.';
