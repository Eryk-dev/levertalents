-- Backfill public.profiles for auth.users que foram criados sem disparar o trigger
-- handle_new_user (ex.: usuários inseridos diretamente via SQL ou criados antes do
-- trigger existir). Sem isso, inserts que referenciam profiles.id (ex.:
-- job_openings.requested_by) falham com FK violation.

INSERT INTO public.profiles (id, full_name, avatar_url)
SELECT
  u.id,
  COALESCE(
    NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(u.raw_user_meta_data->>'name'), ''),
    SPLIT_PART(u.email, '@', 1)
  ) AS full_name,
  u.raw_user_meta_data->>'avatar_url'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;
