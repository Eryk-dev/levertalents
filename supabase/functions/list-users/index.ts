import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ALLOWED_ROLES = new Set(['admin', 'socio', 'rh'])
const ROLE_PRIORITY = ['admin', 'socio', 'rh', 'lider', 'colaborador'] as const

function pickHighestRole(roles: string[]): string | null {
  for (const role of ROLE_PRIORITY) {
    if (roles.includes(role)) return role
  }
  return roles[0] ?? null
}

async function logDebug(
  admin: ReturnType<typeof createClient>,
  step: string,
  err: unknown,
  callerUserId: string | null,
  extra: Record<string, unknown> = {}
) {
  try {
    const name = err instanceof Error ? err.name : null
    const message = err instanceof Error ? err.message : String(err)
    await admin.from('debug_list_users_log').insert({
      step,
      error_name: name,
      error_message: message,
      caller_user_id: callerUserId,
      extra,
    })
  } catch {
    // best effort
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let step = 'init'
  let callerUserId: string | null = null

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      await logDebug(admin, 'missing_auth_header', new Error('no Authorization header'), null)
      return new Response(JSON.stringify({ error: 'Missing Authorization header', step: 'missing_auth_header' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    step = 'read_env'
    if (!supabaseUrl || !serviceRoleKey) {
      await logDebug(admin, step, new Error(`url=${!!supabaseUrl} key=${!!serviceRoleKey}`), null)
      return new Response(JSON.stringify({ error: 'Missing env', step }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    step = 'get_user_from_jwt'
    const jwt = authHeader.replace('Bearer ', '')
    const { data: userData, error: userError } = await admin.auth.getUser(jwt)
    if (userError || !userData?.user) {
      await logDebug(admin, step, userError ?? new Error('no user in JWT'), null)
      return new Response(JSON.stringify({ error: 'Invalid JWT', step, detail: userError?.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }
    callerUserId = userData.user.id

    step = 'load_caller_roles'
    const { data: callerRoles, error: callerRolesError } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', callerUserId)
    if (callerRolesError) {
      await logDebug(admin, step, callerRolesError, callerUserId)
      return new Response(JSON.stringify({ error: callerRolesError.message, step }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    step = 'check_allowed'
    const callerRoleSet = new Set((callerRoles ?? []).map((r: any) => r.role))
    const callerAllowed = [...callerRoleSet].some((r) => ALLOWED_ROLES.has(r as string))
    if (!callerAllowed) {
      await logDebug(admin, step, new Error('forbidden'), callerUserId, { roles: [...callerRoleSet] })
      return new Response(JSON.stringify({ error: 'Forbidden', step, roles: [...callerRoleSet] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    step = 'list_auth_users'
    const { data: authList, error: listError } = await admin.auth.admin.listUsers()
    if (listError) {
      await logDebug(admin, step, listError, callerUserId)
      return new Response(JSON.stringify({ error: listError.message, step }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    const authUsers = authList.users
    const ids = authUsers.map((u) => u.id)

    step = 'load_profiles_and_roles'
    const [profilesRes, rolesRes] = await Promise.all([
      admin.from('profiles').select('id, full_name').in('id', ids),
      admin.from('user_roles').select('user_id, role').in('user_id', ids),
    ])
    if (profilesRes.error) {
      await logDebug(admin, 'load_profiles', profilesRes.error, callerUserId)
      return new Response(JSON.stringify({ error: profilesRes.error.message, step: 'load_profiles' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }
    if (rolesRes.error) {
      await logDebug(admin, 'load_roles', rolesRes.error, callerUserId)
      return new Response(JSON.stringify({ error: rolesRes.error.message, step: 'load_roles' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    step = 'build_response'
    const profileById = new Map((profilesRes.data ?? []).map((p: any) => [p.id, p.full_name]))
    const rolesByUserId = new Map<string, string[]>()
    for (const r of (rolesRes.data ?? []) as Array<{ user_id: string; role: string }>) {
      const list = rolesByUserId.get(r.user_id) ?? []
      list.push(r.role)
      rolesByUserId.set(r.user_id, list)
    }

    const users = authUsers.map((u) => ({
      id: u.id,
      email: u.email ?? '',
      full_name: (profileById.get(u.id) as string | undefined) ?? u.email ?? '',
      role: pickHighestRole(rolesByUserId.get(u.id) ?? []),
    }))

    users.sort((a, b) => a.full_name.localeCompare(b.full_name))

    await logDebug(admin, 'ok', new Error(`returned ${users.length}`), callerUserId)

    return new Response(JSON.stringify({ users }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    await logDebug(admin, `catch:${step}`, error, callerUserId)
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
    return new Response(JSON.stringify({ error: message, step }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
