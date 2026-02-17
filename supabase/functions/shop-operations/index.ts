import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

async function resolveUserId(authUserId: string, targetUserId?: string): Promise<string> {
  if (!targetUserId || targetUserId === authUserId) return authUserId;
  
  // Verify caller is admin
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
      case 'purchase_item':
        return await purchaseItem(effectiveUserId, params)
      case 'get_user_gear':
        return await getUserGear(effectiveUserId)
      default:
        return new Response(JSON.stringify({ error: 'Invalid operation' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
  } catch (error) {
    console.error('Shop operations error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

async function purchaseItem(userId: string, { itemId, quantity = 1 }: { itemId: string, quantity?: number }) {
  const { data: item, error: itemError } = await supabase
    .from('shop_items')
    .select('*')
    .eq('id', itemId)
    .eq('is_active', true)
    .single()

  if (itemError || !item) {
    return new Response(JSON.stringify({ error: 'Item not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  if (item.quantity_available && item.quantity_available < quantity) {
    return new Response(JSON.stringify({ error: 'Insufficient quantity available' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const totalCost = item.price * quantity

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('credits')
    .eq('user_id', userId)
    .single()

  if (profileError || !profile) {
    return new Response(JSON.stringify({ error: 'User profile not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const newBalance = profile.credits - totalCost
  if (newBalance < -6000) {
    return new Response(JSON.stringify({ error: 'Insufficient funds. Would exceed credit limit.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    const { error: creditError } = await supabase
      .from('profiles')
      .update({ credits: newBalance })
      .eq('user_id', userId)

    if (creditError) throw creditError

    if (item.quantity_available) {
      const { error: quantityError } = await supabase
        .from('shop_items')
        .update({ quantity_available: item.quantity_available - quantity })
        .eq('id', itemId)

      if (quantityError) throw quantityError
    }

    const { error: purchaseError } = await supabase
      .from('purchases')
      .insert({
        user_id: userId,
        shop_item_id: itemId,
        quantity,
        total_cost: totalCost
      })

    if (purchaseError) throw purchaseError

    const { error: augError } = await supabase
      .from('user_augmentations')
      .insert({
        user_id: userId,
        name: item.name,
        category: item.category || 'equipment',
        metadata: {
          purchase_id: itemId,
          specifications: item.specifications,
          purchase_price: item.price,
          quantity
        }
      })

    if (augError) throw augError

    let subscriptionCreated = false
    if (item.subscription_fee && item.subscription_interval) {
      const nextDate = new Date()
      nextDate.setDate(nextDate.getDate() + 1)

      const { error: subError } = await supabase
        .from('recurring_payments')
        .insert({
          to_user_id: userId,
          amount: item.subscription_fee,
          description: `${item.name} subscription`,
          interval_type: item.subscription_interval,
          next_send_at: nextDate.toISOString(),
          metadata: {
            shop_item_id: itemId,
            item_name: item.name
          }
        })

      if (subError) throw subError
      subscriptionCreated = true
    }

    await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        amount: -totalCost,
        transaction_type: 'purchase',
        description: `Purchased ${quantity}x ${item.name}`,
        metadata: {
          shop_item_id: itemId,
          quantity,
          subscription_created: subscriptionCreated
        }
      })

    return new Response(JSON.stringify({ 
      success: true, 
      newBalance,
      subscriptionCreated 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    throw error
  }
}

async function getUserGear(userId: string) {
  const { data: gear, error } = await supabase
    .from('user_augmentations')
    .select('*')
    .eq('user_id', userId)
    .order('installed_at', { ascending: false })

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  return new Response(JSON.stringify({ gear }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}
