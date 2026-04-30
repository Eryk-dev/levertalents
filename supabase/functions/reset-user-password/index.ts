// Edge Function: reset-user-password
// Permite que admin/rh redefinam a senha de OUTRO usuário, gerando uma nova
// senha temporária (mesmo formato D-21) e marcando must_change_password=true
// + temp_password_expires_at = NOW()+24h. Retorna a senha em texto UMA vez
// para que o RH copie a mensagem do WhatsApp (D-20). NUNCA loga a senha.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// D-21: alfabeto de 56 chars sem 0/O/o/1/l/I
const ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateTempPassword(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < 8; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // 1. Autenticação do chamador via JWT
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user: caller } } = await supabaseUser.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Autorização: admin ou rh
    const { data: roles } = await supabaseUser
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id);
    const callerRoles = (roles ?? []).map((r: { role: string }) => r.role);
    if (!callerRoles.includes('admin') && !callerRoles.includes('rh')) {
      return new Response(JSON.stringify({ error: 'Sem permissão (apenas admin/rh)' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Body
    const body = (await req.json()) as { userId?: string };
    const targetId = body?.userId;
    if (!targetId || typeof targetId !== 'string') {
      return new Response(JSON.stringify({ error: 'userId é obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (targetId === caller.id) {
      return new Response(JSON.stringify({
        error: 'Você não pode redefinir a própria senha por aqui — use a opção "Trocar senha".',
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Cliente service-role para ops admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // 5. Buscar perfil do alvo (precisamos de full_name + username pra mensagem WhatsApp)
    const { data: targetProfile, error: targetProfileError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, username')
      .eq('id', targetId)
      .maybeSingle();
    if (targetProfileError) throw targetProfileError;
    if (!targetProfile) {
      return new Response(JSON.stringify({ error: 'Usuário não encontrado' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 6. Gerar senha temporária + atualizar auth
    const tempPassword = generateTempPassword();
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

    const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(targetId, {
      password: tempPassword,
    });
    if (updateAuthError) {
      // Pitfall §12: NUNCA logar a senha
      return new Response(JSON.stringify({ error: updateAuthError.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 7. Marcar profiles.must_change_password=true + expiração
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        must_change_password: true,
        temp_password_expires_at: expiresAt,
      })
      .eq('id', targetId);
    if (profileError) {
      return new Response(JSON.stringify({
        error: 'Falha ao atualizar perfil: ' + profileError.message,
      }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 8. Retornar senha em texto — caller copia pra WhatsApp
    return new Response(JSON.stringify({
      success: true,
      userId: targetId,
      fullName: targetProfile.full_name ?? '',
      username: targetProfile.username ?? '',
      tempPassword,
      expiresAt,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido';
    console.error('reset-user-password error: [redacted]');
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
