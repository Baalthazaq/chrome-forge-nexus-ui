import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

async function getCurrentGameDate(): Promise<{ day: number | null; month: number | null; year: number | null }> {
  const { data } = await supabase.from('game_calendar').select('current_day, current_month, current_year').limit(1).maybeSingle();
  return {
    day: data?.current_day ?? null,
    month: data?.current_month ?? null,
    year: data?.current_year ?? null,
  };
}

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
      case 'approve_player_application':
        return await approvePlayerApplication(effectiveUserId, params)
      case 'reject_player_application':
        return await rejectPlayerApplication(effectiveUserId, params)
      case 'log_quest_hours':
        return await logQuestHours(effectiveUserId, params)
      case 'delete_player_quest':
        return await deletePlayerQuest(effectiveUserId, params)
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

  // Get the active acceptance
  const { data: acceptance } = await supabase
    .from('quest_acceptances')
    .select('*')
    .eq('quest_id', questId)
    .eq('user_id', userId)
    .eq('status', 'accepted')
    .single()

  if (!acceptance) {
    return new Response(JSON.stringify({ error: 'No active acceptance for this quest' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const submitGd = await getCurrentGameDate();

  // FULL-TIME path — unchanged semantics: just flip status to submitted
  if (quest.job_type === 'full_time') {
    await supabase
      .from('quest_acceptances')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        submitted_game_day: submitGd.day,
        submitted_game_month: submitGd.month,
        submitted_game_year: submitGd.year,
        notes: notes || '',
        roll_result: rollResult ?? null,
        roll_type: rollType ?? null,
      })
      .eq('id', acceptance.id)

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // COMMISSION path — submit ONE completion at a time.
  const unitCost = quest.downtime_cost || 0
  const hoursLogged = acceptance.hours_logged || 0

  // Slot check
  if (quest.available_quantity !== null && quest.available_quantity <= 0) {
    return new Response(JSON.stringify({ error: 'No more slots available for this commission' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // Hours check (must already have enough banked)
  if (unitCost > 0 && hoursLogged < unitCost) {
    return new Response(JSON.stringify({ error: `Need ${unitCost}h logged for one completion (have ${hoursLogged}h). Use Work to log more.` }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // Spawn a NEW submitted row representing this single completion
  const { error: insertError } = await supabase
    .from('quest_acceptances')
    .insert({
      quest_id: questId,
      user_id: userId,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      submitted_game_day: submitGd.day,
      submitted_game_month: submitGd.month,
      submitted_game_year: submitGd.year,
      notes: notes || '',
      roll_result: rollResult ?? null,
      roll_type: rollType ?? null,
      hours_logged: unitCost,
    })

  if (insertError) throw insertError

  // Subtract the unit cost from the active acceptance's banked hours
  await supabase
    .from('quest_acceptances')
    .update({ hours_logged: Math.max(0, hoursLogged - unitCost) })
    .eq('id', acceptance.id)

  // Decrement available quantity
  if (quest.available_quantity !== null) {
    const newQty = Math.max(0, quest.available_quantity - 1)
    await supabase
      .from('quests')
      .update({ available_quantity: newQty })
      .eq('id', questId)

    // If we just consumed the last slot, retire the active acceptance
    if (newQty <= 0) {
      await supabase
        .from('quest_acceptances')
        .update({ status: 'resigned' })
        .eq('id', acceptance.id)
    }
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function resignQuest(userId: string, { questId }: { questId: string }) {
  // Find affected acceptances first so we can cancel any linked subscription
  const { data: affected } = await supabase
    .from('quest_acceptances')
    .select('id')
    .eq('quest_id', questId)
    .eq('user_id', userId)
    .in('status', ['accepted', 'pending_approval'])

  const { error: updateError } = await supabase
    .from('quest_acceptances')
    .update({ status: 'resigned' })
    .eq('quest_id', questId)
    .eq('user_id', userId)
    .in('status', ['accepted', 'pending_approval'])

  if (updateError) throw updateError

  for (const a of affected ?? []) {
    await cancelFullTimeSubscription(a.id)
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

  const jobType = params.job_type || 'commission';
  const payInterval = params.pay_interval || 'daily';

  const gd = await getCurrentGameDate();

  const { error } = await supabase.from('quests').insert({
    title,
    description: description || null,
    client: profile?.character_name || 'Anonymous',
    reward: reward || 0,
    reward_min: reward_min || 0,
    difficulty: difficulty || 'Low Risk',
    job_type: jobType,
    downtime_cost: downtime_cost || 0,
    available_quantity: jobType === 'full_time' ? null : (available_quantity ? parseInt(available_quantity) : null),
    tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map((t: string) => t.trim()).filter(Boolean)) : null,
    time_limit: time_limit || null,
    pay_interval: jobType === 'full_time' ? payInterval : null,
    posted_by_user_id: userId,
    status: 'active',
    posted_game_day: gd.day,
    posted_game_month: gd.month,
    posted_game_year: gd.year,
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

async function deletePlayerQuest(userId: string, { questId }: { questId: string }) {
  if (!questId) {
    return new Response(JSON.stringify({ error: 'questId required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // Verify ownership
  const { data: quest, error: qErr } = await supabase
    .from('quests')
    .select('id, posted_by_user_id')
    .eq('id', questId)
    .single()

  if (qErr || !quest) {
    return new Response(JSON.stringify({ error: 'Quest not found' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // Check admin override
  const { data: role } = await supabase
    .from('user_roles')
    .select('role').eq('user_id', userId).eq('role', 'admin').maybeSingle();
  const isAdmin = !!role;

  if (!isAdmin && quest.posted_by_user_id !== userId) {
    return new Response(JSON.stringify({ error: 'Not authorized' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // Block deletion if there are pending reviews (submitted or pending_approval)
  const { data: pending, error: pErr } = await supabase
    .from('quest_acceptances')
    .select('id, status')
    .eq('quest_id', questId)
    .in('status', ['submitted', 'pending_approval'])

  if (pErr) throw pErr
  if ((pending?.length || 0) > 0) {
    return new Response(JSON.stringify({ error: 'Cannot remove: there are pending reviews. Resolve them first.' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // Delete acceptances then quest
  await supabase.from('quest_acceptances').delete().eq('quest_id', questId)
  const { error: delErr } = await supabase.from('quests').delete().eq('id', questId)
  if (delErr) throw delErr

  return new Response(JSON.stringify({ success: true }), {
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

async function approvePlayerApplication(posterId: string, { acceptanceId }: { acceptanceId: string }) {
  // Approve a player-posted full-time job application — salary is paid via
  // advance-day; we also create a recurring_payments row so the job appears in
  // the employer's @tunes.
  const { data: acceptance, error: getErr } = await supabase
    .from('quest_acceptances')
    .select(`*, quests (id, title, reward, pay_interval, posted_by_user_id, downtime_cost)`)
    .eq('id', acceptanceId)
    .eq('status', 'pending_approval')
    .single()

  if (getErr || !acceptance) {
    return new Response(JSON.stringify({ error: 'Application not found or already processed' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  if (acceptance.quests.posted_by_user_id !== posterId) {
    return new Response(JSON.stringify({ error: 'Only the job poster can approve applications' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  await supabase.from('quest_acceptances').update({
    status: 'accepted',
    admin_notes: 'Application approved by poster. Welcome aboard!',
  }).eq('id', acceptanceId)

  await ensureFullTimeSubscription(acceptance)

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

// Mirror helpers from quest-admin so player-facing approval / resignation keeps @tunes in sync.
async function ensureFullTimeSubscription(acceptance: any) {
  const quest = acceptance.quests
  if (!quest) return

  const { data: empProfile } = await supabase
    .from('profiles').select('character_name').eq('user_id', acceptance.user_id).single()
  const workerName = empProfile?.character_name || 'Worker'

  const isPlayerPosted = !!quest.posted_by_user_id
  const toUserId = isPlayerPosted ? quest.posted_by_user_id : acceptance.user_id
  const fromUserId = isPlayerPosted ? acceptance.user_id : null

  const { data: existing } = await supabase
    .from('recurring_payments')
    .select('id')
    .eq('to_user_id', toUserId)
    .filter('metadata->>acceptance_id', 'eq', acceptance.id)
    .maybeSingle()

  const nextDate = new Date()
  nextDate.setDate(nextDate.getDate() + 1)

  const payload = {
    to_user_id: toUserId,
    from_user_id: fromUserId,
    amount: quest.reward || 0,
    description: `${quest.title} (full-time)`,
    interval_type: quest.pay_interval || 'daily',
    next_send_at: nextDate.toISOString(),
    is_active: true,
    status: 'active',
    metadata: {
      acceptance_id: acceptance.id,
      quest_id: quest.id,
      item_name: quest.title,
      worker_name: workerName,
      player_posted: isPlayerPosted,
      pay_interval: quest.pay_interval || 'daily',
      hours_required: quest.downtime_cost || 0,
      source: 'questseek_full_time',
    },
  }

  if (existing) {
    await supabase.from('recurring_payments').update(payload).eq('id', existing.id)
  } else {
    await supabase.from('recurring_payments').insert(payload)
  }
}

async function cancelFullTimeSubscription(acceptanceId: string) {
  await supabase
    .from('recurring_payments')
    .update({ status: 'cancelled', is_active: false })
    .filter('metadata->>acceptance_id', 'eq', acceptanceId)
}

async function rejectPlayerApplication(posterId: string, { acceptanceId, notes }: { acceptanceId: string, notes?: string }) {
  const { data: acceptance, error: getErr } = await supabase
    .from('quest_acceptances')
    .select(`*, quests (id, posted_by_user_id)`)
    .eq('id', acceptanceId)
    .eq('status', 'pending_approval')
    .single()

  if (getErr || !acceptance) {
    return new Response(JSON.stringify({ error: 'Application not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  if (acceptance.quests.posted_by_user_id !== posterId) {
    return new Response(JSON.stringify({ error: 'Only the job poster can reject applications' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  await supabase.from('quest_acceptances').update({
    status: 'rejected',
    admin_notes: notes || 'Application rejected by poster.',
    completed_at: new Date().toISOString(),
  }).eq('id', acceptanceId)

  await cancelFullTimeSubscription(acceptanceId)

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function logQuestHours(userId: string, { questId, hours }: { questId: string, hours: number }) {
  if (!questId || !hours || hours <= 0) {
    return new Response(JSON.stringify({ error: 'questId and positive hours required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // Get quest and acceptance
  const { data: acceptance, error: accErr } = await supabase
    .from('quest_acceptances')
    .select('id, hours_logged, quest_id')
    .eq('quest_id', questId)
    .eq('user_id', userId)
    .eq('status', 'accepted')
    .single()

  if (accErr || !acceptance) {
    return new Response(JSON.stringify({ error: 'No active acceptance found for this quest' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const { data: quest } = await supabase
    .from('quests')
    .select('downtime_cost, title, available_quantity, job_type')
    .eq('id', questId)
    .single()

  if (!quest || quest.downtime_cost <= 0) {
    return new Response(JSON.stringify({ error: 'Quest has no downtime cost' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // Cap hours so we never bank more than (downtime_cost * available_quantity)
  // for commissions with limited slots. Full-time and unlimited (null) are uncapped.
  let hoursToLog = hours
  if (quest.job_type === 'commission' && quest.available_quantity !== null) {
    const maxBankable = quest.downtime_cost * Math.max(0, quest.available_quantity)
    const room = Math.max(0, maxBankable - (acceptance.hours_logged || 0))
    if (room <= 0) {
      return new Response(JSON.stringify({ error: 'You already have enough hours banked for every remaining slot.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    hoursToLog = Math.min(hours, room)
  }

  // Check downtime balance
  const { data: downtime } = await supabase
    .from('downtime_balances')
    .select('*')
    .eq('user_id', userId)
    .single()

  const currentBalance = downtime?.balance || 0

  if (currentBalance < hoursToLog) {
    return new Response(JSON.stringify({ error: `Not enough downtime. Have ${currentBalance}h, need ${hoursToLog}h.` }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // Deduct downtime
  if (downtime) {
    await supabase
      .from('downtime_balances')
      .update({ balance: currentBalance - hoursToLog, updated_at: new Date().toISOString() })
      .eq('id', downtime.id)
  }

  // Update hours_logged
  const newLogged = (acceptance.hours_logged || 0) + hoursToLog
  await supabase
    .from('quest_acceptances')
    .update({ hours_logged: newLogged })
    .eq('id', acceptance.id)

  // Log downtime activity
  await supabase
    .from('downtime_activities')
    .insert({
      user_id: userId,
      activity_type: 'quest_work',
      hours_spent: hoursToLog,
      notes: `Quest: ${quest.title} (${newLogged}/${quest.downtime_cost}h)`,
    })

  return new Response(JSON.stringify({ 
    success: true, 
    hoursLogged: newLogged,
    totalRequired: quest.downtime_cost,
    newBalance: currentBalance - hoursToLog,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}
