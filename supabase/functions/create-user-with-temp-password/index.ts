// Edge Function: create-user-with-temp-password (Phase 3)
// AUTH-01 / AUTH-02 / AUTH-03 + D-20/D-21/D-22 + Pattern 4 from RESEARCH.md
//
// Flow:
//   1. Verify caller (admin/rh) via JWT
//   2. Validate body (email, fullName, role, companyId, orgUnitId)
//   3. Generate 8-char temp password (Web Crypto)
//   4. auth.admin.createUser({ password, email_confirm: true })
//   5. UPDATE profiles SET must_change_password=true, temp_password_expires_at=NOW()+24h
//   6. INSERT org_unit_members (if orgUnitId provided)
//   7. Return plaintext password ONCE to RH caller (never log)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// D-21: 56-char alphabet excluding 0, O, o, 1, l, I
const ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateTempPassword(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < 8; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

interface CreateUserBody {
  fullName: string;
  email: string;
  role: 'admin' | 'rh' | 'socio' | 'lider' | 'liderado';
  companyId?: string;
  orgUnitId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // 1. Verify caller via JWT (NOT service role — must be authenticated user)
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

    // 2. Authorize: caller must be admin or rh
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

    // 3. Parse + validate body
    const body = (await req.json()) as Partial<CreateUserBody>;
    if (!body.email || !body.fullName || !body.role) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios: email, fullName, role' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const validRoles = ['admin', 'rh', 'socio', 'lider', 'liderado'];
    if (!validRoles.includes(body.role)) {
      return new Response(JSON.stringify({ error: 'Role inválida' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const email = body.email.toLowerCase().trim();
    const fullName = body.fullName.trim();

    // 4. Service-role client for admin ops
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // 5. Generate password + create user
    const tempPassword = generateTempPassword();
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName, role: body.role },
    });
    if (createError) {
      // D-20: Idempotency — detect duplicate email
      if (/already.*registered|exists/i.test(createError.message)) {
        return new Response(JSON.stringify({ error: 'duplicate_email' }), {
          status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      // NEVER log tempPassword (Pitfall §12)
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = userData.user!.id;

    // 6. UPDATE profiles with name + flags
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name: fullName,
        must_change_password: true,
        temp_password_expires_at: expiresAt,
      })
      .eq('id', userId);
    if (profileError) {
      // Best-effort cleanup: delete the auth user to avoid orphan
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({ error: 'Falha ao atualizar perfil: ' + profileError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 7. INSERT user_roles row (upsert — user_roles may have UNIQUE(user_id))
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .upsert({ user_id: userId, role: body.role }, { onConflict: 'user_id' });
    if (roleError) {
      // Non-fatal — user can still log in, role can be fixed via admin UI
      console.warn('user_roles insert non-fatal warning'); // intentionally NO PII
    }

    // 8. Bind to org_unit (Phase 1 model — replaces legacy team_members)
    if (body.orgUnitId) {
      const { error: memberError } = await supabaseAdmin
        .from('org_unit_members')
        .insert({ user_id: userId, org_unit_id: body.orgUnitId });
      if (memberError) {
        console.warn('org_unit_members insert non-fatal warning'); // NO PII
      }
    }

    // 9. Return plaintext password — caller copies to WhatsApp (D-20)
    // T-3-04: tempPassword NEVER appears in console.log
    return new Response(JSON.stringify({
      success: true,
      userId,
      tempPassword,
      expiresAt,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido';
    // NEVER log e directly (could contain PII via stack traces)
    console.error('create-user-with-temp-password error: [redacted]');
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
