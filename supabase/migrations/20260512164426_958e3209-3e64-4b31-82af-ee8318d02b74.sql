-- Remove Undead source layer entirely; undead is now a transformation
DELETE FROM public.evolution_edges
WHERE parent_id IN (SELECT id FROM public.evolution_nodes WHERE label='Undead' AND type='source')
   OR child_id IN (SELECT id FROM public.evolution_nodes WHERE label='Undead' AND type='source')
   OR child_id IN (SELECT id FROM public.evolution_nodes WHERE label IN (
      'Crawling Claw','Dracolich','Ghoul','Mummy','Revenant','Skeleton','Vampire Spawn',
      'Will-o''-Wisp','Zombie','Wraith','Banshee','Flaming Skeleton','Ghost','Poltergeist'
   ));

DELETE FROM public.evolution_nodes
WHERE label IN (
  'Undead','Crawling Claw','Dracolich','Ghoul','Mummy','Revenant','Skeleton','Vampire Spawn',
  'Will-o''-Wisp','Zombie','Wraith','Banshee','Flaming Skeleton','Ghost','Poltergeist'
);

-- Insert official transformations with powers
INSERT INTO public.evolution_transformations (label, description, granted_tags, host_required_tags, host_tag_match_mode, forbidden_tags, acquisition, stackable, stage, chance, powers)
VALUES
('Vampire',
 'A creature transformed into an undead bloodfeeder. Hungers for living vitality.',
 ARRAY['Undead','Vampire'], ARRAY[]::text[], 'all', ARRAY['Construct']::text[], 'afflicted', false, 1, 0,
 '[
   {"name":"FANGS","description":"Make a Strength Roll to bite a target within Melee range, dealing d8 physical damage using your Proficiency."},
   {"name":"FEED","description":"On a successful FANGS attack against a living creature, you can mark a Stress to FEED. Place a number of tokens on this card equal to the number of Hit Points your target has remaining. While you have tokens on this card, your advantage die is a d8 instead of a d6."}
 ]'::jsonb),
('Ghost',
 'An incorporeal undead spirit, only loosely tethered to the material world.',
 ARRAY['Undead','Ghost','Incorporeal'], ARRAY[]::text[], 'all', ARRAY['Construct']::text[], 'afflicted', false, 1, 0,
 '[
   {"name":"INCORPOREAL","description":"You can move through solid objects and creatures. Physical attacks against you deal half damage; magic damage is unchanged. You can spend 2 Hope to attack or physically interact with the material world."},
   {"name":"EPHEMERAL","description":"Cross out a Hit Point slot when you take this card and when you increase your tier. When you mark your last Hit Point, you must choose Blaze of Glory as your death move."}
 ]'::jsonb),
('Demigod',
 'Touched by divinity. A mortal carrying the ichor of the gods.',
 ARRAY['Demigod','Divine'], ARRAY[]::text[], 'all', ARRAY[]::text[], 'innate', false, 1, 0,
 '[
   {"name":"ICHOR OF THE GODS","description":"Your advantage die is always a d10 instead of d6."},
   {"name":"WEIGHT OF DIVINITY","description":"When you roll a failure with Fear, you must mark a Stress or give the GM an additional Fear."}
 ]'::jsonb);