INSERT INTO public.evolution_transformations (label, description, granted_tags, host_required_tags, host_tag_match_mode, forbidden_tags, acquisition, stackable, stage, chance, powers)
SELECT label, NULL, ARRAY['Undead', label]::text[], ARRAY[]::text[], 'all', ARRAY['Construct']::text[], 'afflicted', false, 1, 0, '[]'::jsonb
FROM (VALUES
  ('Skeleton'),('Zombie'),('Ghoul'),('Mummy'),('Revenant'),
  ('Wraith'),('Banshee'),('Poltergeist'),('Vampire Spawn'),
  ('Dracolich'),('Crawling Claw'),('Will-o''-Wisp'),('Flaming Skeleton')
) AS t(label)
WHERE NOT EXISTS (
  SELECT 1 FROM public.evolution_transformations et WHERE et.label = t.label
);