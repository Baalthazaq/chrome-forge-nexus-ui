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
    
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

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
      case 'replenish_quest':
        return await replenishQuest(params)
      case 'get_downtime_config':
        return await getDowntimeConfig()
      case 'update_downtime_config':
        return await updateDowntimeConfig(params)
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
        roll_result,
        roll_type,
        times_completed,
        notes,
        final_payment
      )
    `)
    .order('created_at', { ascending: false })

  if (error) throw error

  // Fetch profiles for each acceptance's user_id
  const userIds = new Set<string>()
  quests?.forEach(q => q.quest_acceptances?.forEach((a: any) => userIds.add(a.user_id)))
  
  let profileMap: Record<string, string> = {}
  if (userIds.size > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, character_name')
      .in('user_id', [...userIds])
    profiles?.forEach(p => { profileMap[p.user_id] = p.character_name || 'Unknown' })
  }

  return new Response(JSON.stringify({ quests, profileMap }), {
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
        reward_min,
        client,
        job_type,
        downtime_cost
      )
    `)
    .eq('status', 'submitted')
    .order('submitted_at', { ascending: false })

  if (error) throw error

  // Fetch profiles
  const userIds = submissions?.map(s => s.user_id) || []
  let profileMap: Record<string, string> = {}
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, character_name')
      .in('user_id', [...new Set(userIds)])
    profiles?.forEach(p => { profileMap[p.user_id] = p.character_name || 'Unknown' })
  }

  return new Response(JSON.stringify({ submissions, profileMap }), {
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
  const { data: acceptance, error: acceptanceError } = await supabase
    .from('quest_acceptances')
    .select(`
      *,
      quests (
        id,
        title,
        reward,
        job_type,
        available_quantity
      )
    `)
    .eq('id', acceptanceId)
    .single()

  if (acceptanceError || !acceptance) {
    throw new Error('Quest acceptance not found')
  }

  const totalParticipants = participants.length > 0 ? participants.length : 1
  const paymentPerParticipant = Math.floor(finalPayment / totalParticipants)
  const participantIds = participants.length > 0 ? participants : [acceptance.user_id]
  
  for (const participantId of participantIds) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits')
      .eq('user_id', participantId)
      .single()

    if (profileError || !profile) {
      console.error(`Profile not found for user ${participantId}`)
      continue
    }

    const { error: creditError } = await supabase
      .from('profiles')
      .update({ credits: (profile.credits || 0) + paymentPerParticipant })
      .eq('user_id', participantId)

    if (creditError) {
      console.error(`Failed to update credits for user ${participantId}:`, creditError)
      continue
    }

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
          final_payment: finalPayment,
          roll_result: acceptance.roll_result,
          roll_type: acceptance.roll_type
        }
      })
  }

  // Update quest acceptance
  const { error: updateError } = await supabase
    .from('quest_acceptances')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      final_payment: finalPayment,
      times_completed: (acceptance.times_completed || 0) + 1
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

async function replenishQuest({ questId, quantity }: { questId: string, quantity: number }) {
  const { data: quest, error: getErr } = await supabase
    .from('quests')
    .select('available_quantity')
    .eq('id', questId)
    .single()

  if (getErr || !quest) throw new Error('Quest not found')

  const newQty = (quest.available_quantity || 0) + quantity

  const { error } = await supabase
    .from('quests')
    .update({ available_quantity: newQty })
    .eq('id', questId)

  if (error) throw error

  return new Response(JSON.stringify({ success: true, newQuantity: newQty }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function getDowntimeConfig() {
  const { data, error } = await supabase
    .from('downtime_config')
    .select('*')
    .limit(1)
    .single()

  if (error) throw error

  return new Response(JSON.stringify({ config: data }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function updateDowntimeConfig({ hoursPerDay }: { hoursPerDay: number }) {
  const { data: existing } = await supabase
    .from('downtime_config')
    .select('id')
    .limit(1)
    .single()

  if (!existing) throw new Error('Downtime config not found')

  const { error } = await supabase
    .from('downtime_config')
    .update({ hours_per_day: hoursPerDay, updated_at: new Date().toISOString() })
    .eq('id', existing.id)

  if (error) throw error

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}
