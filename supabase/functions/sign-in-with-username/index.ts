import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normalizeUsername(input: unknown): string {
  return String(input ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '');
}

async function findAuthEmailByUserId(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
): Promise<string | null> {
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const match = data.users.find((user) => user.id === userId);
    if (match) return match.email ?? null;
    if (data.users.length < perPage) return null;

    page += 1;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  try {
    const body = await req.json().catch(() => ({}));
    const username = normalizeUsername(body.username);
    const password = String(body.password ?? '');

    if (!/^[a-z0-9][a-z0-9._-]{2,39}$/.test(username) || password.length < 1) {
      return json(400, { error: 'Credenciais inválidas' });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) return json(400, { error: 'Credenciais inválidas' });

    const email = await findAuthEmailByUserId(supabaseAdmin, profile.id);
    if (!email) return json(400, { error: 'Credenciais inválidas' });

    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) return json(400, { error: 'Credenciais inválidas' });

    return json(200, { session: data.session });
  } catch (_error) {
    console.error('sign-in-with-username error: [redacted]');
    return json(500, { error: 'Erro ao autenticar' });
  }
});
