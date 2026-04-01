import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FIRST_NAMES = [
  "Ash", "Bren", "Cael", "Dara", "Eris", "Finn", "Gale", "Haze", "Iris", "Jade",
  "Kael", "Luna", "Mira", "Nyx", "Orin", "Pike", "Quinn", "Rook", "Sage", "Thane",
  "Uma", "Vale", "Wren", "Xara", "Yara", "Zev", "Aldric", "Brynn", "Corvus", "Delphine",
  "Ember", "Flint", "Garnet", "Hawthorn", "Ivy", "Jasper", "Kira", "Lark", "Moss", "Nova"
]

const SURNAMES = [
  "Ashford", "Blackthorn", "Coppervein", "Darkhollow", "Evershade", "Frostbane",
  "Grimshaw", "Hallowmere", "Ironwood", "Jadecrest", "Knightfall", "Longstrider",
  "Moonshadow", "Nightwhisper", "Oakenshield", "Pinecrest", "Quicksilver", "Ravenholm",
  "Stoneheart", "Thornwall", "Underhill", "Voidwalker", "Windchaser", "Yarrow", "Zephyrcrest"
]

const ANCESTRIES = [
  "Human", "Elf", "Dwarf", "Halfling", "Orc", "Gnome", "Tiefling",
  "Dragonborn", "Half-Elf", "Goblin", "Firbolg", "Genasi", "Aasimar"
]

const JOBS = [
  "Blacksmith", "Merchant", "Scholar", "Guard", "Healer", "Courier",
  "Bartender", "Hunter", "Farmer", "Scribe", "Alchemist", "Tailor",
  "Cook", "Miner", "Carpenter", "Fisher", "Herbalist", "Jeweler",
  "Sailor", "Stablehand", "Street Performer", "Fortune Teller",
  "Locksmith", "Bouncer", "Librarian", "Apothecary", "Brewer"
]

const COMMUNITIES = [
  "Highcourt", "Lostbarrow", "Duskhollow", "Silverfen", "Thornhaven",
  "Emberfall", "Gloomreach", "Brightwater", "Stonegate", "Willowmere"
]

const TAGS = [
  "Friendly", "Mysterious", "Cautious", "Bold", "Shy", "Ambitious",
  "Loyal", "Cunning", "Kind", "Fierce", "Scholarly", "Streetwise",
  "Charismatic", "Reserved", "Adventurous", "Practical", "Dreamer",
  "Skeptical", "Generous", "Stubborn", "Witty", "Stoic"
]

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, n)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const body = await req.json()
    const { action } = body

    if (action === 'generate') {
      // Generate a profile (client-side preview, no save yet)
      const filters = body.filters || {}
      
      const character_name = filters.character_name || `${pick(FIRST_NAMES)} ${pick(SURNAMES)}`
      const ancestry = filters.ancestry || pick(ANCESTRIES)
      const job = filters.job || pick(JOBS)
      const community = filters.community || pick(COMMUNITIES)
      const age = filters.age || (18 + Math.floor(Math.random() * 60))
      const tags = filters.tags?.length > 0 ? filters.tags : pickN(TAGS, 2 + Math.floor(Math.random() * 3))
      const search_purpose = filters.search_purpose || 'General'
      const compatibility = 40 + Math.floor(Math.random() * 55)

      // Generate bio with AI
      let bio = `A ${ancestry.toLowerCase()} ${job.toLowerCase()} from ${community}.`
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
      
      if (LOVABLE_API_KEY) {
        try {
          const bioResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-3-flash-preview',
              messages: [
                { role: 'system', content: 'You write short, colorful character bios for a fantasy RPG setting. Keep it to 2-3 sentences. Be creative and hint at personality. Do not use quotation marks around the bio.' },
                { role: 'user', content: `Write a brief bio for: ${character_name}, a ${age}-year-old ${ancestry} ${job} from ${community}. Personality tags: ${tags.join(', ')}. The player is searching for: ${search_purpose}.` }
              ]
            })
          })

          if (bioResponse.ok) {
            const bioData = await bioResponse.json()
            const generatedBio = bioData.choices?.[0]?.message?.content
            if (generatedBio) bio = generatedBio.trim()
          }
        } catch (e) {
          console.error('Bio generation failed, using fallback:', e)
        }
      }

      // Generate avatar with AI
      let avatar_url: string | null = null
      if (LOVABLE_API_KEY) {
        try {
          const imgResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-3.1-flash-image-preview',
              messages: [
                { role: 'user', content: `Fantasy RPG character portrait headshot, painterly style, dark moody background. ${ancestry}, ${age} years old, works as a ${job}. Personality: ${tags.join(', ')}. Head and shoulders only, no text.` }
              ],
              modalities: ['image', 'text']
            })
          })

          if (imgResponse.ok) {
            const imgData = await imgResponse.json()
            const imageB64 = imgData.choices?.[0]?.message?.images?.[0]?.image_url?.url
            
            if (imageB64) {
              // Extract base64 data and upload to storage
              const base64Data = imageB64.replace(/^data:image\/\w+;base64,/, '')
              const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))
              
              const fileName = `succubus/${crypto.randomUUID()}.png`
              const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
              const adminClient = createClient(supabaseUrl, serviceKey)
              
              const { error: uploadError } = await adminClient.storage
                .from('avatars')
                .upload(fileName, imageBytes, { contentType: 'image/png' })
              
              if (!uploadError) {
                const { data: urlData } = adminClient.storage.from('avatars').getPublicUrl(fileName)
                avatar_url = urlData.publicUrl
              } else {
                console.error('Upload error:', uploadError)
              }
            }
          }
        } catch (e) {
          console.error('Avatar generation failed:', e)
        }
      }

      return new Response(JSON.stringify({
        character_name,
        ancestry,
        job,
        community,
        age,
        bio,
        avatar_url,
        tags,
        search_purpose,
        compatibility
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    } else if (action === 'save') {
      // Save a swiped-right profile
      const profile = body.profile
      if (!profile?.character_name) {
        return new Response(JSON.stringify({ error: 'Profile data required' }), { status: 400, headers: corsHeaders })
      }

      const { data, error } = await supabase
        .from('succubus_profiles')
        .insert({
          created_by: user.id,
          character_name: profile.character_name,
          ancestry: profile.ancestry,
          job: profile.job,
          community: profile.community,
          age: profile.age,
          bio: profile.bio,
          avatar_url: profile.avatar_url,
          tags: profile.tags || [],
          search_purpose: profile.search_purpose || 'General',
          compatibility: profile.compatibility || 50,
        })
        .select()
        .single()

      if (error) {
        console.error('Save error:', error)
        return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders })
      }

      return new Response(JSON.stringify({ success: true, profile: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    } else {
      return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: corsHeaders })
    }

  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
  }
})
