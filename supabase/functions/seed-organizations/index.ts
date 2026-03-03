import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const organizations = [
  { name: "Biogen", quick_description: "Bio-engineering giant specializing in pharmaceuticals, genetic splicing, and organic cyberwear.", is_public: true },
  { name: "Void Systems", quick_description: "High-tech manufacturer of stealth systems, anti-gravity propulsion, and light-based weaponry.", is_public: true },
  { name: "Neuro-Corp", quick_description: "The leader in neural interfacing, social manipulation algorithms, and AI development.", is_public: true },
  { name: "Arcane Inc.", quick_description: "Industrialized magic corporation mass-producing wands, potions, and enchanted consumer goods.", is_public: true },
  { name: "Titan Heavy Industries", quick_description: "Mega-corp dominating heavy construction, mining, and super-heavy power armor manufacturing.", is_public: true },
  { name: "Apex Dynamics", quick_description: "Military-grade hardware manufacturer focusing on ballistics, precision optics, and tactical gear.", is_public: true },
  { name: "Bargain Bin", quick_description: "Ubiquitous discount retailer selling low-quality, generic, and surplus goods.", is_public: true },
  { name: "Brittlewisp Industries", quick_description: "Infrastructure and UI corporation specializing in hard-light holograms and illusion tech.", is_public: true },
  { name: "BHoldR", quick_description: "Youtube Equivalent.", is_public: true },
  { name: "Sending", quick_description: "Twitter Equivalent.", is_public: true },
  { name: "Wyrmcart", quick_description: "Amazon Equivalent.", is_public: true },
  { name: "Succubus", quick_description: "Tinder Equivalent.", is_public: true },
  { name: "Bloodstone Insurance", quick_description: "A predatory insurance firm specializing in high-risk coverage and trauma team dispatch.", is_public: true },
  { name: "Hex-Gear Foundries", quick_description: "Competitor to Titan/Arcane; manufactures heavy enchanted industrial machinery.", is_public: true },
  { name: "Zenith Systems", quick_description: "Competitor to Apex/Neuro; produces \"smart\" weapons with predictive AI targeting.", is_public: true },
  { name: "Chimera-Tech", quick_description: "Competitor to Biogen/Arcane; creates monstrous biological grafts and mutations.", is_public: true },
  { name: "Mammoth Heavy Works", quick_description: "Competitor to Titan; focuses on oversized, brute-force construction equipment and armor.", is_public: true },
  { name: "Keymaster Inc.", quick_description: "Professional locksmithing and digital security bypass services.", is_public: true },
  { name: "Beast-B-Good", quick_description: "Training and obedience services for magical familiars and exotic pets.", is_public: true },
  { name: "Aero-Clad Dynamics", quick_description: "Competitor to Titan/Void; specializes in flying power armor and heavy mobility.", is_public: true },
  { name: "Ink-Flow Studios", quick_description: "Cosmetic body-mod shop offering moving, glowing, or magical tattoos.", is_public: true },
  { name: "Heavy Handlers", quick_description: "A moving company utilizing automated golems for heavy lifting.", is_public: true },
  { name: "Bit-Fix", quick_description: "Repair shop specializing in cyberdecks and fried hacking hardware.", is_public: true },
  { name: "Mercury Logistics", quick_description: "Ultra-fast courier service utilizing high-speed bikes and reckless drivers.", is_public: true },
  { name: "Elixir Express", quick_description: "Delivery service for potions and alchemical consumables.", is_public: true },
  { name: "Dreamscape", quick_description: "Entertainment provider renting out SimSense and VR experiences.", is_public: true },
  { name: "Data-Pirates", quick_description: "Illegal service providers offering signal boosting and matrix access.", is_public: true },
  { name: "Slum-Lordz Inc.", quick_description: "Provider of squalid, bare-minimum housing solutions (dumpsters/pods).", is_public: true },
  { name: "Lingua-Soft", quick_description: "Provider of instant language-learning skill chips.", is_public: true },
  { name: "Wipe-It", quick_description: "Data security firm specializing in the permanent deletion of digital footprints.", is_public: true },
  { name: "Crystal-Eye", quick_description: "Magical surveillance service offering remote scrying.", is_public: true },
  { name: "Spectral Services", quick_description: "\"Pest control\" for spiritual entities and astral surveillance.", is_public: true },
  { name: "Silence Co.", quick_description: "Acoustic engineering firm providing sound-proofing for secure rooms.", is_public: true },
  { name: "REM-Tech", quick_description: "Entertainment service recording dreams for playback.", is_public: true },
  { name: "Scribe-Bot", quick_description: "Digitization service converting physical scrolls/books to data.", is_public: true },
  { name: "Cyber-Lube", quick_description: "Maintenance shop for tuning and greasing cybernetic limbs.", is_public: true },
  { name: "Recall Inc.", quick_description: "Memory management service for extracting and storing specific memories.", is_public: true },
  { name: "Clear-View", quick_description: "Cyber-optic technicians installing ad-blocking implants for AR.", is_public: true },
  { name: "Void-Storage", quick_description: "Storage provider utilizing extradimensional pocket spaces.", is_public: true },
  { name: "Iron-Clad", quick_description: "Vehicle workshop adding aftermarket ballistic plating to civilian cars.", is_public: true },
  { name: "Instant-Pro", quick_description: "Skillsoft rental service for temporary muscle memory downloads.", is_public: true },
  { name: "Tenement Corp.", quick_description: "Provider of \"Poor\" lifestyle housing; shared rooms and thin walls.", is_public: true },
  { name: "Ward-It", quick_description: "Home security service installing magical wards against intrusion.", is_public: true },
  { name: "Ley-Line Power", quick_description: "Utility company providing recharging services for magical batteries/items.", is_public: true },
  { name: "Cloud-Burst", quick_description: "Weather control service offering localized rain or sunshine.", is_public: true },
  { name: "Blink-Box", quick_description: "High-end courier service using teleportation circles for instant delivery.", is_public: true },
  { name: "Click-Farm", quick_description: "Reputation management service using bot farms to boost social scores.", is_public: true },
  { name: "Auto-Law", quick_description: "Legal defense service utilizing aggressive algorithmic lawyer-bots.", is_public: true },
  { name: "Panzer-Taxi", quick_description: "Heavily armored combat taxi service for dangerous commutes.", is_public: true },
  { name: "Sky-Hook", quick_description: "Emergency extraction service using armored helicopters.", is_public: true },
  { name: "Lazarus Group", quick_description: "Premium healthcare provider offering trauma team response and resurrection.", is_public: true },
  { name: "Haggle-Bot", quick_description: "Negotiation service for lowering ransom demands.", is_public: true },
  { name: "Djinn-Climate", quick_description: "Luxury HVAC service using bound elementals for perfect climate control.", is_public: true },
  { name: "Phylactery Inc.", quick_description: "Soul-storage service for holding spirits while bodies are repaired/cloned.", is_public: true },
  { name: "Spire Estates", quick_description: "Provider of \"Aristocratic\" lifestyle housing; massive estates with political immunity.", is_public: true },
  { name: "Orbital-Lux", quick_description: "Provider of \"Prestige\" lifestyle housing; space stations and floating palaces.", is_public: true },
  { name: "Swift Justice", quick_description: "The Jury subcontractor owned by Theo Titanswift.", is_public: false },
  { name: "Druids of the Sun", quick_description: "Solar Druids. Solar Power.", is_public: false },
  { name: "Druids of the Rot", quick_description: "Fossil Druids. Oil, Biomass, Coal.", is_public: false },
  { name: "Druids of the Phoenix", quick_description: "Nuclear Druids. Nuclear Power.", is_public: false },
  { name: "Druids of the Force", quick_description: "Kinetic Druids. Hydro, Wind, Geothermal.", is_public: false },
  { name: "Druids of the Beast", quick_description: "The Park Rangers. Powerless.", is_public: false },
  { name: "The Hoff Crime Family", quick_description: "The Hoff crime family has control of much of the Human district.", is_public: false },
  { name: "The Jury", quick_description: "The Jury put together by Swift Justice.", is_public: false },
  { name: "The Gnang", quick_description: "Trinker's Biker Gang.", is_public: false },
  { name: "The City", quick_description: "Raccassammeddi; the sprawling, layered cyberpunk metropolis where the campaign takes place.", is_public: false },
  { name: "The Pit Enclave", quick_description: "A lawless subterranean district beneath the city, home to outcasts and monsters.", is_public: false },
  { name: "The Cabal", quick_description: "A secretive shadow organization pulling strings behind corporate and magical affairs.", is_public: false },
  { name: "The Illumian University", quick_description: "The premier institution for higher learning, magical theory, and archaeological study.", is_public: false },
  { name: "The Peak", quick_description: "The exclusive upper-city district housing the ultra-wealthy and corporate elite.", is_public: false },
  { name: "Virgosa Investigations", quick_description: "A private detective agency handling cold cases and corporate espionage.", is_public: false },
  { name: "Spectral Suds", quick_description: "Specialized dry-cleaning service for removing magical residues and hazardous stains.", is_public: false },
  { name: "Pixel-Punk", quick_description: "Cosmetic service for intentionally glitching one's digital avatar/appearance.", is_public: false },
  { name: "Mind-Menders", quick_description: "Psychiatric service for diagnosing and treating cyber-psychosis.", is_public: false },
  { name: "Crime-Scene-Clean", quick_description: "Bio-hazard cleaning crews for post-combat messes.", is_public: false },
  { name: "Hunter's Guild", quick_description: "Bureaucratic office handling licenses and paperwork for bounty hunters.", is_public: false },
  { name: "Hex-Off", quick_description: "Magical clinic for removing minor curses and hexes.", is_public: false },
  { name: "Grease-Monkeys", quick_description: "Mechanic shop for personal vehicle repair and tuning.", is_public: false },
  { name: "Silver-Coat", quick_description: "Weapon modification service applying anti-monster coatings (silver/cold iron).", is_public: false },
  { name: "Hell-Law & Associates", quick_description: "Law firm specializing in infernal contract disputes and demon litigation.", is_public: false },
  { name: "Spirit-Away", quick_description: "Exorcism service for removing stubborn undead tenants.", is_public: false },
  { name: "Shadow-Eye", quick_description: "Private investigation firm utilizing drone surveillance.", is_public: false },
  { name: "Modular Living", quick_description: "Provider of \"Modest\" lifestyle housing; secure, boring, standard apartments.", is_public: false },
  { name: "Re-Pet", quick_description: "Cloning service for replacing deceased pets with genetic copies.", is_public: false },
  { name: "Meat-Grinder", quick_description: "\"Waste management\" service for disposing of large organic masses.", is_public: false },
  { name: "Face-Off", quick_description: "High-end bio-sculpting clinic for total facial reconstruction.", is_public: false },
  { name: "Eye-In-Sky", quick_description: "Aerial surveillance provider offering live drone feeds of locations.", is_public: false },
  { name: "Brute-Force", quick_description: "Staffing agency providing unskilled muscle and thugs for rent.", is_public: false },
  { name: "Sky-Rise Apts", quick_description: "Provider of \"Comfortable\" lifestyle housing; high-rise apartments with amenities.", is_public: false },
  { name: "New-U", quick_description: "Black-market service creating high-quality forged identities.", is_public: false },
  { name: "Gilded Cage", quick_description: "Provider of \"Wealthy\" lifestyle housing; mansions and secure compounds.", is_public: false },
  { name: "Dreamscape Data-Pirates", quick_description: "Entertainment provider renting out SimSense and VR experiences (illegal arm).", is_public: true }
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

    // Check existing to avoid duplicates
    const { data: existing } = await adminClient
      .from('organizations')
      .select('name')

    const existingNames = new Set((existing || []).map(o => o.name.toLowerCase()))

    const toInsert = organizations.filter(o => !existingNames.has(o.name.toLowerCase()))

    if (toInsert.length === 0) {
      return new Response(JSON.stringify({ message: 'All organizations already exist', inserted: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data, error } = await adminClient
      .from('organizations')
      .insert(toInsert)
      .select()

    if (error) throw error

    return new Response(JSON.stringify({
      message: `Inserted ${data.length} organizations, skipped ${organizations.length - toInsert.length}`,
      inserted: data.length,
      skipped: organizations.length - toInsert.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(error.message, { status: 500, headers: corsHeaders })
  }
})
