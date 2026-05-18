-- Sex rules & brood roles on evolution nodes
ALTER TABLE public.evolution_nodes
  ADD COLUMN IF NOT EXISTS sex_rule text,
  ADD COLUMN IF NOT EXISTS brood_role text;

ALTER TABLE public.evolution_nodes
  DROP CONSTRAINT IF EXISTS evolution_nodes_sex_rule_check;
ALTER TABLE public.evolution_nodes
  ADD CONSTRAINT evolution_nodes_sex_rule_check
  CHECK (sex_rule IS NULL OR sex_rule IN ('queen_only_female','always_male','always_female','hermaphrodite'));

ALTER TABLE public.evolution_nodes
  DROP CONSTRAINT IF EXISTS evolution_nodes_brood_role_check;
ALTER TABLE public.evolution_nodes
  ADD CONSTRAINT evolution_nodes_brood_role_check
  CHECK (brood_role IS NULL OR brood_role IN ('queen','drone','worker'));

-- Composite carriers on transformations
ALTER TABLE public.evolution_transformations
  ADD COLUMN IF NOT EXISTS carrier_node_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS requires_carrier_hybrid boolean NOT NULL DEFAULT false;

-- Backfill carrier_node_ids from the legacy single carrier_node_id
UPDATE public.evolution_transformations
SET carrier_node_ids = ARRAY[carrier_node_id]
WHERE carrier_node_id IS NOT NULL
  AND (carrier_node_ids IS NULL OR array_length(carrier_node_ids, 1) IS NULL);