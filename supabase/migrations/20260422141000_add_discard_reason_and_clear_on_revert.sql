-- Adiciona colunas de descarte (o arquivo local 20260420190000 existe mas
-- nunca foi aplicado no remoto) + ajusta o trigger permissivo para limpar
-- a metadata de descarte ao voltar de um estado terminal (obrigatório
-- pela CHECK constraint applications_discard_reason_only_on_closed).

-- 1) Enum + colunas ---------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'discard_reason_enum') THEN
    CREATE TYPE public.discard_reason_enum AS ENUM (
      'antecedentes_reprovados',
      'perfil_desalinhado',
      'experiencia_insuficiente',
      'expectativa_salarial',
      'candidato_desistiu',
      'sem_retorno_candidato',
      'reprovado_entrevista_rh',
      'reprovado_entrevista_final',
      'avaliacao_rh_negativa',
      'posicao_preenchida',
      'outro'
    );
  END IF;
END $$;

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS discard_reason        public.discard_reason_enum,
  ADD COLUMN IF NOT EXISTS discard_notes         TEXT,
  ADD COLUMN IF NOT EXISTS added_to_talent_pool  BOOLEAN NOT NULL DEFAULT false;

-- 2) CHECK constraint -------------------------------------------------------
ALTER TABLE public.applications
  DROP CONSTRAINT IF EXISTS applications_discard_reason_only_on_closed;

ALTER TABLE public.applications
  ADD CONSTRAINT applications_discard_reason_only_on_closed CHECK (
    discard_reason IS NULL
    OR stage IN ('recusado', 'reprovado_pelo_gestor')
  );

-- 3) Índices ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_applications_talent_pool
  ON public.applications (added_to_talent_pool, closed_at DESC)
  WHERE added_to_talent_pool = true;

CREATE INDEX IF NOT EXISTS idx_applications_discard_reason
  ON public.applications (discard_reason)
  WHERE discard_reason IS NOT NULL;

-- 4) Trigger permissivo + limpa metadata de descarte ao sair do terminal ---
CREATE OR REPLACE FUNCTION public.tg_enforce_application_stage_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.stage IS NOT DISTINCT FROM NEW.stage THEN
    RETURN NEW;
  END IF;

  NEW.stage_entered_at := NOW();

  IF OLD.stage IN ('reprovado_pelo_gestor', 'recusado')
     AND NEW.stage NOT IN ('reprovado_pelo_gestor', 'recusado') THEN
    NEW.closed_at := NULL;
    NEW.discard_reason := NULL;
    NEW.discard_notes := NULL;
    NEW.added_to_talent_pool := false;
    NEW.rejection_message_id := NULL;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON COLUMN public.applications.discard_reason IS
  'Motivo estruturado do descarte (enum). Preenchido no fluxo de recusar candidato.';
COMMENT ON COLUMN public.applications.discard_notes IS
  'Observação livre opcional do RH sobre o descarte.';
COMMENT ON COLUMN public.applications.added_to_talent_pool IS
  'Se true, o candidato aparece no Banco de Talentos para reaproveitamento em outras vagas.';
COMMENT ON FUNCTION public.tg_enforce_application_stage_transition IS
  'Permissivo: qualquer transição de stage é permitida. Ao sair de estados terminais (recusado/reprovado), zera closed_at + metadata de descarte para satisfazer a CHECK constraint e retomar o fluxo ativo.';
