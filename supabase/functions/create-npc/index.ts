
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
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

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

    const { 
      character_name, 
      character_class, 
      subclass,
      community,
      level = 1, 
      credits = 100,
      credit_rating,
      ancestry,
      job,
      company,
      charisma_score = 10,
      notes,
      is_searchable = true,
      has_succubus_profile = false,
      agility = 10,
      strength = 10,
      finesse = 10,
      instinct = 10,
      presence = 10,
      knowledge = 10,
      age,
      bio,
      employer,
      education,
      address,
      aliases = [],
      security_rating = 'C'
    } = await req.json()

    if (!character_name?.trim()) {
      return new Response('Character name is required', { status: 400, headers: corsHeaders })
    }

    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Create the NPC user
    const randomEmail = `npc_${Date.now()}@nexus.game`
    const randomPassword = `npc_${Math.random().toString(36).substring(7)}`

    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: randomEmail,
      password: randomPassword,
      email_confirm: true,
      user_metadata: { character_name, is_npc: true }
    })

    if (authError) {
      console.error('Auth error:', authError)
      return new Response(authError.message, { status: 400, headers: corsHeaders })
    }

    // Update the profile
    const { error: profileError } = await adminClient
      .from('profiles')
      .upsert({
        user_id: authData.user.id,
        character_name,
        ancestry: ancestry || null,
        job: job || null,
        company: company || null,
        character_class: character_class || 'NPC',
        level: level || 1,
        credits: credit_rating || credits || 100,
        credit_rating: credit_rating || credits || 100,
        charisma_score: charisma_score || 10,
        notes: notes || null,
        is_searchable: is_searchable ?? true,
        has_succubus_profile: has_succubus_profile || false,
        agility: agility || 10,
        strength: strength || 10,
        finesse: finesse || 10,
        instinct: instinct || 10,
        presence: presence || 10,
        knowledge: knowledge || 10,
        age: age || null,
        bio: bio || 'NPC Account',
        employer: employer || null,
        education: education || null,
        address: address || null,
        aliases: aliases || [],
        security_rating: security_rating || 'C'
      }, { onConflict: 'user_id' })

    if (profileError) {
      console.error('Profile error:', profileError)
      return new Response(profileError.message, { status: 400, headers: corsHeaders })
    }

    // Create character_sheet so Doppleganger works for this NPC
    const { error: sheetError } = await adminClient
      .from('character_sheets')
      .upsert({
        user_id: authData.user.id,
        class: character_class || null,
        subclass: subclass || null,
        community: community || null,
        ancestry: ancestry || null,
        level: level || 1,
      }, { onConflict: 'user_id' })

    if (sheetError) {
      console.error('Character sheet error:', sheetError)
      // Non-fatal: profile was created, sheet sync failed
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
