import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ResetPasswordResult {
  userId: string;
  fullName: string;
  username: string;
  tempPassword: string;
  expiresAt: string;
}

/**
 * Redefine a senha de outro usuário via Edge Function reset-user-password.
 * Apenas admin/rh. Gera nova senha temporária (8 chars D-21), seta
 * must_change_password=true + temp_password_expires_at=NOW()+24h, e devolve
 * a senha em texto UMA vez — caller exibe na UI e copia pra WhatsApp.
 */
export function useResetUserPassword() {
  return useMutation({
    mutationFn: async (input: { userId: string }): Promise<ResetPasswordResult> => {
      const { data, error } = await supabase.functions.invoke('reset-user-password', {
        body: input,
      });

      // Edge Function non-2xx: extrai mensagem do body via error.context
      if (error) {
        let serverMessage: string | undefined;
        const ctx = (error as { context?: Response }).context;
        if (ctx && typeof ctx.json === 'function') {
          try {
            const body = await ctx.clone().json();
            serverMessage = body?.error || body?.message;
          } catch {
            /* body não-JSON: cai no error.message */
          }
        }
        throw new Error(serverMessage || error.message || 'Erro ao redefinir senha');
      }

      const result = data as {
        success: boolean;
        userId: string;
        fullName: string;
        username: string;
        tempPassword: string;
        expiresAt: string;
        error?: string;
      };
      if (!result?.success) throw new Error(result?.error || 'Falha ao redefinir senha');

      return {
        userId: result.userId,
        fullName: result.fullName,
        username: result.username,
        tempPassword: result.tempPassword,
        expiresAt: result.expiresAt,
      };
    },
  });
}
