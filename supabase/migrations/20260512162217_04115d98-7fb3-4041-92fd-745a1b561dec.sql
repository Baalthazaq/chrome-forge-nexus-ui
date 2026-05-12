
-- Promote Aberration, Undead, Construct to sources
UPDATE public.evolution_nodes SET type='source' WHERE label IN ('Aberration','Undead','Construct');

-- Detach them from The Source (they ARE sources now)
DELETE FROM public.evolution_edges
WHERE parent_id = (SELECT id FROM public.evolution_nodes WHERE label='The Source' AND type='source')
  AND child_id IN (SELECT id FROM public.evolution_nodes WHERE label IN ('Aberration','Undead','Construct') AND type='source');

-- Preserve descendant tag inheritance: keep their label as an explicit tag on the source node
UPDATE public.evolution_nodes
SET tags = (SELECT ARRAY(SELECT DISTINCT unnest(tags || ARRAY[label])))
WHERE label IN ('Aberration','Undead','Construct') AND type='source';

-- Link Gith to Humanoid family as a second parent
INSERT INTO public.evolution_edges (parent_id, child_id)
SELECT
  (SELECT id FROM public.evolution_nodes WHERE label='Humanoid' AND type='family'),
  (SELECT id FROM public.evolution_nodes WHERE label='Gith' AND type='race')
WHERE NOT EXISTS (
  SELECT 1 FROM public.evolution_edges
  WHERE parent_id = (SELECT id FROM public.evolution_nodes WHERE label='Humanoid' AND type='family')
    AND child_id = (SELECT id FROM public.evolution_nodes WHERE label='Gith' AND type='race')
);
