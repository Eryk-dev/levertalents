-- ----------------------------------------------------------------------------
-- Motivo de descarte + Banco de Talentos
-- ----------------------------------------------------------------------------
-- Antes: ao recusar um candidato, o RH escolhia apenas uma mensagem padrão
-- (rejection_message_id). Agora o fluxo captura dois campos independentes:
--   1) discard_reason — motivo estruturado (enum)
--   2) added_to_talent_pool — se o candidato deve voltar ao Banco de Talentos
--
-- Também deixamos rejection_message_id opcional (a mensagem pode ser omitida)
-- e preservamos dados legados (sem_retorno / fit_recebido continuam válidos
-- no enum de stage, mas o Kanban não mostra mais a coluna "Fit Cultural").
-- ----------------------------------------------------------------------------

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

ALTER TABLE public.applications
  ADD COLUMN discard_reason        public.discard_reason_enum,
  ADD COLUMN discard_notes         TEXT,
  ADD COLUMN added_to_talent_pool  BOOLEAN NOT NULL DEFAULT false;

-- Consistência: só faz sentido ter motivo de descarte quando a application
-- está em um estado terminal de recusa.
ALTER TABLE public.applications
  ADD CONSTRAINT applications_discard_reason_only_on_closed CHECK (
    discard_reason IS NULL
    OR stage IN ('recusado', 'reprovado_pelo_gestor')
  );

-- Índice para a futura tela de "Banco de Talentos".
CREATE INDEX idx_applications_talent_pool
  ON public.applications (added_to_talent_pool, closed_at DESC)
  WHERE added_to_talent_pool = true;

CREATE INDEX idx_applications_discard_reason
  ON public.applications (discard_reason)
  WHERE discard_reason IS NOT NULL;

COMMENT ON COLUMN public.applications.discard_reason IS
  'Motivo estruturado do descarte (enum). Preenchido no fluxo de recusar candidato.';
COMMENT ON COLUMN public.applications.discard_notes IS
  'Observação livre opcional do RH sobre o descarte.';
COMMENT ON COLUMN public.applications.added_to_talent_pool IS
  'Se true, o candidato aparece no Banco de Talentos para reaproveitamento em outras vagas.';
