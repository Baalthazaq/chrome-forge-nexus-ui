import { MapLocation, useMazeData } from '@/hooks/useMazeData';
import { useAuth } from '@/hooks/useAuth';
import { MapNotes } from './MapNotes';
import { Button } from '@/components/ui/button';
import { X, Trash2, Move } from 'lucide-react';
import { toast } from 'sonner';

interface LocationPanelProps {
  location: MapLocation;
  onClose: () => void;
  isAdmin?: boolean;
  onRelocate?: (location: MapLocation) => void;
}

export const LocationPanel = ({ location, onClose, isAdmin = false }: LocationPanelProps) => {
  const { user } = useAuth();
  const { deleteLocation } = useMazeData();

  const canDelete = user?.id === location.user_id && !location.is_public;

  const handleDelete = async () => {
    try {
      await deleteLocation.mutateAsync(location.id);
      toast.success('Location deleted');
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="bg-gray-900/95 border border-gray-700/50 rounded-lg overflow-y-auto max-h-[80vh] w-full md:w-80 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-teal-400">{location.name}</h2>
        <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-white">
          <X className="w-4 h-4" />
        </Button>
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

      <MapNotes locationId={location.id} targetName={location.name} isAdmin={isAdmin} />

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
  );
};