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
      case 'get_user_quests':
        return await getUserQuests(effectiveUserId)
      case 'get_downtime':
        return await getDowntime(effectiveUserId)
      case 'log_rest':
        return await logRest(effectiveUserId, params)
      case 'get_downtime_activities':
        return await getDowntimeActivities(effectiveUserId)
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

  // Get current balance
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

  // Deduct balance
  if (bal) {
    await supabase
      .from('downtime_balances')
      .update({ balance: currentBalance - hours_spent, updated_at: new Date().toISOString() })
      .eq('id', bal.id)
  } else {
    // Create with negative would be blocked, but shouldn't happen since we checked above
    await supabase
      .from('downtime_balances')
      .insert({ user_id: userId, balance: -hours_spent })
  }

  // Insert activity record
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

  if (quest.job_type === 'full_time') {
    const { data: existing } = await supabase
      .from('quest_acceptances')
      .select('id')
      .eq('quest_id', questId)
      .eq('user_id', userId)
      .eq('status', 'accepted')
      .single()

    if (existing) {
      return new Response(JSON.stringify({ error: 'Already employed in this job' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { error: acceptError } = await supabase
      .from('quest_acceptances')
      .insert({ quest_id: questId, user_id: userId, status: 'accepted' })

    if (acceptError) throw acceptError

    const intervalType = quest.pay_interval || 'daily'
    const { error: rpError } = await supabase
      .from('recurring_payments')
      .insert({
        to_user_id: userId,
        from_user_id: null,
        amount: quest.reward,
        interval_type: intervalType,
        description: `Full-time job: ${quest.title}`,
        next_send_at: new Date().toISOString(),
        status: 'active',
        is_active: true,
        metadata: { quest_id: questId, job_type: 'full_time' }
      })

    if (rpError) throw rpError

    return new Response(JSON.stringify({ success: true, jobType: 'full_time' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

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

  const { data: downtime } = await supabase
    .from('downtime_balances')
    .select('*')
    .eq('user_id', userId)
    .single()

  const currentBalance = downtime?.balance || 0

  if (quest.downtime_cost > 0 && currentBalance < quest.downtime_cost) {
    return new Response(JSON.stringify({ error: `Not enough downtime. Need ${quest.downtime_cost} hours, have ${currentBalance}.` }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  if (quest.downtime_cost > 0) {
    await supabase
      .from('downtime_balances')
      .update({ balance: currentBalance - quest.downtime_cost, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
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
    .eq('status', 'accepted')

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
        available_quantity, pay_interval
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error

  return new Response(JSON.stringify({ quests }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}
