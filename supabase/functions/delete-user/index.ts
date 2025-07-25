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
    const { user_id } = await req.json()

    if (!user_id?.trim()) {
      return new Response('User ID is required', { status: 400, headers: corsHeaders })
    }

    // Prevent admin from deleting themselves
    if (user_id === user.id) {
      return new Response('Cannot delete your own account', { status: 400, headers: corsHeaders })
    }

    // Create admin client with service role key
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Get user info before deletion for logging
    const { data: userProfile } = await adminClient
      .from('profiles')
      .select('character_name')
      .eq('user_id', user_id)
      .single()

    // Delete the user (this will cascade delete related data)
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user_id)

    if (deleteError) {
      console.error('Delete error:', deleteError)
      return new Response(deleteError.message, { status: 400, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `User ${userProfile?.character_name || user_id} has been deleted successfully`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error deleting user:', error)
    return new Response(error.message, { status: 500, headers: corsHeaders })
  }
})