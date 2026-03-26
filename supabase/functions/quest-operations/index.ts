import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

async function resolveUserId(authUserId: string, targetUserId?: string): Promise<string> {
  if (!targetUserId || targetUserId === authUserId) return authUserId;
  
  const { data: role } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', authUserId)
    .eq('role', 'admin')
    .single();
  
  if (!role) throw new Error('Only admins can act on behalf of other users');
  return targetUserId;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { operation, targetUserId, ...params } = await req.json()
    
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const effectiveUserId = await resolveUserId(user.id, targetUserId);

    switch (operation) {
      case 'accept_quest':
        return await acceptQuest(effectiveUserId, params)
      case 'submit_quest':
        return await submitQuest(effectiveUserId, params)
      case 'resign_quest':
        return await resignQuest(effectiveUserId, params)
      case 'repeat_quest':
        return await repeatQuest(effectiveUserId, params)
      case 'get_user_quests':
        return await getUserQuests(effectiveUserId)
      case 'get_downtime':
        return await getDowntime(effectiveUserId)
      case 'log_rest':
        return await logRest(effectiveUserId, params)
      case 'get_downtime_activities':
        return await getDowntimeActivities(effectiveUserId)
      case 'create_player_quest':
        return await createPlayerQuest(effectiveUserId, params)
      case 'get_community_quests':
        return await getCommunityQuests()
      case 'get_my_posted_quests':
        return await getMyPostedQuests(effectiveUserId)
      case 'approve_player_quest':
        return await approvePlayerQuest(effectiveUserId, params)
      case 'reject_player_quest':
        return await rejectPlayerQuest(effectiveUserId, params)
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

async function getDowntime(userId: string) {
  const { data, error } = await supabase
    .from('downtime_balances')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error && error.code === 'PGRST116') {
    const { data: created, error: createErr } = await supabase
      .from('downtime_balances')
      .insert({ user_id: userId, balance: 0 })
      .select()
      .single()
    if (createErr) throw createErr
    return new Response(JSON.stringify({ downtime: created }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
  if (error) throw error

  return new Response(JSON.stringify({ downtime: data }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function logRest(userId: string, params: any) {
  const { activity_type, hours_spent, activities_chosen, notes, game_day, game_month, game_year } = params;

  if (!activity_type || !hours_spent || hours_spent <= 0) {
    return new Response(JSON.stringify({ error: 'activity_type and hours_spent required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const { data: bal } = await supabase
    .from('downtime_balances')
    .select('*')
    .eq('user_id', userId)
    .single()

  const currentBalance = bal?.balance || 0;

  if (currentBalance < hours_spent) {
    return new Response(JSON.stringify({ error: `Not enough downtime. Have ${currentBalance}h, need ${hours_spent}h.` }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  if (bal) {
    await supabase
      .from('downtime_balances')
      .update({ balance: currentBalance - hours_spent, updated_at: new Date().toISOString() })
      .eq('id', bal.id)
  } else {
    await supabase
      .from('downtime_balances')
      .insert({ user_id: userId, balance: -hours_spent })
  }

  const { error: insertErr } = await supabase
    .from('downtime_activities')
    .insert({
      user_id: userId,
      activity_type,
      hours_spent,
      activities_chosen: activities_chosen || [],
      notes: notes || null,
      game_day: game_day || null,
      game_month: game_month || null,
      game_year: game_year || null,
    })

  if (insertErr) throw insertErr

  return new Response(JSON.stringify({ success: true, newBalance: currentBalance - hours_spent }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function getDowntimeActivities(userId: string) {
  const { data, error } = await supabase
    .from('downtime_activities')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) throw error

  return new Response(JSON.stringify({ activities: data || [] }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function acceptQuest(userId: string, { questId }: { questId: string }) {
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

  if (quest.job_type === 'commission' && quest.available_quantity !== null && quest.available_quantity <= 0) {
    return new Response(JSON.stringify({ error: 'No more slots available for this commission' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // Don't allow accepting own posted quests
  if (quest.posted_by_user_id && quest.posted_by_user_id === userId) {
    return new Response(JSON.stringify({ error: 'You cannot accept your own posted job' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  if (quest.job_type === 'full_time') {
    const { data: existing } = await supabase
      .from('quest_acceptances')
      .select('id, status')
      .eq('quest_id', questId)
      .eq('user_id', userId)
      .in('status', ['accepted', 'pending_approval'])
      .single()

    if (existing) {
      return new Response(JSON.stringify({ error: existing.status === 'pending_approval' ? 'Application already pending' : 'Already employed in this job' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { error: acceptError } = await supabase
      .from('quest_acceptances')
      .insert({ quest_id: questId, user_id: userId, status: 'pending_approval' })

    if (acceptError) throw acceptError

    return new Response(JSON.stringify({ success: true, jobType: 'full_time', status: 'pending_approval' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // Commission quest
  const { data: existing } = await supabase
    .from('quest_acceptances')
    .select('id')
    .eq('quest_id', questId)
    .eq('user_id', userId)
    .eq('status', 'accepted')
    .single()

  if (existing) {
    return new Response(JSON.stringify({ error: 'Quest already accepted' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const { error: acceptError } = await supabase
    .from('quest_acceptances')
    .insert({ quest_id: questId, user_id: userId, status: 'accepted' })

  if (acceptError) throw acceptError

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function repeatQuest(userId: string, { questId }: { questId: string }) {
  const { data: quest, error: questError } = await supabase
    .from('quests')
    .select('*')
    .eq('id', questId)
    .eq('status', 'active')
    .single()

  if (questError || !quest) {
    return new Response(JSON.stringify({ error: 'Quest not found or no longer active' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  if (quest.job_type !== 'commission') {
    return new Response(JSON.stringify({ error: 'Only commissions can be repeated' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  if (quest.available_quantity !== null && quest.available_quantity <= 0) {
    return new Response(JSON.stringify({ error: 'No more slots available' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const { data: active } = await supabase
    .from('quest_acceptances')
    .select('id')
    .eq('quest_id', questId)
    .eq('user_id', userId)
    .in('status', ['accepted', 'submitted'])
    .single()

  if (active) {
    return new Response(JSON.stringify({ error: 'Already have this quest in progress' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const { error: insertError } = await supabase
    .from('quest_acceptances')
    .insert({ quest_id: questId, user_id: userId, status: 'accepted' })

  if (insertError) throw insertError

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function submitQuest(userId: string, { questId, notes, rollResult, rollType }: { questId: string, notes?: string, rollResult?: number, rollType?: string }) {
  const { data: quest } = await supabase
    .from('quests')
    .select('*')
    .eq('id', questId)
    .single()

  if (!quest) {
    return new Response(JSON.stringify({ error: 'Quest not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // Check downtime cost
  if (quest.downtime_cost > 0) {
    const { data: downtime } = await supabase
      .from('downtime_balances')
      .select('*')
      .eq('user_id', userId)
      .single()

    const currentBalance = downtime?.balance || 0

    if (currentBalance < quest.downtime_cost) {
      return new Response(JSON.stringify({ error: `Not enough downtime. Need ${quest.downtime_cost} hours, have ${currentBalance}.` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Deduct downtime
    await supabase
      .from('downtime_balances')
      .update({ balance: currentBalance - quest.downtime_cost, updated_at: new Date().toISOString() })
      .eq('user_id', userId)

    // Log the downtime activity
    await supabase
      .from('downtime_activities')
      .insert({
        user_id: userId,
        activity_type: 'quest_work',
        hours_spent: quest.downtime_cost,
        notes: `Quest: ${quest.title}`,
      })
  }

  const { error: updateError } = await supabase
    .from('quest_acceptances')
    .update({
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      notes: notes || '',
      roll_result: rollResult ?? null,
      roll_type: rollType ?? null
    })
    .eq('quest_id', questId)
    .eq('user_id', userId)
    .eq('status', 'accepted')

  if (updateError) throw updateError

  if (quest.job_type === 'commission' && quest.available_quantity !== null) {
    await supabase
      .from('quests')
      .update({ available_quantity: Math.max(0, quest.available_quantity - 1) })
      .eq('id', questId)
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function resignQuest(userId: string, { questId }: { questId: string }) {
  const { error: updateError } = await supabase
    .from('quest_acceptances')
    .update({ status: 'resigned' })
    .eq('quest_id', questId)
    .eq('user_id', userId)
    .in('status', ['accepted', 'pending_approval'])

  if (updateError) throw updateError

  await supabase
    .from('recurring_payments')
    .delete()
    .eq('to_user_id', userId)
    .filter('metadata->>quest_id', 'eq', questId)

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
        id, title, description, client, reward, reward_min,
        difficulty, time_limit, tags, job_type, downtime_cost,
        available_quantity, pay_interval, status, posted_by_user_id
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error

  return new Response(JSON.stringify({ quests }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

// --- Player-posted quests ---

async function createPlayerQuest(userId: string, params: any) {
  const { title, description, reward, reward_min, difficulty, downtime_cost, available_quantity, tags, time_limit } = params;

  if (!title) {
    return new Response(JSON.stringify({ error: 'Title is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // Get poster's profile for the client name
  const { data: profile } = await supabase
    .from('profiles')
    .select('character_name')
    .eq('user_id', userId)
    .single()

  const { error } = await supabase.from('quests').insert({
    title,
    description: description || null,
    client: profile?.character_name || 'Anonymous',
    reward: reward || 0,
    reward_min: reward_min || 0,
    difficulty: difficulty || 'Low Risk',
    job_type: 'commission',
    downtime_cost: downtime_cost || 0,
    available_quantity: available_quantity ? parseInt(available_quantity) : null,
    tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map((t: string) => t.trim()).filter(Boolean)) : null,
    time_limit: time_limit || null,
    posted_by_user_id: userId,
    status: 'active',
  })

  if (error) throw error

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function getCommunityQuests() {
  const { data, error } = await supabase
    .from('quests')
    .select('*')
    .eq('status', 'active')
    .not('posted_by_user_id', 'is', null)
    .order('created_at', { ascending: false })

  if (error) throw error

  // Get poster names
  const posterIds = [...new Set((data || []).map(q => q.posted_by_user_id).filter(Boolean))]
  let posterMap: Record<string, string> = {}
  if (posterIds.length > 0) {
    const { data: profiles } = await supabase.from('profiles').select('user_id, character_name').in('user_id', posterIds)
    profiles?.forEach(p => { posterMap[p.user_id] = p.character_name || 'Unknown' })
  }

  return new Response(JSON.stringify({ quests: data || [], posterMap }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function getMyPostedQuests(userId: string) {
  const { data, error } = await supabase
    .from('quests')
    .select(`*, quest_acceptances (id, user_id, status, submitted_at, roll_result, roll_type, notes, final_payment, admin_notes)`)
    .eq('posted_by_user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error

  // Get worker names
  const userIds = new Set<string>()
  data?.forEach(q => q.quest_acceptances?.forEach((a: any) => userIds.add(a.user_id)))
  let profileMap: Record<string, string> = {}
  if (userIds.size > 0) {
    const { data: profiles } = await supabase.from('profiles').select('user_id, character_name').in('user_id', [...userIds])
    profiles?.forEach(p => { profileMap[p.user_id] = p.character_name || 'Unknown' })
  }

  return new Response(JSON.stringify({ quests: data || [], profileMap }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function approvePlayerQuest(posterId: string, { acceptanceId, finalPayment }: { acceptanceId: string, finalPayment: number }) {
  // Get acceptance + quest
  const { data: acceptance, error: getErr } = await supabase
    .from('quest_acceptances')
    .select(`*, quests (id, title, reward, posted_by_user_id)`)
    .eq('id', acceptanceId)
    .eq('status', 'submitted')
    .single()

  if (getErr || !acceptance) {
    return new Response(JSON.stringify({ error: 'Submission not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // Verify the poster is the one approving
  if (acceptance.quests.posted_by_user_id !== posterId) {
    return new Response(JSON.stringify({ error: 'Only the job poster can approve this' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const payment = finalPayment || acceptance.quests.reward || 0

  // Check poster has enough credits
  const { data: posterProfile } = await supabase.from('profiles').select('credits').eq('user_id', posterId).single()
  if (!posterProfile) throw new Error('Poster profile not found')

  const posterNewBalance = (posterProfile.credits || 0) - payment
  if (posterNewBalance < -6000) {
    return new Response(JSON.stringify({ error: 'Insufficient funds to pay the worker.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // Deduct from poster
  await supabase.from('profiles').update({ credits: posterNewBalance }).eq('user_id', posterId)
  await supabase.from('transactions').insert({
    user_id: posterId,
    transaction_type: 'quest_payment',
    amount: -payment,
    description: `Paid for job: ${acceptance.quests.title}`,
    reference_id: acceptance.quest_id,
    status: 'completed',
  })

  // Pay the worker
  const { data: workerProfile } = await supabase.from('profiles').select('credits').eq('user_id', acceptance.user_id).single()
  if (workerProfile) {
    await supabase.from('profiles').update({ credits: (workerProfile.credits || 0) + payment }).eq('user_id', acceptance.user_id)
    await supabase.from('transactions').insert({
      user_id: acceptance.user_id,
      transaction_type: 'quest_reward',
      amount: payment,
      description: `Quest completion: ${acceptance.quests.title}`,
      reference_id: acceptance.quest_id,
      status: 'completed',
    })
  }

  // Update acceptance
  await supabase.from('quest_acceptances').update({
    status: 'completed',
    completed_at: new Date().toISOString(),
    final_payment: payment,
    times_completed: (acceptance.times_completed || 0) + 1,
    admin_notes: `Approved by poster. Paid ${payment}.`,
  }).eq('id', acceptanceId)

  return new Response(JSON.stringify({ success: true, payment }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function rejectPlayerQuest(posterId: string, { acceptanceId, notes }: { acceptanceId: string, notes?: string }) {
  const { data: acceptance, error: getErr } = await supabase
    .from('quest_acceptances')
    .select(`*, quests (id, posted_by_user_id)`)
    .eq('id', acceptanceId)
    .eq('status', 'submitted')
    .single()

  if (getErr || !acceptance) {
    return new Response(JSON.stringify({ error: 'Submission not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  if (acceptance.quests.posted_by_user_id !== posterId) {
    return new Response(JSON.stringify({ error: 'Only the job poster can reject this' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  await supabase.from('quest_acceptances').update({
    status: 'rejected',
    admin_notes: notes || 'Rejected by poster.',
    completed_at: new Date().toISOString(),
  }).eq('id', acceptanceId)

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}
