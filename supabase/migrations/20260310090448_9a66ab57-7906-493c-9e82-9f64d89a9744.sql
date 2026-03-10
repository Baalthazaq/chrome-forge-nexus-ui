
-- Map locations (pins on the map)
CREATE TABLE public.map_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon_type TEXT NOT NULL DEFAULT 'default',
  image_url TEXT,
  x DOUBLE PRECISION NOT NULL,
  y DOUBLE PRECISION NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT false,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.map_locations ENABLE ROW LEVEL SECURITY;

-- Everyone can see public locations
CREATE POLICY "Everyone can view public locations" ON public.map_locations
  FOR SELECT USING (is_public = true);

-- Users can see their own locations
CREATE POLICY "Users can view own locations" ON public.map_locations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Users can create their own locations
CREATE POLICY "Users can create locations" ON public.map_locations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Users can update their own locations
CREATE POLICY "Users can update own locations" ON public.map_locations
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Users can delete their own locations
CREATE POLICY "Users can delete own locations" ON public.map_locations
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Admins can manage all
CREATE POLICY "Admins can manage all locations" ON public.map_locations
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_map_locations_updated_at
  BEFORE UPDATE ON public.map_locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Map areas (polygon regions)
CREATE TABLE public.map_areas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  polygon_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  environment_card JSONB DEFAULT '{}'::jsonb,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.map_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view areas" ON public.map_areas
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage areas" ON public.map_areas
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_map_areas_updated_at
  BEFORE UPDATE ON public.map_areas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Map route nodes (invisible pathfinding nodes)
CREATE TABLE public.map_route_nodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  x DOUBLE PRECISION NOT NULL,
  y DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.map_route_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view route nodes" ON public.map_route_nodes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage route nodes" ON public.map_route_nodes
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Map route edges (connections between nodes)
CREATE TABLE public.map_route_edges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_node_id UUID NOT NULL REFERENCES public.map_route_nodes(id) ON DELETE CASCADE,
  to_node_id UUID NOT NULL REFERENCES public.map_route_nodes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(from_node_id, to_node_id)
);

ALTER TABLE public.map_route_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view route edges" ON public.map_route_edges
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage route edges" ON public.map_route_edges
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Area reviews by players
CREATE TABLE public.map_area_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  area_id UUID NOT NULL REFERENCES public.map_areas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL DEFAULT 3,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.map_area_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view reviews" ON public.map_area_reviews
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create reviews" ON public.map_area_reviews
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews" ON public.map_area_reviews
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reviews" ON public.map_area_reviews
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage reviews" ON public.map_area_reviews
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_map_area_reviews_updated_at
  BEFORE UPDATE ON public.map_area_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
