import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify admin
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' })
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin only' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { items } = await req.json()
    if (!items || !Array.isArray(items)) {
      return new Response(JSON.stringify({ error: 'items array required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Map local store items to shop_items schema
    const rows = items.map((item: any) => ({
      name: item.name,
      price: item.priceUpfront,
      description: item.description || null,
      category: item.type || null,
      subscription_fee: item.priceSub || 0,
      subscription_interval: item.priceSub > 0 ? 'daily' : null,
      is_active: true,
      specifications: {
        tier: item.tier,
        company: item.company,
        advert: item.advert,
        ...(item.ability ? { ability: item.ability } : {}),
        ...(item.hand ? { hand: item.hand } : {}),
        ...(item.range ? { range: item.range } : {}),
        ...(item.damage ? { damage: item.damage } : {}),
        ...(item.armorBase !== undefined ? { armorBase: item.armorBase } : {}),
        ...(item.armorThreshold !== undefined ? { armorThreshold: item.armorThreshold } : {}),
      }
    }))

    // Insert in batches of 50
    let inserted = 0
    for (let i = 0; i < rows.length; i += 50) {
      const batch = rows.slice(i, i + 50)
      const { error } = await supabase.from('shop_items').insert(batch)
      if (error) {
        console.error('Batch insert error:', error)
        return new Response(JSON.stringify({ error: error.message, inserted }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      inserted += batch.length
    }

    return new Response(JSON.stringify({ success: true, inserted }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
