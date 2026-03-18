import { useState } from 'react';
import { MapLocation, MapArea, MapLocationReview, useMazeData } from '@/hooks/useMazeData';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MapNotes } from './MapNotes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X, Trash2, Move, Pencil, Star, Send } from 'lucide-react';
import { toast } from 'sonner';
import { LOCATION_ICON_TYPES, ICON_MAP, ICON_LABELS } from './InteractiveMap';

interface LocationPanelProps {
  location: MapLocation;
  areas: MapArea[];
  onClose: () => void;
  isAdmin?: boolean;
  onRelocate?: (location: MapLocation) => void;
}

// Shoelace formula for polygon area (unsigned)
const polygonArea = (pts: { x: number; y: number }[]) => {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    a += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
  }
  return Math.abs(a) / 2;
};

// Point-in-polygon test
const pointInPolygon = (px: number, py: number, polygon: { x: number; y: number }[]) => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
};

export const LocationPanel = ({ location, areas, onClose, isAdmin = false, onRelocate }: LocationPanelProps) => {
  const { user } = useAuth();
  const { deleteLocation, updateLocation, createLocationReview, deleteLocationReview } = useMazeData();
  const [editing, setEditing] = useState(false);
  const [reviewRating, setReviewRating] = useState(3);
  const [reviewContent, setReviewContent] = useState('');

  const reviewsQuery = useQuery({
    queryKey: ['map-location-reviews', location.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('map_location_reviews')
        .select('*')
        .eq('location_id', location.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const userIds = [...new Set((data || []).map((r: any) => r.user_id))];
      if (userIds.length === 0) return [] as MapLocationReview[];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, character_name, avatar_url')
        .in('user_id', userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      return (data || []).map((r: any) => ({
        ...r,
        profile: profileMap.get(r.user_id) || null,
      })) as MapLocationReview[];
    },
  });

  const reviews = reviewsQuery.data || [];
  const [editForm, setEditForm] = useState({
    name: location.name,
    description: location.description || '',
    icon_type: location.icon_type,
    image_url: location.image_url || '',
    marker_color: location.marker_color,
  });

  const isOwner = user?.id === location.user_id;
  const canDelete = isOwner && !location.is_public;
  const canEdit = isOwner || isAdmin;
  const canRelocate = !!onRelocate && canEdit;

  // Determine containing areas, sorted largest to smallest
  const containingAreas = areas
    .filter(a => a.polygon_points.length >= 3 && pointInPolygon(location.x, location.y, a.polygon_points))
    .sort((a, b) => polygonArea(b.polygon_points) - polygonArea(a.polygon_points));

  const handleDelete = async () => {
    try {
      await deleteLocation.mutateAsync(location.id);
      toast.success('Location deleted');
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSaveEdit = async () => {
    try {
      await updateLocation.mutateAsync({
        id: location.id,
        name: editForm.name,
        description: editForm.description || null,
        icon_type: editForm.icon_type,
        image_url: editForm.image_url || null,
        marker_color: editForm.marker_color,
      });
      toast.success('Location updated');
      setEditing(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <>
      <div className="bg-gray-900/95 border border-gray-700/50 rounded-lg overflow-y-auto max-h-[80vh] w-full md:w-80 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-teal-400">{location.name}</h2>
          <div className="flex items-center gap-1">
            {canEdit && (
              <Button variant="ghost" size="icon" onClick={() => setEditing(true)} className="text-gray-400 hover:text-white">
                <Pencil className="w-4 h-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {location.image_url && (
          <img src={location.image_url} alt={location.name} className="w-full rounded-md" />
        )}

        {location.description && (
          <p className="text-sm text-gray-300">{location.description}</p>
        )}

        <div className="text-xs text-gray-500 font-mono">
          Type: {location.icon_type} • {location.is_public ? 'Public' : 'Private'}
        </div>

        {containingAreas.length > 0 && (
          <div className="text-xs text-gray-500">
            <span className="font-mono">Areas:</span>{' '}
            <span className="text-gray-400">{containingAreas.map(a => a.name).join(' → ')}</span>
          </div>
        )}

        <MapNotes
          locationId={location.id}
          targetName={location.name}
          isAdmin={isAdmin}
          locationDescription={location.description}
          locationImageUrl={location.image_url}
          containingAreas={containingAreas.map(a => a.name)}
        />

        {canDelete && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleteLocation.isPending}
            className="w-full"
          >
            <Trash2 className="w-3 h-3 mr-1" /> Delete Location
          </Button>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="bg-gray-900 border-gray-700 text-gray-200 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-teal-400">Edit Location</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-gray-300">Name *</Label>
              <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="bg-gray-800 border-gray-700 text-gray-200" />
            </div>
            <div>
              <Label className="text-gray-300">Description</Label>
              <Textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} className="bg-gray-800 border-gray-700 text-gray-200" />
            </div>
            <div>
              <Label className="text-gray-300">Icon Type</Label>
              <Select value={editForm.icon_type} onValueChange={v => setEditForm(f => ({ ...f, icon_type: v }))}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-200"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 max-h-60">
                  {LOCATION_ICON_TYPES.map(t => {
                    const Icon = ICON_MAP[t];
                    return (
                      <SelectItem key={t} value={t} className="text-gray-200">
                        <span className="flex items-center gap-2"><Icon className="w-4 h-4" />{ICON_LABELS[t]}</span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-300">Marker Color</Label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={editForm.marker_color} onChange={e => setEditForm(f => ({ ...f, marker_color: e.target.value }))} className="w-8 h-8 rounded cursor-pointer bg-transparent border border-gray-600" />
                <div className="flex gap-1 flex-wrap">
                  {['#14b8a6','#f59e0b','#ef4444','#3b82f6','#a855f7','#ec4899','#22c55e','#f97316','#06b6d4','#8b5cf6','#ffffff','#6b7280'].map(c => (
                    <button key={c} onClick={() => setEditForm(f => ({ ...f, marker_color: c }))} className={`w-5 h-5 rounded-full border ${editForm.marker_color === c ? 'border-white scale-125' : 'border-gray-600'}`} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </div>
            <div>
              <Label className="text-gray-300">Image URL</Label>
              <Input value={editForm.image_url} onChange={e => setEditForm(f => ({ ...f, image_url: e.target.value }))} className="bg-gray-800 border-gray-700 text-gray-200" placeholder="https://..." />
            </div>

            {/* Coordinates + Move */}
            <div>
              <Label className="text-gray-300">Coordinates</Label>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-400 font-mono bg-gray-800 rounded px-2 py-1 border border-gray-700">
                  x: {location.x.toFixed(1)}, y: {location.y.toFixed(1)}
                </span>
                {canRelocate && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { onRelocate!(location); setEditing(false); onClose(); }}
                    className="border-gray-600 text-gray-300 hover:bg-gray-800"
                  >
                    <Move className="w-3 h-3 mr-1" /> Move
                  </Button>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSaveEdit} disabled={!editForm.name || updateLocation.isPending} className="bg-teal-600 hover:bg-teal-700 flex-1">Save</Button>
              <Button variant="outline" onClick={() => setEditing(false)} className="border-gray-600 text-gray-300">Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
