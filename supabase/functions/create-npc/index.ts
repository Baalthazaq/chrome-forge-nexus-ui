
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
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    // Create a Supabase client with the anon key for user verification
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // Verify the user is an admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single()

    if (!roleData) {
      return new Response('Forbidden - Admin access required', { status: 403, headers: corsHeaders })
    }

    // Parse the request body
    const { character_name, character_class, level, credits } = await req.json()

    if (!character_name?.trim()) {
      return new Response('Character name is required', { status: 400, headers: corsHeaders })
    }

    // Create admin client with service role key
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Create the NPC user
    const randomEmail = `npc_${Date.now()}@nexus.game`
    const randomPassword = `npc_${Math.random().toString(36).substring(7)}`

    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: randomEmail,
      password: randomPassword,
      email_confirm: true,
      user_metadata: {
        character_name,
        is_npc: true
      }
    })

    if (authError) {
      console.error('Auth error:', authError)
      return new Response(authError.message, { status: 400, headers: corsHeaders })
    }

    // Update the profile (it may already exist due to trigger)
    const { error: profileError } = await adminClient
      .from('profiles')
      .upsert({
        user_id: authData.user.id,
        character_name,
        character_class: character_class || 'NPC',
        level: level || 1,
        credits: credits || 100,
        bio: 'NPC Account'
      })

    if (profileError) {
      console.error('Profile error:', profileError)
      return new Response(profileError.message, { status: 400, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `${character_name} has been created successfully`,
      npc_id: authData.user.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error creating NPC:', error)
    return new Response(error.message, { status: 500, headers: corsHeaders })
  }
})
