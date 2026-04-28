-- =========================================================================
-- Migration F.3: candidate_consents granular (LGPD)
--
-- Motivacao: TAL-03/04/08 exigem consent granular por finalidade
-- (purpose) com base legal explicita. Tabela append-friendly: revoke e
-- UPDATE setando revoked_at; re-grant cria nova row. EXCLUDE constraint
-- garante 1 ATIVO por (candidate, purpose). View active_candidate_consents
-- materializa "nao revogado E nao expirado".
--
-- Pattern: DDL + RLS + view. Edge function apply-to-job (Plan 07) usa
-- service-role para INSERT inicial; RH usa policy para revoke (UPDATE
-- com WITH CHECK).
-- Threats:
--   T-02-03-01 (consent tampering) — RLS WITH CHECK so is_people_manager UPDATE
--   T-02-03-02 (2 consents ativos para mesma finalidade — LGPD ambiguous) —
--     EXCLUDE constraint (candidate_id WITH =, purpose WITH =) WHERE revoked_at IS NULL
-- REQs: TAL-03, TAL-04, TAL-08
-- =========================================================================

-- 1. Enums (idempotente via DO + EXCEPTION)
DO $$ BEGIN
  CREATE TYPE public.consent_purpose_enum AS ENUM (
    'aplicar_a_esta_vaga',
    'incluir_no_banco_de_talentos_global',
    'compartilhar_com_cliente_externo',
    'manter_cv_pos_recusa',
    'considerar_outras_vagas_lever',
    'considerar_vagas_grupo_lever'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.consent_legal_basis_enum AS ENUM (
    'consent',                -- LGPD Art. 7 I
    'legitimate_interest',    -- LGPD Art. 7 IX
    'contract',               -- LGPD Art. 7 V
    'legal_obligation'        -- LGPD Art. 7 II
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Tabela
-- Habilitar btree_gist para EXCLUDE constraint com WITH = (uses btree_gist for equality)
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS public.candidate_consents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id  uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  purpose       public.consent_purpose_enum NOT NULL,
  legal_basis   public.consent_legal_basis_enum NOT NULL DEFAULT 'consent',
  granted_at    timestamptz NOT NULL DEFAULT NOW(),
  granted_by    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  expires_at    timestamptz,
  revoked_at    timestamptz,
  revoked_by    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  document_url  text,
  created_at    timestamptz NOT NULL DEFAULT NOW(),
  updated_at    timestamptz NOT NULL DEFAULT NOW(),

  CONSTRAINT consents_revoked_after_granted
    CHECK (revoked_at IS NULL OR revoked_at >= granted_at),
  CONSTRAINT consents_expires_after_granted
    CHECK (expires_at IS NULL OR expires_at >= granted_at),
  EXCLUDE USING gist (candidate_id WITH =, purpose WITH =) WHERE (revoked_at IS NULL)
);

CREATE INDEX IF NOT EXISTS idx_candidate_consents_candidate ON public.candidate_consents (candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_consents_purpose   ON public.candidate_consents (purpose);

ALTER TABLE public.candidate_consents ENABLE ROW LEVEL SECURITY;

-- 3. Trigger updated_at (reusa public.tg_set_updated_at — Phase 0 helper)
DROP TRIGGER IF EXISTS tg_candidate_consents_updated_at ON public.candidate_consents;
CREATE TRIGGER tg_candidate_consents_updated_at
  BEFORE UPDATE ON public.candidate_consents
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 4. View active (revoked_at IS NULL E (expires_at IS NULL OR expires_at > NOW()))
CREATE OR REPLACE VIEW public.active_candidate_consents AS
SELECT *
  FROM public.candidate_consents
 WHERE revoked_at IS NULL
   AND (expires_at IS NULL OR expires_at > NOW());

-- 5. RLS policies (3 policies)
DROP POLICY IF EXISTS "candidate_consents:select:rh_admin" ON public.candidate_consents;
CREATE POLICY "candidate_consents:select:rh_admin"
  ON public.candidate_consents FOR SELECT TO authenticated
  USING (
    public.is_people_manager((SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.job_openings j ON j.id = a.job_opening_id
      WHERE a.candidate_id = candidate_consents.candidate_id
        AND j.company_id = ANY(public.visible_companies((SELECT auth.uid())))
    )
  );

DROP POLICY IF EXISTS "candidate_consents:insert:rh_admin" ON public.candidate_consents;
CREATE POLICY "candidate_consents:insert:rh_admin"
  ON public.candidate_consents FOR INSERT TO authenticated
  WITH CHECK ( public.is_people_manager((SELECT auth.uid())) );

DROP POLICY IF EXISTS "candidate_consents:update:rh_admin_revoke_only" ON public.candidate_consents;
CREATE POLICY "candidate_consents:update:rh_admin_revoke_only"
  ON public.candidate_consents FOR UPDATE TO authenticated
  USING ( public.is_people_manager((SELECT auth.uid())) )
  WITH CHECK ( public.is_people_manager((SELECT auth.uid())) );

COMMENT ON TABLE public.candidate_consents IS
  'Phase 2 Migration F.3 — consent granular LGPD por purpose + legal_basis. Revoke = UPDATE revoked_at; re-grant = nova row.';
COMMENT ON VIEW public.active_candidate_consents IS
  'Consents validos: revoked_at IS NULL E (expires_at IS NULL OR > NOW()).';
