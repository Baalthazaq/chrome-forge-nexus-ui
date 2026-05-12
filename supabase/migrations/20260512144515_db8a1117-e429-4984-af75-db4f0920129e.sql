
-- Update existing Vampire with official description + powers
UPDATE public.evolution_transformations
SET
  description = 'Cursed undeath conferred by a sire''s bite. Grants the Undead and Vampire tags.',
  granted_tags = ARRAY['Undead','Vampire'],
  powers = '[
    {"name":"Fangs","description":"Make a Strength Roll to bite a target within Melee range, dealing d8 physical damage using your Proficiency."},
    {"name":"Feed","description":"On a successful FANGS attack against a living creature, you can mark a Stress to FEED. Place a number of tokens on this card equal to the number of Hit Points your target marks. You can hold up to 5 tokens at a time. Spend a token before an action roll to make your Fear Die a d20 instead. When you take a Long Rest, remove a token. If there are no tokens on this card, all your action and reaction rolls are made with disadvantage."}
  ]'::jsonb
WHERE label = 'Vampire';

-- Insert the rest (idempotent)
INSERT INTO public.evolution_transformations
  (label, description, granted_tags, host_required_tags, host_tag_match_mode, acquisition, stage, chance, stackable, powers)
SELECT * FROM (VALUES
  (
    'Werewolf',
    'A lycanthropic curse that lets the bearer shift into a feral wolf form. Grants the Werewolf tag.',
    ARRAY['Werewolf'], ARRAY['Humanoid']::text[], 'any', 'afflicted', 3, 0.03, false,
    '[
      {"name":"Wolf Form","description":"When you mark one or more Hit Points, you can also mark a Stress to enter your Wolf Form. While in this form, gain a d10 Wolf Die that you add to all attacks and damage rolls. When you would gain a Hope while in Wolf Form, you mark a Stress instead."},
      {"name":"Frenzy","description":"When you mark your last Stress while in Wolf Form, you go into a Frenzy. Roll a number of d20s equal to your tier and automatically deal that much physical damage to all creatures within Very Close range. Then drop out of Wolf Form."}
    ]'::jsonb
  ),
  (
    'Reanimated',
    'A body stitched back together from death. Grants the Undead and Reanimated tags.',
    ARRAY['Undead','Reanimated'], ARRAY[]::text[], 'all', 'innate', 3, 0.0, false,
    '[
      {"name":"Stitch Up","description":"During a rest, you can only clear Hit Points if you have access to remains from a recently deceased creature. Describe how using this material affects your appearance. You cannot clear Hit Points by any means except a downtime move or the Risk It All death move."},
      {"name":"Corpse","description":"When you Risk It All on a death move, if you fail, you can permanently mark a Hit Point to succeed instead. When you do, you still use the Hope Die''s value to clear Hit Points and Stress."}
    ]'::jsonb
  ),
  (
    'Shapeshifter',
    'A being whose flesh refuses a single form. Grants the Shapeshifter tag.',
    ARRAY['Shapeshifter'], ARRAY[]::text[], 'all', 'innate', 3, 0.0, false,
    '[
      {"name":"Change Shape","description":"During a long rest, you can spend a downtime move to swap your current ancestry with another. When you do, describe how your appearance changes."},
      {"name":"Only Skin Deep","description":"When you CHANGE SHAPE, you only gain the benefit of one of the ancestry''s features, which you select when you choose the ancestry. You can spend a downtime move to switch which of your ancestry''s features you gain the benefit of."}
    ]'::jsonb
  ),
  (
    'Ghost',
    'A spirit lingering between worlds, half-tethered to flesh. Grants the Undead and Ghost tags.',
    ARRAY['Undead','Ghost'], ARRAY[]::text[], 'all', 'innate', 3, 0.0, false,
    '[
      {"name":"Spirit Form","description":"Your physical form can shift between corporeal and incorporeal. Mark a Stress to transition into and out of your Spirit Form. While in Spirit Form, you can move through solid objects, are immune to physical damage, and take double magic damage. You can spend 2 Hope to attack or physically interact with the material world."},
      {"name":"Ephemeral","description":"Cross out a Hit Point slot when you take this card and when you increase your tier. When you mark your last Hit Point, you must choose Blaze of Glory as your death move."}
    ]'::jsonb
  ),
  (
    'Demigod',
    'Touched by divinity — divine ichor runs in their veins. Grants the Demigod tag.',
    ARRAY['Demigod'], ARRAY[]::text[], 'all', 'innate', 3, 0.0, false,
    '[
      {"name":"Ichor of the Gods","description":"Your advantage die is always a d10 instead of d6."},
      {"name":"Weight of Divinity","description":"When you roll a failure with Fear, you must mark a Stress or give the GM an additional Fear."}
    ]'::jsonb
  )
) AS v(label, description, granted_tags, host_required_tags, host_tag_match_mode, acquisition, stage, chance, stackable, powers)
WHERE NOT EXISTS (
  SELECT 1 FROM public.evolution_transformations t WHERE t.label = v.label
);
