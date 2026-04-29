import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CreateUserResult {
  userId: string;
  tempPassword: string;
  expiresAt: string;
}

export interface CreateUserInput {
  fullName: string;
  username: string;
  role: 'admin' | 'rh' | 'socio' | 'lider' | 'liderado';
  companyId?: string;
  orgUnitId?: string;
}

/**
 * AUTH-01/D-20/D-21: Creates a user via Edge Function which:
 *   - generates a readable 8-char temp password (no 0/O/1/l/I ambiguous chars)
 *   - calls auth.admin.createUser with must_change_password=true flag
 *   - sets profiles.must_change_password + temp_password_expires_at
 * Returns { userId, tempPassword, expiresAt } for display in WhatsApp message copy UI.
 *
 * Throws 'duplicate_username' error string on 409 conflict.
 */
export function useCreateUserWithTempPassword() {
  return useMutation({
    mutationFn: async (input: CreateUserInput): Promise<CreateUserResult> => {
      const { data, error } = await supabase.functions.invoke(
        'create-user-with-temp-password',
        { body: input },
      );
      if (error) {
        // Detect duplicate username (409) from Edge Function error or response body
        const errMsg = error.message ?? '';
        const bodyErr = (data as { error?: string } | null)?.error ?? '';
        if (
          errMsg.includes('409') ||
          bodyErr === 'duplicate_username' ||
          errMsg.toLowerCase().includes('duplicate') ||
          errMsg.toLowerCase().includes('already exists')
        ) {
          throw new Error('duplicate_username');
        }
        throw error;
      }
      const result = data as {
        success: boolean;
        userId: string;
        tempPassword: string;
        expiresAt: string;
      };
      if (!result.success) throw new Error('Falha ao criar usuário');
      return {
        userId: result.userId,
        tempPassword: result.tempPassword,
        expiresAt: result.expiresAt,
      };
    },
  });
}
