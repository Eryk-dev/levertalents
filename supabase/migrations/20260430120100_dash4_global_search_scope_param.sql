-- =========================================================================
-- Migration DASH.4: extend global_search with optional scope filter
--
-- Threats: T-04-02-02 (Cmd+K scope leakage — candidatos de empresas fora do escopo)
--          mitigado por p_company_ids pre-filter ANTES de RLS, garantindo
--          consistência entre o scope selecionado no header e os resultados.
-- REQs: DASH-04
-- Reversibility: DROP + CREATE com signature antiga (3-arg → 2-arg revert).
--
-- P4-V03 column-name pre-flight (verified 2026-04-28 against migration
-- 20260427120100_b2_org_units_and_helpers.sql + 20260429120100_e2_teams_to_org_units_backfill.sql):
--   public.org_units(id, company_id) — confirmed
--   public.org_unit_members(org_unit_id, user_id) — confirmed
-- If a future migration renames these columns, this RPC must be updated alongside.
--
-- Note on PDI removal: Cmd+K refactor (Plan 04-05) drops the "pdi" RemoteKind
-- from the UI per D-06. Migration leaves the PDI block out — global_search
-- post-Plan 04-02 returns only candidate/job/person.
-- =========================================================================

DROP FUNCTION IF EXISTS public.global_search(text, int);

CREATE OR REPLACE FUNCTION public.global_search(
  q text,
  max_per_kind int DEFAULT 5,
  p_company_ids uuid[] DEFAULT NULL  -- NULL = no scope filter (back-compat); array = restrict to those companies
)
RETURNS TABLE (
  kind     text,
  id       uuid,
  title    text,
  subtitle text,
  url      text
)
LANGUAGE plpgsql
SECURITY INVOKER  -- RLS still applies; this is just a pre-filter for performance + scope consistency
STABLE
SET search_path = public
AS $$
DECLARE
  needle text := '%' || trim(q) || '%';
  has_scope boolean := p_company_ids IS NOT NULL AND array_length(p_company_ids, 1) > 0;
BEGIN
  IF q IS NULL OR length(trim(q)) < 2 THEN
    RETURN;
  END IF;

  -- Candidatos (excluindo anonimizados). Scope: an aplicação do candidato em uma vaga das company_ids
  -- (candidatos não têm company_id direto; vínculo é via applications.job → job.company_id).
  RETURN QUERY
  SELECT
    'candidate'::text,
    c.id,
    c.full_name,
    NULLIF(c.email::text, ''),
    '/hiring/candidates/' || c.id::text
  FROM public.candidates c
  WHERE c.anonymized_at IS NULL
    AND (
      c.full_name ILIKE needle
      OR c.email::text ILIKE needle
      OR COALESCE(c.phone, '') ILIKE needle
    )
    AND (
      NOT has_scope
      OR EXISTS (
        SELECT 1
          FROM public.applications a
          JOIN public.job_openings j ON j.id = a.job_opening_id
         WHERE a.candidate_id = c.id
           AND j.company_id = ANY(p_company_ids)
      )
    )
  ORDER BY c.updated_at DESC
  LIMIT max_per_kind;

  -- Vagas (filtradas direto por company_id quando há scope).
  RETURN QUERY
  SELECT
    'job'::text,
    j.id,
    j.title,
    NULLIF(
      CONCAT_WS(
        ' · ',
        NULLIF(j.sector, ''),
        j.status::text
      ),
      ''
    ),
    '/hiring/jobs/' || j.id::text
  FROM public.job_openings j
  WHERE
    (
      j.title ILIKE needle
      OR COALESCE(j.summary, '') ILIKE needle
      OR COALESCE(j.sector, '') ILIKE needle
    )
    AND (NOT has_scope OR j.company_id = ANY(p_company_ids))
  ORDER BY j.updated_at DESC
  LIMIT max_per_kind;

  -- Pessoas (colaboradores) — filtra por org_unit_members vinculados a uma org_unit das company_ids quando há scope.
  -- Column names verified per P4-V03 pre-flight at the top of this migration:
  --   org_units(id, company_id) — public.org_unit_members(org_unit_id, user_id)
  RETURN QUERY
  SELECT
    'person'::text,
    pr.id,
    pr.full_name,
    NULL::text,
    '/colaborador/' || pr.id::text
  FROM public.profiles pr
  WHERE pr.full_name ILIKE needle
    AND (
      NOT has_scope
      OR EXISTS (
        SELECT 1
          FROM public.org_unit_members oum
          JOIN public.org_units ou ON ou.id = oum.org_unit_id
         WHERE oum.user_id = pr.id
           AND ou.company_id = ANY(p_company_ids)
      )
    )
  ORDER BY pr.full_name
  LIMIT max_per_kind;
END;
$$;

GRANT EXECUTE ON FUNCTION public.global_search(text, int, uuid[]) TO authenticated;

COMMENT ON FUNCTION public.global_search(text, int, uuid[]) IS
  'DASH-04: Cmd+K palette search. Optional p_company_ids pre-filters candidatos (via applications JOIN), vagas (direct company_id), pessoas (org_unit_members JOIN). Runs as invoker — RLS still applies as defense-in-depth.';
