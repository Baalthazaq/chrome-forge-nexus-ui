import { MapLocation } from '@/hooks/useMazeData';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { LOCATION_ICON_TYPES } from './InteractiveMap';

interface LocationPanelProps {
  location: MapLocation;
  onClose: () => void;
}

export const LocationPanel = ({ location, onClose }: LocationPanelProps) => {
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
    </div>
  );
};
