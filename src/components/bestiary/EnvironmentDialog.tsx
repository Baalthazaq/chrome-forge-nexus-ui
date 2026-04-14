import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Trash2, Library, Image, Link } from 'lucide-react';
import { FeatureItem } from './FeatureLibraryPicker';
import { EnvironmentFeatureLibraryPicker } from './EnvironmentFeatureLibraryPicker';

interface Props {
  environment: any | null;
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

export const EnvironmentDialog = ({ environment, open, onClose, onSaved }: Props) => {
  const isEdit = !!environment && !!environment.id && !environment._isClone;

  const [form, setForm] = useState({
    name: environment?.name || '',
    tier: environment?.tier || 1,
    environment_type: environment?.environment_type || 'Exploration',
    difficulty: environment?.difficulty || '',
    impulses: (environment?.impulses || []).join(', '),
    potential_adversaries: environment?.potential_adversaries || '',
    image_url: environment?.image_url || '',
  });

  const [features, setFeatures] = useState<FeatureItem[]>(parseFeatures(environment?.features));
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
      const path = `environments/${crypto.randomUUID()}.${ext}`;
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
    const { data } = await supabase
      .from('environment_features' as any)
      .select('id')
      .eq('name', feature.name)
      .maybeSingle();
    if (!data) {
      await supabase.from('environment_features' as any).insert({
        name: feature.name,
        type: feature.type,
        description: feature.description,
      });
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }

    setSaving(true);
    try {
      for (const f of features) {
        if (f.name.trim()) {
          await saveFeatureToLibrary(f);
        }
      }

      const payload: any = {
        name: form.name,
        tier: Number(form.tier),
        environment_type: form.environment_type,
        difficulty: form.difficulty || null,
        impulses: form.impulses ? form.impulses.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        potential_adversaries: form.potential_adversaries || null,
        features: features.filter(f => f.name.trim()),
        image_url: form.image_url || null,
      };

      if (isEdit) {
        const { error } = await supabase
          .from('bestiary_environments')
          .update(payload)
          .eq('id', environment.id);
        if (error) throw error;
        toast.success('Environment updated');
      } else {
        const { error } = await supabase
          .from('bestiary_environments')
          .insert(payload);
        if (error) throw error;
        toast.success('Environment created');
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
            <DialogTitle>{isEdit ? 'Edit' : 'Create'} Environment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Image */}
            <div>
              <Label>Image</Label>
              <div className="flex items-center gap-2 mt-1">
                <Button type="button" variant={imageMode === 'url' ? 'default' : 'outline'} size="sm" onClick={() => setImageMode('url')}>
                  <Link className="h-3 w-3 mr-1" /> URL
                </Button>
                <Button type="button" variant={imageMode === 'upload' ? 'default' : 'outline'} size="sm" onClick={() => setImageMode('upload')}>
                  <Image className="h-3 w-3 mr-1" /> Upload
                </Button>
              </div>
              {imageMode === 'url' ? (
                <Input className="mt-2" placeholder="https://example.com/image.png" value={form.image_url} onChange={e => update('image_url', e.target.value)} />
              ) : (
                <Input className="mt-2" type="file" accept="image/*" disabled={uploading} onChange={e => { const file = e.target.files?.[0]; if (file) handleImageUpload(file); }} />
              )}
              {form.image_url && (
                <img src={form.image_url} alt="Preview" className="mt-2 h-24 w-24 object-cover rounded-md border" />
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
                <Select value={form.environment_type} onValueChange={v => update('environment_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Exploration', 'Social', 'Event', 'Traversal'].map(t =>
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <Label>Difficulty</Label>
              <Input
                type="text"
                value={form.difficulty}
                onChange={e => update('difficulty', e.target.value)}
                placeholder="e.g. 14"
              />
            </div>

            {/* Impulses */}
            <div>
              <Label>Impulses (comma-separated)</Label>
              <Input value={form.impulses} onChange={e => update('impulses', e.target.value)} placeholder="e.g. To consume, To spread" />
            </div>

            {/* Potential Adversaries */}
            <div>
              <Label>Potential Adversaries</Label>
              <Input value={form.potential_adversaries} onChange={e => update('potential_adversaries', e.target.value)} />
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
                  <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={() => removeFeature(i)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                  <div className="grid grid-cols-2 gap-2 pr-8">
                    <Input placeholder="Feature name" value={feature.name} onChange={e => updateFeature(i, 'name', e.target.value)} />
                    <Select value={feature.type} onValueChange={v => updateFeature(i, 'type', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['Passive', 'Action', 'Reaction', 'Free Action'].map(t =>
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <Textarea placeholder="Description..." value={feature.description} onChange={e => updateFeature(i, 'description', e.target.value)} rows={2} className="text-sm" />
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

      <FeatureLibraryPicker open={showLibrary} onClose={() => setShowLibrary(false)} onSelect={addFromLibrary} />
    </>
  );
};
