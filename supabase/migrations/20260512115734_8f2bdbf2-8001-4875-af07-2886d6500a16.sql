
-- Seed The Source node and link all current root families to it
WITH src AS (
  INSERT INTO public.evolution_nodes (label, type, color, x, y)
  VALUES ('The Source', 'source', 'hsl(45 90% 70%)', 0, 0)
  RETURNING id
)
INSERT INTO public.evolution_edges (parent_id, child_id)
SELECT (SELECT id FROM src), n.id
FROM public.evolution_nodes n
WHERE n.type = 'family'
  AND NOT EXISTS (
    SELECT 1 FROM public.evolution_edges e
    JOIN public.evolution_nodes p ON p.id = e.parent_id
    WHERE e.child_id = n.id AND p.type = 'source'
  );
