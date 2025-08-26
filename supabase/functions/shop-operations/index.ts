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
      case 'purchase_item':
        return await purchaseItem(user.id, params)
      case 'get_user_gear':
        return await getUserGear(user.id)
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
  // Get item details
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

  // Check quantity availability
  if (item.quantity_available && item.quantity_available < quantity) {
    return new Response(JSON.stringify({ error: 'Insufficient quantity available' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const totalCost = item.price * quantity

  // Get user's current credits
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

  // Check if user has enough credits (including negative limit of -6000)
  const newBalance = profile.credits - totalCost
  if (newBalance < -6000) {
    return new Response(JSON.stringify({ error: 'Insufficient funds. Would exceed credit limit.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // Begin transaction
  const { error: updateError } = await supabase.rpc('begin_transaction')
  
  try {
    // Update user credits
    const { error: creditError } = await supabase
      .from('profiles')
      .update({ credits: newBalance })
      .eq('user_id', userId)

    if (creditError) throw creditError

    // Update item quantity if limited
    if (item.quantity_available) {
      const { error: quantityError } = await supabase
        .from('shop_items')
        .update({ quantity_available: item.quantity_available - quantity })
        .eq('id', itemId)

      if (quantityError) throw quantityError
    }

    // Create purchase record
    const { error: purchaseError } = await supabase
      .from('purchases')
      .insert({
        user_id: userId,
        shop_item_id: itemId,
        quantity,
        total_cost: totalCost
      })

    if (purchaseError) throw purchaseError

    // Add to user augmentations (for @tunes tracking)
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

    // Create subscription if item has recurring fee
    let subscriptionCreated = false
    if (item.subscription_fee && item.subscription_interval) {
      const nextDate = new Date()
      nextDate.setDate(nextDate.getDate() + 1) // Start tomorrow

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

    // Create transaction record
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

    await supabase.rpc('commit_transaction')

    return new Response(JSON.stringify({ 
      success: true, 
      newBalance,
      subscriptionCreated 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    await supabase.rpc('rollback_transaction')
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