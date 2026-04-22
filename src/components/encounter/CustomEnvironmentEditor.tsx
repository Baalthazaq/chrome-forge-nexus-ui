import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Search, Copy } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';

export interface CustomEnvironment {
  custom: true;
  name: string;
  tier?: number;
  environment_type?: string;
  difficulty?: string;
  impulses?: string[];
  potential_adversaries?: string;
  image_url?: string;
  description?: string;
  features?: { name: string; type?: string; description?: string }[];
}

interface Props {
  open: boolean;
  initial?: CustomEnvironment | null;
  onClose: () => void;
  onSave: (env: CustomEnvironment) => void;
}

const ENV_TYPES = ['Standard', 'Exploration', 'Social', 'Traversal', 'Event'];

export const CustomEnvironmentEditor = ({ open, initial, onClose, onSave }: Props) => {
  const [name, setName] = useState('');
  const [tier, setTier] = useState(1);
  const [envType, setEnvType] = useState('Standard');
  const [difficulty, setDifficulty] = useState('');
  const [impulses, setImpulses] = useState('');
  const [potentialAdversaries, setPotentialAdversaries] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [features, setFeatures] = useState<{ name: string; type?: string; description?: string }[]>([]);

  // Start-from-existing picker
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [available, setAvailable] = useState<any[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name || '');
      setTier(initial?.tier || 1);
      setEnvType(initial?.environment_type || 'Standard');
      setDifficulty(initial?.difficulty || '');
      setImpulses((initial?.impulses || []).join(', '));
      setPotentialAdversaries(initial?.potential_adversaries || '');
      setImageUrl(initial?.image_url || '');
      setDescription(initial?.description || '');
      setFeatures(initial?.features || []);
      setPickerOpen(false);
      setPickerSearch('');
    }
  }, [open, initial]);

  const loadAvailable = async () => {
    setPickerLoading(true);
    const { data } = await supabase
      .from('environments')
      .select('id, name, tier, environment_type, difficulty, impulses, potential_adversaries, image_url, features')
      .order('name');
    setAvailable(data || []);
    setPickerLoading(false);
  };

  const openPicker = () => {
    setPickerOpen(true);
    if (!available.length) loadAvailable();
  };

  const applyTemplate = (env: any) => {
    setName(env.name ? `${env.name} (Custom)` : '');
    setTier(env.tier || 1);
    setEnvType(env.environment_type || 'Standard');
    setDifficulty(env.difficulty ? String(env.difficulty) : '');
    setImpulses((env.impulses || []).join(', '));
    setPotentialAdversaries(env.potential_adversaries || '');
    setImageUrl(env.image_url || '');
    setDescription('');
    const feats = Array.isArray(env.features) ? env.features.map((f: any) => ({
      name: f.name || '',
      type: f.type || 'Passive',
      description: f.description || '',
    })) : [];
    setFeatures(feats);
    setPickerOpen(false);
  };

  const filteredAvailable = available.filter(a =>
    !pickerSearch || a.name?.toLowerCase().includes(pickerSearch.toLowerCase())
  );

  const addFeature = () => setFeatures(prev => [...prev, { name: '', type: 'Passive', description: '' }]);
  const updateFeature = (i: number, patch: Partial<{ name: string; type: string; description: string }>) =>
    setFeatures(prev => prev.map((f, idx) => idx === i ? { ...f, ...patch } : f));
  const removeFeature = (i: number) => setFeatures(prev => prev.filter((_, idx) => idx !== i));

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      custom: true,
      name: name.trim(),
      tier,
      environment_type: envType,
      difficulty: difficulty || undefined,
      impulses: impulses.split(',').map(s => s.trim()).filter(Boolean),
      potential_adversaries: potentialAdversaries || undefined,
      image_url: imageUrl || undefined,
      description: description || undefined,
      features,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {initial ? 'Edit Custom Environment' : 'Create Custom Environment'}
            <Badge variant="outline" className="text-xs">Encounter-only</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!initial && (
            <div className="space-y-2">
              {!pickerOpen ? (
                <Button size="sm" variant="outline" onClick={openPicker}>
                  <Copy className="h-3 w-3 mr-1" /> Start from existing environment
                </Button>
              ) : (
                <div className="border rounded p-3 space-y-2 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Pick a template — fields will be pre-filled</Label>
                    <Button size="sm" variant="ghost" onClick={() => setPickerOpen(false)}>Cancel</Button>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <Input placeholder="Search environments..." value={pickerSearch} onChange={(e) => setPickerSearch(e.target.value)} className="pl-7 h-8 text-sm" />
                  </div>
                  <ScrollArea className="max-h-48">
                    <div className="space-y-1 pr-2">
                      {pickerLoading && <div className="text-xs text-muted-foreground p-2">Loading...</div>}
                      {!pickerLoading && filteredAvailable.map((env) => (
                        <div key={env.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted cursor-pointer text-sm" onClick={() => applyTemplate(env)}>
                          {env.image_url ? (
                            <img src={env.image_url} alt="" className="h-8 w-8 object-cover rounded shrink-0" />
                          ) : (
                            <div className="h-8 w-8 rounded bg-emerald-500/20 shrink-0" />
                          )}
                          <span className="flex-1">{env.name}</span>
                          {env.tier && <Badge variant="outline" className="text-xs">T{env.tier}</Badge>}
                          <Badge variant="outline" className="text-xs">{env.environment_type}</Badge>
                        </div>
                      ))}
                      {!pickerLoading && !filteredAvailable.length && (
                        <div className="text-xs text-muted-foreground p-2">No environments found.</div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Environment name" />
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
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={envType} onValueChange={setEnvType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ENV_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Input value={difficulty} onChange={(e) => setDifficulty(e.target.value)} placeholder="e.g. 14" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Image URL</Label>
            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
          </div>

          <div className="space-y-2">
            <Label>Impulses (comma-separated)</Label>
            <Input value={impulses} onChange={(e) => setImpulses(e.target.value)} placeholder="Stalk, Ambush, Hide" />
          </div>

          <div className="space-y-2">
            <Label>Potential Adversaries</Label>
            <Input value={potentialAdversaries} onChange={(e) => setPotentialAdversaries(e.target.value)} placeholder="Bandits, wolves..." />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Features</Label>
              <Button size="sm" variant="outline" onClick={addFeature}>
                <Plus className="h-3 w-3 mr-1" /> Add Feature
              </Button>
            </div>
            {features.length > 0 && (
              <ScrollArea className="max-h-72">
                <div className="space-y-2 pr-2">
                  {features.map((f, i) => (
                    <div key={i} className="border rounded p-2 space-y-2 bg-muted/30">
                      <div className="flex gap-2">
                        <Input value={f.name} onChange={(e) => updateFeature(i, { name: e.target.value })} placeholder="Feature name" className="flex-1 h-8 text-sm" />
                        <Select value={f.type || 'Passive'} onValueChange={(v) => updateFeature(i, { type: v })}>
                          <SelectTrigger className="w-32 h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Passive">Passive</SelectItem>
                            <SelectItem value="Action">Action</SelectItem>
                            <SelectItem value="Reaction">Reaction</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeFeature(i)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                      <Textarea value={f.description || ''} onChange={(e) => updateFeature(i, { description: e.target.value })} placeholder="Description..." rows={2} className="text-sm" />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!name.trim()}>{initial ? 'Update' : 'Add to Encounter'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
