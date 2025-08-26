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

    // Check if user is admin
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!userRole || userRole.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    switch (operation) {
      case 'create_quest':
        return await createQuest(params)
      case 'update_quest':
        return await updateQuest(params)
      case 'delete_quest':
        return await deleteQuest(params)
      case 'get_all_quests':
        return await getAllQuests()
      case 'get_submitted_quests':
        return await getSubmittedQuests()
      case 'complete_quest':
        return await completeQuest(params)
      default:
        return new Response(JSON.stringify({ error: 'Invalid operation' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
  } catch (error) {
    console.error('Quest admin error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

async function createQuest(params: any) {
  const { error } = await supabase
    .from('quests')
    .insert(params)

  if (error) throw error

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function updateQuest({ id, ...updates }: any) {
  const { error } = await supabase
    .from('quests')
    .update(updates)
    .eq('id', id)

  if (error) throw error

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function deleteQuest({ id }: { id: string }) {
  const { error } = await supabase
    .from('quests')
    .update({ status: 'cancelled' })
    .eq('id', id)

  if (error) throw error

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function getAllQuests() {
  const { data: quests, error } = await supabase
    .from('quests')
    .select(`
      *,
      quest_acceptances (
        id,
        user_id,
        status,
        submitted_at,
        profiles!user_id (
          character_name
        )
      )
    `)
    .order('created_at', { ascending: false })

  if (error) throw error

  return new Response(JSON.stringify({ quests }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function getSubmittedQuests() {
  const { data: submissions, error } = await supabase
    .from('quest_acceptances')
    .select(`
      *,
      quests (
        id,
        title,
        description,
        reward,
        client
      ),
      profiles!user_id (
        character_name,
        user_id
      )
    `)
    .eq('status', 'submitted')
    .order('submitted_at', { ascending: false })

  if (error) throw error

  return new Response(JSON.stringify({ submissions }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function completeQuest({ 
  acceptanceId, 
  finalPayment, 
  participants = []
}: { 
  acceptanceId: string, 
  finalPayment: number,
  participants?: string[]
}) {
  // Get the quest acceptance
  const { data: acceptance, error: acceptanceError } = await supabase
    .from('quest_acceptances')
    .select(`
      *,
      quests (
        id,
        title,
        reward
      ),
      profiles!user_id (
        character_name,
        user_id
      )
    `)
    .eq('id', acceptanceId)
    .single()

  if (acceptanceError || !acceptance) {
    throw new Error('Quest acceptance not found')
  }

  // Determine payment per participant
  const totalParticipants = participants.length > 0 ? participants.length : 1
  const paymentPerParticipant = Math.floor(finalPayment / totalParticipants)
  
  // Get all participant profiles
  const participantIds = participants.length > 0 ? participants : [acceptance.user_id]
  
  for (const participantId of participantIds) {
    // Get participant's current credits
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits')
      .eq('user_id', participantId)
      .single()

    if (profileError || !profile) {
      console.error(`Profile not found for user ${participantId}`)
      continue
    }

    // Update participant's credits
    const { error: creditError } = await supabase
      .from('profiles')
      .update({ credits: profile.credits + paymentPerParticipant })
      .eq('user_id', participantId)

    if (creditError) {
      console.error(`Failed to update credits for user ${participantId}:`, creditError)
      continue
    }

    // Create transaction record
    await supabase
      .from('transactions')
      .insert({
        user_id: participantId,
        transaction_type: 'quest_reward',
        amount: paymentPerParticipant,
        description: `Quest completion: ${acceptance.quests.title}`,
        reference_id: acceptance.quest_id,
        status: 'completed',
        metadata: {
          quest_id: acceptance.quest_id,
          acceptance_id: acceptanceId,
          original_reward: acceptance.quests.reward,
          final_payment: finalPayment
        }
      })
  }

  // Update quest acceptance to completed
  const { error: updateError } = await supabase
    .from('quest_acceptances')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      final_payment: finalPayment
    })
    .eq('id', acceptanceId)

  if (updateError) throw updateError

  return new Response(JSON.stringify({ 
    success: true,
    participantsPaid: participantIds.length,
    paymentPerParticipant
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}