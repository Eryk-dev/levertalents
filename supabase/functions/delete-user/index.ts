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

    // Usa RPC admin_hard_delete_user (SQL direto) em vez de auth.admin.deleteUser
    // (que trava em usuários degenerados). FKs CASCADE fazem a limpeza igual.
    const { error: rpcError } = await supabaseAdmin.rpc('admin_hard_delete_user', {
      _user_id: userId,
    })
    if (rpcError) {
      console.error('admin_hard_delete_user RPC error:', rpcError)
      const message = rpcError.message || 'Erro ao excluir usuário'
      const friendly = message.includes('foreign key') || rpcError.code === '23503'
        ? 'Esse usuário tem registros históricos (vagas, entrevistas, etc.) que impedem a exclusão. Reatribua ou anonimize antes.'
        : message
      return jsonResponse({ error: friendly, raw: message, code: rpcError.code }, 400)
    }

    return jsonResponse({ success: true, deletedUserId: userId })
  } catch (error) {
    console.error('delete-user error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return jsonResponse({ error: message }, 500)
  }
})
