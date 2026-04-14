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
import { Plus, Trash2, ChevronDown, TreePine, Users, Swords, Search, MapPin } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

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

  const loadEnvs = async () => {
    const [{ data: bestiaryEnvs }, { data: mapAreas }] = await Promise.all([
      supabase.from('bestiary_environments').select('id, name, tier, environment_type').order('name'),
      supabase.from('map_areas').select('id, name, environment_card').order('name'),
    ]);
    const mapped = (mapAreas || []).map(a => ({
      id: `area:${a.id}`,
      name: a.name,
      tier: (a.environment_card as any)?.tier || null,
      environment_type: (a.environment_card as any)?.type || 'Map Area',
      _source: 'maze',
    }));
    setAvailableEnvs([
      ...(bestiaryEnvs || []).map(e => ({ ...e, _source: 'bestiary' })),
      ...mapped,
    ]);
  };

  const loadNpcs = async () => {
    const { data } = await supabase.from('profiles').select('user_id, character_name, level, character_class, ancestry').eq('is_npc', true).order('character_name');
    setAvailableNpcs(data || []);
  };

  const loadCreatures = async () => {
    const { data } = await supabase.from('bestiary_creatures').select('id, name, tier, creature_type, hp, difficulty').order('name');
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

  return (
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
                <div key={i} className="flex items-center justify-between bg-emerald-500/10 rounded p-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{env.name}</span>
                    {env.tier && <Badge variant="outline" className="text-xs">T{env.tier}</Badge>}
                    {env.environment_type && <Badge variant="outline" className="text-xs">{env.environment_type}</Badge>}
                  </div>
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
                        <div key={env.id} className="flex items-center justify-between p-1.5 rounded hover:bg-muted cursor-pointer text-sm" onClick={() => addEnvironment(env)}>
                          <span className="flex items-center gap-1">
                            {env._source === 'maze' && <MapPin className="h-3 w-3 text-muted-foreground" />}
                            {env.name}
                          </span>
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
                <div key={i} className="flex items-center justify-between bg-blue-500/10 rounded p-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{npc.character_name}</span>
                    {npc.level && <span className="text-xs text-muted-foreground">Lv.{npc.level}</span>}
                    {npc.character_class && <Badge variant="outline" className="text-xs">{npc.character_class}</Badge>}
                  </div>
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
                        <div key={npc.user_id} className="flex items-center justify-between p-1.5 rounded hover:bg-muted cursor-pointer text-sm" onClick={() => addNpc(npc)}>
                          <span>{npc.character_name}</span>
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
                <div key={i} className="flex items-center justify-between bg-red-500/10 rounded p-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{c.name}</span>
                    {c.tier && <Badge variant="outline" className="text-xs">T{c.tier}</Badge>}
                    {c.creature_type && <Badge variant="outline" className="text-xs">{c.creature_type}</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
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
                        <div key={creature.id} className="flex items-center justify-between p-1.5 rounded hover:bg-muted cursor-pointer text-sm" onClick={() => addCreature(creature)}>
                          <span>{creature.name}</span>
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
  );
};
