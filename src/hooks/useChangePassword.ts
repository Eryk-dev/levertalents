import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * AUTH-03 / D-23 / Pitfall §9:
 *   1. Updates auth password via supabase.auth.updateUser
 *   2. Flips profiles.must_change_password = false + clears temp_password_expires_at
 *   3. Invalidates ['userProfile'] cache so ProtectedRoute re-reads the flag
 *
 * T-3-AUTH-05 mitigation: stale profile cache would cause infinite redirect on
 * /first-login-change-password; invalidate BEFORE resolving so the route re-checks.
 *
 * T-3-CHANGE-01 mitigation: retry profile UPDATE once on failure (non-atomic).
 */
export function useChangePassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { newPassword: string }): Promise<{ success: true }> => {
      // Step 1: resolve current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      // Step 2: update auth password
      const { error: pwdError } = await supabase.auth.updateUser({
        password: input.newPassword,
      });
      if (pwdError) throw pwdError;

      // Step 3: flip must_change_password flag in profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          must_change_password: false,
          temp_password_expires_at: null,
        })
        .eq('id', user.id);

      if (profileError) {
        // T-3-CHANGE-01: retry once — profile UPDATE is non-atomic with auth update
        const { error: retryError } = await supabase
          .from('profiles')
          .update({ must_change_password: false, temp_password_expires_at: null })
          .eq('id', user.id);
        if (retryError) throw retryError;
      }

      return { success: true };
    },
    onSuccess: async () => {
      // Pitfall §9: MUST invalidate profile cache so ProtectedRoute re-reads
      // must_change_password=false and stops redirecting to /first-login-change-password.
      await queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}
