UPDATE public.evolution_nodes
SET mate_up_probability = 0.20
WHERE type IN ('family', 'race');