import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ALLOWED_ROLES = new Set(['admin', 'socio', 'rh'])

// Prioridade de role quando o mesmo user_id tem múltiplas rows em user_roles
// (cenário legado: trigger de signup inseriu 'colaborador' e migration seed
// adicionou 'admin' depois). Usamos para escolher qual role exibir no mapping.
const ROLE_PRIORITY = ['admin', 'socio', 'rh', 'lider', 'colaborador'] as const

function pickHighestRole(roles: string[]): string | null {
  for (const role of ROLE_PRIORITY) {
    if (roles.includes(role)) return role
  }
  return roles[0] ?? null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const jwt = authHeader.replace('Bearer ', '')
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(jwt)
    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid JWT' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const { data: callerRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)

    const callerRoleSet = new Set((callerRoles ?? []).map((r) => r.role))
    const callerAllowed = [...callerRoleSet].some((r) => ALLOWED_ROLES.has(r))
    if (!callerAllowed) {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    const { data: authList, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    if (listError) throw listError

    const authUsers = authList.users
    const ids = authUsers.map((u) => u.id)

    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabaseAdmin.from('profiles').select('id, full_name').in('id', ids),
      supabaseAdmin.from('user_roles').select('user_id, role').in('user_id', ids),
    ])

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
    console.error('list-users error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
