import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { operation, ...params } = await req.json()
    
    // Get authenticated user
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    switch (operation) {
      case 'accept_quest':
        return await acceptQuest(user.id, params)
      case 'submit_quest':
        return await submitQuest(user.id, params)
      case 'get_user_quests':
        return await getUserQuests(user.id)
      default:
        return new Response(JSON.stringify({ error: 'Invalid operation' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
  } catch (error) {
    console.error('Quest operations error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

async function acceptQuest(userId: string, { questId }: { questId: string }) {
  // Check if quest exists and is active
  const { data: quest, error: questError } = await supabase
    .from('quests')
    .select('*')
    .eq('id', questId)
    .eq('status', 'active')
    .single()

  if (questError || !quest) {
    return new Response(JSON.stringify({ error: 'Quest not found or not active' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // Check if user already accepted this quest
  const { data: existing } = await supabase
    .from('quest_acceptances')
    .select('id')
    .eq('quest_id', questId)
    .eq('user_id', userId)
    .single()

  if (existing) {
    return new Response(JSON.stringify({ error: 'Quest already accepted' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // Accept the quest
  const { error: acceptError } = await supabase
    .from('quest_acceptances')
    .insert({
      quest_id: questId,
      user_id: userId,
      status: 'accepted'
    })

  if (acceptError) {
    return new Response(JSON.stringify({ error: acceptError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function submitQuest(userId: string, { questId, notes }: { questId: string, notes?: string }) {
  // Update quest acceptance to submitted
  const { error: updateError } = await supabase
    .from('quest_acceptances')
    .update({
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      notes: notes || ''
    })
    .eq('quest_id', questId)
    .eq('user_id', userId)
    .eq('status', 'accepted')

  if (updateError) {
    return new Response(JSON.stringify({ error: updateError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function getUserQuests(userId: string) {
  const { data: quests, error } = await supabase
    .from('quest_acceptances')
    .select(`
      *,
      quests (
        id,
        title,
        description,
        client,
        reward,
        difficulty,
        time_limit,
        tags
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  return new Response(JSON.stringify({ quests }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}