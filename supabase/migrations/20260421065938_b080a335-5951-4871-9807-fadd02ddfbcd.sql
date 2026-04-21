-- Extend evolution_nodes with quirk + origin flags
ALTER TABLE public.evolution_nodes
  ADD COLUMN IF NOT EXISTS origin_mode text NOT NULL DEFAULT 'born',
  ADD COLUMN IF NOT EXISTS is_carrier boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS variant_inheritance text NOT NULL DEFAULT 'random',
  ADD COLUMN IF NOT EXISTS mate_variant_lock_tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS identity_overwrites_host boolean NOT NULL DEFAULT false;

-- Transformations table
CREATE TABLE IF NOT EXISTS public.evolution_transformations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  description text,
  granted_tags text[] NOT NULL DEFAULT '{}',
  host_required_tags text[] NOT NULL DEFAULT '{}',
  host_tag_match_mode text NOT NULL DEFAULT 'all',
  forbidden_tags text[] NOT NULL DEFAULT '{}',
  acquisition text NOT NULL DEFAULT 'afflicted',
  carrier_node_id uuid REFERENCES public.evolution_nodes(id) ON DELETE SET NULL,
  stackable boolean NOT NULL DEFAULT false,
  stage integer NOT NULL DEFAULT 0,
  chance numeric NOT NULL DEFAULT 0.05,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.evolution_transformations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view transformations"
  ON public.evolution_transformations FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage transformations"
  ON public.evolution_transformations FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_evolution_transformations_updated_at
  BEFORE UPDATE ON public.evolution_transformations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_evolution_transformations_stage ON public.evolution_transformations(stage);
CREATE INDEX IF NOT EXISTS idx_evolution_nodes_origin_mode ON public.evolution_nodes(origin_mode);
CREATE INDEX IF NOT EXISTS idx_evolution_nodes_is_carrier ON public.evolution_nodes(is_carrier);