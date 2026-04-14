import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Trash2, Library, Image, Link } from 'lucide-react';
import { FeatureLibraryPicker, FeatureItem } from './FeatureLibraryPicker';

interface Props {
  creature: any | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const parseFeatures = (raw: any): FeatureItem[] => {
  if (!raw) return [];
  const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
  return Array.isArray(arr) ? arr.map((f: any) => ({
    name: f.name || '',
    type: f.type || 'Passive',
    description: f.description || '',
  })) : [];
};

export const BestiaryCreatureDialog = ({ creature, open, onClose, onSaved }: Props) => {
  const isEdit = !!creature && !!creature.id && !creature._isClone;
  const thresholds = typeof creature?.thresholds === 'string'
    ? JSON.parse(creature.thresholds)
    : creature?.thresholds || { major: '', severe: '' };

  const [form, setForm] = useState({
    name: creature?.name || '',
    tier: creature?.tier || 1,
    creature_type: creature?.creature_type || 'Standard',
    description: creature?.description || '',
    motives_tactics: creature?.motives_tactics || '',
    difficulty: creature?.difficulty ?? '',
    thresholds_major: thresholds.major ?? '',
    thresholds_severe: thresholds.severe ?? '',
    hp: creature?.hp ?? '',
    stress: creature?.stress ?? '',
    attack_modifier: creature?.attack_modifier ?? '',
    weapon_name: creature?.weapon_name || '',
    weapon_range: creature?.weapon_range || 'Melee',
    damage: creature?.damage || '',
    experience: creature?.experience || '',
    horde_value: creature?.horde_value ?? '',
    is_custom: creature?.is_custom ?? true,
    image_url: creature?.image_url || '',
  });

  const [features, setFeatures] = useState<FeatureItem[]>(parseFeatures(creature?.features));
  const [saving, setSaving] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [imageMode, setImageMode] = useState<'url' | 'upload'>('url');
  const [uploading, setUploading] = useState(false);

  const update = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const addFeature = () => {
    setFeatures(prev => [...prev, { name: '', type: 'Passive', description: '' }]);
  };

  const updateFeature = (index: number, field: keyof FeatureItem, value: string) => {
    setFeatures(prev => prev.map((f, i) => i === index ? { ...f, [field]: value } : f));
  };

  const removeFeature = (index: number) => {
    setFeatures(prev => prev.filter((_, i) => i !== index));
  };

  const addFromLibrary = (feature: FeatureItem) => {
    setFeatures(prev => [...prev, { ...feature }]);
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `bestiary/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('icons').upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('icons').getPublicUrl(path);
      update('image_url', publicUrl);
      toast.success('Image uploaded');
    } catch (e: any) {
      toast.error('Upload failed: ' + e.message);
    } finally {
      setUploading(false);
    }
  };

  const saveFeatureToLibrary = async (feature: FeatureItem) => {
    if (!feature.name.trim()) return;
    // Check if already exists
    const { data } = await supabase
      .from('bestiary_features')
      .select('id')
      .eq('name', feature.name)
      .maybeSingle();
    if (!data) {
      await supabase.from('bestiary_features').insert({
        name: feature.name,
        type: feature.type,
        description: feature.description,
      } as any);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }

    setSaving(true);
    try {
      // Save any custom features to the library
      for (const f of features) {
        if (f.name.trim()) {
          await saveFeatureToLibrary(f);
        }
      }

      const payload: any = {
        name: form.name,
        tier: Number(form.tier),
        creature_type: form.creature_type,
        description: form.description,
        motives_tactics: form.motives_tactics,
        difficulty: form.difficulty !== '' ? Number(form.difficulty) : null,
        thresholds: {
          major: form.thresholds_major !== '' ? Number(form.thresholds_major) : 0,
          severe: form.thresholds_severe !== '' ? Number(form.thresholds_severe) : 0,
        },
        hp: form.hp !== '' ? Number(form.hp) : null,
        stress: form.stress !== '' ? Number(form.stress) : null,
        attack_modifier: form.attack_modifier !== '' ? Number(form.attack_modifier) : null,
        weapon_name: form.weapon_name,
        weapon_range: form.weapon_range,
        damage: form.damage,
        experience: form.experience,
        features: features.filter(f => f.name.trim()),
        horde_value: form.horde_value !== '' ? Number(form.horde_value) : null,
        is_custom: form.is_custom,
        image_url: form.image_url || null,
      };

      if (isEdit) {
        const { error } = await supabase
          .from('bestiary_creatures')
          .update(payload)
          .eq('id', creature.id);
        if (error) throw error;
        toast.success('Creature updated');
      } else {
        const { error } = await supabase
          .from('bestiary_creatures')
          .insert(payload);
        if (error) throw error;
        toast.success('Creature created');
      }

      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const typeColors: Record<string, string> = {
    Passive: 'bg-blue-500/20 text-blue-300',
    Action: 'bg-red-500/20 text-red-300',
    Reaction: 'bg-yellow-500/20 text-yellow-300',
    'Free Action': 'bg-green-500/20 text-green-300',
  };

  return (
    <>
      <Dialog open={open} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit' : 'Create'} Creature</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Image */}
            <div>
              <Label>Image</Label>
              <div className="flex items-center gap-2 mt-1">
                <Button
                  type="button"
                  variant={imageMode === 'url' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setImageMode('url')}
                >
                  <Link className="h-3 w-3 mr-1" /> URL
                </Button>
                <Button
                  type="button"
                  variant={imageMode === 'upload' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setImageMode('upload')}
                >
                  <Image className="h-3 w-3 mr-1" /> Upload
                </Button>
              </div>
              {imageMode === 'url' ? (
                <Input
                  className="mt-2"
                  placeholder="https://example.com/image.png"
                  value={form.image_url}
                  onChange={e => update('image_url', e.target.value)}
                />
              ) : (
                <Input
                  className="mt-2"
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                />
              )}
              {form.image_url && (
                <img
                  src={form.image_url}
                  alt="Preview"
                  className="mt-2 h-24 w-24 object-cover rounded-md border"
                />
              )}
            </div>

            {/* Name, Tier, Type */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Name</Label>
                <Input value={form.name} onChange={e => update('name', e.target.value)} />
              </div>
              <div>
                <Label>Tier</Label>
                <Select value={String(form.tier)} onValueChange={v => update('tier', Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4].map(t => <SelectItem key={t} value={String(t)}>Tier {t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.creature_type} onValueChange={v => update('creature_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Bruiser', 'Horde', 'Leader', 'Minion', 'Ranged', 'Skulk', 'Social', 'Solo', 'Standard', 'Support'].map(t =>
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => update('description', e.target.value)} rows={2} />
            </div>

            <div>
              <Label>Motives & Tactics</Label>
              <Input value={form.motives_tactics} onChange={e => update('motives_tactics', e.target.value)} />
            </div>

            {/* Numeric stats - using text inputs for clean UX */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {[
                { key: 'difficulty', label: 'Difficulty' },
                { key: 'thresholds_major', label: 'Major' },
                { key: 'thresholds_severe', label: 'Severe' },
                { key: 'hp', label: 'HP' },
                { key: 'stress', label: 'Stress' },
                { key: 'attack_modifier', label: 'Atk Mod' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <Label>{label}</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={String((form as any)[key] ?? '')}
                    onChange={e => {
                      const v = e.target.value;
                      if (v === '' || v === '-' || /^-?\d+$/.test(v)) {
                        update(key, v === '' || v === '-' ? v : Number(v));
                      }
                    }}
                    placeholder="—"
                  />
                </div>
              ))}
            </div>

            {/* Weapon */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Weapon Name</Label>
                <Input value={form.weapon_name} onChange={e => update('weapon_name', e.target.value)} />
              </div>
              <div>
                <Label>Range</Label>
                <Select value={form.weapon_range} onValueChange={v => update('weapon_range', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Melee', 'Very Close', 'Close', 'Far', 'Very Far'].map(r =>
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Damage</Label>
                <Input value={form.damage} onChange={e => update('damage', e.target.value)} placeholder="1d8+3 phy" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Experience</Label>
                <Input value={form.experience} onChange={e => update('experience', e.target.value)} />
              </div>
              <div>
                <Label>Horde Value</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={String(form.horde_value ?? '')}
                  onChange={e => {
                    const v = e.target.value;
                    if (v === '' || /^\d+$/.test(v)) {
                      update('horde_value', v === '' ? '' : Number(v));
                    }
                  }}
                  placeholder="e.g. 5"
                />
              </div>
            </div>

            {/* Features */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Features</Label>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => setShowLibrary(true)}>
                    <Library className="h-3 w-3 mr-1" /> From Library
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={addFeature}>
                    <Plus className="h-3 w-3 mr-1" /> Add Custom
                  </Button>
                </div>
              </div>

              {features.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-md">
                  No features yet. Add from the library or create a custom one.
                </p>
              )}

              {features.map((feature, i) => (
                <div key={i} className="border rounded-md p-3 space-y-2 relative">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6"
                    onClick={() => removeFeature(i)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                  <div className="grid grid-cols-2 gap-2 pr-8">
                    <Input
                      placeholder="Feature name"
                      value={feature.name}
                      onChange={e => updateFeature(i, 'name', e.target.value)}
                    />
                    <Select value={feature.type} onValueChange={v => updateFeature(i, 'type', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['Passive', 'Action', 'Reaction', 'Free Action'].map(t =>
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <Textarea
                    placeholder="Description..."
                    value={feature.description}
                    onChange={e => updateFeature(i, 'description', e.target.value)}
                    rows={2}
                    className="text-sm"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <FeatureLibraryPicker
        open={showLibrary}
        onClose={() => setShowLibrary(false)}
        onSelect={addFromLibrary}
      />
    </>
  );
};
