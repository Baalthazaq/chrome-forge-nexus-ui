import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, ChevronDown, TreePine, Users, Swords, Search, Eye, Pencil, Sparkles } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CreatureViewDialog } from './CreatureViewDialog';
import { EnvironmentViewDialog } from './EnvironmentViewDialog';
import { NPCViewDialog } from './NPCViewDialog';
import { CustomEnvironmentEditor, CustomEnvironment } from './CustomEnvironmentEditor';

interface EncounterDialogProps {
  encounter: any | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const EncounterDialog = ({ encounter, open, onClose, onSaved }: EncounterDialogProps) => {
  const isClone = encounter?._isClone;
  const isEdit = encounter?.id && !isClone;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [tier, setTier] = useState(1);
  const [environments, setEnvironments] = useState<any[]>([]);
  const [npcs, setNpcs] = useState<any[]>([]);
  const [creatures, setCreatures] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  // Picker states
  const [showEnvPicker, setShowEnvPicker] = useState(false);
  const [showNpcPicker, setShowNpcPicker] = useState(false);
  const [showCreaturePicker, setShowCreaturePicker] = useState(false);
  const [availableEnvs, setAvailableEnvs] = useState<any[]>([]);
  const [availableNpcs, setAvailableNpcs] = useState<any[]>([]);
  const [availableCreatures, setAvailableCreatures] = useState<any[]>([]);
  const [pickerSearch, setPickerSearch] = useState('');

  // Thumbnails for currently-added items
  const [thumbs, setThumbs] = useState<{ envs: Record<string, string | null>; creatures: Record<string, string | null>; npcs: Record<string, string | null>; }>({ envs: {}, creatures: {}, npcs: {} });

  // Viewer dialogs
  const [viewCreatureId, setViewCreatureId] = useState<string | null>(null);
  const [viewEnvironmentId, setViewEnvironmentId] = useState<string | null>(null);
  const [viewNpcId, setViewNpcId] = useState<string | null>(null);

  // Collapsible sections
  const [envOpen, setEnvOpen] = useState(true);
  const [npcOpen, setNpcOpen] = useState(true);
  const [creatureOpen, setCreatureOpen] = useState(true);

  useEffect(() => {
    if (encounter) {
      setName(encounter.name || '');
      setDescription(encounter.description || '');
      setNotes(encounter.notes || '');
      setTier(encounter.tier || 1);
      setEnvironments(encounter.environments || []);
      setNpcs(encounter.npcs || []);
      setCreatures(encounter.creatures || []);
    } else {
      setName('');
      setDescription('');
      setNotes('');
      setTier(1);
      setEnvironments([]);
      setNpcs([]);
      setCreatures([]);
    }
  }, [encounter]);

  // Load thumbnails whenever lists change
  useEffect(() => {
    const envIds = environments.map(e => e.id).filter(Boolean);
    const creatureIds = creatures.map(c => c.id).filter(Boolean);
    const npcIds = npcs.map(n => n.user_id).filter(Boolean);
    if (!envIds.length && !creatureIds.length && !npcIds.length) {
      setThumbs({ envs: {}, creatures: {}, npcs: {} });
      return;
    }
    (async () => {
      const [envRes, crRes, npRes] = await Promise.all([
        envIds.length ? supabase.from('environments').select('id, image_url').in('id', envIds) : Promise.resolve({ data: [] as any[] }),
        creatureIds.length ? supabase.from('bestiary_creatures').select('id, image_url').in('id', creatureIds) : Promise.resolve({ data: [] as any[] }),
        npcIds.length ? supabase.from('profiles').select('user_id, avatar_url').in('user_id', npcIds) : Promise.resolve({ data: [] as any[] }),
      ]);
      const envs: Record<string, string | null> = {};
      (envRes.data || []).forEach((r: any) => { envs[r.id] = r.image_url; });
      const creaturesT: Record<string, string | null> = {};
      (crRes.data || []).forEach((r: any) => { creaturesT[r.id] = r.image_url; });
      const npcsT: Record<string, string | null> = {};
      (npRes.data || []).forEach((r: any) => { npcsT[r.user_id] = r.avatar_url; });
      setThumbs({ envs, creatures: creaturesT, npcs: npcsT });
    })();
  }, [environments, creatures, npcs]);

  const loadEnvs = async () => {
    const { data } = await supabase.from('environments').select('id, name, tier, environment_type, image_url').order('name');
    setAvailableEnvs(data || []);
  };

  const loadNpcs = async () => {
    const { data } = await supabase.from('profiles').select('user_id, character_name, level, character_class, ancestry, avatar_url').eq('is_npc', true).order('character_name');
    setAvailableNpcs(data || []);
  };

  const loadCreatures = async () => {
    const { data } = await supabase.from('bestiary_creatures').select('id, name, tier, creature_type, hp, difficulty, image_url').order('name');
    setAvailableCreatures(data || []);
  };

  const openEnvPicker = () => {
    loadEnvs();
    setPickerSearch('');
    setShowEnvPicker(true);
    setShowNpcPicker(false);
    setShowCreaturePicker(false);
  };

  const openNpcPicker = () => {
    loadNpcs();
    setPickerSearch('');
    setShowNpcPicker(true);
    setShowEnvPicker(false);
    setShowCreaturePicker(false);
  };

  const openCreaturePicker = () => {
    loadCreatures();
    setPickerSearch('');
    setShowCreaturePicker(true);
    setShowEnvPicker(false);
    setShowNpcPicker(false);
  };

  const addEnvironment = (env: any) => {
    setEnvironments(prev => [...prev, { id: env.id, name: env.name, tier: env.tier, environment_type: env.environment_type }]);
    setShowEnvPicker(false);
  };

  const addNpc = (npc: any) => {
    setNpcs(prev => [...prev, { user_id: npc.user_id, character_name: npc.character_name, level: npc.level, character_class: npc.character_class, ancestry: npc.ancestry }]);
    setShowNpcPicker(false);
  };

  const addCreature = (creature: any) => {
    const existing = creatures.findIndex(c => c.id === creature.id);
    if (existing >= 0) {
      setCreatures(prev => prev.map((c, i) => i === existing ? { ...c, quantity: (c.quantity || 1) + 1 } : c));
    } else {
      setCreatures(prev => [...prev, { id: creature.id, name: creature.name, tier: creature.tier, creature_type: creature.creature_type, quantity: 1 }]);
    }
    setShowCreaturePicker(false);
  };

  const removeEnvironment = (idx: number) => setEnvironments(prev => prev.filter((_, i) => i !== idx));
  const removeNpc = (idx: number) => setNpcs(prev => prev.filter((_, i) => i !== idx));
  const removeCreature = (idx: number) => setCreatures(prev => prev.filter((_, i) => i !== idx));

  const updateCreatureQty = (idx: number, qty: number) => {
    setCreatures(prev => prev.map((c, i) => i === idx ? { ...c, quantity: Math.max(1, qty) } : c));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    const payload = { name, description, notes, tier, environments, npcs, creatures };

    let error;
    if (isEdit) {
      ({ error } = await supabase.from('encounters' as any).update(payload).eq('id', encounter.id));
    } else {
      ({ error } = await supabase.from('encounters' as any).insert(payload));
    }

    if (error) {
      toast.error('Failed to save: ' + error.message);
    } else {
      toast.success(isEdit ? 'Encounter updated' : 'Encounter created');
      onSaved();
      onClose();
    }
    setSaving(false);
  };

  const filteredPickerItems = (items: any[], nameKey: string = 'name') =>
    items.filter(i => !pickerSearch || i[nameKey]?.toLowerCase().includes(pickerSearch.toLowerCase()));

  const Thumb = ({ src, fallback, color }: { src: string | null | undefined; fallback: React.ReactNode; color: string }) => (
    src ? <img src={src} alt="" className="h-9 w-9 object-cover rounded shrink-0" />
        : <div className={`h-9 w-9 rounded ${color} flex items-center justify-center shrink-0`}>{fallback}</div>
  );

  return (
    <>
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Encounter' : 'Create Encounter'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Encounter name" />
            </div>
            <div className="space-y-2">
              <Label>Tier</Label>
              <Select value={String(tier)} onValueChange={(v) => setTier(parseInt(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Tier 1</SelectItem>
                  <SelectItem value="2">Tier 2</SelectItem>
                  <SelectItem value="3">Tier 3</SelectItem>
                  <SelectItem value="4">Tier 4</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Encounter description..." rows={2} />
          </div>

          {/* Environments Section */}
          <Collapsible open={envOpen} onOpenChange={setEnvOpen}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer p-2 rounded hover:bg-muted/50">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <TreePine className="h-4 w-4 text-emerald-400" /> Environments ({environments.length})
                </h3>
                <ChevronDown className={`h-4 w-4 transition-transform ${envOpen ? 'rotate-180' : ''}`} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              {environments.map((env, i) => (
                <div key={i} className="flex items-center justify-between bg-emerald-500/10 rounded p-2 text-sm gap-2">
                  <button
                    type="button"
                    onClick={() => env.id && setViewEnvironmentId(env.id)}
                    className="flex items-center gap-2 flex-1 min-w-0 text-left hover:opacity-80"
                  >
                    <Thumb src={env.id ? thumbs.envs[env.id] : null} fallback={<TreePine className="h-4 w-4 text-emerald-400" />} color="bg-emerald-500/20" />
                    <div className="min-w-0">
                      <span className="font-semibold">{env.name}</span>
                      {env.tier && <Badge variant="outline" className="text-xs ml-2">T{env.tier}</Badge>}
                      {env.environment_type && <Badge variant="outline" className="text-xs ml-1">{env.environment_type}</Badge>}
                    </div>
                  </button>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => env.id && setViewEnvironmentId(env.id)} title="View">
                    <Eye className="h-3 w-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeEnvironment(i)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              ))}
              {showEnvPicker ? (
                <div className="border rounded p-3 space-y-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <Input placeholder="Search environments..." value={pickerSearch} onChange={(e) => setPickerSearch(e.target.value)} className="pl-7 h-8 text-sm" />
                  </div>
                  <ScrollArea className="max-h-40">
                    <div className="space-y-1">
                       {filteredPickerItems(availableEnvs).map(env => (
                        <div key={env.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted cursor-pointer text-sm" onClick={() => addEnvironment(env)}>
                          <Thumb src={env.image_url} fallback={<TreePine className="h-4 w-4 text-emerald-400" />} color="bg-emerald-500/20" />
                          <span className="flex-1">{env.name}</span>
                          <div className="flex gap-1">
                            {env.tier && <Badge variant="outline" className="text-xs">T{env.tier}</Badge>}
                            <Badge variant="outline" className="text-xs">{env.environment_type}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <Button size="sm" variant="ghost" onClick={() => setShowEnvPicker(false)}>Cancel</Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={openEnvPicker}>
                  <Plus className="h-3 w-3 mr-1" /> Add Environment
                </Button>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* NPCs Section */}
          <Collapsible open={npcOpen} onOpenChange={setNpcOpen}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer p-2 rounded hover:bg-muted/50">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-400" /> NPCs ({npcs.length})
                </h3>
                <ChevronDown className={`h-4 w-4 transition-transform ${npcOpen ? 'rotate-180' : ''}`} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              {npcs.map((npc, i) => (
                <div key={i} className="flex items-center justify-between bg-blue-500/10 rounded p-2 text-sm gap-2">
                  <button
                    type="button"
                    onClick={() => npc.user_id && setViewNpcId(npc.user_id)}
                    className="flex items-center gap-2 flex-1 min-w-0 text-left hover:opacity-80"
                  >
                    <Thumb src={npc.user_id ? thumbs.npcs[npc.user_id] : null} fallback={<Users className="h-4 w-4 text-blue-400" />} color="bg-blue-500/20" />
                    <div className="min-w-0">
                      <span className="font-semibold">{npc.character_name}</span>
                      {npc.level && <span className="text-xs text-muted-foreground ml-2">Lv.{npc.level}</span>}
                      {npc.character_class && <Badge variant="outline" className="text-xs ml-1">{npc.character_class}</Badge>}
                    </div>
                  </button>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => npc.user_id && setViewNpcId(npc.user_id)} title="View">
                    <Eye className="h-3 w-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeNpc(i)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              ))}
              {showNpcPicker ? (
                <div className="border rounded p-3 space-y-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <Input placeholder="Search NPCs..." value={pickerSearch} onChange={(e) => setPickerSearch(e.target.value)} className="pl-7 h-8 text-sm" />
                  </div>
                  <ScrollArea className="max-h-40">
                    <div className="space-y-1">
                      {filteredPickerItems(availableNpcs, 'character_name').map(npc => (
                        <div key={npc.user_id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted cursor-pointer text-sm" onClick={() => addNpc(npc)}>
                          <Thumb src={npc.avatar_url} fallback={<Users className="h-4 w-4 text-blue-400" />} color="bg-blue-500/20" />
                          <span className="flex-1">{npc.character_name}</span>
                          <div className="flex gap-1">
                            {npc.level && <Badge variant="outline" className="text-xs">Lv.{npc.level}</Badge>}
                            {npc.character_class && <Badge variant="outline" className="text-xs">{npc.character_class}</Badge>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <Button size="sm" variant="ghost" onClick={() => setShowNpcPicker(false)}>Cancel</Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={openNpcPicker}>
                  <Plus className="h-3 w-3 mr-1" /> Add NPC
                </Button>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Creatures Section */}
          <Collapsible open={creatureOpen} onOpenChange={setCreatureOpen}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer p-2 rounded hover:bg-muted/50">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Swords className="h-4 w-4 text-red-400" /> Creatures ({creatures.reduce((sum, c) => sum + (c.quantity || 1), 0)})
                </h3>
                <ChevronDown className={`h-4 w-4 transition-transform ${creatureOpen ? 'rotate-180' : ''}`} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              {creatures.map((c, i) => (
                <div key={i} className="flex items-center justify-between bg-red-500/10 rounded p-2 text-sm gap-2">
                  <button
                    type="button"
                    onClick={() => c.id && setViewCreatureId(c.id)}
                    className="flex items-center gap-2 flex-1 min-w-0 text-left hover:opacity-80"
                  >
                    <Thumb src={c.id ? thumbs.creatures[c.id] : null} fallback={<Swords className="h-4 w-4 text-red-400" />} color="bg-red-500/20" />
                    <div className="min-w-0">
                      <span className="font-semibold">{c.name}</span>
                      {c.tier && <Badge variant="outline" className="text-xs ml-2">T{c.tier}</Badge>}
                      {c.creature_type && <Badge variant="outline" className="text-xs ml-1">{c.creature_type}</Badge>}
                    </div>
                  </button>
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => c.id && setViewCreatureId(c.id)} title="View">
                      <Eye className="h-3 w-3" />
                    </Button>
                    <span className="text-xs text-muted-foreground">Qty:</span>
                    <Input
                      type="number"
                      min={1}
                      value={c.quantity || 1}
                      onChange={(e) => updateCreatureQty(i, parseInt(e.target.value) || 1)}
                      className="w-14 h-7 text-sm text-center"
                    />
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeCreature(i)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
              {showCreaturePicker ? (
                <div className="border rounded p-3 space-y-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <Input placeholder="Search creatures..." value={pickerSearch} onChange={(e) => setPickerSearch(e.target.value)} className="pl-7 h-8 text-sm" />
                  </div>
                  <ScrollArea className="max-h-40">
                    <div className="space-y-1">
                      {filteredPickerItems(availableCreatures).map(creature => (
                        <div key={creature.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted cursor-pointer text-sm" onClick={() => addCreature(creature)}>
                          <Thumb src={creature.image_url} fallback={<Swords className="h-4 w-4 text-red-400" />} color="bg-red-500/20" />
                          <span className="flex-1">{creature.name}</span>
                          <div className="flex gap-1">
                            <Badge variant="outline" className="text-xs">T{creature.tier}</Badge>
                            <Badge variant="outline" className="text-xs">{creature.creature_type}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <Button size="sm" variant="ghost" onClick={() => setShowCreaturePicker(false)}>Cancel</Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={openCreaturePicker}>
                  <Plus className="h-3 w-3 mr-1" /> Add Creature
                </Button>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="GM notes for this encounter..." rows={3} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <CreatureViewDialog creatureId={viewCreatureId} onClose={() => setViewCreatureId(null)} />
    <EnvironmentViewDialog environmentId={viewEnvironmentId} onClose={() => setViewEnvironmentId(null)} />
    <NPCViewDialog userId={viewNpcId} onClose={() => setViewNpcId(null)} />
    </>
  );
};
