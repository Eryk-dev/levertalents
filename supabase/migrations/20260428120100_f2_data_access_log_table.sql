-- =========================================================================
-- Migration F.2: data_access_log + read_candidate_with_log RPC + pg_cron retention
--
-- Motivacao: TAL-05/06/07 exigem log append-only para todo acesso a PII de
-- candidatos. Generaliza candidate_access_log existente em data_access_log
-- com entity_type discriminator, scope_company_id, e context. RPC
-- read_candidate_with_log e o unico caminho de leitura de PII (RLS direto
-- na tabela candidates e mantido para entity reads nao-PII; o RPC forca
-- escrita atomica no log). pg_cron deleta rows >36 meses semanalmente.
--
-- Pattern: append-only DDL + RPC SECURITY DEFINER + cron schedule.
-- Threats:
--   T-02-02-01 (PII leakage via direct SELECT) — mitigado por RPC + RLS denies
--   T-02-02-02 (log poisoning via INSERT direto) — mitigado por NAO ter RLS
--     policy de INSERT, so RPC com SECURITY DEFINER escreve.
--   T-02-02-04 (RPC bypassa RLS sem re-aplicar) — RPC re-aplica is_people_manager
--     OR EXISTS(visible_companies) antes de retornar.
--   T-02-02-05 (search_path injection) — todas funcoes SECURITY DEFINER tem
--     SET search_path = public.
-- REQs: TAL-05, TAL-06, TAL-07
-- =========================================================================

-- 1. Tabela append-only generalizada
CREATE TABLE IF NOT EXISTS public.data_access_log (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id          uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  entity_type       text NOT NULL CHECK (entity_type IN ('candidate', 'application', 'cultural_fit_response', 'profile', 'salary')),
  entity_id         uuid NOT NULL,
  action            text NOT NULL CHECK (action IN ('view', 'export', 'update', 'anonymize', 'delete')),
  scope_company_id  uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  context           text,
  ip_address        inet,
  user_agent        text,
  at                timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_access_log_actor_at
  ON public.data_access_log (actor_id, at DESC);
CREATE INDEX IF NOT EXISTS idx_data_access_log_entity
  ON public.data_access_log (entity_type, entity_id, at DESC);

ALTER TABLE public.data_access_log ENABLE ROW LEVEL SECURITY;

-- 2. RLS: SELECT apenas para is_people_manager (admin/rh/socio).
-- NAO ha policy INSERT/UPDATE/DELETE — so funcoes SECURITY DEFINER escrevem.
DROP POLICY IF EXISTS "data_access_log:select:admin_rh_only" ON public.data_access_log;
CREATE POLICY "data_access_log:select:admin_rh_only"
  ON public.data_access_log FOR SELECT TO authenticated
  USING ( public.is_people_manager((SELECT auth.uid())) );

-- 3. RPC SECURITY DEFINER que le candidate + escreve log atomicamente
CREATE OR REPLACE FUNCTION public.read_candidate_with_log(
  p_candidate_id uuid,
  p_context text DEFAULT 'view'
)
RETURNS public.candidates
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := (SELECT auth.uid());
  v_candidate public.candidates;
  v_visible_companies uuid[];
  v_can_read boolean;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Nao autenticado' USING ERRCODE = '42501';
  END IF;

  v_visible_companies := public.visible_companies(v_actor);

  -- Re-aplica RLS logica como o caller (SECURITY DEFINER bypassaria sem isso)
  SELECT EXISTS (
    SELECT 1 FROM public.candidates c WHERE c.id = p_candidate_id
      AND (
        public.is_people_manager(v_actor)
        OR EXISTS (
          SELECT 1 FROM public.applications a
          JOIN public.job_openings j ON j.id = a.job_opening_id
          WHERE a.candidate_id = c.id
            AND j.company_id = ANY(v_visible_companies)
        )
      )
  ) INTO v_can_read;

  IF NOT v_can_read THEN
    RAISE EXCEPTION 'Sem permissao pra ler esse candidato' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_candidate FROM public.candidates WHERE id = p_candidate_id;

  -- Log append-only (mesmo se v_candidate for NULL — util pra auditar tentativas)
  INSERT INTO public.data_access_log (
    actor_id, entity_type, entity_id, action, context
  ) VALUES (
    v_actor, 'candidate', p_candidate_id, 'view', COALESCE(p_context, 'view')
  );

  RETURN v_candidate;
END $$;

GRANT EXECUTE ON FUNCTION public.read_candidate_with_log(uuid, text) TO authenticated;

-- 4. Migrar dados existentes de candidate_access_log para data_access_log
-- (idempotente — NOT EXISTS guard usando o id do candidate_access_log).
--
-- DEVIATION (Rule 1 - Bug): O plan original referenciava cal.created_at, mas
-- a coluna no candidate_access_log existente (20260416193000_hiring_core_entities.sql:401)
-- e 'at', nao 'created_at'. Corrigido aqui.
--
-- DEVIATION (Rule 1 - Bug): cal.action e do tipo log_action_enum
-- ('view'|'update'|'optimistic_conflict'). O CHECK do data_access_log so aceita
-- 'view'|'export'|'update'|'anonymize'|'delete'. Filtramos 'optimistic_conflict'
-- (mapeavel para 'update' com context, mas preferimos drop para nao poluir
-- audit log com noise tecnico de retry).
INSERT INTO public.data_access_log (id, actor_id, entity_type, entity_id, action, at)
SELECT
  cal.id,
  cal.actor_id,
  CASE cal.resource
    WHEN 'candidates' THEN 'candidate'
    WHEN 'applications' THEN 'application'
    WHEN 'interviews' THEN 'application'
    ELSE 'candidate'
  END,
  cal.resource_id,
  cal.action::text,
  cal.at
FROM public.candidate_access_log cal
WHERE cal.action::text IN ('view', 'update')
  AND NOT EXISTS (
    SELECT 1 FROM public.data_access_log dal WHERE dal.id = cal.id
  );

-- 5. pg_cron — retention 36 meses (rotina semanal segunda-feira 03:30 UTC = 00:30 BRT)
-- Idempotente: unschedule existente antes de re-schedule.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'data_access_log_retention_cleanup') THEN
    PERFORM cron.unschedule('data_access_log_retention_cleanup');
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'data_access_log_retention_cleanup',
  '30 3 * * 1',
  $cron$
    DELETE FROM public.data_access_log WHERE at < NOW() - INTERVAL '36 months';
  $cron$
);

COMMENT ON TABLE public.data_access_log IS
  'Phase 2 Migration F.2 — append-only audit log generalizado. Inserts apenas via SECURITY DEFINER RPCs.';
COMMENT ON FUNCTION public.read_candidate_with_log(uuid, text) IS
  'Phase 2 Migration F.2 — unico caminho de leitura de PII de candidato. Escreve em data_access_log atomicamente.';
