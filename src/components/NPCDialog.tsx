import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Edit, Zap } from 'lucide-react';

interface NPCDialogProps {
  trigger?: React.ReactNode;
  npc?: any;
  onSuccess?: () => void;
}

export const NPCDialog = ({ trigger, npc, onSuccess }: NPCDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    character_name: '',
    ancestry: '',
    job: '',
    company: '',
    character_class: '',
    level: 1,
    credit_rating: 100,
    charisma_score: 10,
    notes: '',
    is_searchable: true,
    has_succubus_profile: false
  });
  const { toast } = useToast();

  useEffect(() => {
    if (npc) {
      setForm({
        character_name: npc.character_name || '',
        ancestry: npc.ancestry || '',
        job: npc.job || '',
        company: npc.company || '',
        character_class: npc.character_class || '',
        level: npc.level || 1,
        credit_rating: npc.credit_rating || npc.credits || 100,
        charisma_score: npc.charisma_score || 10,
        notes: npc.notes || '',
        is_searchable: npc.is_searchable ?? true,
        has_succubus_profile: npc.has_succubus_profile || false
      });
    }
  }, [npc]);

  const generateRandomNPC = () => {
    const names = ['Vex', 'Cypher', 'Nova', 'Raven', 'Ghost', 'Phoenix', 'Shadow', 'Echo', 'Byte', 'Neon'];
    const ancestries = ['Human', 'Elf', 'Dwarf', 'Halfling', 'Tiefling', 'Dragonborn', 'Gnome', 'Half-Elf'];
    const jobs = ['Netrunner', 'Street Samurai', 'Corpo Executive', 'Techie', 'Medic', 'Fixer', 'Solo', 'Nomad', 'Bartender', 'Hacker'];
    const companies = ['Arasaka', 'Militech', 'Kang Tao', 'Zetatech', 'Biotechnica', 'Petrochem', 'Independent', 'Street'];
    const classes = ['Netrunner', 'Street Samurai', 'Corpo', 'Techie', 'Medic', 'Fixer', 'Solo', 'Nomad'];
    
    const randomName = names[Math.floor(Math.random() * names.length)];
    const randomAncestry = ancestries[Math.floor(Math.random() * ancestries.length)];
    const randomJob = jobs[Math.floor(Math.random() * jobs.length)];
    const randomCompany = companies[Math.floor(Math.random() * companies.length)];
    const randomClass = classes[Math.floor(Math.random() * classes.length)];
    const randomLevel = Math.floor(Math.random() * 10) + 1;
    const randomCredits = Math.floor(Math.random() * 1000) + 100;
    const randomCharisma = Math.floor(Math.random() * 20) + 1;

    setForm({
      character_name: `${randomName}-${Math.floor(Math.random() * 1000)}`,
      ancestry: randomAncestry,
      job: randomJob,
      company: randomCompany,
      character_class: randomClass,
      level: randomLevel,
      credit_rating: randomCredits,
      charisma_score: randomCharisma,
      notes: `A mysterious ${randomJob.toLowerCase()} with connections to ${randomCompany}.`,
      is_searchable: Math.random() > 0.3, // 70% chance to be searchable
      has_succubus_profile: Math.random() > 0.7 // 30% chance to have succubus profile
    });
  };

  const handleSubmit = async () => {
    if (!form.character_name.trim()) {
      toast({
        title: "Error",
        description: "Character name is required",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (npc) {
        // Update existing NPC
        console.log('Updating NPC with data:', {
          form,
          npc_user_id: npc.user_id,
          npc_data: npc
        });
        
        const { data, error } = await supabase
          .from('profiles')
          .update({
            character_name: form.character_name,
            ancestry: form.ancestry,
            job: form.job,
            company: form.company,
            character_class: form.character_class,
            level: form.level,
            credit_rating: form.credit_rating,
            credits: form.credit_rating, // Keep both for compatibility
            charisma_score: form.charisma_score,
            notes: form.notes,
            is_searchable: form.is_searchable,
            has_succubus_profile: form.has_succubus_profile
          })
          .eq('user_id', npc.user_id);

        if (error) throw error;

        toast({
          title: "NPC Updated",
          description: `${form.character_name} has been updated successfully.`,
        });
      } else {
        // Create new NPC
        const { data, error } = await supabase.functions.invoke('create-npc', {
          body: {
            character_name: form.character_name,
            ancestry: form.ancestry,
            job: form.job,
            company: form.company,
            character_class: form.character_class,
            level: form.level,
            credit_rating: form.credit_rating,
            charisma_score: form.charisma_score,
            notes: form.notes,
            is_searchable: form.is_searchable,
            has_succubus_profile: form.has_succubus_profile
          }
        });

        if (error) throw error;

        toast({
          title: "NPC Created",
          description: data.message,
        });
      }

      // Reset form if creating new
      if (!npc) {
        setForm({
          character_name: '',
          ancestry: '',
          job: '',
          company: '',
          character_class: '',
          level: 1,
          credit_rating: 100,
          charisma_score: 10,
          notes: '',
          is_searchable: true,
          has_succubus_profile: false
        });
      }

      setOpen(false);
      onSuccess?.();

    } catch (error: any) {
      console.error('NPC operation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save NPC",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Create NPC
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {npc ? <Edit className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
            {npc ? 'Edit NPC' : 'Create New NPC'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex gap-2 mb-4">
            <Button
              onClick={generateRandomNPC}
              variant="outline"
              className="flex items-center gap-2"
              type="button"
            >
              <Zap className="h-4 w-4" />
              Generate Random
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="character_name">Character Name *</Label>
              <Input
                id="character_name"
                value={form.character_name}
                onChange={(e) => setForm(prev => ({ ...prev, character_name: e.target.value }))}
                placeholder="Enter character name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ancestry">Ancestry</Label>
              <Input
                id="ancestry"
                value={form.ancestry}
                onChange={(e) => setForm(prev => ({ ...prev, ancestry: e.target.value }))}
                placeholder="e.g., Human, Elf, Dwarf"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="job">Job</Label>
              <Input
                id="job"
                value={form.job}
                onChange={(e) => setForm(prev => ({ ...prev, job: e.target.value }))}
                placeholder="e.g., Netrunner, Bartender"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={form.company}
                onChange={(e) => setForm(prev => ({ ...prev, company: e.target.value }))}
                placeholder="e.g., Arasaka, Independent"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="character_class">Class</Label>
              <Input
                id="character_class"
                value={form.character_class}
                onChange={(e) => setForm(prev => ({ ...prev, character_class: e.target.value }))}
                placeholder="e.g., Netrunner, Solo, Corpo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="level">Level</Label>
              <Input
                id="level"
                type="number"
                min="1"
                max="50"
                value={form.level}
                onChange={(e) => setForm(prev => ({ ...prev, level: parseInt(e.target.value) || 1 }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="credit_rating">Credit Rating</Label>
              <Input
                id="credit_rating"
                type="number"
                min="0"
                value={form.credit_rating}
                onChange={(e) => setForm(prev => ({ ...prev, credit_rating: parseInt(e.target.value) || 0 }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="charisma_score">Charisma Score</Label>
              <Input
                id="charisma_score"
                type="number"
                min="1"
                max="20"
                value={form.charisma_score}
                onChange={(e) => setForm(prev => ({ ...prev, charisma_score: parseInt(e.target.value) || 10 }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Profile Notes (Private)</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Internal notes about this character (not visible to players)"
              rows={4}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_searchable"
                checked={form.is_searchable}
                onCheckedChange={(checked) => setForm(prev => ({ ...prev, is_searchable: !!checked }))}
              />
              <Label htmlFor="is_searchable">
                Searchable (Players can find this character in contact lists)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="has_succubus_profile"
                checked={form.has_succubus_profile}
                onCheckedChange={(checked) => setForm(prev => ({ ...prev, has_succubus_profile: !!checked }))}
              />
              <Label htmlFor="has_succubus_profile">
                Create default Succubus profile
              </Label>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !form.character_name.trim()}
              className="flex-1"
            >
              {isSubmitting ? 'Saving...' : (npc ? 'Update NPC' : 'Create NPC')}
            </Button>
            <Button
              onClick={() => setOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};