-- Global search RPC used by the ⌘K command palette.
-- SECURITY INVOKER so existing RLS rules decide what each caller can see.

CREATE OR REPLACE FUNCTION public.global_search(q text, max_per_kind int DEFAULT 5)
RETURNS TABLE (
  kind     text,
  id       uuid,
  title    text,
  subtitle text,
  url      text
)
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
SET search_path = public
AS $$
DECLARE
  needle text := '%' || trim(q) || '%';
BEGIN
  IF q IS NULL OR length(trim(q)) < 2 THEN
    RETURN;
  END IF;

  -- Candidatos (excluindo anonimizados)
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
  ORDER BY c.updated_at DESC
  LIMIT max_per_kind;

  -- Vagas
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
    j.title ILIKE needle
    OR COALESCE(j.summary, '') ILIKE needle
    OR COALESCE(j.sector, '') ILIKE needle
  ORDER BY j.updated_at DESC
  LIMIT max_per_kind;

  -- PDIs (development plans)
  RETURN QUERY
  SELECT
    'pdi'::text,
    p.id,
    p.title,
    NULLIF(p.development_area, ''),
    '/pdi'
  FROM public.development_plans p
  WHERE
    p.title ILIKE needle
    OR COALESCE(p.description, '') ILIKE needle
    OR COALESCE(p.development_area, '') ILIKE needle
    OR COALESCE(p.goals, '') ILIKE needle
  ORDER BY p.updated_at DESC
  LIMIT max_per_kind;

  -- Pessoas (colaboradores)
  RETURN QUERY
  SELECT
    'person'::text,
    pr.id,
    pr.full_name,
    NULL::text,
    '/colaborador/' || pr.id::text
  FROM public.profiles pr
  WHERE pr.full_name ILIKE needle
  ORDER BY pr.full_name
  LIMIT max_per_kind;
END;
$$;

GRANT EXECUTE ON FUNCTION public.global_search(text, int) TO authenticated;
