import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { useMazeData, MapLocation, MapArea, MapRouteNode, EnvironmentCard } from '@/hooks/useMazeData';
import { InteractiveMap, LOCATION_ICON_TYPES } from '@/components/maze/InteractiveMap';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ArrowLeft, Shield, MapPin, Layers, Route, Plus, Trash2, Pencil, X, Save, Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

const MazeAdmin = () => {
  const navigate = useNavigate();
  const { isAdmin, isLoading: adminLoading } = useAdmin();
  const { user } = useAuth();
  const maze = useMazeData();

  const [activeTab, setActiveTab] = useState('locations');
  const [mapMode, setMapMode] = useState<'view' | 'place-location' | 'draw-polygon' | 'draw-route'>('view');

  // Location state
  const [editingLocation, setEditingLocation] = useState<Partial<MapLocation> | null>(null);
  const [placingLocation, setPlacingLocation] = useState(false);
  const [locForm, setLocForm] = useState({ name: '', description: '', icon_type: 'default', image_url: '', is_public: true, marker_color: '#14b8a6' });

  // Area state
  const [editingArea, setEditingArea] = useState<Partial<MapArea> | null>(null);
  const [drawingPolygon, setDrawingPolygon] = useState<{ x: number; y: number }[]>([]);
  const [areaForm, setAreaForm] = useState({ name: '', description: '', image_url: '' });
  const [envCard, setEnvCard] = useState<EnvironmentCard>({ tier: 1, type: 'Exploration', impulses: [], difficulty: '', potential_adversaries: '', features: [] });
  const [showEnvEditor, setShowEnvEditor] = useState(false);

  // Route state
  const [drawingRoute, setDrawingRoute] = useState<string[]>([]);

  if (adminLoading) return <div className="min-h-screen bg-black flex items-center justify-center"><Shield className="w-8 h-8 text-teal-500 animate-pulse" /></div>;
  if (!isAdmin) { navigate('/'); return null; }

  // --- Location Handlers ---
  const startPlaceLocation = () => {
    setMapMode('place-location');
    setPlacingLocation(true);
    setLocForm({ name: '', description: '', icon_type: 'default', image_url: '', is_public: true, marker_color: '#14b8a6' });
    toast.info('Click on the map to place a location');
  };

  const handleMapClickLocation = (x: number, y: number) => {
    setEditingLocation({ x, y });
    setMapMode('view');
    setPlacingLocation(false);
  };

  const saveLocation = async () => {
    if (!editingLocation || !locForm.name || !user) return;
    try {
      if (editingLocation.id) {
        await maze.updateLocation.mutateAsync({
          id: editingLocation.id,
          name: locForm.name,
          description: locForm.description || null,
          icon_type: locForm.icon_type,
          image_url: locForm.image_url || null,
          is_public: locForm.is_public,
          marker_color: locForm.marker_color,
        });
        toast.success('Location updated');
      } else {
        await maze.createLocation.mutateAsync({
          name: locForm.name,
          description: locForm.description || null,
          icon_type: locForm.icon_type,
          image_url: locForm.image_url || null,
          x: editingLocation.x!,
          y: editingLocation.y!,
          is_public: locForm.is_public,
          marker_color: locForm.marker_color,
          user_id: user.id,
        });
        toast.success('Location created');
      }
      setEditingLocation(null);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const startEditLocation = (loc: MapLocation) => {
    setEditingLocation(loc);
    setLocForm({ name: loc.name, description: loc.description || '', icon_type: loc.icon_type, image_url: loc.image_url || '', is_public: loc.is_public, marker_color: loc.marker_color || '#14b8a6' });
  };

  // --- Area Handlers ---
  const startDrawArea = () => {
    setMapMode('draw-polygon');
    setDrawingPolygon([]);
    setAreaForm({ name: '', description: '', image_url: '' });
    setEnvCard({ tier: 1, type: 'Exploration', impulses: [], difficulty: '', potential_adversaries: '', features: [] });
    toast.info('Click on the map to draw polygon points. Click the starting point to close.');
  };

  const handleMapClickPolygon = (x: number, y: number) => {
    // If we have 3+ points and click near the first point, close the polygon
    if (drawingPolygon.length >= 3) {
      const first = drawingPolygon[0];
      const dist = Math.sqrt((x - first.x) ** 2 + (y - first.y) ** 2);
      if (dist < 1.5) {
        finishPolygon();
        return;
      }
    }
    setDrawingPolygon(prev => [...prev, { x, y }]);
  };

  const finishPolygon = () => {
    if (drawingPolygon.length < 3) {
      toast.error('Need at least 3 points');
      return;
    }
    setMapMode('view');
    setEditingArea({ polygon_points: drawingPolygon });
  };

  const saveArea = async () => {
    if (!editingArea || !areaForm.name) return;
    try {
      if (editingArea.id) {
        await maze.updateArea.mutateAsync({
          id: editingArea.id,
          name: areaForm.name,
          description: areaForm.description || null,
          image_url: areaForm.image_url || null,
          environment_card: envCard,
          ...(editingArea.polygon_points ? { polygon_points: editingArea.polygon_points } : {}),
        });
        toast.success('Area updated');
      } else {
        await maze.createArea.mutateAsync({
          name: areaForm.name,
          description: areaForm.description || null,
          polygon_points: editingArea.polygon_points || [],
          environment_card: envCard,
          image_url: areaForm.image_url || null,
        });
        toast.success('Area created');
      }
      setEditingArea(null);
      setDrawingPolygon([]);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const startEditArea = (area: MapArea) => {
    setEditingArea(area);
    setAreaForm({ name: area.name, description: area.description || '', image_url: area.image_url || '' });
    setEnvCard(area.environment_card || { visible_fields: { impulses: true, difficulty: true, adversaries: true, features: true } });
  };

  // --- Route Handlers ---
  const startDrawRoute = () => {
    setMapMode('draw-route');
    setDrawingRoute([]);
    toast.info('Click on existing nodes or empty map to add new nodes. Click an existing node to connect.');
  };

  const handleMapClickRoute = async (x: number, y: number) => {
    try {
      const result = await maze.createRouteNode.mutateAsync({ x, y });
      const newNodeId = result.id;
      if (drawingRoute.length > 0) {
        const lastNodeId = drawingRoute[drawingRoute.length - 1];
        await maze.createRouteEdge.mutateAsync({ from_node_id: lastNodeId, to_node_id: newNodeId });
      }
      setDrawingRoute(prev => [...prev, newNodeId]);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleRouteNodeClick = async (node: MapRouteNode) => {
    if (mapMode !== 'draw-route') return;
    if (drawingRoute.length > 0) {
      const lastNodeId = drawingRoute[drawingRoute.length - 1];
      if (lastNodeId !== node.id) {
        try {
          await maze.createRouteEdge.mutateAsync({ from_node_id: lastNodeId, to_node_id: node.id });
          setDrawingRoute(prev => [...prev, node.id]);
          toast.success('Connected to existing node');
        } catch (err: any) {
          if (err.message?.includes('duplicate')) {
            toast.info('Edge already exists');
            setDrawingRoute(prev => [...prev, node.id]);
          } else {
            toast.error(err.message);
          }
        }
      }
    } else {
      setDrawingRoute([node.id]);
      toast.info('Route started from existing node');
    }
  };

  const finishRoute = () => {
    setMapMode('view');
    setDrawingRoute([]);
    toast.success('Route drawing finished');
  };

  // --- Export / Import ---
  const exportData = (type: 'locations' | 'areas') => {
    const data = type === 'locations' ? maze.locations : maze.areas;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maze-${type}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${data.length} ${type}`);
  };

  const importData = (type: 'locations' | 'areas') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const items = JSON.parse(text);
        if (!Array.isArray(items)) throw new Error('Expected a JSON array');
        let updated = 0, created = 0;
        for (const item of items) {
          if (type === 'locations') {
            const { id, created_at, updated_at, ...rest } = item;
            if (id && maze.locations.find(l => l.id === id)) {
              await maze.updateLocation.mutateAsync({ id, ...rest });
              updated++;
            } else {
              await maze.createLocation.mutateAsync({ ...rest, user_id: rest.user_id || user!.id });
              created++;
            }
          } else {
            const { id, created_at, updated_at, ...rest } = item;
            if (id && maze.areas.find(a => a.id === id)) {
              await maze.updateArea.mutateAsync({ id, ...rest });
              updated++;
            } else {
              await maze.createArea.mutateAsync(rest);
              created++;
            }
          }
        }
        maze.invalidateAll();
        toast.success(`Import complete: ${created} created, ${updated} updated`);
      } catch (err: any) {
        toast.error(`Import failed: ${err.message}`);
      }
    };
    input.click();
  };

  // Map click dispatcher
  const handleMapClick = (x: number, y: number) => {
    if (mapMode === 'place-location') handleMapClickLocation(x, y);
    else if (mapMode === 'draw-polygon') handleMapClickPolygon(x, y);
    else if (mapMode === 'draw-route') handleMapClickRoute(x, y);
  };

  return (
    <div className="min-h-screen bg-black text-gray-200">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin')} className="text-gray-400 hover:text-white hover:bg-gray-800/50">
              <ArrowLeft className="w-4 h-4 mr-2" /> Admin
            </Button>
            <h1 className="text-2xl font-bold text-teal-400 font-mono">MAZE ADMIN</h1>
          </div>
          {mapMode !== 'view' && (
            <div className="flex gap-2">
              {mapMode === 'draw-polygon' && (
                <Button size="sm" onClick={finishPolygon} className="bg-teal-600 hover:bg-teal-700">
                  Finish Polygon ({drawingPolygon.length} pts)
                </Button>
              )}
              {mapMode === 'draw-route' && (
                <Button size="sm" onClick={finishRoute} className="bg-teal-600 hover:bg-teal-700">
                  Finish Route ({drawingRoute.length} nodes)
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => { setMapMode('view'); setDrawingPolygon([]); setDrawingRoute([]); setPlacingLocation(false); }} className="border-gray-600 text-gray-300">
                Cancel
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map */}
          <div className="lg:col-span-2">
            <Card className="bg-gray-900/40 border-gray-700/50 p-1">
              <InteractiveMap
                locations={maze.locations}
                areas={maze.areas}
                routeNodes={maze.routeNodes}
                routeEdges={maze.routeEdges}
                showRouteNodes={activeTab === 'routes' || mapMode === 'draw-route'}
                showRouteEdges={activeTab === 'routes' || mapMode === 'draw-route'}
                drawingPolygon={drawingPolygon}
                drawingRoute={drawingRoute}
                onMapClick={handleMapClick}
                onLocationClick={startEditLocation}
                onAreaClick={startEditArea}
                onRouteNodeClick={handleRouteNodeClick}
                mode={mapMode}
              />
            </Card>
          </div>

          {/* Sidebar */}
          <div>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full bg-gray-900/60 border border-gray-700/50">
                <TabsTrigger value="locations" className="flex-1 data-[state=active]:bg-teal-600/20 data-[state=active]:text-teal-400"><MapPin className="w-3 h-3 mr-1" /> Locations</TabsTrigger>
                <TabsTrigger value="areas" className="flex-1 data-[state=active]:bg-teal-600/20 data-[state=active]:text-teal-400"><Layers className="w-3 h-3 mr-1" /> Areas</TabsTrigger>
                <TabsTrigger value="routes" className="flex-1 data-[state=active]:bg-teal-600/20 data-[state=active]:text-teal-400"><Route className="w-3 h-3 mr-1" /> Routes</TabsTrigger>
              </TabsList>

              {/* Locations Tab */}
              <TabsContent value="locations" className="space-y-3 mt-4">
                <Button
                  onClick={() => { if (mapMode === 'place-location') { setMapMode('view'); setPlacingLocation(false); toast.info('Cancelled'); } else startPlaceLocation(); }}
                  disabled={mapMode !== 'view' && mapMode !== 'place-location'}
                  size="sm"
                  className={`w-full ${mapMode === 'place-location' ? 'bg-red-600 hover:bg-red-700' : 'bg-teal-600 hover:bg-teal-700'}`}
                >
                  {mapMode === 'place-location' ? <><X className="w-3 h-3 mr-1" /> Cancel Placing</> : <><Plus className="w-3 h-3 mr-1" /> Place Location</>}
                </Button>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => exportData('locations')} className="flex-1 border-gray-600 text-gray-300 text-xs">
                    <Download className="w-3 h-3 mr-1" /> Export
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => importData('locations')} className="flex-1 border-gray-600 text-gray-300 text-xs">
                    <Upload className="w-3 h-3 mr-1" /> Import
                  </Button>
                </div>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {maze.locations.map(loc => (
                    <div key={loc.id} className="flex items-center justify-between p-2 bg-gray-900/50 border border-gray-700/30 rounded text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <MapPin className={`w-3 h-3 flex-shrink-0 ${loc.is_public ? 'text-teal-500' : 'text-amber-500'}`} />
                        <span className="truncate">{loc.name}</span>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => startEditLocation(loc)} className="p-1 text-gray-400 hover:text-white"><Pencil className="w-3 h-3" /></button>
                        <button onClick={() => { maze.deleteLocation.mutate(loc.id); toast.success('Deleted'); }} className="p-1 text-gray-400 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* Areas Tab */}
              <TabsContent value="areas" className="space-y-3 mt-4">
                <Button
                  onClick={() => { if (mapMode === 'draw-polygon') { setMapMode('view'); setDrawingPolygon([]); toast.info('Cancelled'); } else startDrawArea(); }}
                  disabled={mapMode !== 'view' && mapMode !== 'draw-polygon'}
                  size="sm"
                  className={`w-full ${mapMode === 'draw-polygon' ? 'bg-red-600 hover:bg-red-700' : 'bg-teal-600 hover:bg-teal-700'}`}
                >
                  {mapMode === 'draw-polygon' ? <><X className="w-3 h-3 mr-1" /> Cancel Drawing ({drawingPolygon.length} pts)</> : <><Plus className="w-3 h-3 mr-1" /> Draw Area</>}
                </Button>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {maze.areas.map(area => (
                    <div key={area.id} className="flex items-center justify-between p-2 bg-gray-900/50 border border-gray-700/30 rounded text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <Layers className="w-3 h-3 text-teal-500 flex-shrink-0" />
                        <span className="truncate">{area.name}</span>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => startEditArea(area)} className="p-1 text-gray-400 hover:text-white"><Pencil className="w-3 h-3" /></button>
                        <button onClick={() => { maze.deleteArea.mutate(area.id); toast.success('Deleted'); }} className="p-1 text-gray-400 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* Routes Tab */}
              <TabsContent value="routes" className="space-y-3 mt-4">
                <Button
                  onClick={() => { if (mapMode === 'draw-route') { finishRoute(); } else startDrawRoute(); }}
                  disabled={mapMode !== 'view' && mapMode !== 'draw-route'}
                  size="sm"
                  className={`w-full ${mapMode === 'draw-route' ? 'bg-red-600 hover:bg-red-700' : 'bg-teal-600 hover:bg-teal-700'}`}
                >
                  {mapMode === 'draw-route' ? <><X className="w-3 h-3 mr-1" /> Finish Route ({drawingRoute.length} nodes)</> : <><Plus className="w-3 h-3 mr-1" /> Draw Route</>}
                </Button>
                <div className="text-xs text-gray-400 font-mono space-y-1">
                  <p>Nodes: {maze.routeNodes.length}</p>
                  <p>Edges: {maze.routeEdges.length}</p>
                </div>
                {maze.routeNodes.length > 0 && (
                  <div className="space-y-1 max-h-[50vh] overflow-y-auto">
                    {maze.routeNodes.map(node => (
                      <div key={node.id} className="flex items-center justify-between p-1 bg-gray-900/50 border border-gray-700/30 rounded text-xs font-mono">
                        <span className="text-gray-400">({node.x.toFixed(1)}, {node.y.toFixed(1)})</span>
                        <button onClick={() => { maze.deleteRouteNode.mutate(node.id); toast.success('Node deleted'); }} className="p-1 text-gray-400 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Location Edit Dialog */}
      <Dialog open={!!editingLocation} onOpenChange={(open) => !open && setEditingLocation(null)}>
        <DialogContent className="bg-gray-900 border-gray-700 text-gray-200 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-teal-400">{editingLocation?.id ? 'Edit' : 'New'} Location</DialogTitle>
            <DialogDescription className="text-gray-400">
              {editingLocation?.x !== undefined && `Position: (${editingLocation.x?.toFixed(1)}, ${editingLocation.y?.toFixed(1)})`}
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
              <Label className="text-gray-300">Marker Color</Label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={locForm.marker_color} onChange={e => setLocForm(f => ({ ...f, marker_color: e.target.value }))} className="w-8 h-8 rounded cursor-pointer bg-transparent border border-gray-600" />
                <div className="flex gap-1 flex-wrap">
                  {['#14b8a6','#f59e0b','#ef4444','#3b82f6','#a855f7','#ec4899','#22c55e','#f97316','#06b6d4','#8b5cf6','#ffffff','#6b7280'].map(c => (
                    <button key={c} onClick={() => setLocForm(f => ({ ...f, marker_color: c }))} className={`w-5 h-5 rounded-full border ${locForm.marker_color === c ? 'border-white scale-125' : 'border-gray-600'}`} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </div>
            <div>
              <Label className="text-gray-300">Image URL</Label>
              <Input value={locForm.image_url} onChange={e => setLocForm(f => ({ ...f, image_url: e.target.value }))} className="bg-gray-800 border-gray-700 text-gray-200" placeholder="https://..." />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={locForm.is_public} onCheckedChange={v => setLocForm(f => ({ ...f, is_public: v }))} />
              <Label className="text-gray-300">Public</Label>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={saveLocation} disabled={!locForm.name} className="bg-teal-600 hover:bg-teal-700 flex-1"><Save className="w-3 h-3 mr-1" /> Save</Button>
              <Button variant="outline" onClick={() => setEditingLocation(null)} className="border-gray-600 text-gray-300">Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Area Edit Dialog */}
      <Dialog open={!!editingArea} onOpenChange={(open) => !open && setEditingArea(null)}>
        <DialogContent className="bg-gray-900 border-gray-700 text-gray-200 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-teal-400">{editingArea?.id ? 'Edit' : 'New'} Area</DialogTitle>
            <DialogDescription className="text-gray-400">
              {editingArea?.polygon_points && `${(editingArea.polygon_points as any[]).length} polygon points`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-gray-300">Name *</Label>
              <Input value={areaForm.name} onChange={e => setAreaForm(f => ({ ...f, name: e.target.value }))} className="bg-gray-800 border-gray-700 text-gray-200" />
            </div>
            <div>
              <Label className="text-gray-300">Description</Label>
              <Textarea value={areaForm.description} onChange={e => setAreaForm(f => ({ ...f, description: e.target.value }))} className="bg-gray-800 border-gray-700 text-gray-200" />
            </div>
            <div>
              <Label className="text-gray-300">Image URL</Label>
              <Input value={areaForm.image_url} onChange={e => setAreaForm(f => ({ ...f, image_url: e.target.value }))} className="bg-gray-800 border-gray-700 text-gray-200" />
            </div>

            {/* Environment Card Editor */}
            <div className="border border-gray-700/50 rounded p-3 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-teal-400 font-bold">Environment Card</Label>
                <Button size="sm" variant="ghost" onClick={() => setShowEnvEditor(!showEnvEditor)} className="text-gray-400 text-xs">
                  {showEnvEditor ? 'Collapse' : 'Expand'}
                </Button>
              </div>
              {showEnvEditor && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-gray-400 text-xs">Tier</Label>
                      <Input type="number" value={envCard.tier || ''} onChange={e => setEnvCard(c => ({ ...c, tier: parseInt(e.target.value) || undefined }))} className="bg-gray-800 border-gray-700 text-gray-200" />
                    </div>
                    <div>
                      <Label className="text-gray-400 text-xs">Type</Label>
                      <Select value={envCard.type || ''} onValueChange={v => setEnvCard(c => ({ ...c, type: v }))}>
                        <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-200"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          {['Exploration', 'Event', 'Combat', 'Social', 'Hazard'].map(t => <SelectItem key={t} value={t} className="text-gray-200">{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-400 text-xs">Impulses (comma-separated)</Label>
                    <Input
                      value={(envCard as any)._impulsesRaw ?? (envCard.impulses || []).join(', ')}
                      onChange={e => setEnvCard(c => ({ ...c, _impulsesRaw: e.target.value }))}
                      onBlur={e => setEnvCard(c => {
                        const parsed = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                        const { _impulsesRaw, ...rest } = c as any;
                        return { ...rest, impulses: parsed };
                      })}
                      className="bg-gray-800 border-gray-700 text-gray-200"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400 text-xs">Difficulty</Label>
                    <Input value={envCard.difficulty || ''} onChange={e => setEnvCard(c => ({ ...c, difficulty: e.target.value }))} className="bg-gray-800 border-gray-700 text-gray-200" />
                  </div>
                  <div>
                    <Label className="text-gray-400 text-xs">Potential Adversaries</Label>
                    <Input value={envCard.potential_adversaries || ''} onChange={e => setEnvCard(c => ({ ...c, potential_adversaries: e.target.value }))} className="bg-gray-800 border-gray-700 text-gray-200" />
                  </div>

                  {/* Features */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-gray-400 text-xs">Features</Label>
                      <Button size="sm" variant="ghost" onClick={() => setEnvCard(c => ({ ...c, features: [...(c.features || []), { name: '', type: 'Passive', description: '' }] }))} className="text-teal-400 text-xs h-6">
                        <Plus className="w-3 h-3 mr-1" /> Add
                      </Button>
                    </div>
                    {(envCard.features || []).map((feat, i) => (
                      <div key={i} className="bg-gray-800/50 rounded p-2 space-y-1">
                        <div className="flex gap-2">
                          <Input value={feat.name} onChange={e => {
                            const features = [...(envCard.features || [])];
                            features[i] = { ...features[i], name: e.target.value };
                            setEnvCard(c => ({ ...c, features }));
                          }} placeholder="Feature name" className="bg-gray-800 border-gray-700 text-gray-200 text-xs" />
                          <Select value={feat.type} onValueChange={v => {
                            const features = [...(envCard.features || [])];
                            features[i] = { ...features[i], type: v };
                            setEnvCard(c => ({ ...c, features }));
                          }}>
                            <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-200 w-28 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-gray-800 border-gray-700">
                              {['Passive', 'Action', 'Reaction', 'Special'].map(t => <SelectItem key={t} value={t} className="text-gray-200">{t}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <button onClick={() => {
                            const features = (envCard.features || []).filter((_, j) => j !== i);
                            setEnvCard(c => ({ ...c, features }));
                          }} className="text-gray-400 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                        </div>
                        <Textarea value={feat.description} onChange={e => {
                          const features = [...(envCard.features || [])];
                          features[i] = { ...features[i], description: e.target.value };
                          setEnvCard(c => ({ ...c, features }));
                        }} placeholder="Description" className="bg-gray-800 border-gray-700 text-gray-200 text-xs min-h-[40px]" />
                      </div>
                    ))}
                  </div>

                  {/* Visibility Toggles */}
                  <div className="border-t border-gray-700/30 pt-2 space-y-2">
                    <Label className="text-gray-400 text-xs font-bold">Player Visibility</Label>
                    {[
                      { key: 'impulses', label: 'Impulses' },
                      { key: 'difficulty', label: 'Difficulty' },
                      { key: 'adversaries', label: 'Adversaries' },
                      { key: 'features', label: 'Features' },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-xs text-gray-300">{label}</span>
                        <Switch
                          checked={(envCard.visible_fields as any)?.[key] !== false}
                          onCheckedChange={v => setEnvCard(c => ({
                            ...c,
                            visible_fields: { ...(c.visible_fields || {}), [key]: v },
                          }))}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={saveArea} disabled={!areaForm.name} className="bg-teal-600 hover:bg-teal-700 flex-1"><Save className="w-3 h-3 mr-1" /> Save</Button>
              <Button variant="outline" onClick={() => { setEditingArea(null); setDrawingPolygon([]); }} className="border-gray-600 text-gray-300">Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MazeAdmin;
