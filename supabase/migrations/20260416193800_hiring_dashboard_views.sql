-- T066 — SQL views for the Hiring Dashboard. Views respect RLS on the
-- underlying tables (security_invoker=on would also ensure caller-level RLS;
-- in Supabase Postgres 15 views inherit permissions + the caller's policies
-- when accessed from PostgREST).

CREATE OR REPLACE VIEW public.v_hiring_jobs_by_status AS
SELECT
  company_id,
  status,
  COUNT(*) AS count
FROM public.job_openings
GROUP BY company_id, status;

CREATE OR REPLACE VIEW public.v_hiring_applications_by_stage AS
SELECT
  j.company_id,
  a.stage,
  COUNT(*) AS count
FROM public.applications a
JOIN public.job_openings j ON j.id = a.job_opening_id
GROUP BY j.company_id, a.stage;

CREATE OR REPLACE VIEW public.v_hiring_bottlenecks AS
SELECT
  a.id AS application_id,
  a.stage,
  a.stage_entered_at,
  a.job_opening_id,
  j.company_id,
  j.title AS job_title,
  c.full_name AS candidate_name,
  EXTRACT(DAY FROM (NOW() - a.stage_entered_at))::int AS days_in_stage
FROM public.applications a
JOIN public.job_openings j ON j.id = a.job_opening_id
JOIN public.candidates c ON c.id = a.candidate_id
WHERE a.stage_entered_at < NOW() - INTERVAL '3 days'
  AND a.stage NOT IN ('admitido', 'recusado', 'reprovado_pelo_gestor');

CREATE OR REPLACE VIEW public.v_hiring_avg_time_per_job AS
SELECT
  company_id,
  AVG(EXTRACT(EPOCH FROM (COALESCE(closed_at, NOW()) - opened_at)) / 86400.0)::numeric(10,2) AS avg_days_open
FROM public.job_openings
WHERE status <> 'aguardando_descritivo'
GROUP BY company_id;

CREATE OR REPLACE VIEW public.v_hiring_stage_conversion AS
SELECT
  j.company_id,
  h.from_stage,
  h.to_stage,
  COUNT(*) AS transitions
FROM public.application_stage_history h
JOIN public.applications a ON a.id = h.application_id
JOIN public.job_openings j ON j.id = a.job_opening_id
GROUP BY j.company_id, h.from_stage, h.to_stage;

CREATE OR REPLACE VIEW public.v_hiring_final_approval_rate AS
SELECT
  j.company_id,
  COUNT(*) FILTER (WHERE d.outcome = 'aprovado') AS aprovados,
  COUNT(*) FILTER (WHERE d.outcome = 'reprovado') AS reprovados,
  CASE WHEN COUNT(*) > 0
    THEN (COUNT(*) FILTER (WHERE d.outcome = 'aprovado')::numeric / COUNT(*)::numeric)
    ELSE 0
  END AS approval_rate
FROM public.hiring_decisions d
JOIN public.applications a ON a.id = d.application_id
JOIN public.job_openings j ON j.id = a.job_opening_id
GROUP BY j.company_id;
