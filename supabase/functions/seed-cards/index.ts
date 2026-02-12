import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        const { data: role } = await supabase.rpc("get_user_role", { _user_id: user.id });
        if (role !== "admin") {
          return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }
    }

    // Clear existing cards
    await supabase.from("game_cards").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    const cards: any[] = [];

    // === CLASS CARDS ===
    const classes = [
      ["Bard","Grace","Codex",10,5,"A romance novel or a letter never opened. THEN DECIDE WHAT YOU CARRY YOUR SPELLS IN: songbook, journal, etc.","MAKE A SCENE: Spend 3 Hope to temporarily Distract a target within Close range, giving them a -2 penalty to their Difficulty.","RALLY\nOnce per session, describe how you rally the party and give yourself and each of your allies a Rally Die. At level 1, your Rally Die is a d6. A PC can spend their Rally Die to roll it, adding the result to their action roll, reaction roll, damage roll, or to clear a number of Stress equal to the result. At the end of each session, clear all unspent Rally Dice.\n\nAt level 5, your Rally Die increases to a d8."],
      ["Druid","Sage","Arcana",10,6,"A small bag of rocks and bones or a strange pendant found in the dirt.","EVOLUTION: Spend 3 Hope to transform into a Beastform without marking a Stress. When you do, choose one trait to raise by +1 until you drop out of that Beastform.","BEASTFORM\nMark a Stress to magically transform into a creature of your tier or lower from the Beastform list. You can drop out of this form at any time. While transformed, you can't use weapons or cast spells from domain cards, but you can still use other features abilities you have access to.\n\nWILDTOUCH\nYou can perform harmless, subtle effects that involve nature at will."],
      ["Guardian","Valor","Blade",9,7,"A totem from your mentor or a secret key.","FRONTLINE TANK: Spend 3 Hope to clear 2 Armor Slots.","UNSTOPPABLE\nOnce per long rest, you can become Unstoppable. You gain an Unstoppable Die (d4 at level 1, d6 at level 5). While Unstoppable:\n• You reduce the severity of physical damage by one threshold.\n• You add the current value of the Unstoppable Die to your damage roll.\n• You can't be Restrained or Vulnerable."],
      ["Ranger","Bone","Sage",12,6,"A trophy from your first kill or a seemingly broken compass.","HOLD THEM OFF: Spend 3 Hope when you succeed on an attack with a weapon to use that same roll against two additional adversaries within range of the attack.","RANGER'S FOCUS\nSpend a Hope and make an attack against a target. On a success, deal your attack's normal damage and temporarily make the attack's target your Focus. Until this feature ends:\n• You know precisely what direction they are in.\n• When you deal damage to them, they must mark a Stress.\n• When you fail an attack against them, you can end your Ranger's Focus to reroll your Duality Dice."],
      ["Rogue","Midnight","Grace",12,6,"A set of forgery tools or a grappling hook.","ROGUE'S DODGE: Spend 3 Hope to gain a +2 bonus to your Evasion until the next time an attack succeeds against you. This bonus lasts until your next rest.","CLOAKED\nAny time you would be Hidden, you are instead Cloaked. In addition to the benefits of the Hidden condition, while Cloaked you remain unseen if you are stationary when an adversary moves to where they would normally see you.\n\nSNEAK ATTACK\nWhen you succeed on an attack while Cloaked or while an ally is within Melee range of your target, add a number of d6s equal to your tier to your damage roll."],
      ["Seraph","Splendor","Valor",9,7,"A bundle of offerings or a sigil of your god.","LIFE SUPPORT: Spend 3 Hope to clear a Hit Point on an ally within Close Range.","PRAYER DICE\nAt the beginning of each session, roll a number of d4s equal to your subclass's Spellcast trait and place them on your character sheet. You can spend any number of Prayer Dice to aid yourself or an ally within Far range."],
      ["Sorcerer","Arcana","Midnight",10,6,"A whispering orb or a family heirloom.","VOLATILE MAGIC: Spend 3 Hope to reroll any number of your damage dice on an attack that deals magic damage.","ARCANE SENSE\nYou can sense the presence of magical people and objects within Close range.\n\nMINOR ILLUSION\nMake a Spellcast Roll (10). On a success, you create a minor visual illusion.\n\nCHANNEL RAW POWER\nOnce per long rest, you can place a domain card from your loadout into your vault and choose to either gain Hope equal to the level of the card, or enhance a spell's damage."],
      ["Warrior","Blade","Bone",11,6,"The drawing of a lover or a sharpening stone.","NO MERCY: Spend 3 Hope to gain a +1 bonus to your attack rolls until your next rest.","ATTACK OF OPPORTUNITY\nIf an adversary within Melee range attempts to leave that range, make a reaction roll. Choose one effect on a success, or two if you critically succeed:\n• They can't move from where they are.\n• You deal damage to them equal to your primary weapon's damage.\n• You move with them.\n\nCOMBAT TRAINING\nYou ignore burden when equipping weapons. When you deal physical damage, you gain a bonus to your damage roll equal to your level."],
      ["Wizard","Codex","Splendor",11,5,"A book you're trying to translate or a tiny, harmless elemental pet.","NOT THIS TIME: Spend 3 Hope to force an adversary within Far range to reroll an attack or damage roll.","PRESTIDIGITATION\nYou can perform harmless, subtle magical effects at will.\n\nSTRANGE PATTERNS\nChoose a number between 1 and 12. When you roll that number on a Duality Die, gain a Hope or clear a Stress."],
      ["Brawler","Bone","Valor",10,6,"Hand wraps from a mentor or a book about your secret hobby","STAGGERING STRIKE: Spend 3 Hope when you hit an adversary to also deal them a Stress and make them temporarily Staggered.","I AM THE WEAPON\nWhile you don't have any equipped weapons:\n• Your Evasion has a +1 bonus.\n• Your unarmed strikes deal d8+d6 phy damage.\n\nCOMBO STRIKES\nAfter making a damage roll with a Melee weapon, mark a Stress to start a combo strike with your Combo Die (starts d4)."],
      ["Warlock","Dread","Grace",11,5,"A carving that symbolizes your patron or a ring you can't remove","PATRON'S BOON: Spend 3 Hope to call out to your patron for help, gaining 1d4 Favor.","WARLOCK PATRON\nYou have committed yourself to a patron in exchange for power. Choose their spheres of influence (+2 bonus). Spend Favor to add its value to rolls related to spheres.\n\nFAVOR\nStart with 3 Favor. During a rest, tithe to your patron to gain Favor equal to your Presence."],
      ["Assassin","Midnight","Blade",12,5,"A list of names with several marked off or a mortar and pestle","GRIM RESOLVE: Spend 3 Hope to clear 2 Stress.","MARKED FOR DEATH\nOn a successful weapon attack, mark a Stress to make the target Marked for Death. Attacks gain +1d4 per tier damage bonus.\n\nGET IN & GET OUT\nSpend a Hope to ask the GM for a quick or inconspicuous way into or out of a building."],
      ["Witch","Dread","Sage",10,6,"A handcrafted besom or a pouch of animal bones","WITCH'S CHARM: When you or an ally within Far range rolls a failure, spend 3 Hope to change into a success with Fear instead.","HEX\nWhen a creature causes you or an ally to mark Hit Points, mark a Stress to Hex them. Action and damage rolls gain a bonus equal to your tier.\n\nCOMMUNE\nOnce per long rest, commune with an ancestor, deity, or spirit. Ask a question and roll d6s equal to your Spellcast trait."],
      ["Blood Hunter","Blade","Blood",9,7,"A steel needle or a vial holding a foe's blood","BLOOD MALEDICT: Spend 3 Hope to target a creature within Far range. Until you finish a rest, you have advantage on all action rolls against the target.","CRIMSON RITE\nMark a Hit Point to enchant a weapon. It deals extra 1d6 damage (2d6 at level 5, 3d6 at level 8).\n\nGRIM PSYCHOMETRY\nInspect a creature/location/object. Make a Spellcast Roll (12). On success, mark a Stress to have a vision of the most recent violence."],
    ];

    for (const [name,d1,d2,ev,hp,inv,hope,feat] of classes) {
      cards.push({
        card_type: "class", name, source: null, content: feat as string,
        metadata: { domain1: d1, domain2: d2, evasion: ev, starting_hp: hp, inventory: inv, hope_feature: hope, class_feature: feat }
      });
    }

    // === COMMUNITY CARDS ===
    const communities = [
      ["Highborne","Privilege","You have advantage on rolls to consort with nobles, negotiate prices, or leverage your reputation."],
      ["Loreborne","Well-Read","You have advantage on rolls that invoke the history, culture, or politics of a prominent person or place."],
      ["Orderborne","Dedicated","Record three sayings or values your upbringing instilled in you. Once per rest, when you describe how you're embodying one of these principles, you can roll a d20 as your Hope Die."],
      ["Ridgeborne","Steady","You have advantage on rolls to traverse dangerous cliffs and ledges, navigate harsh environments, and use your survival knowledge."],
      ["Seaborne","Know The Tide","You can sense the ebb and flow of life. When you roll with Fear, place a token. Spend tokens before action rolls for +1 bonus each."],
      ["Slyborne","Scoundrel","You have advantage on rolls to negotiate with criminals, detect lies, or find a safe place to hide."],
      ["Underborne","Low-Light Living","In low light or heavy shadow, you have advantage on rolls to hide, investigate, or perceive details."],
      ["Wanderborne","Nomadic Pack","Add a Nomadic Pack to your inventory. Once per session, spend a Hope to pull out a useful mundane item."],
      ["Wildborne","Lightfoot","Your movement is naturally silent. You have advantage on rolls to move without being heard."],
      ["Duneborne","Oasis","During a short rest, you or an ally can reroll a die used for a downtime action."],
      ["Freeborne","Unbound","Once per session, when you make an action roll with Fear, you can instead change it to a roll with Hope."],
      ["Frostborne","Long Winter","Once per rest, you can Help an Ally traverse difficult terrain without spending Hope."],
      ["Hearthborne","Close-Knit","Once per long rest, you can spend any number of Hope to give an ally the same number of Hope."],
      ["Reborne","Found Family","Once per session, spend a Hope to use an ally's community ability. Your ally gains a Hope."],
      ["Warborne","Brave Face","Once per session, when an attack would cause you to mark a Stress, you can spend a Hope instead."],
    ];

    for (const [src, title, content] of communities) {
      cards.push({ card_type: "community", name: title as string, source: src, content });
    }

    // === ANCESTRY CARDS ===
    const ancestries = [
      ["Clank","Purposeful Design","Decide who made you and for what purpose. Choose one Experience that aligns with this purpose and gain a permanent +1 bonus to it."],
      ["Clank","Efficient","When you take a short rest, you can choose a long rest move instead of a short rest move."],
      ["Drakona","Scales","Your scales act as natural protection. When you would take Severe damage, mark a Stress to mark 1 fewer Hit Points."],
      ["Drakona","Elemental Breath","Choose an element for your breath. Use against targets within Very Close range, treating it as an Instinct weapon that deals d8 magic damage."],
      ["Dwarf","Thick Skin","When you take Minor damage, you can mark 2 Stress instead of marking a Hit Point."],
      ["Dwarf","Increased Fortitude","Spend 3 Hope to halve incoming physical damage."],
      ["Elf","Quick Reactions","Mark a Stress to gain advantage on a reaction roll."],
      ["Elf","Celestial Trance","During a rest, you can drop into a trance to choose an additional downtime move."],
      ["Faerie","Luckbender","Once per session, after you or a willing ally within Close range makes an action, spend 3 Hope to reroll the Duality Dice."],
      ["Faerie","Wings","You can fly. While flying, mark a Stress after an adversary attacks to gain +2 Evasion against that attack."],
      ["Faun","Caprine Leap","You can leap anywhere within Close range as though you were using normal movement."],
      ["Faun","Kick","On a successful attack in Melee range, mark a Stress to kick, dealing extra 2d6 damage and knocking to Very Close range."],
      ["Firbolg","Charge","When you succeed on an Agility Roll to move into Melee range, mark a Stress to deal 1d12 physical damage to all targets."],
      ["Firbolg","Unshakable","When you would mark a Stress, roll a d6. On a 6, don't mark it."],
      ["Fungril","Fungril Network","Make an Instinct Roll (12) to speak with others of your ancestry across any distance."],
      ["Fungril","Death Connection","While touching a recent corpse, mark a Stress to extract one memory related to an emotion of your choice."],
      ["Galapa","Shell","Gain a bonus to your damage thresholds equal to your Proficiency."],
      ["Galapa","Retract","Mark a Stress to retract into your shell. Resistance to physical damage, disadvantage on action rolls, can't move."],
      ["Giant","Endurance","Gain an additional Hit Point slot at character creation."],
      ["Giant","Reach","Treat Melee range as Very Close range for weapons, abilities, and spells."],
      ["Goblin","Surefooted","You ignore disadvantage on Agility Rolls."],
      ["Goblin","Danger Sense","Once per rest, mark a Stress to force an adversary to reroll an attack against you or an ally within Very Close range."],
      ["Halfling","Luckbringer","At the start of each session, everyone in your party gains a Hope."],
      ["Halfling","Internal Compass","When you roll a 1 on your Hope Die, you can reroll it."],
      ["Human","High Stamina","Gain an additional Stress slot at character creation."],
      ["Human","Adaptability","When you fail a roll that utilized one of your Experiences, mark a Stress to reroll it."],
      ["Infernis","Fearless","When you roll with Fear, mark 2 Stress to change it into a roll with Hope instead."],
      ["Infernis","Dread Visage","You have advantage on rolls to intimidate hostile creatures."],
      ["Katari","Feline Instincts","When you make an Agility Roll, spend 2 Hope to reroll your Hope Die."],
      ["Katari","Retracting Claws","Make an Agility Roll to scratch a target in Melee range. On success, they become temporarily Vulnerable."],
      ["Orc","Sturdy","When you have 1 Hit Point remaining, attacks against you have disadvantage."],
      ["Orc","Tusks","On a successful Melee attack, spend a Hope to gore with tusks for extra 1d6 damage."],
      ["Ribbet","Amphibious","You can breathe and move naturally underwater."],
      ["Ribbet","Long Tongue","Use your long tongue to grab things within Close range. Mark a Stress for d12 physical damage weapon."],
      ["Simiah","Natural Climber","You have advantage on Agility Rolls that involve balancing and climbing."],
      ["Simiah","Nimble","Gain a permanent +1 bonus to your Evasion at character creation."],
      ["Earthkin","Hard As Stone","After marking Hit Points, spend 2 Hope for +1 damage threshold bonus until next rest."],
      ["Earthkin","Tectonic Attack","Strike the ground to make a weapon attack against all targets within Very Close range. d8 magic damage and temporarily Restrained."],
      ["Tidekin","Amphibious","You can breathe and move naturally underwater."],
      ["Tidekin","Lifespring","Once per rest, with water access, mark 2 Stress to heal a Hit Point on yourself or an ally."],
      ["Emberkin","Incinerator","Mark a Stress to light yourself Ablaze. Adversaries ending attacks in Melee must mark a Stress."],
      ["Emberkin","Fireshot","Unleash a fire projectile within Far range. d10+5 magic damage on failed reaction roll."],
      ["Skykin","Gust Leap","Once per rest, call upon wind to carry you to a point within Very Far range."],
      ["Skykin","Gale Force","Instinct Roll against targets in front within Very Close range. d6 magic damage and forced back to Far range."],
      ["Aetheris","Hallowed Aura","Once per rest, when an ally within Close range rolls with Fear, make it a roll with Hope instead."],
      ["Aetheris","Divine Countenance","You have advantage on rolls to command or persuade."],
      ["Gnome","Nimble Fingers","When you make a Finesse Roll, spend 2 Hope to reroll your Hope die."],
      ["Gnome","True Sight","You have advantage on rolls to see through illusions."],
    ];

    for (const [src, title, content] of ancestries) {
      cards.push({ card_type: "ancestry", name: title as string, source: src, content });
    }

    // === SUBCLASS CARDS ===
    const subclasses = [
      ["Bard","Troubadour","Presence","GIFTED PERFORMER: Play each song once per long rest:\n• RELAXING SONG: Clear a Hit Point on you and allies.\n• EPIC SONG: Make a target Vulnerable.\n• HEARTBREAKING SONG: Gain a Hope.","MAESTRO: When you give a Rally Die to an ally, they can gain a Hope or clear a Stress.","VIRTUOSO: You can perform each song twice instead of once per long rest."],
      ["Bard","Wordsmith","Presence","ROUSING SPEECH: Once per long rest, all allies within Far range clear 2 Stress.\nHEART OF A POET: After a Presence roll, spend a Hope to add a d4.","ELOQUENT: Once per session, encourage an ally for a special benefit.","EPIC POETRY: Rally Die increases to d10. When you Help an Ally, roll a d10 as your advantage die."],
      ["Druid","Way of the Elements","Instinct","ELEMENTAL INCARNATION: Mark a Stress to Channel an element (Fire, Earth, Water, Air) with unique benefits.","ELEMENTAL AURA: Once per rest while Channeling, assume a matching aura affecting targets within Close range.","ELEMENTAL DOMINION: Further embody your element with enhanced benefits while Channeling."],
      ["Druid","Way of Renewal","Instinct","CLARITY OF NATURE: Once per long rest, create a serene space to clear Stress equal to your Instinct.\nREGENERATION: Touch a creature and spend 3 Hope to clear 1d4 Hit Points.","REGENERATIVE REACH: Target creatures within Very Close range with Regeneration.\nWARDEN'S PROTECTION: Once per long rest, spend 2 Hope to clear 2 Hit Points on 1d4 allies.","DEFENDER: In Beastform, when an ally marks 2+ Hit Points, mark a Stress to reduce by 1."],
      ["Guardian","Stalwart","-","UNWAVERING: Gain permanent +1 to damage thresholds.\nIRON WILL: When you take physical damage, mark an additional Armor Slot to reduce severity.","UNRELENTING: Gain permanent +2 to damage thresholds.\nPARTNERS-IN-ARMS: When an ally within Very Close range takes damage, mark an Armor Slot to reduce severity.","UNDAUNTED: Gain permanent +3 to damage thresholds.\nLOYAL PROTECTOR: When an ally with 2 or fewer HP would take damage, mark a Stress to take it instead."],
      ["Guardian","Vengeance","-","AT EASE: Gain an additional Stress slot.\nREVENGE: When an adversary succeeds on an attack, mark 2 Stress to force them to mark a Hit Point.","ACT OF REPRISAL: When an adversary damages an ally in Melee, gain +1 Proficiency against them.","NEMESIS: Spend 2 Hope to Prioritize an adversary. Swap Hope and Fear Dice results on attacks against them."],
      ["Ranger","Beastbound","Agility","COMPANION: You have an animal companion that stays by your side.","EXPERT TRAINING: Choose an additional level-up option.\nBATTLE-BONDED: +2 Evasion when adversary attacks you near companion.","ADVANCED TRAINING: Choose two additional level-up options.\nLOYAL FRIEND: Once per long rest, you or companion can take damage for the other."],
      ["Ranger","Wayfinder","Agility","RUTHLESS PREDATOR: Mark a Stress for +1 Proficiency on damage. Severe damage forces Stress.\nPATH FORWARD: Identify shortest path to visited locations.","ELUSIVE PREDATOR: +2 Evasion when your Focus attacks you.","APEX PREDATOR: Spend a Hope before attacking Focus. On success, remove a Fear from GM's pool."],
      ["Rogue","Night Walker","Finesse","SHADOW STEPPER: Mark a Stress to teleport between shadows within Far range. Become Cloaked.","DARK CLOUD: Create a dark cloud within Close range.\nADRENALINE: While Vulnerable, add level to damage rolls.","FLEETING SHADOW: +1 Evasion. Shadow Step within Very Far range.\nVANISHING ACT: Mark a Stress to become Cloaked at any time."],
      ["Rogue","Syndicate","Finesse","WELL-CONNECTED: When you arrive in a town, you know somebody there. Choose a complication.","CONTACTS EVERYWHERE: Once per session, call on a shady contact for various benefits.","RELIABLE BACKUP: Use Contacts three times per session with additional benefit options."],
      ["Seraph","Divine Wielder","Strength","SPIRIT WEAPON: Equipped Melee weapon can fly to attack within Close range.\nSPARING TOUCH: Once per long rest, clear 2 HP or 2 Stress on a creature you touch.","DEVOUT: Roll additional Prayer Die and discard lowest. Use Sparing Touch twice per long rest.","SACRED RESONANCE: If damage dice match, double the matching dice values."],
      ["Seraph","Winged Sentinel","Strength","WINGS OF LIGHT: You can fly. Mark a Stress to carry a creature. Spend a Hope for +1d8 damage.","ETHEREAL VISAGE: While flying, advantage on Presence Rolls. Success with Hope removes a Fear.","ASCENDANT: +4 to Severe threshold. +1d12 damage instead of 1d8 while flying."],
      ["Sorcerer","Elemental Origin","Instinct","ELEMENTALIST: Choose an element. Spend a Hope for +2 to action roll or +3 to damage.","NATURAL EVASION: Mark a Stress to roll d6 and add to Evasion against an attack.","TRANSCENDENCE: Once per long rest, transform into your element. Choose two benefits."],
      ["Sorcerer","Primal Origin","Instinct","MANIPULATE MAGIC: After casting, mark a Stress to extend range, +2 to roll, double a damage die, or hit additional target.","ENCHANTED AID: When Helping with Spellcast, roll d8 as advantage die. Once per long rest, swap ally's Duality Dice.","ARCANE CHARGE: When you take magic damage, become Charged. Spend 2 Hope alternatively. +10 damage or +3 Difficulty on next magic attack."],
      ["Warrior","Call of the Brave","-","COURAGE: When you fail with Fear, gain a Hope.\nBATTLE RITUAL: Once per long rest, before great danger, clear 2 Stress and gain 2 Hope.","RISE TO THE CHALLENGE: With 2 or fewer HP, roll d20 as Hope Dice.","CAMARADERIE: Extra Tag Team Roll per session. Allies only need 2 Hope for Tag Team with you."],
      ["Warrior","Call of the Slayer","-","SLAYER: Gain a pool of Slayer Dice. On Hope rolls, place d6 instead of gaining Hope. Spend on attack/damage rolls.","WEAPON SPECIALIST: Spend a Hope to add secondary weapon damage die. Reroll 1s on Slayer Dice once per long rest.","MARTIAL PREPARATION: Party gains martial Preparation downtime. All gain d6 Slayer Die."],
      ["Wizard","School of Knowledge","Knowledge","PREPARED: Take an additional domain card.\nADEPT: Mark a Stress instead of spending Hope to double Experience modifier.","ACCOMPLISHED: Take an additional domain card.\nPERFECT RECALL: Once per rest, reduce Recall Cost by 1.","BRILLIANT: Take an additional domain card.\nHONED EXPERTISE: Roll d6 when using Experience; on 5+, no Hope cost."],
      ["Wizard","School of War","Knowledge","BATTLEMAGE: Gain an additional Hit Point slot.\nFACE YOUR FEAR: When you succeed with Fear, deal extra 1d10 magic damage.","CONJURE SHIELD: With 2+ Hope, add Proficiency to Evasion.\nFUELED BY FEAR: Extra damage increases to 2d10.","THRIVE IN CHAOS: On successful attack, mark a Stress to force extra Hit Point.\nHAVE NO FEAR: Extra damage increases to 3d10."],
      ["Brawler","Juggernaut","-","POWERHOUSE: Unarmed d10s. Mark Stress to target two in Melee.\nOVERWHELM: Spend Hope to force Stress or throw target.","RUGGED: +3 Severe threshold. Target three creatures.\nEYE FOR AN EYE: When marked 2+ HP in melee, attacker makes Reaction Roll.","PUMMELJOY: On crit, extra Hope, clear Stress, +1 Proficiency.\nNOT DONE YET: When marked 2+ HP, gain Hope or clear Stress."],
      ["Brawler","Martial Artist","-","MARTIAL FORM: Start with two Tier 1 stances.\nFOCUS: Roll d6s equal to Instinct, gain Focus tokens equal to highest value.","KEEN DEFENSES: Spend Focus for attack disadvantage.\nSPIRIT BLAST: Spend Focus for d20+3 magic damage.","LIMIT BREAKER: Once per rest, perform an impossible feat without rolling."],
      ["Warlock","Pact of the Endless","Presence","PATRON'S MANTLE: Mark Stress for terrifying aspect. Spend Favor instead of Armor.\nDEADLY DEVOTION: Spend Favor for +1 Evasion.","DRAINING INVOCATION: Spend Favor to make adversary use d12. They mark Stress, you clear Stress.","DARK AEGIS: Once per long rest, spend Favor instead of marking HP.\nDRAINING BANE: Spend 2 Favor to permanently Drain them."],
      ["Warlock","Pact of the Wrathful","Presence","FAVORED WEAPON: Mark Stress to Imbue weapon. Spend Favor for +1d6 damage each.\nHERALD OF DEATH: Spend Favor to reroll failed attack.","MENACING REACH: Mark additional Stress to increase Imbued weapon range.\nDIMINISH MY FOES: On Hope success, spend Hope to force Stress.","FEARSOME ATTACK: Spend Favor to reroll any damage dice.\nDIVINE IRE: Once per rest, spend Favor to force that many adversaries to mark HP."],
      ["Assassin","Executioners Guild","Agility","FIRST STRIKE: First successful attack in a scene deals double damage.\nBACKSTAB: Marked for Death uses d6s instead of d4s.","DEATH STRIKE: On Severe damage, mark Stress for extra HP.\nSCORPION'S POISE: +2 Evasion against Marked for Death targets.","TRUE STRIKE: Once per long rest, spend Hope to turn failed attack into success.\nBACKSTAB: Uses d8s instead of d6s."],
      ["Assassin","Poisoners Guild","Knowledge","TOXIC CONCOCTIONS: Mark Stress for 1d4+1 poison tokens. Three known poisons.\nENVENOMATE: On successful attack, spend token to apply poison.","POISON COMPENDIUM: Two additional poisons.\nADDER'S BLESSING: Immune to poisons and toxins.","VENOMANCER: Two additional poisons.\nTWIN FANG: Spend extra token to apply two poisons."],
      ["Witch","Hedge","Instinct","HERBAL REMEDIES: Using consumables clears an extra HP or Stress.\nTETHERED TALISMAN: Once per rest, imbue item with protection to reduce HP marked by 1.","WALK BETWEEN WORLDS: Spellcast Roll (13) to converse with spirits.\nENHANCED HEX: Attacks against Hexed gain damage bonus equal to Proficiency.","CIRCLE OF POWER: Once per rest, create a circle. While inside: +4 thresholds, +2 attack, +1 Evasion."],
      ["Witch","Moon","Instinct","NIGHT'S GLAMOUR: Mark Stress to Glamour yourself. Disguise or enhance appearance.","MOON BEAM: Once per session, conjure moonlight for +1 Spellcast and advantage vs illusions.\nIRE OF PALE LIGHT: Hexed creatures mark Stress on failed attacks.","LUNAR PHASES: Roll d4 at session start for a moon phase effect (New, Waxing, Full, Waning)."],
      ["Blood Hunter","Order of the Ghost Slayer","Agility","CHASING DEATH: With 1-3 unmarked HP, Crimson Rite is free. With 1 HP, use d8s.\nSHADOWED GRIT: When GM gains Fear, mark Stress to gain Hope.","VEILWALKER: Spend 2 Hope to teleport to a creature/corpse within Far range. Advantage on next attack.","SPECTRAL FORM: Death move option - clear HP, become spectral, resistance to physical, pass through objects."],
      ["Blood Hunter","Order of the Mutant","Agility","MUTAGENS: After rest, drink a toxin for +1 trait, -1 different trait, and a benefit (Celerity, Durable, or Hunter's Senses).","IMPROVED MUTAGENS: Additional options (Nerves of Steel, Rapidity, Ironskin).\nVOLATILE TOXINS: Choose two benefits but mark a permanent HP.","MASTERED MUTAGENS: +2/-2 trait bonus/penalty. Additional options (Aetherblood, Fury, Steelflesh)."],
      ["Blood Hunter","Order of the Lycan","Strength","WEREWOLF: Gain Werewolf Transformation card. Advantage on hearing/scent perception.\nCONTROL THE BEAST: In Wolf Form, apply bonus die to Agility and Strength.","FERAL HIDE: In Wolf Form, +Tier to Damage Thresholds.\nLYCAN REGENERATION: In Wolf Form with all HP marked, mark Stress to clear HP.","MASTER THE BEAST: When last Stress would be marked in Wolf Form, put a Domain card in Vault instead.\nOn Frenzy, gain 2 Hope."],
    ];

    for (const [cls, name, trait, found, spec, mast] of subclasses) {
      cards.push({
        card_type: "subclass", name: name as string, source: cls, content: found as string,
        metadata: { spellcast_trait: trait, foundation: found, specialization: spec, mastery: mast }
      });
    }

    // === DOMAIN CARDS ===
    const domains = [
      ["Blade","A Soldier's Bond",2,"Ability",1,"Once per long rest, when you compliment someone, you can both gain 3 Hope."],
      ["Arcana","Adjust Reality",10,"Spell",1,"After any roll, spend 5 Hope to change the result to a value of your choice."],
      ["Arcana","Arcana-Touched",7,"Spell",2,"With 4+ Arcana domain cards: +1 Spellcast, once per rest swap Hope/Fear Dice."],
      ["Arcana","Arcane Reflection",8,"Spell",1,"When taking magic damage, spend Hope to roll d6s. On any 6, reflect the attack back."],
      ["Valor","Armorer",5,"Ability",1,"While wearing armor, +1 Armor Score. During rest, allies also clear an Armor Slot."],
      ["Grace","Astral Projection",8,"Spell",0,"Once per long rest, mark Stress to create a projected copy of yourself anywhere you've been."],
      ["Dread","Avatar Of Malice",10,"Spell",1,"Transform into an avatar of malice with powerful benefits. Spend Hope each action roll."],
      ["Codex","Banish",6,"Spell",0,"Make a Spellcast Roll to banish a target from this realm."],
      ["Valor","Bare Bones",1,"Ability",0,"Without armor: base Armor Score 3 + Strength with tier-based thresholds."],
      ["Blade","Battle Cry",8,"Ability",2,"Once per long rest, allies clear Stress, gain Hope, and get advantage on attacks."],
      ["Blade","Battle Monster",10,"Ability",0,"On successful attack, mark 4 Stress to force target to mark HP equal to your marked HP."],
      ["Blade","Battle-Hardened",6,"Ability",2,"Once per long rest, spend Hope to clear a HP instead of making a Death Move."],
      ["Blade","Blade-Touched",7,"Ability",1,"With 4+ Blade cards: +2 attack rolls, +4 Severe threshold."],
      ["Dread","Blighting Strike",1,"Spell",1,"Spellcast Roll for d6 magic damage. Reduce target's next damage by 1d6."],
      ["Arcana","Blink Out",4,"Spell",1,"Spellcast Roll (12) to teleport within Far range. Spend Hope per additional creature."],
      ["Blood","Blood Bind",6,"Spell",2,"Restrain and make Vulnerable. Target takes d10 magic damage each spotlight."],
      ["Blood","Blood Puppet",3,"Spell",2,"Control a creature to move, attack, or both."],
      ["Blood","Blood Spike",1,"Spell",1,"d10 magic damage, mark Stress. On Hope, target also marks Stress."],
      ["Blood","Bloodbath",9,"Spell",2,"Spellcast Roll against all in Close range. Success: HP + Stress. Failure: Stress. Allies clear HP."],
      ["Blood","Blood-Touched",7,"Ability",1,"With 4+ Blood cards: gain Hope when marking 2+ HP, +1 Evasion per 3 marked HP."],
      ["Valor","Body Basher",2,"Ability",1,"On Melee success, add Strength to damage roll."],
      ["Valor","Bold Presence",2,"Ability",0,"Spend Hope to add Strength to Presence Roll. Once per rest, avoid a condition."],
      ["Splendor","Bolt Beacon",1,"Spell",1,"d8+2 magic damage within Far range. Target becomes Vulnerable and glows."],
      ["Bone","Bone-Touched",7,"Ability",2,"With 4+ Bone cards: +1 Agility, once per rest spend 3 Hope to make attack fail."],
      ["Codex","Book Of Ava",1,"Grimoire",2,"Power Push: Make a Spellcast Roll against a target within Melee range. On a success, they're knocked back to Far range and take d10+2 magic damage using your Proficiency.\nTava's Armor: Spend a Hope to give a target you can touch a +1 bonus to their Armor Score until their next rest or you cast Tava's Armor again.\nIce Spike: Make a Spellcast Roll (12) to summon a large ice spike within Far range. If you use it as a weapon, make the Spellcast Roll against the target's Difficulty instead. On a success, deal d6 physical damage using your Proficiency."],
      ["Codex","Book Of Exota",4,"Grimoire",3,"Repudiate and Create Construct spells."],
      ["Codex","Book Of Grynn",4,"Grimoire",2,"Arcane Deflection, Time Lock, Wall of Flame spells."],
      ["Codex","Book Of Homet",7,"Grimoire",0,"Pass Through and Plane Gate spells."],
      ["Codex","Book Of Illiat",1,"Grimoire",2,"Slumber, Arcane Barrage, Telepathy spells."],
      ["Codex","Book Of Korvax",3,"Grimoire",2,"Levitation, Recant, Rune Circle spells."],
      ["Codex","Book Of Norai",3,"Grimoire",2,"Mystic Tether and Fireball spells."],
      ["Codex","Book Of Ronin",9,"Grimoire",4,"Transform and Eternal Enervation spells."],
      ["Codex","Book Of Sitil",2,"Grimoire",2,"Adjust Appearance, Parallela, Illusion spells."],
      ["Codex","Book Of Tyfar",1,"Grimoire",2,"Wild Flame, Magic Hand, Mysterious Mist spells."],
      ["Codex","Book Of Vagras",2,"Grimoire",2,"Runic Lock, Arcane Door, Reveal spells."],
      ["Codex","Book Of Vyola",8,"Grimoire",2,"Memory Delve and Shared Clarity spells."],
      ["Codex","Book Of Yarrow",10,"Grimoire",2,"Timejammer and Magic Immunity spells."],
      ["Bone","Boost",4,"Ability",1,"Mark Stress to boost off an ally for an aerial attack with advantage and +d10 damage."],
      ["Bone","Brace",3,"Ability",1,"When marking Armor Slot, mark Stress to mark an additional Armor Slot."],
      ["Blood","Brand Of Castigation",2,"Spell",1,"Sear a mark on a target. You know their direction. They mark Stress when damaging allies."],
      ["Bone","Breaking Blow",8,"Ability",3,"On successful attack, mark Stress for +2d12 damage on the next attack against that target."],
      ["Blood","Burning Blood",3,"Spell",2,"Spellcast Roll (12). Mark HP to deal area HP damage."],
      ["Arcana","Chain Lightning",5,"Spell",1,"Mark 2 Stress for chaining 2d8+4 magic damage through all adversaries in Close range."],
      ["Blade","Champion's Edge",5,"Ability",1,"On crit, spend up to 3 Hope for: clear HP, clear Armor, or extra HP on target."],
      ["Midnight","Chokehold",3,"Ability",1,"Position behind a target to make them Vulnerable. Allies deal extra 2d6 damage."],
      ["Arcana","Cinder Grasp",2,"Spell",1,"1d20+3 magic damage in Melee. Target is temporarily On Fire for extra 2d6."],
      ["Arcana","Cloaking Blast",7,"Spell",2,"After a successful spell, spend Hope to become Cloaked."],
      ["Codex","Codex-Touched",7,"Ability",2,"With 4+ Codex cards: add Proficiency to Spellcast, swap vault card without Recall Cost."],
      ["Arcana","Confusing Aura",8,"Spell",2,"Create layers of illusion. Roll d6s per layer; 5+ destroys a layer and the attack fails."],
      ["Sage","Conjure Swarm",2,"Spell",1,"Conjure beetles for damage reduction or fire flies for 2d8+3 magic damage."],
      ["Sage","Conjured Steeds",6,"Spell",0,"Spend Hope to conjure riding steeds. Double travel speed, +2 damage/-2 attack while mounted."],
      ["Grace","Copycat",9,"Spell",3,"Once per long rest, mimic another player's domain card features."],
      ["Sage","Corrosive Projectile",3,"Spell",1,"d6+4 magic damage. Mark Stress to permanently Corrode target (-1 Difficulty per 2 Stress)."],
      ["Arcana","Counterspell",3,"Spell",2,"Interrupt a magical effect. On success, effect stops and card goes to vault."],
      ["Blood","Crimson Adamance",10,"Ability",1,"When marking last HP, spend Hope to mark Stress instead."],
      ["Valor","Critical Inspiration",3,"Ability",1,"Once per rest on crit, allies clear Stress or gain Hope."],
      ["Bone","Cruel Precision",7,"Ability",1,"On weapon attack, add Finesse or Agility to damage roll."],
      ["Dread","Damnation",9,"Spell",2,"Mark 3 Stress, roll d20s equal to Spellcast trait for massive damage."],
      ["Dread","Dark Army",8,"Spell",2,"Once per rest, summon 8 fiends. Spend fiends for +1d8 damage or -1d8 damage reduction."],
      ["Midnight","Dark Whispers",6,"Spell",0,"Speak into minds of people you've touched. Mark Stress for Spellcast Roll to learn about them."],
      ["Blade","Deadly Focus",4,"Ability",2,"Once per rest, +1 Proficiency against a single target until they're defeated."],
      ["Sage","Death Grip",4,"Spell",1,"Spellcast Roll to pull, constrict, or vine-attack targets. Temporarily Restrain."],
      ["Bone","Deathrun",10,"Ability",1,"Spend 3 Hope to attack all adversaries along a Far range path with diminishing damage."],
      ["Grace","Deft Deceiver",1,"Ability",0,"Spend Hope for advantage on deception rolls."],
      ["Bone","Deft Maneuvers",1,"Ability",0,"Once per rest, sprint to Far range without rolling. +1 to immediate attack."],
      ["Dread","Dire Strike",5,"Spell",1,"Summon dark energy on your weapon. Use Spellcast trait. Roll d8s equal to GM's Fear."],
      ["Codex","Disintegration Wave",9,"Spell",4,"Once per long rest, kill adversaries with Difficulty 18 or lower within Far range."],
      ["Splendor","Divination",4,"Spell",1,"Once per long rest, spend 3 Hope to ask a yes/no question about the future."],
      ["Dread","Dread-Touched",7,"Spell",2,"With 4+ Dread cards: prevent GM Fear on Fear rolls, add Fear count to action rolls."],
      ["Arcana","Earthquake",9,"Spell",2,"Once per rest, 3d10+8 damage to all targets in Very Far range. Terrain becomes difficult."],
      ["Midnight","Eclipse",10,"Spell",2,"Once per long rest, plunge area into darkness only allies can see through."],
      ["Dread","Eldritch Flesh",8,"Spell",1,"Per 2 Stress marked, +1 thresholds. On Fear success, spend Hope to clear Armor."],
      ["Grace","Encore",10,"Spell",1,"When an ally deals damage, make a Spellcast Roll to deal the same damage."],
      ["Grace","Endless Charisma",7,"Ability",1,"After persuasion roll, spend Hope to reroll a die."],
      ["Grace","Enrapture",1,"Spell",0,"Target becomes Enraptured, fixing attention on you."],
      ["Arcana","Falling Sky",10,"Spell",1,"Mark any Stress for 1d20+2 magic damage per Stress to all adversaries in Far range."],
      ["Sage","Fane Of The Wilds",9,"Ability",2,"Gain tokens from Sage cards. Spend for +1 per token on Spellcast Rolls."],
      ["Bone","Ferocity",2,"Ability",2,"After dealing HP damage, spend 2 Hope for Evasion bonus equal to HP dealt."],
      ["Splendor","Final Words",2,"Spell",1,"Speak with a corpse. On Hope: 3 questions. On Fear: 1 question."],
      ["Arcana","Flight",3,"Spell",1,"Spellcast Roll (15) to fly with limited action tokens."],
      ["Arcana","Floating Eye",2,"Spell",0,"Spend Hope to create a seeing orb within Very Far range."],
      ["Sage","Forager",6,"Ability",1,"Additional downtime move. Roll d6 for a foraged consumable."],
      ["Sage","Force Of Nature",10,"Spell",2,"Transform into nature spirit. +10 damage, absorb defeated creatures, can't be Restrained."],
      ["Valor","Forceful Push",1,"Ability",0,"Melee attack that knocks target to Close range. Spend Hope for Vulnerable."],
      ["Sage","Forest Sprites",8,"Spell",2,"Summon sprites for +3 attack bonus and extra Armor benefits to nearby allies."],
      ["Blade","Fortified Armor",4,"Ability",0,"While wearing armor, +2 to damage thresholds."],
      ["Blade","Frenzy",8,"Ability",3,"Once per long rest, +10 damage, +8 Severe threshold, but can't use Armor."],
      ["Valor","Full Surge",8,"Ability",1,"Once per long rest, mark 3 Stress for +2 to all traits until next rest."],
      ["Blade","Get Back Up",1,"Ability",1,"On Severe damage, mark Stress to reduce severity by one threshold."],
      ["Sage","Gifted Tracker",1,"Ability",0,"Spend Hope to ask questions about tracked creatures. +1 Evasion against them."],
      ["Blade","Glancing Blow",7,"Ability",1,"On failed attack, mark Stress to deal half Proficiency weapon damage."],
      ["Blood","Glyph Of Hemorrhaging",9,"Spell",1,"Sear a glyph. When target marks HP, mark Stress for an additional HP."],
      ["Midnight","Glyph Of Nightfall",4,"Spell",1,"Reduce target's Difficulty by your Knowledge."],
      ["Valor","Goad Them On",4,"Ability",1,"Taunt a target. They mark Stress and must attack you with disadvantage."],
      ["Blade","Gore And Glory",9,"Ability",2,"On crit or defeating enemy, gain Hope or clear Stress."],
      ["Grace","Grace-Touched",7,"Ability",2,"With 4+ Grace cards: mark Armor instead of Stress, force Stress instead of HP."],
      ["Blood","Grisly Harpoon",4,"Spell",1,"Launch blood harpoon for 3d8 magic damage, pull to Melee range."],
      ["Valor","Ground Pound",8,"Ability",2,"Spend 2 Hope to knock all in Very Close to Far range. 4d10+8 damage on failed reaction."],
      ["Sage","Healing Field",4,"Spell",2,"Once per long rest, conjure healing plants. Clear HP for you and allies in Close range."],
      ["Splendor","Healing Hands",2,"Spell",1,"Spellcast Roll (13) to clear 2 HP or 2 Stress on a target."],
      ["Splendor","Healing Strike",7,"Spell",1,"When dealing damage, spend 2 Hope to clear HP on an ally."],
      ["Dread","Hideous Retribution",2,"Spell",2,"When an ally takes damage, Reaction Roll for d6 magic damage."],
      ["Valor","Hold The Line",9,"Ability",1,"Defensive stance. Adversaries in Very Close range are pulled and Restrained."],
      ["Midnight","Hush",5,"Spell",1,"Silence a target. They can't make noise or cast spells."],
      ["Grace","Hypnotic Shimmer",3,"Spell",1,"Once per rest, Stun and Stress targets with flashing illusions."],
      ["Valor","I Am Your Shield",1,"Ability",1,"Take damage for an ally within Very Close range."],
      ["Bone","I See It Coming",1,"Ability",1,"Against ranged attacks, mark Stress for +d4 Evasion."],
      ["Valor","Inevitable",6,"Ability",1,"After a failed roll, next roll has advantage."],
      ["Grace","Inspirational Words",1,"Ability",1,"Place tokens equal to Presence. Spend to clear Stress/HP or give Hope to allies."],
      ["Splendor","Invigoration",10,"Spell",3,"Spend Hope and roll d6s to refresh an exhausted feature."],
      ["Grace","Invisibility",3,"Spell",1,"Spellcast Roll (10) to make a creature Invisible with limited action tokens."],
      ["Dread","Invoke Torment",10,"Spell",2,"Double damage against fully Stressed creatures. If defeated, clear Stress."],
      ["Bone","Know Thy Enemy",5,"Ability",1,"Observe a creature to learn their stats, tactics, or features."],
      ["Valor","Lead By Example",9,"Ability",3,"After dealing damage, mark Stress to let next ally clear Stress or gain Hope."],
      ["Valor","Lean On Me",3,"Ability",1,"Once per long rest, console a failed ally. Both clear 2 Stress."],
      ["Blood","Life Leash",8,"Spell",2,"Redistribute marked HP between you and a willing ally."],
      ["Splendor","Life Ward",4,"Spell",1,"Spend 3 Hope to protect an ally from their next death move."],
      ["Blood","Lifeblood Talisman",1,"Spell",0,"Mark HP to create a talisman. Bearer can spend Hope to reduce HP damage by 1."],
      ["Codex","Manifest Wall",5,"Spell",2,"Once per rest, create a magical wall between two points within Far range."],
      ["Midnight","Mass Disguise",6,"Spell",0,"Change appearance of all willing creatures in Close range."],
      ["Grace","Mass Enrapture",8,"Spell",3,"Enrapture all targets in Far range."],
      ["Grace","Master Of The Craft",9,"Ability",0,"+2 to two Experiences or +3 to one. Then vault permanently."],
      ["Splendor","Mending Touch",1,"Spell",1,"Spend 2 Hope to clear HP or Stress. Once per long rest, clear 2 instead."],
      ["Midnight","Midnight Spirit",2,"Spell",1,"Summon a spirit to move things or attack (d6s equal to Spellcast trait damage)."],
      ["Midnight","Midnight-Touched",7,"Ability",2,"With 4+ Midnight cards: gain Hope instead of GM Fear, add Fear Die to damage."],
      ["Blood","Mutual Suffering",5,"Spell",1,"When marked HP from an attack, make attacker mark the same HP."],
      ["Sage","Natural Familiar",2,"Spell",1,"Summon a familiar. Add d6 to damage when near familiar."],
      ["Sage","Nature's Tongue",1,"Ability",0,"Speak to plants and animals. +2 to Spellcast in natural environments."],
      ["Dread","Nether Flames",6,"Spell",2,"d8+6 magic damage to all in Close range on failed reaction."],
      ["Grace","Never Upstaged",6,"Ability",2,"After taking HP damage, store tokens for +5 damage bonus each on next attack."],
      ["Midnight","Night Terror",9,"Spell",2,"Once per long rest, Horrify targets. Steal Fear and deal d6 damage per stolen Fear."],
      ["Blade","Not Good Enough",1,"Ability",1,"Reroll 1s and 2s on damage dice."],
      ["Grace","Notorious",10,"Ability",0,"Leverage notoriety for +10 bonus. Free food and drinks. Doesn't count against loadout."],
      ["Bone","On The Brink",9,"Ability",1,"With 2 or fewer HP, you don't take Minor damage."],
      ["Blade","Onslaught",10,"Ability",3,"Attacks always deal minimum Major damage (2+ HP). Force reactions from nearby attackers."],
      ["Splendor","Overwhelming Aura",9,"Spell",2,"Spellcast Roll (15) to set Presence equal to Spellcast. Attackers must mark Stress."],
      ["Blood","Parasite Of The Will",5,"Spell",1,"Conjure a bloodworm in target. Advantage on Presence, spend Hope for disadvantage on their rolls."],
      ["Midnight","Phantom Retreat",5,"Spell",2,"Set a return point, then teleport back to it later."],
      ["Midnight","Pick And Pull",1,"Ability",0,"Advantage on picking locks, disarming traps, or stealing."],
      ["Sage","Plant Dominion",9,"Spell",1,"Once per long rest, reshape plant life within Far range."],
      ["Blood","Power Through Pain",1,"Ability",1,"Damage bonus equals twice your marked HP."],
      ["Arcana","Premonition",5,"Spell",2,"Once per long rest, rescind a move and its consequences, then make another."],
      ["Arcana","Preservation Blast",4,"Spell",2,"Force all targets in Melee back to Far range with d8+3 magic damage."],
      ["Blade","Rage Up",6,"Ability",1,"Mark Stress for damage bonus equal to twice Strength. Can Rage Up twice per attack."],
      ["Midnight","Rain Of Blades",1,"Spell",1,"d8+2 magic damage to all in Very Close range. Extra d8 to Vulnerable targets."],
      ["Bone","Rapid Riposte",6,"Ability",0,"When melee attack fails against you, mark Stress to deal weapon damage back."],
      ["Blade","Reaper's Strike",9,"Ability",3,"Once per long rest, force a target to mark 5 HP."],
      ["Splendor","Reassurance",1,"Ability",0,"Once per rest, let an ally reroll their dice."],
      ["Blade","Reckless",2,"Ability",1,"Mark Stress for advantage on an attack."],
      ["Bone","Recovery",6,"Ability",1,"During short rest, choose a long rest move instead. Spend Hope for an ally too."],
      ["Bone","Redirect",4,"Ability",1,"When ranged attack fails, roll d6s. On any 6, redirect attack to nearby adversary."],
      ["Sage","Rejuvenation Barrier",8,"Spell",1,"Once per rest, create protective barrier. Clear 1d4 HP. Resistance to physical damage from outside."],
      ["Splendor","Restoration",6,"Spell",2,"After long rest, gain tokens. Spend to clear 2 HP or 2 Stress per token."],
      ["Splendor","Resurrection",10,"Spell",2,"Spellcast Roll (20) to restore a creature dead up to 100 years."],
      ["Arcana","Rift Walker",6,"Spell",2,"Place arcane marking, then cast again to open a rift back to that spot."],
      ["Valor","Rise Up",6,"Ability",2,"+Proficiency to Severe threshold. When marked HP, clear a Stress."],
      ["Valor","Rousing Strike",5,"Ability",1,"Once per rest on crit, you and allies clear HP or 1d4 Stress."],
      ["Arcana","Rune Ward",1,"Spell",0,"Infuse a trinket with protection. Holder spends Hope to reduce damage by 1d8."],
      ["Blood","Runic Adrenaline",8,"Ability",1,"Use d8 advantage die with marked HP. Mark HP to add 1d8 to Str/Agi/Fin rolls."],
      ["Codex","Safe Haven",8,"Spell",3,"Spend 2 Hope to summon an interdimensional home. Extra downtime move inside."],
      ["Sage","Sage-Touched",7,"Ability",2,"With 4+ Sage cards: +2 Spellcast in nature, double Agi or Inst once per rest."],
      ["Splendor","Salvation Beam",9,"Spell",2,"Spellcast Roll (16). Mark Stress to clear HP on a line of allies."],
      ["Blood","Sanguine Feast",10,"Spell",2,"Spend 2 Hope, mark 1-3 HP, target marks double. If defeated, clear your HP."],
      ["Dread","Savor The Anguish",9,"Spell",0,"When creatures mark Stress or take Severe, spend Hope to clear Stress or Fear."],
      ["Blade","Scramble",3,"Ability",1,"Once per rest, avoid melee damage and move out of range."],
      ["Splendor","Second Wind",3,"Ability",2,"Once per rest on attack success, clear 3 Stress or HP."],
      ["Arcana","Sensory Projection",9,"Spell",0,"Once per rest, drop into a vision of any place you've been."],
      ["Midnight","Shadowbind",2,"Spell",0,"Restrain all adversaries in Very Close range via their shadows."],
      ["Midnight","Shadowhunter",8,"Ability",2,"+1 Evasion and advantage on attacks in low light or darkness."],
      ["Splendor","Shape Material",5,"Spell",1,"Spend Hope to shape natural material you're touching."],
      ["Grace","Share The Burden",6,"Spell",0,"Once per rest, take Stress from an ally. Gain Hope per Stress transferred."],
      ["Dread","Shared Trauma",3,"Spell",1,"Once per rest, redistribute HP between two willing targets."],
      ["Splendor","Shield Aura",8,"Spell",2,"Cast on target. When marking Armor, reduce severity by additional threshold."],
      ["Valor","Shrug It Off",7,"Ability",1,"Mark Stress to reduce damage severity. Roll d6; on 3 or lower, vault this card."],
      ["Codex","Sigil Of Retribution",6,"Spell",2,"Mark adversary with sigil. Store d8s when they deal damage. Spend all on your next attack."],
      ["Bone","Signature Move",5,"Ability",1,"Once per rest, roll d20 as Hope Die for your signature move."],
      ["Dread","Siphon Essence",2,"Spell",1,"Once per short rest, d8 magic damage and clear 2 HP."],
      ["Splendor","Smite",5,"Spell",2,"Once per rest, spend 3 Hope to double damage on next weapon attack."],
      ["Grace","Soothing Speech",4,"Ability",1,"During short rest, clear extra HP when tending wounds. Also clear 2 HP on yourself."],
      ["Midnight","Specter Of The Dark",10,"Spell",1,"Become Spectral. Immune to physical, float through objects."],
      ["Dread","Spectral Mist",5,"Spell",0,"Create mist allowing creatures to pass through solid walls."],
      ["Midnight","Spellcharge",8,"Spell",1,"Store tokens from magic damage. Spend for +d6 per token on attacks."],
      ["Splendor","Splendor-Touched",7,"Ability",2,"With 4+ Splendor cards: +3 Severe threshold, once per long rest mark Stress/Hope instead of HP."],
      ["Bone","Splintering Strike",9,"Ability",3,"Spend Hope to attack all in weapon range, redistribute total damage."],
      ["Midnight","Stealth Expertise",4,"Ability",0,"Mark Stress to change Fear to Hope on stealth rolls. Applies to allies too."],
      ["Bone","Strategic Approach",2,"Ability",1,"After long rest, gain Knowledge tokens. Spend on first attack for advantage, Stress clear, or +d8 damage."],
      ["Splendor","Stunning Sunlight",8,"Spell",2,"3d20+3 or 4d20+5 magic damage. Targets may be Stunned."],
      ["Dread","Summon Horror",4,"Spell",2,"Summon a horror for d10 magic damage. Target may mark 1d4 Stress."],
      ["Valor","Support Tank",4,"Ability",2,"When ally fails, spend 2 Hope to let them reroll a die."],
      ["Bone","Swift Step",10,"Ability",2,"When attack fails against you, clear Stress or gain Hope."],
      ["Bone","Tactician",3,"Ability",1,"When Helping, ally can add your Experience. Tag Team with d20 Hope Die."],
      ["Arcana","Telekinesis",6,"Spell",0,"Move a target with your mind. Throw them at another for d12+4 damage."],
      ["Codex","Teleport",5,"Spell",2,"Once per long rest, teleport yourself and willing targets to a place you've been."],
      ["Grace","Tell No Lies",2,"Spell",1,"Spellcast Roll against target. They can't lie to you while in Close range."],
      ["Sage","Tempest",10,"Spell",2,"Choose Blizzard (2d20+8), Hurricane (3d10+10), or Sandstorm (5d6+9) against all in Far range."],
      ["Dread","Terrify",3,"Spell",1,"Target marks 1d4 Stress and can be pushed one range away. Spend Hope for Vulnerable."],
      ["Sage","Thorn Skin",5,"Spell",1,"Once per rest, sprout thorns. Spend tokens to reduce damage and reflect to melee attackers."],
      ["Grace","Thought Delver",5,"Spell",2,"Read surface thoughts. Spellcast Roll for deeper thoughts."],
      ["Grace","Through Your Eyes",4,"Spell",1,"See and hear through a target's senses within Very Far range."],
      ["Sage","Towering Stalk",3,"Spell",1,"Once per rest, conjure a climbable stalk. Mark Stress to use as attack for d8 damage."],
      ["Codex","Transcendent Union",10,"Spell",1,"Once per long rest, link creatures. They can choose who marks Stress or HP."],
      ["Grace","Troublemaker",2,"Ability",2,"Taunt a target. Once per rest, roll d4s and target marks Stress equal to highest."],
      ["Midnight","Twilight Toll",9,"Ability",1,"Build tokens from non-damage successes. Spend for +d12 per token on damage."],
      ["Dread","Umbral Veil",1,"Spell",1,"Spend Hope for shadow energy tokens. Spend for +1 Evasion per token."],
      ["Valor","Unbreakable",10,"Ability",4,"On last HP, roll d6 to clear that many HP instead of death move. Then vault."],
      ["Midnight","Uncanny Disguise",1,"Spell",0,"Mark Stress to disguise as any humanoid. Limited action tokens."],
      ["Arcana","Unleash Chaos",1,"Spell",1,"Place Spellcast tokens. Spend tokens for d10s of magic damage."],
      ["Bone","Untouchable",1,"Ability",1,"+half Agility to Evasion."],
      ["Valor","Unyielding Armor",10,"Ability",1,"When marking Armor, roll d6s. On any 6, reduce severity without marking."],
      ["Valor","Valor-Touched",7,"Ability",1,"With 4+ Valor cards: +1 Armor Score, clear Armor when taking HP without using Armor."],
      ["Blood","Vampiric Strike",7,"Spell",2,"On successful attack causing 2+ HP, spend Hope to clear HP or Stress."],
      ["Midnight","Vanishing Dodge",7,"Spell",1,"When physical attack fails, spend Hope to become Hidden and teleport."],
      ["Midnight","Veil Of Night",3,"Spell",1,"Create darkness curtain. Only you can see through. Advantage on attacks through it."],
      ["Blade","Versatile Fighter",3,"Ability",1,"Use different trait for weapon. Mark Stress to maximize one damage die."],
      ["Sage","Vicious Entangle",1,"Spell",1,"1d8+1 damage and Restrain. Spend Hope to Restrain another nearby."],
      ["Blood","Vital Ward",6,"Spell",1,"Mark HP to create a blood circle with resistance to physical or magic damage."],
      ["Blade","Vitality",5,"Ability",0,"Permanently gain two of: Stress slot, HP slot, +2 thresholds. Then vault permanently."],
      ["Blood","Vitality Manipulation",2,"Spell",0,"Spellcast Roll for calming or agitating a target's Stress."],
      ["Dread","Voice Of Dread",1,"Spell",0,"Speak into a creature's ears. On success, they mark Stress and become Vulnerable."],
      ["Splendor","Voice Of Reason",3,"Ability",1,"Advantage to de-escalate. With full Stress, +1 Proficiency for damage."],
      ["Dread","Wailing Leap",6,"Spell",0,"When dealing magic damage, mark Stress to teleport into Melee."],
      ["Dread","Wall Of Hunger",7,"Spell",2,"Create a wall of necrotic energy. Creatures passing through mark 2 Stress and may be Restrained."],
      ["Arcana","Wall Walk",1,"Spell",1,"Spend Hope to let a creature walk on walls and ceilings."],
      ["Blood","Weave The Flesh",4,"Spell",1,"Once per rest, mark HP to let allies clear HP or Stress. Mark Stress for one of each."],
      ["Blade","Whirlwind",1,"Ability",0,"Attack in Very Close range. Spend Hope to hit all other targets for half damage."],
      ["Sage","Wild Fortress",5,"Spell",1,"Spellcast Roll (13) for a protective dome. Can't be targeted inside. Thresholds: 15/30."],
      ["Sage","Wild Surge",7,"Spell",2,"Once per long rest, Wild Surge Die adds its escalating value to all action rolls."],
      ["Dread","Withering Affliction",4,"Spell",2,"Make target Withered. Their damage is reduced by 1 HP."],
      ["Grace","Words Of Discord",5,"Spell",1,"Whisper to make adversary attack another adversary instead."],
      ["Bone","Wrangle",8,"Ability",1,"Agility Roll to reposition targets and allies within Close range."],
      ["Splendor","Zone Of Protection",6,"Spell",2,"Once per long rest, create protection zone. Escalating d6 damage reduction for allies."],
    ];

    for (const [domain, name, level, type, recall, desc] of domains) {
      cards.push({
        card_type: "domain", name: name as string, source: domain as string, content: desc as string,
        metadata: { level, type, recall_cost: recall, domain }
      });
    }

    // Batch insert
    const batchSize = 50;
    let inserted = 0;
    for (let i = 0; i < cards.length; i += batchSize) {
      const batch = cards.slice(i, i + batchSize);
      const { error } = await supabase.from("game_cards").insert(batch);
      if (error) {
        console.error(`Batch insert error at ${i}:`, error);
        return new Response(JSON.stringify({ error: error.message, inserted }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      inserted += batch.length;
    }

    return new Response(JSON.stringify({ success: true, inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
