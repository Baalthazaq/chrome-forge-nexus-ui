import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface MapLocation {
  id: string;
  name: string;
  description: string | null;
  icon_type: string;
  image_url: string | null;
  marker_color: string;
  x: number;
  y: number;
  is_public: boolean;
  user_id: string;
  environment_card: EnvironmentCard;
  created_at: string;
  updated_at: string;
}

export interface MapArea {
  id: string;
  name: string;
  description: string | null;
  polygon_points: { x: number; y: number }[];
  environment_card: EnvironmentCard;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface EnvironmentCard {
  tier?: number;
  type?: string;
  impulses?: string[];
  difficulty?: string;
  potential_adversaries?: string;
  features?: { name: string; type: string; description: string }[];
  visible_fields?: {
    impulses?: boolean;
    difficulty?: boolean;
    adversaries?: boolean;
    features?: boolean;
  };
}

export interface MapRouteNode {
  id: string;
  x: number;
  y: number;
  created_at: string;
}

export interface MapRouteEdge {
  id: string;
  from_node_id: string;
  to_node_id: string;
  created_at: string;
}

export interface MapAreaReview {
  id: string;
  area_id: string;
  user_id: string;
  rating: number;
  content: string | null;
  created_at: string;
  updated_at: string;
  profile?: { character_name: string | null; avatar_url: string | null };
}

export interface MapLocationReview {
  id: string;
  location_id: string;
  user_id: string;
  rating: number;
  content: string | null;
  created_at: string;
  updated_at: string;
  profile?: { character_name: string | null; avatar_url: string | null };
}

export const useMazeData = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const locationsQuery = useQuery({
    queryKey: ['map-locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('map_locations')
        .select('*')
        .order('name');
      if (error) throw error;
      return (data || []).map((l: any) => ({
        ...l,
        environment_card: l.environment_card || {},
      })) as MapLocation[];
    },
  });

  const areasQuery = useQuery({
    queryKey: ['map-areas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('map_areas')
        .select('*')
        .order('name');
      if (error) throw error;
      return (data || []).map((a: any) => ({
        ...a,
        polygon_points: Array.isArray(a.polygon_points) ? a.polygon_points : [],
        environment_card: a.environment_card || {},
      })) as MapArea[];
    },
  });

  const routeNodesQuery = useQuery({
    queryKey: ['map-route-nodes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('map_route_nodes')
        .select('*');
      if (error) throw error;
      return (data || []) as MapRouteNode[];
    },
  });

  const routeEdgesQuery = useQuery({
    queryKey: ['map-route-edges'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('map_route_edges')
        .select('*');
      if (error) throw error;
      return (data || []) as MapRouteEdge[];
    },
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['map-locations'] });
    queryClient.invalidateQueries({ queryKey: ['map-areas'] });
    queryClient.invalidateQueries({ queryKey: ['map-route-nodes'] });
    queryClient.invalidateQueries({ queryKey: ['map-route-edges'] });
  };

  // Location mutations
  const createLocation = useMutation({
    mutationFn: async (loc: Omit<MapLocation, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase.from('map_locations').insert(loc).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['map-locations'] }),
  });

  const updateLocation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MapLocation> & { id: string }) => {
      const { error } = await supabase.from('map_locations').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['map-locations'] }),
  });

  const deleteLocation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('map_locations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['map-locations'] }),
  });

  // Area mutations
  const createArea = useMutation({
    mutationFn: async (area: Omit<MapArea, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase.from('map_areas').insert(area as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['map-areas'] }),
  });

  const updateArea = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MapArea> & { id: string }) => {
      const { error } = await supabase.from('map_areas').update(updates as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['map-areas'] }),
  });

  const deleteArea = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('map_areas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['map-areas'] }),
  });

  // Route node mutations
  const createRouteNode = useMutation({
    mutationFn: async (node: { x: number; y: number }) => {
      const { data, error } = await supabase.from('map_route_nodes').insert(node).select().single();
      if (error) throw error;
      return data as MapRouteNode;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['map-route-nodes'] }),
  });

  const deleteRouteNode = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('map_route_nodes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['map-route-nodes'] });
      queryClient.invalidateQueries({ queryKey: ['map-route-edges'] });
    },
  });

  // Route edge mutations
  const createRouteEdge = useMutation({
    mutationFn: async (edge: { from_node_id: string; to_node_id: string }) => {
      const { data, error } = await supabase.from('map_route_edges').insert(edge).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['map-route-edges'] }),
  });

  const deleteRouteEdge = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('map_route_edges').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['map-route-edges'] }),
  });

  // Reviews
  const useAreaReviews = (areaId: string | null) =>
    useQuery({
      queryKey: ['map-area-reviews', areaId],
      enabled: !!areaId,
      queryFn: async () => {
        const { data, error } = await supabase
          .from('map_area_reviews')
          .select('*')
          .eq('area_id', areaId!)
          .order('created_at', { ascending: false });
        if (error) throw error;
        // Fetch profiles for each review
        const userIds = [...new Set((data || []).map((r: any) => r.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, character_name, avatar_url')
          .in('user_id', userIds);
        const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
        return (data || []).map((r: any) => ({
          ...r,
          profile: profileMap.get(r.user_id) || null,
        })) as MapAreaReview[];
      },
    });

  const createReview = useMutation({
    mutationFn: async (review: { area_id: string; user_id: string; rating: number; content: string }) => {
      const { error } = await supabase.from('map_area_reviews').insert(review);
      if (error) throw error;
    },
    onSuccess: (_, vars) => queryClient.invalidateQueries({ queryKey: ['map-area-reviews', vars.area_id] }),
  });

  const deleteReview = useMutation({
    mutationFn: async ({ id, area_id }: { id: string; area_id: string }) => {
      const { error } = await supabase.from('map_area_reviews').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => queryClient.invalidateQueries({ queryKey: ['map-area-reviews', vars.area_id] }),
  });

  // Location Reviews
  const createLocationReview = useMutation({
    mutationFn: async (review: { location_id: string; user_id: string; rating: number; content: string }) => {
      const { error } = await supabase.from('map_location_reviews').insert(review);
      if (error) throw error;
    },
    onSuccess: (_, vars) => queryClient.invalidateQueries({ queryKey: ['map-location-reviews', vars.location_id] }),
  });

  const deleteLocationReview = useMutation({
    mutationFn: async ({ id, location_id }: { id: string; location_id: string }) => {
      const { error } = await supabase.from('map_location_reviews').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => queryClient.invalidateQueries({ queryKey: ['map-location-reviews', vars.location_id] }),
  });

  return {
    locations: locationsQuery.data || [],
    areas: areasQuery.data || [],
    routeNodes: routeNodesQuery.data || [],
    routeEdges: routeEdgesQuery.data || [],
    isLoading: locationsQuery.isLoading || areasQuery.isLoading || routeNodesQuery.isLoading || routeEdgesQuery.isLoading,
    createLocation,
    updateLocation,
    deleteLocation,
    createArea,
    updateArea,
    deleteArea,
    createRouteNode,
    deleteRouteNode,
    createRouteEdge,
    deleteRouteEdge,
    useAreaReviews,
    createReview,
    deleteReview,
    createLocationReview,
    deleteLocationReview,
    invalidateAll,
  };
};
