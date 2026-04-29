-- AUTH.2: login por nome de usuário, sem exigir email na experiência do usuário.

CREATE OR REPLACE FUNCTION public.normalize_username(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT NULLIF(regexp_replace(lower(trim(COALESCE(input, ''))), '[^a-z0-9._-]+', '', 'g'), '');
$$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text;

WITH raw_candidates AS (
  SELECT
    p.id,
    COALESCE(
      public.normalize_username(au.raw_user_meta_data->>'username'),
      public.normalize_username(split_part(au.email, '@', 1))
    ) AS raw_username,
    'user-' || LEFT(p.id::text, 8) AS fallback_username
  FROM public.profiles p
  LEFT JOIN auth.users au ON au.id = p.id
),
candidates AS (
  SELECT
    id,
    LEFT(
      CASE
        WHEN raw_username ~ '^[a-z0-9][a-z0-9._-]*$' AND LENGTH(raw_username) >= 3 THEN raw_username
        ELSE fallback_username
      END,
      32
    ) AS base_username
  FROM raw_candidates
),
deduped AS (
  SELECT
    id,
    base_username,
    ROW_NUMBER() OVER (PARTITION BY base_username ORDER BY id) AS rn
  FROM candidates
),
final_usernames AS (
  SELECT
    id,
    CASE
      WHEN rn = 1 THEN base_username
      ELSE LEFT(base_username, 40 - LENGTH(rn::text) - 1) || '-' || rn::text
    END AS username
  FROM deduped
)
UPDATE public.profiles p
SET username = d.username
FROM final_usernames d
WHERE p.id = d.id
  AND p.username IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN username SET NOT NULL;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_username_format;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_format
  CHECK (
    username = public.normalize_username(username)
    AND username ~ '^[a-z0-9][a-z0-9._-]{2,39}$'
  );

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_key
  ON public.profiles (username);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  desired_role public.app_role;
  raw_username text;
  base_username text;
  desired_username text;
  suffix int := 1;
BEGIN
  raw_username := COALESCE(
    public.normalize_username(NEW.raw_user_meta_data->>'username'),
    public.normalize_username(split_part(NEW.email, '@', 1))
  );
  base_username := CASE
    WHEN raw_username ~ '^[a-z0-9][a-z0-9._-]*$' AND LENGTH(raw_username) >= 3 THEN raw_username
    ELSE 'user-' || LEFT(NEW.id::text, 8)
  END;
  desired_username := LEFT(base_username, 40);

  WHILE EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE username = desired_username
      AND id <> NEW.id
  ) LOOP
    suffix := suffix + 1;
    desired_username := LEFT(base_username, 40 - LENGTH(suffix::text) - 1) || '-' || suffix::text;
  END LOOP;

  INSERT INTO public.profiles (id, full_name, avatar_url, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    desired_username
  )
  ON CONFLICT (id) DO UPDATE
  SET username = COALESCE(public.profiles.username, EXCLUDED.username);

  BEGIN
    desired_role := COALESCE(
      (NEW.raw_user_meta_data->>'role')::public.app_role,
      'colaborador'::public.app_role
    );
  EXCEPTION WHEN invalid_text_representation THEN
    desired_role := 'colaborador'::public.app_role;
  END;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, desired_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

COMMENT ON COLUMN public.profiles.username
  IS 'AUTH.2: identificador público usado para login; email real/tecnico fica interno ao Supabase Auth.';
