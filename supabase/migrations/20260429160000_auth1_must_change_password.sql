-- =========================================================================
-- Migration AUTH.1: profiles.must_change_password + temp_password_expires_at (D-22)
--
-- Threats: T-3-04 (senha temp em log/Sentry) — covered by Phase 1 logger.ts/Sentry beforeSend
-- REQs: AUTH-01, AUTH-02, AUTH-03, D-22
-- Reversibility: ALTER TABLE DROP COLUMN (no data lost — flags are per-user booleans)
-- DEPENDENCIES: independent (no cross-migration deps; profiles table exists from Phase 1)
-- =========================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS must_change_password     BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS temp_password_expires_at TIMESTAMPTZ NULL;

-- Partial index: only index rows that need password change (most users are false)
CREATE INDEX IF NOT EXISTS idx_profiles_must_change_password
  ON public.profiles(must_change_password)
  WHERE must_change_password = true;

COMMENT ON COLUMN public.profiles.must_change_password
  IS 'D-22: set true on Edge Function user creation; ProtectedRoute redirects to /first-login-change-password when true';
COMMENT ON COLUMN public.profiles.temp_password_expires_at
  IS 'D-22: set to NOW() + 24h on user creation; D-24: expired still allows login (owner tradeoff) but forces immediate change';

-- Verify Phase 1 policies still permit must_change_password update by self:
-- If no UPDATE policy exists on profiles, the change-password flow will fail.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'profiles'
       AND cmd = 'UPDATE'
  ) THEN
    RAISE NOTICE 'AUTH.1 WARNING: profiles has no UPDATE policy — useChangePassword RPC may fail for self-service updates';
  END IF;
END $$;
