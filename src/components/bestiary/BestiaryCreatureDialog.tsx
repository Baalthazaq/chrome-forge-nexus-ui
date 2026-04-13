import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface Props {
  creature: any | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const BestiaryCreatureDialog = ({ creature, open, onClose, onSaved }: Props) => {
  const isEdit = !!creature;
  const [form, setForm] = useState({
    name: creature?.name || '',
    tier: creature?.tier || 1,
    creature_type: creature?.creature_type || 'Standard',
    description: creature?.description || '',
    motives_tactics: creature?.motives_tactics || '',
    difficulty: creature?.difficulty || 10,
    thresholds: typeof creature?.thresholds === 'string'
      ? JSON.parse(creature.thresholds)
      : creature?.thresholds || { major: 0, severe: 0 },
    hp: creature?.hp || 1,
    stress: creature?.stress || 0,
    attack_modifier: creature?.attack_modifier || 0,
    weapon_name: creature?.weapon_name || '',
    weapon_range: creature?.weapon_range || 'Melee',
    damage: creature?.damage || '',
    experience: creature?.experience || '',
    features: typeof creature?.features === 'string'
      ? creature.features
      : JSON.stringify(creature?.features || [], null, 2),
    horde_value: creature?.horde_value || '',
    is_custom: creature?.is_custom ?? true,
  });
  const [saving, setSaving] = useState(false);

  const update = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }

    setSaving(true);
    try {
      let parsedFeatures;
      try {
        parsedFeatures = JSON.parse(form.features);
      } catch {
        toast.error('Features must be valid JSON');
        setSaving(false);
        return;
      }

      const payload = {
        name: form.name,
        tier: Number(form.tier),
        creature_type: form.creature_type,
        description: form.description,
        motives_tactics: form.motives_tactics,
        difficulty: Number(form.difficulty),
        thresholds: form.thresholds,
        hp: Number(form.hp),
        stress: Number(form.stress),
        attack_modifier: Number(form.attack_modifier),
        weapon_name: form.weapon_name,
        weapon_range: form.weapon_range,
        damage: form.damage,
        experience: form.experience,
        features: parsedFeatures,
        horde_value: form.horde_value ? Number(form.horde_value) : null,
        is_custom: form.is_custom,
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

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit' : 'Create'} Creature</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
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

          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            <div>
              <Label>Difficulty</Label>
              <Input type="number" value={form.difficulty} onChange={e => update('difficulty', e.target.value)} />
            </div>
            <div>
              <Label>Major</Label>
              <Input type="number" value={form.thresholds.major} onChange={e => update('thresholds', { ...form.thresholds, major: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Severe</Label>
              <Input type="number" value={form.thresholds.severe} onChange={e => update('thresholds', { ...form.thresholds, severe: Number(e.target.value) })} />
            </div>
            <div>
              <Label>HP</Label>
              <Input type="number" value={form.hp} onChange={e => update('hp', e.target.value)} />
            </div>
            <div>
              <Label>Stress</Label>
              <Input type="number" value={form.stress} onChange={e => update('stress', e.target.value)} />
            </div>
            <div>
              <Label>Atk Mod</Label>
              <Input type="number" value={form.attack_modifier} onChange={e => update('attack_modifier', e.target.value)} />
            </div>
          </div>

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
              <Label>Horde Value (if applicable)</Label>
              <Input type="number" value={form.horde_value} onChange={e => update('horde_value', e.target.value)} placeholder="e.g. 5" />
            </div>
          </div>

          <div>
            <Label>Features (JSON)</Label>
            <Textarea
              value={form.features}
              onChange={e => update('features', e.target.value)}
              rows={6}
              className="font-mono text-xs"
              placeholder='[{"name": "...", "type": "Passive", "description": "..."}]'
            />
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
  );
};
