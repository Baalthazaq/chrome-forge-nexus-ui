ALTER TABLE public.evolution_nodes
  DROP COLUMN IF EXISTS mate_variant_lock_tags,
  DROP COLUMN IF EXISTS identity_overwrites_host,
  DROP COLUMN IF EXISTS origin_mode,
  DROP COLUMN IF EXISTS variant_inheritance,
  DROP COLUMN IF EXISTS host_required_tags,
  DROP COLUMN IF EXISTS host_tag_match_mode;

DROP INDEX IF EXISTS public.idx_evolution_nodes_origin_mode;