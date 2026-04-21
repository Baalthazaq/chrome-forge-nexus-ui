-- 1. Detach non-born families from Source by marking origin_mode
UPDATE public.evolution_nodes 
SET origin_mode = 'created' 
WHERE label IN ('Construct', 'Modron') AND type = 'family';

UPDATE public.evolution_nodes 
SET origin_mode = 'parasitic' 
WHERE label = 'Undead' AND type = 'family';

-- 2. Spider quirk: father determines variant
UPDATE public.evolution_nodes 
SET variant_inheritance = 'father' 
WHERE label = 'Spider' AND type = 'race';

-- 3. Remove Queen, Drider, Vampire variant nodes (and their edges via cascade-on-delete... or manually)
DELETE FROM public.evolution_edges 
WHERE child_id IN (
  SELECT id FROM public.evolution_nodes 
  WHERE type = 'variant' AND label IN ('Queen', 'Drider', 'Vampire')
);

DELETE FROM public.evolution_nodes 
WHERE type = 'variant' AND label IN ('Queen', 'Drider', 'Vampire');

-- 4. Add Parasitic Fungril race under Plant family
INSERT INTO public.evolution_nodes (label, type, origin_mode, identity_overwrites_host, host_required_tags, host_tag_match_mode, weight, x, y)
VALUES ('Parasitic Fungril', 'race', 'parasitic', true, ARRAY['Humanoid'], 'any', 1, 0, 0);

INSERT INTO public.evolution_edges (parent_id, child_id)
SELECT 
  (SELECT id FROM public.evolution_nodes WHERE label = 'Plant' AND type = 'family' LIMIT 1),
  (SELECT id FROM public.evolution_nodes WHERE label = 'Parasitic Fungril' AND type = 'race' LIMIT 1);

-- 5. Carrier nodes (small, isolated, is_carrier=true). Type = 'carrier' to keep them out of normal lineage.
INSERT INTO public.evolution_nodes (label, type, is_carrier, origin_mode, weight, x, y)
VALUES 
  ('Drider Ritual', 'carrier', true, 'created', 0, 0, 0),
  ('Spider Pheromone', 'carrier', true, 'created', 0, 0, 0),
  ('Vampire Sire', 'carrier', true, 'created', 0, 0, 0);

-- 6. Insert transformations
INSERT INTO public.evolution_transformations 
  (label, description, granted_tags, host_required_tags, host_tag_match_mode, acquisition, carrier_node_id, stage, chance)
VALUES
  (
    'Drider',
    'Drow afflicted by Lolth''s ritual fuses with arachnid form. Grants the Spider tag, opening eligibility for further spider-based transformations.',
    ARRAY['Spider', 'Drider'],
    ARRAY['Drow'],
    'any',
    'afflicted',
    (SELECT id FROM public.evolution_nodes WHERE label = 'Drider Ritual' LIMIT 1),
    1,
    0.05
  ),
  (
    'Spider Queen',
    'A spider transformed by hive pheromones into a fertile matriarch. Triggered innately at birth in the presence of an existing queen.',
    ARRAY['Spider Queen'],
    ARRAY['Spider'],
    'all',
    'innate',
    (SELECT id FROM public.evolution_nodes WHERE label = 'Spider Pheromone' LIMIT 1),
    2,
    0.05
  ),
  (
    'Vampire',
    'Cursed undeath conferred by a sire''s bite. Grants the Undead and Vampire tags.',
    ARRAY['Undead', 'Vampire'],
    ARRAY['Humanoid'],
    'any',
    'afflicted',
    (SELECT id FROM public.evolution_nodes WHERE label = 'Vampire Sire' LIMIT 1),
    3,
    0.03
  );