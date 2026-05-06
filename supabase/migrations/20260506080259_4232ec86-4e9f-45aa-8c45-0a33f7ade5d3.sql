DROP POLICY IF EXISTS "Everyone can view route nodes" ON public.map_route_nodes;
DROP POLICY IF EXISTS "Everyone can view route edges" ON public.map_route_edges;
CREATE POLICY "Everyone can view route nodes" ON public.map_route_nodes FOR SELECT USING (true);
CREATE POLICY "Everyone can view route edges" ON public.map_route_edges FOR SELECT USING (true);