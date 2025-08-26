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
      case 'create_item':
        return await createItem(params)
      case 'update_item':
        return await updateItem(params)
      case 'delete_item':
        return await deleteItem(params)
      case 'get_all_items':
        return await getAllItems()
      case 'export_items':
        return await exportItems()
      case 'import_items':
        return await importItems(params)
      case 'add_item_to_user':
        return await addItemToUser(params)
      case 'get_user_subscriptions':
        return await getUserSubscriptions(params)
      default:
        return new Response(JSON.stringify({ error: 'Invalid operation' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
  } catch (error) {
    console.error('Shop admin error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

async function createItem(params: any) {
  const { error } = await supabase
    .from('shop_items')
    .insert(params)

  if (error) throw error

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function updateItem({ id, ...updates }: any) {
  const { error } = await supabase
    .from('shop_items')
    .update(updates)
    .eq('id', id)

  if (error) throw error

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function deleteItem({ id }: { id: string }) {
  const { error } = await supabase
    .from('shop_items')
    .update({ is_active: false })
    .eq('id', id)

  if (error) throw error

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function getAllItems() {
  const { data: items, error } = await supabase
    .from('shop_items')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error

  return new Response(JSON.stringify({ items }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function exportItems() {
  const { data: items, error } = await supabase
    .from('shop_items')
    .select('*')
    .eq('is_active', true)

  if (error) throw error

  // Convert to CSV format
  const headers = ['name', 'description', 'price', 'category', 'subscription_fee', 'subscription_interval', 'quantity_available']
  const csvContent = [
    headers.join(','),
    ...items.map(item => headers.map(header => {
      const value = item[header]
      return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value || ''
    }).join(','))
  ].join('\n')

  return new Response(csvContent, {
    headers: { 
      ...corsHeaders, 
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="shop_items.csv"'
    }
  })
}

async function importItems({ csvData }: { csvData: string }) {
  const lines = csvData.trim().split('\n')
  const headers = lines[0].split(',')
  const items = lines.slice(1).map(line => {
    const values = line.split(',')
    const item: any = {}
    headers.forEach((header, index) => {
      let value = values[index]?.replace(/^"|"$/g, '').replace(/""/g, '"')
      if (header === 'price' || header === 'subscription_fee' || header === 'quantity_available') {
        value = value ? parseInt(value) : (header === 'quantity_available' ? null : 0)
      }
      item[header] = value
    })
    return item
  })

  const { error } = await supabase
    .from('shop_items')
    .insert(items)

  if (error) throw error

  return new Response(JSON.stringify({ success: true, imported: items.length }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function addItemToUser({ userId, itemName, category }: { userId: string, itemName: string, category: string }) {
  const { error } = await supabase
    .from('user_augmentations')
    .insert({
      user_id: userId,
      name: itemName,
      category: category || 'equipment',
      metadata: {
        manually_added: true,
        added_by_admin: true
      }
    })

  if (error) throw error

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function getUserSubscriptions({ userId }: { userId?: string }) {
  let query = supabase
    .from('recurring_payments')
    .select(`
      *,
      profiles!to_user_id (
        character_name,
        user_id
      )
    `)

  if (userId) {
    query = query.eq('to_user_id', userId)
  }

  const { data: subscriptions, error } = await query.order('created_at', { ascending: false })

  if (error) throw error

  return new Response(JSON.stringify({ subscriptions }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}