-- =========================================================================
-- Migration F.1: Normalize legacy application stages
--
-- Motivação: STAGE_GROUPS.ts (src/lib/hiring/stageGroups.ts) mapeia 16 stages
-- atuais em 6 grupos visuais consolidados, mas 3 stages legados
-- ('aguardando_fit_cultural', 'sem_retorno', 'fit_recebido') ainda são valores
-- válidos no enum application_stage_enum e existem candidatos parados nesses
-- valores. Eles geram bug do kanban (canTransition() falha pois
-- APPLICATION_STAGE_TRANSITIONS não tem entrada explícita para alguns desses
-- legados).
--
-- Pattern: expand-backfill (UPDATE direto em batch, FOR UPDATE SKIP LOCKED)
-- + trigger anti-regressão. Contract (drop dos enum values) fica para Phase 4
-- / Migration G.
--
-- Mapping per CONTEXT.md D-mapping (linha 76):
--   'aguardando_fit_cultural' -> 'fit_cultural'  (NOTA: enum atual NÃO tem
--      'fit_cultural' como valor — o CONTEXT decision é alinhar à coluna
--      "Triagem" do kanban; STAGE_GROUPS.ts coloca todos esses legados em
--      'triagem'. Como o enum não tem 'fit_cultural', mapeamos para
--      'em_interesse' (o defaultStage da Triagem) — alinhado com decisão
--      operacional do owner, preservando 'legacy_marker' em metadata).
--   'sem_retorno'             -> 'em_interesse' (com legacy_marker='sem_retorno')
--   'fit_recebido'            -> 'em_interesse'
--
-- DEVIATION (Rule 1 - Bug discovered durante execução):
-- O enum public.application_stage_enum (definido em 20260416193000_hiring_core_entities.sql:37-55)
-- NÃO contém os valores 'fit_cultural' nem 'triagem'. Tentar usar
-- 'fit_cultural'::public.application_stage_enum quebraria a migration.
-- Solução: mapear para 'em_interesse' (defaultStage da Triagem em
-- STAGE_GROUPS.ts), que é o valor canônico atual para a coluna "Triagem".
-- Preservamos legacy_marker em metadata para rastreabilidade forense.
--
-- Threats: bloqueio prolongado da tabela applications durante UPDATE em massa.
-- Mitigação: batch de 1000 + pg_sleep(0.05) entre batches.
-- REQs: RS-05, RS-06
-- =========================================================================

-- 1. Garantir que applications.metadata exista (jsonb append-only).
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2. Backfill batch — 3 UPDATEs distintos por legacy stage.
-- Cada UPDATE em batches de 1000 com FOR UPDATE SKIP LOCKED para evitar contention.

-- 2a. aguardando_fit_cultural -> em_interesse (Triagem default per STAGE_GROUPS.ts)
DO $$
DECLARE
  v_batch_size INT := 1000;
  v_affected INT;
BEGIN
  LOOP
    WITH legacy_apps AS (
      SELECT id
      FROM public.applications
      WHERE stage = 'aguardando_fit_cultural'
      LIMIT v_batch_size
      FOR UPDATE SKIP LOCKED
    )
    UPDATE public.applications a
       SET metadata = a.metadata || jsonb_build_object(
                        'legacy_marker', a.stage::text,
                        'normalized_at', NOW()
                      ),
           stage = 'em_interesse'::public.application_stage_enum
      FROM legacy_apps
     WHERE a.id = legacy_apps.id;

    GET DIAGNOSTICS v_affected = ROW_COUNT;
    EXIT WHEN v_affected = 0;
    PERFORM pg_sleep(0.05);
  END LOOP;
END $$;

-- 2b. sem_retorno -> em_interesse (preserva legacy_marker 'sem_retorno' para rastreabilidade forense)
DO $$
DECLARE
  v_batch_size INT := 1000;
  v_affected INT;
BEGIN
  LOOP
    WITH legacy_apps AS (
      SELECT id
      FROM public.applications
      WHERE stage = 'sem_retorno'
      LIMIT v_batch_size
      FOR UPDATE SKIP LOCKED
    )
    UPDATE public.applications a
       SET metadata = jsonb_set(
                        coalesce(a.metadata, '{}'::jsonb),
                        '{legacy_marker}',
                        '"sem_retorno"'::jsonb
                      ) || jsonb_build_object('normalized_at', NOW()),
           stage = 'em_interesse'::public.application_stage_enum
      FROM legacy_apps
     WHERE a.id = legacy_apps.id;

    GET DIAGNOSTICS v_affected = ROW_COUNT;
    EXIT WHEN v_affected = 0;
    PERFORM pg_sleep(0.05);
  END LOOP;
END $$;

-- 2c. fit_recebido -> em_interesse
DO $$
DECLARE
  v_batch_size INT := 1000;
  v_affected INT;
BEGIN
  LOOP
    WITH legacy_apps AS (
      SELECT id
      FROM public.applications
      WHERE stage = 'fit_recebido'
      LIMIT v_batch_size
      FOR UPDATE SKIP LOCKED
    )
    UPDATE public.applications a
       SET metadata = a.metadata || jsonb_build_object(
                        'legacy_marker', a.stage::text,
                        'normalized_at', NOW()
                      ),
           stage = 'em_interesse'::public.application_stage_enum
      FROM legacy_apps
     WHERE a.id = legacy_apps.id;

    GET DIAGNOSTICS v_affected = ROW_COUNT;
    EXIT WHEN v_affected = 0;
    PERFORM pg_sleep(0.05);
  END LOOP;
END $$;

-- 3. Trigger anti-regressão: bloqueia INSERT/UPDATE com stage legado.
CREATE OR REPLACE FUNCTION public.tg_block_legacy_stages()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.stage IN ('aguardando_fit_cultural', 'sem_retorno', 'fit_recebido') THEN
    RAISE EXCEPTION 'Stage legado % nao e permitido apos Migration F.1. Use em_interesse (Triagem).', NEW.stage
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tg_applications_block_legacy_stages ON public.applications;
CREATE TRIGGER tg_applications_block_legacy_stages
  BEFORE INSERT OR UPDATE OF stage ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.tg_block_legacy_stages();

COMMENT ON FUNCTION public.tg_block_legacy_stages() IS
  'Phase 2 Migration F.1 — bloqueia regressao para stages legados pos-normalizacao.';
COMMENT ON COLUMN public.applications.metadata IS
  'Phase 2 Migration F.1 — jsonb append-only para forensic markers (legacy_marker, normalized_at, etc).';
