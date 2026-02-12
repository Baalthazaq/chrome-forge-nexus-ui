
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const npcs = [
  {
    character_name: "Astrophe",
    ancestry: "Familiar (Cat)",
    character_class: "Sorcerer",
    subclass: "Elemental Origin",
    community: "Found Family",
    level: 3, credits: 50, credit_rating: 50,
    job: "Curious Anomaly Technician", company: "Freelance", age: 4,
    bio: "A \"Curious Anomaly Technician\" disguised as a feline, Astrophe is prone to glitching out of reality when startled. He has a habit of phasing through keyboards and accidentally deleting data.",
    notes: "A helpful but chaotic companion who assists Wyrd with tech but often causes as many problems as he solves.",
    agility: 5, strength: 1, finesse: 4, instinct: 5, presence: 3, knowledge: 4,
  },
  {
    character_name: "Ozymandias",
    ancestry: "Spider (Train)",
    character_class: "Wizard",
    subclass: "School of Knowledge",
    community: "Well-Read",
    level: 15, credits: 200, credit_rating: 200,
    job: "Librarian", company: "The Last Great Public Library", age: 250,
    bio: "A retiring train spider housing one of the last great public libraries on his back; he is currently molting and struggling to let go of his past role as a guardian of knowledge.",
    notes: "A father figure to Wyrd; he commands respect and offers wisdom, though their future connection is uncertain as he prepares for his next life stage.",
    agility: 2, strength: 6, finesse: 2, instinct: 5, presence: 5, knowledge: 6,
  },
  {
    character_name: "Eyric Gazebon",
    ancestry: "Firbolg (Firward)",
    character_class: "Bard",
    subclass: "Wordsmith",
    community: "Unbound",
    level: 2, credits: 30, credit_rating: 30,
    job: "Content Creator / Superfan", company: "Self-Employed", age: 28,
    bio: "A longtime superfan and top contributor to Wyrd's channels; he uses a hot avatar but has never revealed his true face. He gets jealous of new listeners. Username: Book-Khaki.",
    notes: "He is obsessed with Wyrd, bordering on possessive; a parasocial relationship that provides income but is becoming increasingly uncomfortable.",
    agility: 2, strength: 2, finesse: 3, instinct: 2, presence: 4, knowledge: 5,
  },
  {
    character_name: "Melissa Lockhart",
    ancestry: "Human (Short'r) / Halfling (Tallfellow)",
    character_class: "Bard",
    subclass: "Troubadour",
    community: "Dedicated",
    level: 3, credits: 60, credit_rating: 60,
    job: "Publicist", company: "Freelance", age: 29,
    bio: "A mousy, bookish publicist in a brown crocheted cardigan who is kind, helpful, and perpetually anxious. She used to be on track for the big leagues until a mysterious \"incident\" derailed her career.",
    notes: "She believes in Wyrd when no one else does; she is the frantic glue holding Wyrd's public image together, always pitching new ideas.",
    agility: 2, strength: 1, finesse: 3, instinct: 3, presence: 5, knowledge: 4,
  },
  {
    character_name: "Aunt Samantha",
    ancestry: "Human (Mage-Touched)",
    character_class: "Witch",
    subclass: "Hedge",
    community: "Close-Knit",
    level: 7, credits: 80, credit_rating: 80,
    job: "Medium / Psychic", company: "Self-Employed", age: 62,
    bio: "She was always doing readings, seances and the like. Often wondered what she would be like as a ghost. She sure did pick some strange works though. Her first choice, The Divine Comedy.",
    notes: "Aunty Samantha ran my first book club and started me off on this literary quest.",
    agility: 2, strength: 1, finesse: 2, instinct: 5, presence: 5, knowledge: 6,
  },
  {
    character_name: "Medusa Mead",
    ancestry: "Firbolg (Firward) + Satyr (Faun)",
    character_class: "Rogue",
    subclass: "Syndicate",
    community: "Scoundrel",
    level: 4, credits: 40, credit_rating: 40,
    job: "Grifter / Con Artist", company: "Self-Employed", age: 26,
    bio: "Andromeda's twin sister who lives a parallel life, often mistaken for Andromeda by authorities and creditors. This is by intent, as their parents only registered one of them.",
    notes: "A secret coworker and source of frustration; Andromeda often ends up paying for Medusa's mistakes, creating a tense, co-dependent dynamic.",
    agility: 4, strength: 2, finesse: 5, instinct: 3, presence: 4, knowledge: 2,
  },
  {
    character_name: "Stencil Ssassara",
    ancestry: "Kobold (Earth) + Firbolg (Firward) + Dragonborn (Green)",
    character_class: "Bard",
    subclass: "Troubadour",
    community: "Scoundrel",
    level: 5, credits: 90, credit_rating: 90,
    job: "Talent Agent", company: "Ssassara Talent Agency", age: 30,
    bio: "A chaotic genetic mix, Stencil is a fast-talking agent who promises the moon but delivers a flashlight. She is always juggling five phones and ten different scams.",
    notes: "She sees Andromeda as a meal ticket; she gets Andromeda work but often over-promises to clients, leaving Andromeda to clean up the mess.",
    agility: 4, strength: 1, finesse: 3, instinct: 3, presence: 6, knowledge: 2,
  },
  {
    character_name: "Eugene Wilbur Brown",
    ancestry: "Ribbet (Pond)",
    character_class: "Wizard",
    subclass: "School of War",
    community: "Privilege",
    level: 6, credits: 500, credit_rating: 500,
    job: "Corporate Executive", company: "Brown Industries", age: 48,
    bio: "A wealthy, high-maintenance client who requires constant validation and reassurance. He is a slimy corporate executive (literally and figuratively) with deep pockets.",
    notes: "Andromeda's number one client; he is a goldmine for corporate secrets, provided Andromeda can tolerate his endless neediness.",
    agility: 2, strength: 2, finesse: 2, instinct: 3, presence: 4, knowledge: 5,
  },
  {
    character_name: "Poppy Mead",
    ancestry: "Firbolg (Firward)",
    character_class: "Druid",
    subclass: "Beastbound",
    community: "Close-Knit",
    level: 8, credits: 20, credit_rating: 20,
    job: "Commune Elder", company: "Loxodon Commune", age: 55,
    bio: "Andromeda's mother, living in a Loxodon commune east of the city, totally disconnected from the cyberpunk dystopia. She speaks in riddles and smells of patchouli and compost.",
    notes: "She disapproves of Andromeda's city life, constantly trying to guilt her into returning to the \"natural way\" of the commune.",
    agility: 2, strength: 3, finesse: 2, instinct: 6, presence: 4, knowledge: 5,
  },
  {
    character_name: "Archdruid Solara Vane",
    ancestry: "Elf (High, Wood)",
    character_class: "Druid",
    subclass: "Way of the Elements",
    community: "Dedicated",
    level: 12, credits: 300, credit_rating: 300,
    job: "Archdruid / Energy Grid Manager", company: "City Power Authority", age: 180,
    bio: "An Archdruid who treats the power grid like a living forest, viewing clean energy as \"sap\" and fossil fuels as necromancy. She is calm, calculated, and intense about efficiency.",
    notes: "She respects Uji's tech obsession but views him as an eccentric; they bond over the \"flow\" of energy/data, though their philosophies differ.",
    agility: 3, strength: 2, finesse: 3, instinct: 6, presence: 5, knowledge: 5,
  },
  {
    character_name: "Socket",
    ancestry: "Shifter (Mammalian: Rat)",
    character_class: "Rogue",
    subclass: "Syndicate",
    community: "Low-Light Living",
    level: 5, credits: 150, credit_rating: 150,
    job: "Tech Dealer", company: "The Zero-Day Cache", age: 35,
    bio: "A paranoid hoarder running \"The Zero-Day Cache\" deep in the under-city. He speaks in clipped sentences and is terrified of corporate surveillance, obsessed with untrackable pre-collapse tech.",
    notes: "Uji is his \"whale\" and favorite customer; Socket trusts Uji enough to save the weirdest, rarest junk specifically for him.",
    agility: 5, strength: 1, finesse: 5, instinct: 6, presence: 2, knowledge: 4,
  },
  {
    character_name: "Kazimir \"The Piston\" Volkov",
    ancestry: "Orc (Jungle)",
    character_class: "Guardian",
    subclass: "Stalwart",
    community: "Nomadic Pack",
    level: 7, credits: 120, credit_rating: 120,
    job: "Enforcer", company: "Independent", age: 38,
    bio: "A massive, suit-wearing enforcer with a patch of moss growing on his shoulder where Uji healed him. He operates on strict \"Transactional Value\" and was mentally broken by Uji's act of free kindness.",
    notes: "He is paranoid and obsessed with Uji, stalking him to force a favor so he can repay the \"debt\" and restore his worldview of transactional balance.",
    agility: 3, strength: 6, finesse: 2, instinct: 4, presence: 4, knowledge: 2,
  },
  {
    character_name: "Fiddlesticks",
    ancestry: "Gnome (Redcap)",
    character_class: "Brawler",
    subclass: "Martial Artist",
    community: "Brave Face",
    level: 4, credits: 0, credit_rating: 0,
    job: "Gang Member [DECEASED]", company: "The Old Gang", age: 45,
    bio: "[DECEASED] A manic, violence-loving Redcap who wielded dual rusted rebar clubs like conductor batons. He died as he lived: laughing hysterically while charging a security bot that was way out of his league.",
    notes: "A symbol of reckless courage (and stupidity); Bash likely pours one out for him every year, remembering the chaos he brought to the crew.",
    agility: 4, strength: 4, finesse: 3, instinct: 2, presence: 3, knowledge: 1,
  },
  {
    character_name: "Inky",
    ancestry: "Gnome (Redcap)",
    character_class: "Rogue",
    subclass: "Night Walker",
    community: "Low-Light Living",
    level: 4, credits: 0, credit_rating: 0,
    job: "Infiltration Specialist [DECEASED]", company: "The Old Gang", age: 40,
    bio: "[DECEASED] The infiltration specialist, covered in midnight-blue camouflage tattoos and prone to disappearing acts. He vanished on a job years ago, and only his blood-soaked boots were ever found.",
    notes: "A lingering ghost of the past; his death represents the moment the \"fun\" stopped and the reality of the streets took over.",
    agility: 5, strength: 2, finesse: 6, instinct: 4, presence: 1, knowledge: 2,
  },
  {
    character_name: "Blinky",
    ancestry: "Gnome (Redcap)",
    character_class: "Ranger",
    subclass: "Wayfinder",
    community: "Brave Face",
    level: 3, credits: 0, credit_rating: 0,
    job: "Lookout [DECEASED]", company: "The Old Gang", age: 38,
    bio: "[DECEASED] The crew's paranoid lookout, equipped with cheap, twitchy optical sensors that never closed. He saw everything coming except the shot that finally took him out during the gang's collapse.",
    notes: "A source of survivor's guilt; he was the one who was supposed to keep everyone safe, and his failure haunts Bash.",
    agility: 4, strength: 2, finesse: 3, instinct: 6, presence: 1, knowledge: 2,
  },
  {
    character_name: "Twinkletoes",
    ancestry: "Gnome (Redcap)",
    character_class: "Brawler",
    subclass: "Juggernaut",
    community: "Scoundrel",
    level: 5, credits: 40, credit_rating: 40,
    job: "Gang Enforcer", company: "Independent", age: 52,
    bio: "The last of the \"old gang\" still in the life, a bitter and violent gnome who wears iron-shod boots for \"dancing\" on enemies. He hates that the world has moved on without him.",
    notes: "He views the PC as a traitor for leaving the gang, constantly guilting them about \"loyalty\" and the good old days.",
    agility: 3, strength: 4, finesse: 4, instinct: 3, presence: 3, knowledge: 1,
  },
  {
    character_name: "Barney \"Rattatouille\" Plaguecrust",
    ancestry: "Svirfneblin (Surface) + Shifter (Mammalian: Rat) + Fungril (Puff)",
    character_class: "Rogue",
    subclass: "Syndicate",
    community: "Scoundrel",
    level: 6, credits: 70, credit_rating: 70,
    job: "Information Broker / Gentleman Thief", company: "The Sewer Court", age: 44,
    bio: "A steampunk-aesthetic gangster who maintains a \"gentleman thief\" persona despite living in a sewer. He has the countenance and speech patterns of an old silent movie villain.",
    notes: "An old contact who provides information for a price; He comes to Bash for advice often, unaware of how he comes across.",
    agility: 4, strength: 2, finesse: 5, instinct: 4, presence: 4, knowledge: 3,
  },
  {
    character_name: "Cassie \"Applause\" Over-There",
    ancestry: "Kenku (Magpie)",
    character_class: "Rogue",
    subclass: "Syndicate",
    community: "Privilege",
    level: 5, credits: 200, credit_rating: 200,
    job: "Risk Assessor", company: "Apex Financial Corp", age: 32,
    bio: "An ex-ganger who went corporate, now working in risk assessment. She still has kleptomaniacal tendencies and steals office supplies or keycards out of habit.",
    notes: "She represents the \"sellout\" path; she looks down on the PC's lifestyle but secretly misses the thrill of the streets.",
    agility: 4, strength: 2, finesse: 5, instinct: 4, presence: 3, knowledge: 4,
  },
  {
    character_name: "Klara \"Grungy\" Khlorrgl",
    ancestry: "Orc (Aquatic) + Human (Short'r)",
    character_class: "Brawler",
    subclass: "Martial Artist",
    community: "Unbound",
    level: 4, credits: 80, credit_rating: 80,
    job: "Tech Supplier / Piercer", company: "Grungy's Mods & Piercings", age: 27,
    bio: "A blue-haired, pierced tech supplier who deals in grey market cybernetics. She has a grunge aesthetic and runs a shop that doubles as a piercing parlor.",
    notes: "A reliable supplier who holds a torch for the PC; she gives them the \"friends and family\" discount but complains about it the whole time.",
    agility: 3, strength: 4, finesse: 5, instinct: 3, presence: 3, knowledge: 3,
  },
  {
    character_name: "Phyrra \"Dive\" Tranelis",
    ancestry: "Elf (Wild, Painted) + Fungril (Toxic)",
    character_class: "Assassin",
    subclass: "Poisoners Guild",
    community: "Unbound",
    level: 5, credits: 60, credit_rating: 60,
    job: "Bartender", company: "The Gilded Fang", age: 34,
    bio: "An adrenaline junkie ex-ganger working at an upscale bar for criminals. She is permanently high on some new designer drug and glows faintly in the dark.",
    notes: "A source of rumors from the high-end criminal world; she tries to drag the PC into dangerous \"fun\" whenever they meet.",
    agility: 5, strength: 2, finesse: 4, instinct: 4, presence: 4, knowledge: 2,
  },
  {
    character_name: "Walter \"The Wall\" Henge",
    ancestry: "Giant (Stone, Hill, Fire)",
    character_class: "Guardian",
    subclass: "Stalwart",
    community: "Dedicated",
    level: 8, credits: 100, credit_rating: 100,
    job: "Community Sponsor", company: "Henge Community Center", age: 50,
    bio: "An ex-con turned sponsor for convicts trying to go straight. He is a gentle giant with ham-sized fists and a heart of gold, working out of a community center.",
    notes: "He is the PC's conscience; he is constantly trying to get the PC to retire fully and live a clean life, acting as a disappointed big brother.",
    agility: 2, strength: 6, finesse: 1, instinct: 3, presence: 5, knowledge: 3,
  },
  {
    character_name: "Dexter \"Thumbs\" Tumble",
    ancestry: "Dwarf (Exile)",
    character_class: "Rogue",
    subclass: "Syndicate",
    community: "Steady",
    level: 6, credits: 300, credit_rating: 300,
    job: "Pawn Broker / Fence", company: "Tumble's Pawn & Appraisal", age: 65,
    bio: "An old-country exile running a pawn shop and fence operation. He dresses like a leather-daddy biker and appraises stolen jewels with a jeweler's loupe.",
    notes: "The primary fence for the PC's ill-gotten gains; he is grumpy and stingy but strictly honorable when it comes to a deal.",
    agility: 2, strength: 3, finesse: 5, instinct: 4, presence: 3, knowledge: 5,
  },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single()

    if (!roleData) {
      return new Response('Forbidden - Admin access required', { status: 403, headers: corsHeaders })
    }

    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Check existing names to avoid duplicates
    const { data: existingProfiles } = await adminClient
      .from('profiles')
      .select('character_name')
    
    const existingNames = new Set((existingProfiles || []).map(p => p.character_name?.toLowerCase()))

    const results: any[] = []

    for (const npc of npcs) {
      if (existingNames.has(npc.character_name.toLowerCase())) {
        results.push({ name: npc.character_name, status: 'skipped', reason: 'already exists' })
        continue
      }

      try {
        const randomEmail = `npc_${Date.now()}_${Math.random().toString(36).substring(7)}@nexus.game`
        const randomPassword = `npc_${Math.random().toString(36).substring(7)}`

        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
          email: randomEmail,
          password: randomPassword,
          email_confirm: true,
          user_metadata: { character_name: npc.character_name, is_npc: true }
        })

        if (authError) {
          results.push({ name: npc.character_name, status: 'error', reason: authError.message })
          continue
        }

        await adminClient.from('profiles').upsert({
          user_id: authData.user.id,
          character_name: npc.character_name,
          ancestry: npc.ancestry,
          character_class: npc.character_class,
          level: npc.level,
          credits: npc.credit_rating,
          credit_rating: npc.credit_rating,
          job: npc.job,
          company: npc.company,
          age: npc.age,
          bio: npc.bio,
          notes: npc.notes,
          agility: npc.agility,
          strength: npc.strength,
          finesse: npc.finesse,
          instinct: npc.instinct,
          presence: npc.presence,
          knowledge: npc.knowledge,
          is_searchable: true,
        }, { onConflict: 'user_id' })

        await adminClient.from('character_sheets').upsert({
          user_id: authData.user.id,
          class: npc.character_class,
          subclass: npc.subclass,
          community: npc.community,
          ancestry: npc.ancestry,
          level: npc.level,
        }, { onConflict: 'user_id' })

        results.push({ name: npc.character_name, status: 'created' })
      } catch (e) {
        results.push({ name: npc.character_name, status: 'error', reason: e.message })
      }
    }

    const created = results.filter(r => r.status === 'created').length
    const skipped = results.filter(r => r.status === 'skipped').length
    const errors = results.filter(r => r.status === 'error').length

    return new Response(JSON.stringify({
      summary: `Created: ${created}, Skipped: ${skipped}, Errors: ${errors}`,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(error.message, { status: 500, headers: corsHeaders })
  }
})
