-- Fix: tg_enforce_application_stage_transition no banco remoto ainda tem a
-- versão antiga que bloqueia qualquer saída de 'recusado' e
-- 'reprovado_pelo_gestor'. O arquivo local 20260417150000 relaxa isso, mas
-- a consolidação lever_18 cobriu só job_openings.
--
-- Sintoma: depois de descartar um candidato, drag-and-drop de volta falha
-- silenciosamente (trigger lança EXCEPTION).

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
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.tg_enforce_application_stage_transition IS
  'Permissivo: qualquer transição de stage é permitida. Ao sair de terminal, zera closed_at.';
