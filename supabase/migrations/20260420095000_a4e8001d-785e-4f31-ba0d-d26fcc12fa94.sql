ALTER TABLE public.evolution_nodes
  ADD COLUMN IF NOT EXISTS reproduction_mode text NOT NULL DEFAULT 'sexual';