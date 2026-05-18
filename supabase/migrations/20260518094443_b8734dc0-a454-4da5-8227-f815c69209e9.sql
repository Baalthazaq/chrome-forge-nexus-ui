
-- 1. Drop brood_role
ALTER TABLE public.evolution_nodes DROP COLUMN IF EXISTS brood_role;

-- 2. Drop legacy carrier_node_id (kept only carrier_node_ids[])
ALTER TABLE public.evolution_transformations DROP COLUMN IF EXISTS carrier_node_id;

-- 3. Clear carriers from transformations that reference the placeholder carrier nodes
UPDATE public.evolution_transformations
SET carrier_node_ids = '{}'::uuid[], requires_carrier_hybrid = false
WHERE carrier_node_ids && ARRAY[
  '4c5de703-f065-403c-8b8a-f9088de2d86e'::uuid,
  '83ac3b69-ff94-4ae3-ad35-eeacb8c82cc1'::uuid,
  'ab228c86-06db-4447-8c97-f838c6cdaeee'::uuid
];

-- 4. Delete placeholder carrier nodes and any edges that touched them
DELETE FROM public.evolution_edges
WHERE parent_id IN (
  '4c5de703-f065-403c-8b8a-f9088de2d86e',
  '83ac3b69-ff94-4ae3-ad35-eeacb8c82cc1',
  'ab228c86-06db-4447-8c97-f838c6cdaeee'
) OR child_id IN (
  '4c5de703-f065-403c-8b8a-f9088de2d86e',
  '83ac3b69-ff94-4ae3-ad35-eeacb8c82cc1',
  'ab228c86-06db-4447-8c97-f838c6cdaeee'
);

DELETE FROM public.evolution_nodes
WHERE id IN (
  '4c5de703-f065-403c-8b8a-f9088de2d86e',
  '83ac3b69-ff94-4ae3-ad35-eeacb8c82cc1',
  'ab228c86-06db-4447-8c97-f838c6cdaeee'
);
