ALTER TABLE public.evolution_nodes
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS host_required_tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS host_tag_match_mode text NOT NULL DEFAULT 'all';