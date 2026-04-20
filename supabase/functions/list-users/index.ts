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

function fail(step: string, err: unknown, status = 500) {
  const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
  console.error(`list-users FAIL step=${step}:`, err)
  return new Response(
    JSON.stringify({ error: msg, step, debug: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status }
  )
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let step = 'init'
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return fail('missing_auth_header', new Error('Missing Authorization header'), 401)

    step = 'read_env'
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!supabaseUrl) return fail('read_env', new Error('SUPABASE_URL env missing'))
    if (!serviceRoleKey) return fail('read_env', new Error('SUPABASE_SERVICE_ROLE_KEY env missing'))

    step = 'create_client'
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    step = 'get_user_from_jwt'
    const jwt = authHeader.replace('Bearer ', '')
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(jwt)
    if (userError) return fail(step, userError, 401)
    if (!userData?.user) return fail(step, new Error('No user in JWT'), 401)

    step = 'load_caller_roles'
    const { data: callerRoles, error: callerRolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
    if (callerRolesError) return fail(step, callerRolesError)

    step = 'check_allowed'
    const callerRoleSet = new Set((callerRoles ?? []).map((r) => r.role))
    const callerAllowed = [...callerRoleSet].some((r) => ALLOWED_ROLES.has(r))
    if (!callerAllowed) return fail(step, new Error(`Forbidden: caller roles=${JSON.stringify([...callerRoleSet])}`), 403)

    step = 'list_auth_users'
    const { data: authList, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    if (listError) return fail(step, listError)

    const authUsers = authList.users
    const ids = authUsers.map((u) => u.id)

    step = 'load_profiles_and_roles'
    const [profilesRes, rolesRes] = await Promise.all([
      supabaseAdmin.from('profiles').select('id, full_name').in('id', ids),
      supabaseAdmin.from('user_roles').select('user_id, role').in('user_id', ids),
    ])
    if (profilesRes.error) return fail('load_profiles', profilesRes.error)
    if (rolesRes.error) return fail('load_roles', rolesRes.error)
    const profiles = profilesRes.data
    const roles = rolesRes.data

    step = 'build_response'
    const profileById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]))
    const rolesByUserId = new Map<string, string[]>()
    for (const r of roles ?? []) {
      const list = rolesByUserId.get(r.user_id) ?? []
      list.push(r.role)
      rolesByUserId.set(r.user_id, list)
    }

    const users = authUsers.map((u) => ({
      id: u.id,
      email: u.email ?? '',
      full_name: profileById.get(u.id) ?? u.email ?? '',
      role: pickHighestRole(rolesByUserId.get(u.id) ?? []),
    }))

    users.sort((a, b) => a.full_name.localeCompare(b.full_name))

    return new Response(
      JSON.stringify({ users }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return fail(step, error)
  }
})
