
CREATE TABLE public.evolution_nodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'race',
  x DOUBLE PRECISION NOT NULL DEFAULT 0,
  y DOUBLE PRECISION NOT NULL DEFAULT 0,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.evolution_edges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id UUID NOT NULL REFERENCES public.evolution_nodes(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.evolution_nodes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (parent_id, child_id)
);

ALTER TABLE public.evolution_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolution_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view evolution nodes"
  ON public.evolution_nodes FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage evolution nodes"
  ON public.evolution_nodes FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view evolution edges"
  ON public.evolution_edges FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage evolution edges"
  ON public.evolution_edges FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_evolution_nodes_updated_at
  BEFORE UPDATE ON public.evolution_nodes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_evolution_edges_parent ON public.evolution_edges(parent_id);
CREATE INDEX idx_evolution_edges_child ON public.evolution_edges(child_id);
