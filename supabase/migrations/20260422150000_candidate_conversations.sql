-- ----------------------------------------------------------------------------
-- Banco de Talentos — conversas livres com candidato
-- ----------------------------------------------------------------------------
-- Motivação: o transcript atual vive em `interviews` e está amarrado a uma
-- entrevista formal (kind = rh | final). O RH precisa de um registro separado
-- para conversas informais (discovery call, follow-up, ligação rápida) que são
-- consultadas no Banco de Talentos para lembrar a "forma de conversar" do
-- candidato — inclusive meses depois, fora de qualquer aplicação ativa.
--
-- Escopo: 1 candidato → N conversations. Transcrição em texto + upload opcional
-- + resumo curto. Multi-aplicação não entra aqui (conversa é do candidato, não
-- da vaga).
-- ----------------------------------------------------------------------------

CREATE TYPE public.candidate_conversation_kind_enum AS ENUM (
  'discovery',      -- Primeiro contato / bate-papo inicial
  'followup',       -- Conversa de acompanhamento
  'referencia',     -- Verificação de referências
  'alinhamento',    -- Alinhamento de expectativas / proposta
  'outro'
);

CREATE TABLE public.candidate_conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id    UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  kind            public.candidate_conversation_kind_enum NOT NULL DEFAULT 'discovery',
  title           TEXT,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  transcript_text TEXT,
  transcript_path TEXT,
  summary         TEXT,
  created_by      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  anonymized_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_candidate_conversations_candidate
  ON public.candidate_conversations (candidate_id, occurred_at DESC);

ALTER TABLE public.candidate_conversations ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER tg_candidate_conversations_updated_at
  BEFORE UPDATE ON public.candidate_conversations
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- --- RLS --------------------------------------------------------------------
-- Mesma regra de visibilidade de `candidates`: admin/socio/rh sempre podem;
-- lider só vê se houver aplicação do candidato em vaga de empresa permitida.
-- Mutação fica restrita a admin/socio/rh (lider consulta, não edita).

CREATE POLICY "hiring:candidate_conversations:select_rh_socio_admin"
  ON public.candidate_conversations FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'socio'::public.app_role)
    OR public.has_role(auth.uid(), 'rh'::public.app_role)
  );

CREATE POLICY "hiring:candidate_conversations:select_lider_via_application"
  ON public.candidate_conversations FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'lider'::public.app_role)
    AND EXISTS (
      SELECT 1
      FROM public.applications a
      JOIN public.job_openings j ON j.id = a.job_opening_id
      WHERE a.candidate_id = candidate_conversations.candidate_id
        AND j.company_id = ANY(public.allowed_companies(auth.uid()))
        AND (NOT j.confidential OR auth.uid() = ANY(j.confidential_participant_ids))
    )
  );

CREATE POLICY "hiring:candidate_conversations:mutate"
  ON public.candidate_conversations FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'socio'::public.app_role)
    OR public.has_role(auth.uid(), 'rh'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'socio'::public.app_role)
    OR public.has_role(auth.uid(), 'rh'::public.app_role)
  );

COMMENT ON TABLE public.candidate_conversations IS
  'Conversas livres com o candidato (discovery call, follow-up, referências). Consultado no Banco de Talentos para lembrar o histórico de contato.';
COMMENT ON COLUMN public.candidate_conversations.transcript_text IS
  'Transcrição colada ou digitada. Pode coexistir com transcript_path (arquivo).';
COMMENT ON COLUMN public.candidate_conversations.summary IS
  'Resumo curto da conversa — o que se lembra do perfil do candidato ao consultar o banco.';
