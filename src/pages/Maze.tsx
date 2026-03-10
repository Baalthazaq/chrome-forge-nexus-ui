import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Search, Plus, Navigation } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMazeData, MapLocation, MapArea } from '@/hooks/useMazeData';
import { InteractiveMap, LOCATION_ICON_TYPES } from '@/components/maze/InteractiveMap';
import { AreaPanel } from '@/components/maze/AreaPanel';
import { LocationPanel } from '@/components/maze/LocationPanel';
import { findRoute, RouteEndpoint } from '@/lib/pathfinding';
import { toast } from 'sonner';

const Maze = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const maze = useMazeData();

  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null);
  const [selectedArea, setSelectedArea] = useState<MapArea | null>(null);
  const [zoomToArea, setZoomToArea] = useState<MapArea | null>(null);

  // Pathfinding
  const [routeFrom, setRouteFrom] = useState<string>('');
  const [routeTo, setRouteTo] = useState<string>('');
  const [routePath, setRoutePath] = useState<{ x: number; y: number }[] | null>(null);

  // Add location
  const [placingLocation, setPlacingLocation] = useState(false);
  const [newLocCoords, setNewLocCoords] = useState<{ x: number; y: number } | null>(null);
  const [locForm, setLocForm] = useState({ name: '', description: '', icon_type: 'default', image_url: '' });

  const publicLocations = maze.locations.filter(l => l.is_public || l.user_id === user?.id);

  // Combined route options: locations + areas (prefixed)
  const routeOptions: { id: string; label: string; type: 'location' | 'area' }[] = [
    ...publicLocations.map(l => ({ id: `loc:${l.id}`, label: l.name, type: 'location' as const })),
    ...maze.areas.map(a => ({ id: `area:${a.id}`, label: `📍 ${a.name}`, type: 'area' as const })),
  ];

  const resolveEndpoint = (key: string): RouteEndpoint | null => {
    if (key.startsWith('loc:')) {
      const loc = maze.locations.find(l => l.id === key.slice(4));
      return loc ? { type: 'location', location: loc } : null;
    }
    if (key.startsWith('area:')) {
      const area = maze.areas.find(a => a.id === key.slice(5));
      return area ? { type: 'area', area } : null;
    }
    return null;
  };

  const handleFindRoute = () => {
    const from = resolveEndpoint(routeFrom);
    const to = resolveEndpoint(routeTo);
    if (!from || !to) { toast.error('Select both locations'); return; }
    const path = findRoute(from, to, maze.routeNodes, maze.routeEdges);
    if (path) {
      setRoutePath(path);
      toast.success('Route found!');
    } else {
      setRoutePath(null);
      toast.error('No route available');
    }
  };

  const handleAreaClick = (area: MapArea) => {
    setSelectedArea(area);
    setSelectedLocation(null);
    setZoomToArea(area);
  };

  const handleLocationClick = (loc: MapLocation) => {
    setSelectedLocation(loc);
    setSelectedArea(null);
  };

  const handleMapClick = (x: number, y: number) => {
    if (placingLocation) {
      setNewLocCoords({ x, y });
      setPlacingLocation(false);
    }
  };

  const handleSaveLocation = async () => {
    if (!user || !newLocCoords || !locForm.name) return;
    try {
      await maze.createLocation.mutateAsync({
        name: locForm.name,
        description: locForm.description || null,
        icon_type: locForm.icon_type,
        image_url: locForm.image_url || null,
        x: newLocCoords.x,
        y: newLocCoords.y,
        is_public: false,
        user_id: user.id,
      });
      toast.success('Location added! (visible only to you until approved)');
      setNewLocCoords(null);
      setLocForm({ name: '', description: '', icon_type: 'default', image_url: '' });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900" />

      <div className="relative z-10 container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-gray-400 hover:text-white hover:bg-gray-800/50">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          {user && (
            <Button
              size="sm"
              variant={placingLocation ? 'default' : 'outline'}
              onClick={() => { setPlacingLocation(!placingLocation); if (placingLocation) toast.info('Cancelled'); else toast.info('Click on the map to place a location'); }}
              className={placingLocation ? 'bg-amber-600 hover:bg-amber-700' : 'border-gray-600 text-gray-300 hover:bg-gray-800'}
            >
              <Plus className="w-3 h-3 mr-1" /> {placingLocation ? 'Cancel' : 'Add Location'}
            </Button>
          )}
        </div>

        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-400 to-green-400 bg-clip-text text-transparent mb-1">MAZE</h1>
          <p className="text-gray-500 text-xs font-mono tracking-widest">by Ariadne Technologies</p>
        </div>

        {/* Pathfinding bar */}
        <div className="mb-4 flex flex-col sm:flex-row gap-2 bg-gray-900/60 border border-gray-700/50 rounded-lg p-3">
          <Select value={routeFrom} onValueChange={v => { setRouteFrom(v); setRoutePath(null); }}>
            <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-200 flex-1"><SelectValue placeholder="From..." /></SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700 max-h-60">
              {routeOptions.map(o => <SelectItem key={o.id} value={o.id} className="text-gray-200">{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={routeTo} onValueChange={v => { setRouteTo(v); setRoutePath(null); }}>
            <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-200 flex-1"><SelectValue placeholder="To..." /></SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700 max-h-60">
              {routeOptions.filter(o => o.id !== routeFrom).map(o => <SelectItem key={o.id} value={o.id} className="text-gray-200">{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={handleFindRoute} disabled={!routeFrom || !routeTo} className="bg-teal-600 hover:bg-teal-700">
            <Navigation className="w-3 h-3 mr-1" /> Route
          </Button>
          {routePath && (
            <Button variant="ghost" size="sm" onClick={() => setRoutePath(null)} className="text-gray-400">Clear</Button>
          )}
        </div>

        {/* Map + Panel */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <InteractiveMap
              locations={publicLocations}
              areas={maze.areas}
              routeNodes={maze.routeNodes}
              routeEdges={maze.routeEdges}
              routePath={routePath}
              selectedArea={selectedArea}
              selectedLocation={selectedLocation}
              zoomToArea={zoomToArea}
              onLocationClick={handleLocationClick}
              onAreaClick={handleAreaClick}
              onMapClick={placingLocation ? handleMapClick : undefined}
              mode={placingLocation ? 'place-location' : 'view'}
            />
          </div>

          {/* Side panel */}
          {selectedArea && (
            <AreaPanel area={selectedArea} onClose={() => { setSelectedArea(null); setZoomToArea(null); }} />
          )}
          {selectedLocation && !selectedArea && (
            <LocationPanel location={selectedLocation} onClose={() => setSelectedLocation(null)} />
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-gray-600 text-xs font-mono">
          <p>Maze™ • Ariadne Technologies • "Every path leads somewhere"</p>
        </div>
      </div>

      {/* New Location Dialog */}
      <Dialog open={!!newLocCoords} onOpenChange={(open) => !open && setNewLocCoords(null)}>
        <DialogContent className="bg-gray-900 border-gray-700 text-gray-200 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-teal-400">Add Location</DialogTitle>
            <DialogDescription className="text-gray-400">
              This location will be private until an admin makes it public.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-gray-300">Name *</Label>
              <Input value={locForm.name} onChange={e => setLocForm(f => ({ ...f, name: e.target.value }))} className="bg-gray-800 border-gray-700 text-gray-200" />
            </div>
            <div>
              <Label className="text-gray-300">Description</Label>
              <Textarea value={locForm.description} onChange={e => setLocForm(f => ({ ...f, description: e.target.value }))} className="bg-gray-800 border-gray-700 text-gray-200" />
            </div>
            <div>
              <Label className="text-gray-300">Icon Type</Label>
              <Select value={locForm.icon_type} onValueChange={v => setLocForm(f => ({ ...f, icon_type: v }))}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-200"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {LOCATION_ICON_TYPES.map(t => <SelectItem key={t} value={t} className="text-gray-200">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-300">Image URL</Label>
              <Input value={locForm.image_url} onChange={e => setLocForm(f => ({ ...f, image_url: e.target.value }))} className="bg-gray-800 border-gray-700 text-gray-200" placeholder="https://..." />
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSaveLocation} disabled={!locForm.name || maze.createLocation.isPending} className="bg-teal-600 hover:bg-teal-700 flex-1">Save</Button>
              <Button variant="outline" onClick={() => setNewLocCoords(null)} className="border-gray-600 text-gray-300">Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Maze;
