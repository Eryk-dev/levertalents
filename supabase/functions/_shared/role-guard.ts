import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export type AppRole = 'admin' | 'socio' | 'rh' | 'lider' | 'colaborador';

export type GuardSuccess = {
  ok: true;
  userId: string;
  role: AppRole;
};

export type GuardFailure = {
  ok: false;
  response: Response;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonError(status: number, error: string): Response {
  return new Response(
    JSON.stringify({ error }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * Valida o Authorization header do request, carrega o role do caller no
 * banco e exige que esteja em `allowed`. Retorna `{ ok: true, userId, role }`
 * ou `{ ok: false, response }` — nesse último caso devolva `response`
 * direto pro client.
 */
export async function requireRole(
  req: Request,
  allowed: readonly AppRole[]
): Promise<GuardSuccess | GuardFailure> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return { ok: false, response: jsonError(401, 'Missing Authorization header') };
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const jwt = authHeader.replace('Bearer ', '');
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(jwt);
  if (userError || !userData.user) {
    return { ok: false, response: jsonError(401, 'Invalid JWT') };
  }

  const { data: roleRow } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', userData.user.id)
    .maybeSingle();

  const role = roleRow?.role as AppRole | undefined;
  if (!role || !allowed.includes(role)) {
    return { ok: false, response: jsonError(403, 'Forbidden') };
  }

  return { ok: true, userId: userData.user.id, role };
}
