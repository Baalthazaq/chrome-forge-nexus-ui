import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Shield, ArrowLeft, ChevronDown, Plus, Search, Copy, Swords, TreePine, Users } from 'lucide-react';
import { toast } from 'sonner';
import { EncounterDialog } from '@/components/encounter/EncounterDialog';
import { CreatureViewDialog } from '@/components/encounter/CreatureViewDialog';
import { EnvironmentViewDialog } from '@/components/encounter/EnvironmentViewDialog';
import { NPCViewDialog } from '@/components/encounter/NPCViewDialog';

const EncounterBuilder = () => {
  const navigate = useNavigate();
  const { isAdmin, isLoading: adminLoading } = useAdmin();
  const [encounters, setEncounters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editEncounter, setEditEncounter] = useState<any | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [viewCreatureId, setViewCreatureId] = useState<string | null>(null);
  const [viewEnvironmentId, setViewEnvironmentId] = useState<string | null>(null);
  const [viewNpcId, setViewNpcId] = useState<string | null>(null);
  const [thumbs, setThumbs] = useState<{
    envs: Record<string, string | null>;
    creatures: Record<string, string | null>;
    npcs: Record<string, string | null>;
  }>({ envs: {}, creatures: {}, npcs: {} });

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/admin');
      return;
    }
    if (isAdmin) loadEncounters();
  }, [isAdmin, adminLoading]);

  const loadEncounters = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('encounters' as any)
      .select('*')
      .order('tier')
      .order('name');
    if (error) {
      toast.error('Failed to load encounters');
    } else {
      setEncounters((data as any[]) || []);
      loadThumbnails((data as any[]) || []);
    }
    setLoading(false);
  };

  const loadThumbnails = async (encs: any[]) => {
    const envIds = new Set<string>();
    const creatureIds = new Set<string>();
    const npcIds = new Set<string>();
    encs.forEach(e => {
      (e.environments || []).forEach((x: any) => x.id && envIds.add(x.id));
      (e.creatures || []).forEach((x: any) => x.id && creatureIds.add(x.id));
      (e.npcs || []).forEach((x: any) => x.user_id && npcIds.add(x.user_id));
    });
    const [envRes, crRes, npRes] = await Promise.all([
      envIds.size ? supabase.from('environments').select('id, image_url').in('id', [...envIds]) : Promise.resolve({ data: [] as any[] }),
      creatureIds.size ? supabase.from('bestiary_creatures').select('id, image_url').in('id', [...creatureIds]) : Promise.resolve({ data: [] as any[] }),
      npcIds.size ? supabase.from('profiles').select('user_id, avatar_url').in('user_id', [...npcIds]) : Promise.resolve({ data: [] as any[] }),
    ]);
    const envs: Record<string, string | null> = {};
    (envRes.data || []).forEach((r: any) => { envs[r.id] = r.image_url; });
    const creatures: Record<string, string | null> = {};
    (crRes.data || []).forEach((r: any) => { creatures[r.id] = r.image_url; });
    const npcs: Record<string, string | null> = {};
    (npRes.data || []).forEach((r: any) => { npcs[r.user_id] = r.avatar_url; });
    setThumbs({ envs, creatures, npcs });
  };

  const deleteEncounter = async (id: string) => {
    const { error } = await supabase.from('encounters' as any).delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete');
    } else {
      toast.success('Encounter deleted');
      loadEncounters();
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filtered = encounters.filter(e => {
    const matchSearch = !searchTerm ||
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTier = tierFilter === 'all' || e.tier === parseInt(tierFilter);
    return matchSearch && matchTier;
  });

  if (adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Shield className="h-12 w-12 animate-pulse text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Swords className="h-7 w-7 text-amber-400" />
            <h1 className="text-2xl font-bold">Encounter Builder</h1>
            <Badge variant="outline">{filtered.length} / {encounters.length}</Badge>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" /> New Encounter
          </Button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search encounters..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Tiers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              <SelectItem value="1">Tier 1</SelectItem>
              <SelectItem value="2">Tier 2</SelectItem>
              <SelectItem value="3">Tier 3</SelectItem>
              <SelectItem value="4">Tier 4</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Encounter List */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading encounters...</div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {encounters.length === 0 ? 'No encounters yet. Create one to get started.' : 'No encounters match the current filters.'}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map(enc => {
              const environments = enc.environments || [];
              const npcs = enc.npcs || [];
              const creatures = enc.creatures || [];
              const isExpanded = expandedIds.has(enc.id);

              return (
                <Collapsible key={enc.id} open={isExpanded} onOpenChange={() => toggleExpanded(enc.id)}>
                  <Card className="overflow-hidden">
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3 px-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="font-bold text-lg">{enc.name}</span>
                            <Badge variant="outline" className="text-xs">T{enc.tier}</Badge>
                            {environments.length > 0 && (
                              <Badge variant="outline" className="text-xs gap-1">
                                <TreePine className="h-3 w-3" /> {environments.length}
                              </Badge>
                            )}
                            {npcs.length > 0 && (
                              <Badge variant="outline" className="text-xs gap-1">
                                <Users className="h-3 w-3" /> {npcs.length}
                              </Badge>
                            )}
                            {creatures.length > 0 && (
                              <Badge variant="outline" className="text-xs gap-1">
                                <Swords className="h-3 w-3" /> {creatures.reduce((sum: number, c: any) => sum + (c.quantity || 1), 0)}
                              </Badge>
                            )}
                          </div>
                          <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0 pb-4 px-4 space-y-4">
                        {enc.description && (
                          <p className="text-sm italic text-muted-foreground">{enc.description}</p>
                        )}

                        {/* Environments Section */}
                        {environments.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold flex items-center gap-1 border-b border-border pb-1">
                              <TreePine className="h-4 w-4 text-emerald-400" /> Environments
                            </h4>
                            {environments.map((env: any, i: number) => {
                              const img = env.id ? thumbs.envs[env.id] : null;
                              return (
                                <button
                                  key={i}
                                  onClick={(e) => { e.stopPropagation(); env.id && setViewEnvironmentId(env.id); }}
                                  className="w-full text-left bg-emerald-500/10 hover:bg-emerald-500/20 rounded p-2 text-sm flex items-center gap-2 transition-colors"
                                >
                                  {img ? (
                                    <img src={img} alt="" className="h-10 w-10 object-cover rounded shrink-0" />
                                  ) : (
                                    <div className="h-10 w-10 rounded bg-emerald-500/20 flex items-center justify-center shrink-0">
                                      <TreePine className="h-5 w-5 text-emerald-400" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <span className="font-semibold">{env.name}</span>
                                    {env.tier && <Badge variant="outline" className="text-xs ml-2">T{env.tier}</Badge>}
                                    {env.environment_type && <Badge variant="outline" className="text-xs ml-1">{env.environment_type}</Badge>}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* NPCs Section */}
                        {npcs.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold flex items-center gap-1 border-b border-border pb-1">
                              <Users className="h-4 w-4 text-blue-400" /> NPCs
                            </h4>
                            {npcs.map((npc: any, i: number) => {
                              const img = npc.user_id ? thumbs.npcs[npc.user_id] : null;
                              return (
                                <button
                                  key={i}
                                  onClick={(e) => { e.stopPropagation(); npc.user_id && setViewNpcId(npc.user_id); }}
                                  className="w-full text-left bg-blue-500/10 hover:bg-blue-500/20 rounded p-2 text-sm flex items-center gap-2 transition-colors"
                                >
                                  {img ? (
                                    <img src={img} alt="" className="h-10 w-10 object-cover rounded shrink-0" />
                                  ) : (
                                    <div className="h-10 w-10 rounded bg-blue-500/20 flex items-center justify-center shrink-0">
                                      <Users className="h-5 w-5 text-blue-400" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <span className="font-semibold">{npc.character_name}</span>
                                    {npc.level && <span className="text-xs text-muted-foreground ml-2">Lv.{npc.level}</span>}
                                    {npc.character_class && <Badge variant="outline" className="text-xs ml-1">{npc.character_class}</Badge>}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Creatures Section */}
                        {creatures.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold flex items-center gap-1 border-b border-border pb-1">
                              <Swords className="h-4 w-4 text-red-400" /> Creatures
                            </h4>
                            {creatures.map((c: any, i: number) => {
                              const img = c.id ? thumbs.creatures[c.id] : null;
                              return (
                                <button
                                  key={i}
                                  onClick={(e) => { e.stopPropagation(); c.id && setViewCreatureId(c.id); }}
                                  className="w-full text-left bg-red-500/10 hover:bg-red-500/20 rounded p-2 text-sm flex items-center justify-between gap-2 transition-colors"
                                >
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    {img ? (
                                      <img src={img} alt="" className="h-10 w-10 object-cover rounded shrink-0" />
                                    ) : (
                                      <div className="h-10 w-10 rounded bg-red-500/20 flex items-center justify-center shrink-0">
                                        <Swords className="h-5 w-5 text-red-400" />
                                      </div>
                                    )}
                                    <div>
                                      <span className="font-semibold">{c.name}</span>
                                      {c.tier && <Badge variant="outline" className="text-xs ml-2">T{c.tier}</Badge>}
                                      {c.creature_type && <Badge variant="outline" className="text-xs ml-1">{c.creature_type}</Badge>}
                                    </div>
                                  </div>
                                  <Badge variant="outline" className="text-xs">×{c.quantity || 1}</Badge>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Notes */}
                        {enc.notes && (
                          <div>
                            <span className="text-xs font-semibold text-muted-foreground">Notes: </span>
                            <p className="text-sm whitespace-pre-wrap">{enc.notes}</p>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 pt-2">
                          <Button size="sm" variant="outline" onClick={() => setEditEncounter(enc)}>
                            Edit
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => {
                            const { id, created_at, updated_at, ...rest } = enc;
                            setEditEncounter({ ...rest, name: `${rest.name} (Copy)`, _isClone: true });
                          }}>
                            <Copy className="h-3 w-3 mr-1" /> Duplicate
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(enc)}>
                            Delete
                          </Button>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      {editEncounter && (
        <EncounterDialog
          encounter={editEncounter}
          open={!!editEncounter}
          onClose={() => setEditEncounter(null)}
          onSaved={loadEncounters}
        />
      )}

      {/* Create Dialog */}
      {showCreateDialog && (
        <EncounterDialog
          encounter={null}
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onSaved={loadEncounters}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this encounter. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) deleteEncounter(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EncounterBuilder;
