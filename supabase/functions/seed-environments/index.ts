import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify admin
    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: roleData } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin only' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const environments = [
      // ===== TIER 1 =====
      {
        name: "Abandoned Grove",
        tier: 1,
        environment_type: "Exploration",
        difficulty: "11",
        impulses: ["Draw in the curious", "echo the past"],
        potential_adversaries: "Beasts (Bear, Dire Wolf, Glass Snake), Grove Guardians (Minor Treant, Sylvan Soldier, Young Dryad)",
        features: [
          { name: "Overgrown Battlefield", type: "Passive", description: "There has been a battle here. A PC can make an Instinct Roll to identify evidence of that fight. On a success with Hope, learn all three pieces of information below. On a success with Fear, learn two. On a failure, a PC can mark 3 Stress to learn one and gain advantage on the next action roll to investigate this environment. A PC with an appropriate background or Experience can learn an additional detail and ask a follow-up question about the scene and get a truthful (if not always complete) answer. - Traces of a battle (broken weapons and branches, gouges in the ground) litter the ground. - A moss-covered tree trunk is actually the corpse of a treant. - Still-standing trees are twisted in strange ways, as if by powerful magic." },
          { name: "Barbed Vines", type: "Action", description: "Pick a point within the grove. All targets within Very Close range of that point must succeed on an Agility Reaction Roll or take 1d8+3 physical damage and become Restrained by barbed vines. Restrained lasts until they're freed with a successful Finesse or Strength roll or by dealing at least 6 damage to the vines." },
          { name: "You Are Not Welcome Here", type: "Action", description: "A Young Dryad, two Sylvan Soldiers, and a number of Minor Treants equal to the number of PCs appear to confront the party for their intrusion." },
          { name: "Defiler", type: "Action", description: "Spend a Fear to summon a Minor Chaos Adversary drawn to the echoes of violence and discord. They appear within Far range of a chosen PC and immediately take the spotlight." },
        ],
      },
      {
        name: "Ambushed",
        tier: 1,
        environment_type: "Event",
        difficulty: "Special (see Relative Strength)",
        impulses: ["Overwhelm", "scatter", "surround"],
        potential_adversaries: "Any",
        features: [
          { name: "Relative Strength", type: "Passive", description: "The Difficulty of this environment equals that of the adversary with the highest Difficulty." },
          { name: "Surprise!", type: "Action", description: "The ambushers reveal themselves to the party, you gain 2 Fear, and the spotlight immediately shifts to one of the ambushing adversaries." },
        ],
      },
      {
        name: "Ambushers",
        tier: 1,
        environment_type: "Event",
        difficulty: "Special (see Relative Strength)",
        impulses: ["Escape", "group up", "protect the most vulnerable"],
        potential_adversaries: "Any",
        features: [
          { name: "Relative Strength", type: "Passive", description: "The Difficulty of this environment equals that of the adversary with the highest Difficulty." },
          { name: "Where Did They Come From?", type: "Reaction", description: "When a PC starts the ambush on unsuspecting adversaries, you lose 2 Fear and the first attack roll a PC makes has advantage." },
        ],
      },
      {
        name: "Bustling Marketplace",
        tier: 1,
        environment_type: "Social",
        difficulty: "10",
        impulses: ["Buy low", "sell high", "tempt and tantalize with wares from near and far"],
        potential_adversaries: "Guards (Bladed Guard, Head Guard), Masked Thief, Merchant",
        features: [
          { name: "Tip the Scales", type: "Passive", description: "PCs can gain advantage on a Presence Roll by offering a handful of gold as part of the interaction. Will any coin be accepted, or only local currency? How overt are the PCs in offering this bribe?" },
          { name: "Unexpected Find", type: "Action", description: "Reveal to the PCs that one of the merchants has something they want or need, such as food from their home, a rare book, magical components, a dubious treasure map, or a magical key. What cost beyond gold will the merchant ask for in exchange for this rarity?" },
          { name: "Sticky Fingers", type: "Action", description: "A thief tries to steal something from a PC. The PC must succeed on an Instinct Roll to notice the thief or lose an item of the GM's choice as the thief escapes to a Close distance. To retrieve the stolen item, the PCs must complete a Progress Countdown (6) to chase down the thief before the thief completes a Consequence Countdown (4) and escapes to their hideout." },
          { name: "Crowd Control", type: "Reaction", description: "When one of the PCs splits from the group, the crowds shift and cut them off from the party." },
        ],
      },
      {
        name: "Cliffside Ascent",
        tier: 1,
        environment_type: "Traversal",
        difficulty: "12",
        impulses: ["Cast the unwary down to a rocky doom", "draw people in with promise of what lies at the top"],
        potential_adversaries: "Construct, Deeproot Defender, Giant Scorpion, Glass Snake",
        features: [
          { name: "The Climb", type: "Passive", description: "Climbing up the cliffside uses a Progress Countdown (12). It ticks down according to the following criteria when the PCs make an action roll to climb: Critical Success: Tick down 3. Success with Hope: Tick down 2. Success with Fear: Tick down 1. Failure with Hope: No advancement. Failure with Fear: Tick up 1. When the countdown triggers, the party has made it to the top of the cliff." },
          { name: "Pitons Left Behind", type: "Passive", description: "Previous climbers left behind large metal rods that climbers can use to aid their ascent. If a PC using the pitons fails an action roll to climb, they can mark a Stress instead of ticking the countdown up." },
          { name: "Fall", type: "Action", description: "Spend a Fear to have a PC's handhold fail, plummeting them toward the ground. If they aren't saved on the next action, they must make a roll; tick up the countdown by 1, and they take 1d12 physical damage if the countdown is between 8 and 12, 2d12 between 4 and 7, and 3d12 at 3 or lower." },
        ],
      },
      {
        name: "Local Tavern",
        tier: 1,
        environment_type: "Social",
        difficulty: "10",
        impulses: ["Provide opportunities for adventurers", "nurture community"],
        potential_adversaries: "Guards (Bladed Guard, Head Guard), Mercenaries (Harrier, Sellsword, Spellblade, Weaponmaster), Merchant",
        features: [
          { name: "What's the Talk of the Town?", type: "Passive", description: "A PC can ask the bartender, staff, or patrons about local events, rumors, and potential work with a Presence Roll. On a success, they can pick two details to learn—or three if they critically succeed. On a failure, they can pick one and mark a Stress." },
          { name: "Sing for Your Supper", type: "Passive", description: "A PC can perform one time for the guests by making a Presence Roll. On a success, they earn 1d4 handfuls of gold (2d4 if they critically succeed). On a failure, they mark a Stress." },
          { name: "Mysterious Stranger", type: "Action", description: "Reveal a stranger concealing their identity, lurking in a shaded booth." },
          { name: "Someone Comes to Town", type: "Action", description: "Introduce a significant NPC who wants to hire the party for something or who relates to a PC's background." },
          { name: "Bar Fight", type: "Action", description: "Spend a Fear to have a bar fight erupt in the tavern. When a PC tries to move through the tavern while the fight persists, they must succeed on an Agility or Presence Roll or take 1d6+2 physical damage from a wild swing or thrown object. A PC can try to activate this feature by succeeding on an action roll that would provoke tavern patrons." },
        ],
      },
      {
        name: "Outpost Town",
        tier: 1,
        environment_type: "Social",
        difficulty: "12",
        impulses: ["Drive the desperate to certain doom", "profit off of ragged hope"],
        potential_adversaries: "Jagged Knife Bandits (Hexer, Kneebreaker, Lackey, Lieutenant, Shadow, Sniper), Masked Thief, Merchant",
        features: [
          { name: "Rumors Abound", type: "Passive", description: "Gossip is the fastest-traveling currency in the realm. A PC can inquire about major events by making a Presence Roll. Critical Success: Learn about two major events plus one follow-up question. Success with Hope: Learn about two events. Success with Fear: Learn an alarming rumor. Any Failure: Mark a Stress to learn one relevant rumor." },
          { name: "Society of the Broken Compass", type: "Passive", description: "An adventuring society maintains a chapterhouse here, where heroes meet to exchange news and rumors, drink to their imagined successes, and scheme to undermine their rivals." },
          { name: "Rival Party", type: "Passive", description: "Another adventuring party is here, seeking the same treasure or leads as the PCs." },
          { name: "It'd Be a Shame If Something Happened to Your Store", type: "Action", description: "The PCs witness as agents of a local crime boss shake down a general goods store." },
          { name: "Wrong Place, Wrong Time", type: "Reaction", description: "At night, or when the party is alone in a back alley, you can spend a Fear to introduce a group of thieves who try to rob them. The thieves appear at Close range and include a Jagged Knife Kneebreaker, as many Lackeys as there are PCs, and a Lieutenant." },
        ],
      },
      {
        name: "Raging River",
        tier: 1,
        environment_type: "Traversal",
        difficulty: "10",
        impulses: ["Bar crossing", "carry away the unready", "divide the land"],
        potential_adversaries: "Beasts (Bear, Glass Snake), Jagged Knife Bandits (Hexer, Kneebreaker, Lackey, Lieutenant, Shadow, Sniper)",
        features: [
          { name: "Dangerous Crossing", type: "Passive", description: "Crossing the river requires the party to complete a Progress Countdown (4). A PC who rolls a failure with Fear is immediately targeted by the Undertow action without requiring a Fear to be spent." },
          { name: "Undertow", type: "Action", description: "Spend a Fear to catch a PC in the undertow. They must make an Agility Reaction Roll. On a failure, they take 1d6+1 physical damage and are moved a Close distance down the river, becoming Vulnerable until they get out. On a success, they must mark a Stress." },
          { name: "Patient Hunter", type: "Action", description: "Spend a Fear to summon a Glass Snake within Close range of a chosen PC. The Snake appears in or near the river and immediately takes the spotlight to use their Spinning Serpent action." },
        ],
      },
      // ===== TIER 2 =====
      {
        name: "Cult Ritual",
        tier: 2,
        environment_type: "Event",
        difficulty: "14",
        impulses: ["Profane the land", "unite the Mortal Realm with the Circles Below"],
        potential_adversaries: "Cult of the Fallen (Cult Adept, Cult Fang, Cult Initiate, Secret-Keeper)",
        features: [
          { name: "Desecrated Ground", type: "Passive", description: "Cultists dedicated this place to the Fallen Gods, and their foul influence seeps into it. Reduce the PCs' Hope Die to a d10 while in this environment. The desecration can be removed with a Progress Countdown (6)." },
          { name: "Blasphemous Might", type: "Action", description: "A portion of the ritual's power is diverted into a cult member to fight off interlopers. Choose one adversary to become Imbued with terrible magic until the scene ends or they're defeated. An Imbued adversary immediately takes the spotlight and gains one of the following benefits, or all three if you spend a Fear: advantage on all attacks, extra 1d10 damage, or Relentless (2)." },
          { name: "The Summoning", type: "Reaction", description: "Countdown (6). When the PCs enter the scene or the cult begins the ritual, activate the countdown. The countdown ticks down when a PC rolls with Fear. When it triggers, summon a Minor Demon within Very Close range of the ritual's leader. If the leader is defeated, the countdown ends with no effect." },
          { name: "Complete the Ritual", type: "Reaction", description: "If the ritual's leader is targeted by an attack or spell, an ally within Very Close range of them can mark a Stress to be targeted by that attack or spell instead." },
        ],
      },
      {
        name: "Hallowed Temple",
        tier: 2,
        environment_type: "Social",
        difficulty: "13",
        impulses: ["Connect the Mortal Realm with the Hallows Above", "display the power of the divine", "provide aid and succor to the faithful"],
        potential_adversaries: "Guards (Archer Guard, Bladed Guard, Head Guard)",
        features: [
          { name: "A Place of Healing", type: "Passive", description: "A PC who takes a rest in the Hallowed Temple automatically clears all HP." },
          { name: "Divine Guidance", type: "Passive", description: "A PC who prays to a deity while in the Hallowed Temple can make an Instinct Roll to receive answers. If the god they beseech isn't welcome in this temple, roll with disadvantage. Critical Success: Clear information plus 1d4 Hope to distribute. Success with Hope: Clear information. Success with Fear: Brief flashes of insight. Any Failure: Vague flashes; mark a Stress for one clear image." },
          { name: "Restless Hope", type: "Reaction", description: "Once per scene, each PC can mark a Stress to turn a result with Fear into a result with Hope." },
          { name: "Divine Censure", type: "Reaction", description: "When the PCs have trespassed, blasphemed, or offended the clergy, you can spend a Fear to summon a High Seraph and 1d4 Bladed Guards within Close range of the senior priest." },
        ],
      },
      {
        name: "Haunted City",
        tier: 2,
        environment_type: "Exploration",
        difficulty: "14",
        impulses: ["Misdirect and disorient", "replay apocalypses both public and personal"],
        potential_adversaries: "Ghosts (Spectral Archer, Spectral Captain, Spectral Guardian), ghostly versions of other adversaries (see Ghostly Form)",
        features: [
          { name: "Buried Knowledge", type: "Passive", description: "The city has countless mysteries to unfold. A PC who seeks knowledge about the fallen city can make an Instinct or Knowledge Roll to learn about this place. Critical Success: Gain valuable information and a related useful item. Success with Hope: Gain valuable information. Success with Fear: Uncover vague or incomplete information. Any Failure: Mark a Stress to find a lead after an exhaustive search." },
          { name: "Ghostly Form", type: "Passive", description: "Adversaries who appear here are of a ghostly form. They have resistance to physical damage and can mark a Stress to move up to Close range through solid objects." },
          { name: "Dead Ends", type: "Action", description: "The ghosts of an earlier era manifest scenes from the past, such as a street festival, a city council, or a heist. These hauntings change the layout of the city around the PCs, blocking the way behind them, forcing a detour, or presenting them with a challenge." },
          { name: "Apocalypse Then", type: "Action", description: "Spend a Fear to manifest the echo of a past disaster that ravaged the city. Activate a Progress Countdown (5) as the disaster replays around the PCs. To complete the countdown and escape the catastrophe, the PCs must overcome threats such as rampaging fires, stampeding civilians, collapsing buildings, or crumbling streets." },
        ],
      },
      {
        name: "Mountain Pass",
        tier: 2,
        environment_type: "Traversal",
        difficulty: "15",
        impulses: ["Exact a chilling toll in supplies and stamina", "reveal magical slumber", "slow down travel"],
        potential_adversaries: "Beasts (Bear, Giant Eagle, Glass Snake), Chaos Skull, Minotaur Wrecker, Mortal Hunter",
        features: [
          { name: "Engraved Sigils", type: "Passive", description: "Large markings and engravings have been made in the mountainside. A PC with a relevant background or Experience identifies them as weather magic increasing the power of the icy winds. A PC who succeeds on a Knowledge Roll can recall information about the sigils, potential information about their creators, and the knowledge of how to dispel them. If a PC critically succeeds, they recognize the sigils are of a style created by highborne enchanters and gain advantage on a roll to dispel them." },
          { name: "Avalanche", type: "Action", description: "Spend a Fear to carve the mountain with an icy torrent, causing an avalanche. All PCs in its path must succeed on an Agility or Strength Reaction Roll or be bowled over and carried down the mountain. Targets who fail are knocked to Far range, take 2d20 physical damage, and must mark a Stress. Targets who succeed must mark a Stress. A PC using rope, pitons, or other climbing gear gains advantage." },
          { name: "Raptor Nest", type: "Reaction", description: "When the PCs enter the raptors' hunting grounds, two Giant Eagles appear at Very Far range of a chosen PC, identifying the PCs as likely prey." },
          { name: "Icy Winds", type: "Reaction", description: "Countdown (Loop 4). When the PCs enter the mountain pass, activate the countdown. When it triggers, all characters must succeed on a Strength Reaction Roll or mark a Stress. A PC wearing clothes appropriate for extreme cold gains advantage." },
        ],
      },
      // ===== TIER 3 =====
      {
        name: "Burning Heart of the Woods",
        tier: 3,
        environment_type: "Exploration",
        difficulty: "16",
        impulses: ["Beat out an uncanny rhythm for all to follow", "corrupt the woods"],
        potential_adversaries: "Beasts (Bear, Glass Snake), Elementals (Elemental Spark), Verdant Defenders (Dryad, Oak Treant, Stag Knight)",
        features: [
          { name: "Chaos Magic Locus", type: "Passive", description: "When a PC makes a Spellcast Roll, they must roll two Fear Dice and take the higher result." },
          { name: "The Indigo Flame", type: "Passive", description: "PCs who approach the central tree can make a Knowledge Roll to identify the magic. On a success: Learn three details (two on Fear). On a failure: Mark a Stress for one detail. Details: This is Fallen magic. The corruption is spread through the ashen moss. It can be cleansed only by a ritual of nature magic with a Progress Countdown (8)." },
          { name: "Grasping Vines", type: "Action", description: "Animate vines bristling with thorns whip out from the underbrush. A target must succeed on an Agility Reaction Roll or become Restrained and Vulnerable until they break free with a Finesse or Strength Roll or by dealing 10 damage to the vines. When the target makes a roll to escape, they take 1d8+4 physical damage and lose a Hope." },
          { name: "Charcoal Constructs", type: "Action", description: "Warped animals wreathed in indigo flame trample through a point of your choice. All targets within Close range must make an Agility Reaction Roll. Targets who fail take 3d12+3 physical damage. Targets who succeed take half damage." },
          { name: "Choking Ash", type: "Reaction", description: "Countdown (Loop 6). When the PCs enter, activate the countdown. When it triggers, all characters must make a Strength or Instinct Reaction Roll. Targets who fail take 4d6+5 direct physical damage. Targets who succeed take half damage. Protective masks or clothes give advantage." },
        ],
      },
      {
        name: "Castle Siege",
        tier: 3,
        environment_type: "Event",
        difficulty: "17",
        impulses: ["Bleed out the will to fight", "breach the walls", "build tension"],
        potential_adversaries: "Mercenaries (Harrier, Sellsword, Spellblade, Weaponmaster), Noble Forces (Archer Squadron, Conscript, Elite Soldier, Knight of the Realm)",
        features: [
          { name: "Secret Entrance", type: "Passive", description: "A PC can find or recall a secret way into the castle with a successful Instinct or Knowledge Roll." },
          { name: "Siege Weapons (Environment Change)", type: "Action", description: "Consequence Countdown (5). The attacking force deploys siege weapons to raze the defenders' fortifications. When the countdown triggers, the defenders' fortifications have been breached and the attackers flood in. You gain 2 Fear, then shift to the Pitched Battle environment and spotlight it." },
          { name: "Reinforcements", type: "Action", description: "Summon a Knight of the Realm, a number of Tier 3 Minions equal to the number of PCs, and two adversaries of your choice within Far range of a chosen PC. The Knight immediately takes the spotlight." },
          { name: "Collateral Damage", type: "Reaction", description: "When an adversary is defeated, you can spend a Fear to have a stray attack from a siege weapon hit a point on the battlefield. All targets within Very Close range must make an Agility Reaction Roll. Targets who fail take 3d8+3 physical or magic damage and must mark a Stress. Targets who succeed must mark a Stress." },
        ],
      },
      {
        name: "Pitched Battle",
        tier: 3,
        environment_type: "Event",
        difficulty: "17",
        impulses: ["Seize people, land, and wealth", "spill blood for greed and glory"],
        potential_adversaries: "Mercenaries (Sellsword, Harrier, Spellblade, Weaponmaster), Noble Forces (Archer Squadron, Conscript, Elite Soldier, Knight of the Realm)",
        features: [
          { name: "Adrift on a Sea of Steel", type: "Passive", description: "Traversing a battlefield during active combat is extremely dangerous. A PC must succeed on an Agility Roll to move at all, and can only go up to Close range on a success. If an adversary is within Melee range, they must mark a Stress to make an Agility Roll to move." },
          { name: "Raze and Pillage", type: "Action", description: "The attacking force raises the stakes by lighting a fire, stealing a valuable asset, kidnapping an important person, or killing the populace." },
          { name: "War Magic", type: "Action", description: "Spend a Fear as a mage uses large-scale destructive magic. Pick a point within Very Far range of the mage. All targets within Close range must make an Agility Reaction Roll. Targets who fail take 3d12+8 magic damage and must mark a Stress." },
          { name: "Reinforcements", type: "Action", description: "Summon a Knight of the Realm, a number of Tier 3 Minions equal to the number of PCs, and two adversaries of your choice within Far range of a chosen PC. The Knight immediately takes the spotlight." },
        ],
      },
      // ===== TIER 4 =====
      {
        name: "Chaos Realm",
        tier: 4,
        environment_type: "Traversal",
        difficulty: "20",
        impulses: ["Annihilate certainty", "consume power", "defy logic"],
        potential_adversaries: "Outer Realms Monstrosities (Abomination, Corruptor, Thrall)",
        features: [
          { name: "Impossible Architecture", type: "Passive", description: "Up is down, down is right, right is a stairway. Gravity and directionality are in flux, requiring a Progress Countdown (8) to traverse. On a failure, a PC must mark a Stress in addition to the roll's other consequences." },
          { name: "Everything You Are This Place Will Take from You", type: "Action", description: "Countdown (Loop 14). When it triggers, all PCs must succeed on a Presence Reaction Roll or their highest trait is temporarily reduced by 1d4 unless they mark a number of Stress equal to its value. Lost trait points are regained on a critical success or escaping the Chaos Realm." },
          { name: "Unmake", type: "Action", description: "On a failure, they take 4d10 direct magic damage. On a success, they must mark a Stress." },
          { name: "Outer Realms Predators", type: "Action", description: "Spend a Fear to summon an Outer Realms Abomination, an Outer Realms Corruptor, and 2d6 Outer Realms Thralls at Close range of a chosen PC. Immediately spotlight one of these adversaries; spend an additional Fear to automatically succeed on that adversary's standard attack." },
          { name: "Disorienting Reality", type: "Reaction", description: "On a result with Fear, you can ask the PC to describe which of their fears the Chaos Realm evokes as a vision of reality unmakes and reconstitutes itself. The PC loses a Hope. If it is their last Hope, you gain a Fear." },
        ],
      },
      {
        name: "Divine Usurpation",
        tier: 4,
        environment_type: "Event",
        difficulty: "20",
        impulses: ["Ascend to godhood", "break the divine order", "consume celestial power"],
        potential_adversaries: "Fallen Shock Troops, the Usurper and their forces",
        features: [
          { name: "Final Preparations", type: "Passive", description: "Designate one adversary as the Usurper seeking to overthrow the gods. Activate a Long-Term Countdown (8) as they assemble what they need. When it triggers, spotlight this environment to use the Beginning of the End feature. While in play, you can hold up to 15 Fear." },
          { name: "Divine Blessing", type: "Passive", description: "When a PC critically succeeds, they can spend 2 Hope to refresh an ability normally limited by uses (such as once per rest, once per session)." },
          { name: "Defiers Abound", type: "Action", description: "Spend 2 Fear to summon 1d4+2 Fallen Shock Troops that appear within Close range of the Usurper. Immediately spotlight the Shock Troops to use a Group Attack action." },
          { name: "Godslayer", type: "Action", description: "If the Divine Siege Countdown has triggered, spend 3 Fear to describe the Usurper slaying one of the gods, feasting upon their power. The Usurper clears 2 HP. Increase their Difficulty, damage, attack modifier, or give them a new feature from the slain god." },
          { name: "Beginning of the End", type: "Reaction", description: "When the Final Preparations countdown triggers, the Usurper begins hammering on the gates of the Hallows. Activate a Divine Siege Countdown (10). Spotlight the Usurper to tick down by 1. If the Usurper takes Major or greater damage, tick up by 1. When it triggers, the Usurper shatters the barrier between the Mortal Realm and the Hallows Above. You gain a Fear for each unmarked HP the Usurper has." },
        ],
      },
      {
        name: "Imperial Court",
        tier: 4,
        environment_type: "Social",
        difficulty: "20",
        impulses: ["Justify and perpetuate imperial rule", "seduce rivals with promises of power and comfort"],
        potential_adversaries: "Bladed Guard, Courtesan, Knight of the Realm, Monarch, Spy",
        features: [
          { name: "All Roads Lead Here", type: "Passive", description: "While in the Imperial Court, a PC has disadvantage on Presence Rolls made to take actions that don't fit the imperial way of life or support the empire's dominance." },
          { name: "Rival Vassals", type: "Passive", description: "The PCs can find imperial subjects, vassals, and supplicants in the court, each vying for favor, seeking proximity to power, exchanging favors for loyalty, and elevating their status above others. Some might be desperate to undermine their rivals, while others might be open to discussions that verge on sedition." },
          { name: "The Gravity of Empire", type: "Action", description: "Spend a Fear to present a PC with a golden opportunity or offer to satisfy a major goal in exchange for obeying or supporting the empire. The target must make a Presence Reaction Roll. On a failure, they must mark all their Stress or accept the offer. On a success, they must mark 1d4 Stress as they're taxed by temptation." },
          { name: "Imperial Decree", type: "Action", description: "Spend a Fear to tick down a long-term countdown related to the empire's agenda by 1d4. If this triggers the countdown, a proclamation related to the agenda is announced at court as the plan is executed." },
          { name: "Eyes Everywhere", type: "Reaction", description: "On a result with Fear, you can spend a Fear to have someone loyal to the empire overhear seditious talk. A PC must succeed on an Instinct Reaction Roll to notice they've been overheard so they can try to intercept the witness before they're exposed." },
        ],
      },
      {
        name: "Necromancer's Ossuary",
        tier: 4,
        environment_type: "Exploration",
        difficulty: "19",
        impulses: ["Confound intruders", "delve into secrets best left buried", "manifest unlife", "unleash a tide of undead"],
        potential_adversaries: "Arch-Necromancer's Host (Perfected Zombie, Zombie Legion)",
        features: [
          { name: "No Place for the Living", type: "Passive", description: "A feature or action that clears HP requires spending a Hope to use. If it already costs Hope, a PC must spend an additional Hope." },
          { name: "Centuries of Knowledge", type: "Passive", description: "A PC can investigate the library and laboratory and make a Knowledge Roll to learn information related to arcana, local history, and the Necromancer's plans." },
          { name: "Skeletal Burst", type: "Action", description: "All targets within Close range of a point you choose must succeed on an Agility Reaction Roll or take 4d8+8 physical damage from bone shrapnel as part of the ossuary detonates around them." },
          { name: "Aura of Death", type: "Action", description: "Once per scene, roll a d4. Each undead within Far range of the Necromancer can clear HP and Stress equal to the result rolled. The undead can choose how that total is divided between HP and Stress." },
          { name: "They Just Keep Coming!", type: "Action", description: "Spend a Fear to summon 1d6 Rotted Zombies, two Perfected Zombies, or a Zombie Legion, who appear at Close range of a chosen PC." },
        ],
      },
    ];

    const { data, error } = await supabase
      .from('bestiary_environments')
      .upsert(environments, { onConflict: 'name' })
      .select();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, count: data?.length || 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
