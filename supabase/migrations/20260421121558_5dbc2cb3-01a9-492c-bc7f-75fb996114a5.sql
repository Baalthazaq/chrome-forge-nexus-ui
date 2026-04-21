-- Fungril: it's a Fey race, should reproduce sexually so Racegen rolls it
UPDATE public.evolution_nodes
SET reproduction_mode = 'sexual', origin_mode = 'born'
WHERE label = 'Fungril' AND type = 'race';

-- Clank: move from Modron family to Construct family so it shows in the created pool
DELETE FROM public.evolution_edges
WHERE child_id = (SELECT id FROM public.evolution_nodes WHERE label = 'Clank' AND type = 'race')
  AND parent_id = (SELECT id FROM public.evolution_nodes WHERE label = 'Modron' AND type = 'family');

INSERT INTO public.evolution_edges (parent_id, child_id)
SELECT
  (SELECT id FROM public.evolution_nodes WHERE label = 'Construct' AND type = 'family'),
  (SELECT id FROM public.evolution_nodes WHERE label = 'Clank' AND type = 'race')
WHERE NOT EXISTS (
  SELECT 1 FROM public.evolution_edges
  WHERE parent_id = (SELECT id FROM public.evolution_nodes WHERE label = 'Construct' AND type = 'family')
    AND child_id = (SELECT id FROM public.evolution_nodes WHERE label = 'Clank' AND type = 'race')
);

-- Make sure Clank's modes are consistent with the Created flow
UPDATE public.evolution_nodes
SET origin_mode = 'created', reproduction_mode = 'created'
WHERE label = 'Clank' AND type = 'race';