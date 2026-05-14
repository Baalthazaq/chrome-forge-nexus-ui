-- 1. Add mate_tags column
ALTER TABLE public.evolution_nodes
  ADD COLUMN IF NOT EXISTS mate_tags text[] NOT NULL DEFAULT '{}';

-- 2. Allow null reproduction_mode (means: inherit from ancestor)
ALTER TABLE public.evolution_nodes
  ALTER COLUMN reproduction_mode DROP NOT NULL,
  ALTER COLUMN reproduction_mode DROP DEFAULT;

-- 3. Collapse types: keep 'source', everything else becomes 'node'
UPDATE public.evolution_nodes SET type = 'node' WHERE type <> 'source';