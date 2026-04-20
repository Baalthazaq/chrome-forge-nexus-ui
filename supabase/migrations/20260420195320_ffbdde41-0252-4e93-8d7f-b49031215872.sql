-- Insert "The Source" node
INSERT INTO public.evolution_nodes (label, type, reproduction_mode, weight, mate_up_probability, color, x, y)
VALUES ('The Source', 'source', 'asexual', 1, 0.33, '#fbbf24', 0, -400);

-- Link The Source as parent to all family nodes except Construct and Undead
INSERT INTO public.evolution_edges (parent_id, child_id)
SELECT
  (SELECT id FROM public.evolution_nodes WHERE label = 'The Source' LIMIT 1),
  n.id
FROM public.evolution_nodes n
WHERE n.type = 'family'
  AND n.label NOT IN ('Construct', 'Undead');