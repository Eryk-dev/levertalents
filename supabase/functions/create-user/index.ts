import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { email, password, fullName, department, hireDate, role, teamId, leaderId } = await req.json()

    console.log('Creating user:', { email, fullName, role, teamId, leaderId })

    // Create user using Admin API. Role é passado via user_metadata para que
    // o trigger handle_new_user insira direto em user_roles com o role
    // correto — evita a duplicidade (default 'colaborador' + role desejado).
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: role
      }
    })

    if (createError) {
      console.error('Error creating user:', createError)
      throw createError
    }
    if (!userData.user) throw new Error('Erro ao criar usuário')

    const userId = userData.user.id
    console.log('User created with ID:', userId)

    // Update profile (department/hireDate não cabem em user_metadata)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name: fullName,
        department: department || null,
        hire_date: hireDate || null,
      })
      .eq('id', userId)

    if (profileError) {
      console.error('Error updating profile:', profileError)
      throw profileError
    }

    console.log('Profile updated successfully, role assigned via trigger:', role)

    if (teamId) {
      // Se um leader explícito não foi informado, herda do time (fonte de verdade).
      let resolvedLeaderId: string | null = leaderId ?? null
      if (!resolvedLeaderId) {
        const { data: team } = await supabaseAdmin
          .from('teams')
          .select('leader_id')
          .eq('id', teamId)
          .maybeSingle()
        resolvedLeaderId = team?.leader_id ?? null
      }

      const { error: memberError } = await supabaseAdmin
        .from('team_members')
        .insert({
          user_id: userId,
          team_id: teamId,
          leader_id: resolvedLeaderId,
        })
      if (memberError) {
        console.error('Error adding to team_members:', memberError)
        // Don't throw — user was created. Just log + return warning.
      }
    }

    return new Response(
      JSON.stringify({ success: true, userId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in create-user function:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
