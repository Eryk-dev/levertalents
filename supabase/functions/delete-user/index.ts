import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ error: 'Missing Authorization header' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Identifica o chamador
    const jwt = authHeader.replace('Bearer ', '')
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(jwt)
    if (userError || !userData.user) {
      return jsonResponse({ error: 'Invalid JWT' }, 401)
    }

    const callerId = userData.user.id

    // Só admin pode deletar usuários (nem sócio, nem RH)
    const { data: callerRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', callerId)
    const callerIsAdmin = (callerRoles ?? []).some((r) => r.role === 'admin')
    if (!callerIsAdmin) {
      return jsonResponse({ error: 'Forbidden: apenas administradores podem excluir usuários' }, 403)
    }

    const { userId } = (await req.json()) as { userId?: string }
    if (!userId) {
      return jsonResponse({ error: 'userId é obrigatório' }, 400)
    }

    // Proteção 1: auto-delete
    if (userId === callerId) {
      return jsonResponse(
        { error: 'Você não pode excluir a própria conta. Peça para outro administrador.' },
        400,
      )
    }

    // Proteção 2: último admin
    const { data: targetRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
    const targetIsAdmin = (targetRoles ?? []).some((r) => r.role === 'admin')
    if (targetIsAdmin) {
      const { count: adminCount } = await supabaseAdmin
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin')
      if ((adminCount ?? 0) <= 1) {
        return jsonResponse(
          { error: 'Não é possível excluir o último administrador do sistema.' },
          400,
        )
      }
    }

    // Auth Admin API: deleta de auth.users → cascade em profiles, user_roles,
    // team_members (todos têm FK com ON DELETE CASCADE para auth.users).
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (deleteError) {
      console.error('auth.admin.deleteUser error:', deleteError)
      // Erros comuns: FK RESTRICT em tabelas de histórico (ex.: job_openings.requested_by)
      const message = deleteError.message || 'Erro ao excluir usuário'
      const friendly = message.includes('foreign key')
        ? 'Esse usuário tem registros históricos (vagas criadas, entrevistas, etc.) que impedem a exclusão. Reatribua ou anonimize antes.'
        : message
      return jsonResponse({ error: friendly, raw: message }, 400)
    }

    return jsonResponse({ success: true, deletedUserId: userId })
  } catch (error) {
    console.error('delete-user error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return jsonResponse({ error: message }, 500)
  }
})
