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
  const [classCards, setClassCards] = useState<any[]>([]);
  const [subclassCards, setSubclassCards] = useState<any[]>([]);
  const [ancestryCards, setAncestryCards] = useState<any[]>([]);
  const [communityCards, setCommunityCards] = useState<any[]>([]);
  const [form, setForm] = useState({
    character_name: '',
    ancestry: '',
    job: '',
    company: '',
    character_class: '',
    subclass: '',
    community: '',
    level: 1,
    credit_rating: 100,
    charisma_score: 10,
    notes: '',
    is_searchable: true,
    has_succubus_profile: false,
    agility: 10,
    strength: 10,
    finesse: 10,
    instinct: 10,
    presence: 10,
    knowledge: 10,
    age: null as number | null,
    bio: '',
    employer: '',
    education: '',
    address: '',
    aliases: [] as string[],
    security_rating: 'C'
  });
  const { toast } = useToast();

  // Load game cards for dropdowns
  useEffect(() => {
    const loadCards = async () => {
      const { data } = await supabase
        .from('game_cards')
        .select('*')
        .in('card_type', ['class', 'subclass', 'ancestry', 'community']);
      
      if (data) {
        setClassCards(data.filter(c => c.card_type === 'class'));
        setSubclassCards(data.filter(c => c.card_type === 'subclass'));
        setAncestryCards(data.filter(c => c.card_type === 'ancestry'));
        setCommunityCards(data.filter(c => c.card_type === 'community'));
      }
    };
    if (open) loadCards();
  }, [open]);

  useEffect(() => {
    if (npc) {
      setForm({
        character_name: npc.character_name || '',
        ancestry: npc.ancestry || '',
        job: npc.job || '',
        company: npc.company || '',
        character_class: npc.character_class || '',
        subclass: npc.subclass || '',
        community: npc.community || '',
        level: npc.level || 1,
        credit_rating: npc.credit_rating || npc.credits || 100,
        charisma_score: npc.charisma_score || 10,
        notes: npc.notes || '',
        is_searchable: npc.is_searchable ?? true,
        has_succubus_profile: npc.has_succubus_profile || false,
        agility: npc.agility || 10,
        strength: npc.strength || 10,
        finesse: npc.finesse || 10,
        instinct: npc.instinct || 10,
        presence: npc.presence || 10,
        knowledge: npc.knowledge || 10,
        age: npc.age,
        bio: npc.bio || '',
        employer: npc.employer || '',
        education: npc.education || '',
        address: npc.address || '',
        aliases: npc.aliases || [],
        security_rating: npc.security_rating || 'C'
      });

      // If editing, also load their character_sheet data
      if (npc.user_id) {
        supabase
          .from('character_sheets')
          .select('class, subclass, community, ancestry')
          .eq('user_id', npc.user_id)
          .single()
          .then(({ data: sheetData }) => {
            if (sheetData) {
              setForm(prev => ({
                ...prev,
                character_class: sheetData.class || prev.character_class,
                subclass: sheetData.subclass || prev.subclass,
                community: sheetData.community || prev.community,
                ancestry: sheetData.ancestry || prev.ancestry,
              }));
            }
          });
      }
    }
  }, [npc]);

  const filteredSubclasses = subclassCards.filter(c => c.source === form.character_class);
  const ancestryNames = [...new Set(ancestryCards.map(c => c.source).filter(Boolean))] as string[];
  const communityNames = [...new Set(communityCards.map(c => c.source).filter(Boolean))] as string[];

  const generateRandomNPC = () => {
    const names = ['Vex', 'Cypher', 'Nova', 'Raven', 'Ghost', 'Phoenix', 'Shadow', 'Echo', 'Byte', 'Neon'];
    const ancestries = ancestryNames.length > 0 ? ancestryNames : ['Human', 'Elf', 'Dwarf', 'Halfling'];
    const jobs = ['Netrunner', 'Street Samurai', 'Corpo Executive', 'Techie', 'Medic', 'Fixer', 'Solo', 'Nomad', 'Bartender', 'Hacker'];
    const companies = ['Arasaka', 'Militech', 'Kang Tao', 'Zetatech', 'Biotechnica', 'Petrochem', 'Independent', 'Street'];
    const classNames = classCards.map(c => c.name);
    const communities = communityNames.length > 0 ? communityNames : ['Wanderer', 'Noble', 'Scholar'];

    const randomClass = classNames.length > 0 ? classNames[Math.floor(Math.random() * classNames.length)] : 'NPC';
    const matchingSubs = subclassCards.filter(c => c.source === randomClass);
    const randomSub = matchingSubs.length > 0 ? matchingSubs[Math.floor(Math.random() * matchingSubs.length)].name : '';

    setForm({
      character_name: `${names[Math.floor(Math.random() * names.length)]}-${Math.floor(Math.random() * 1000)}`,
      ancestry: ancestries[Math.floor(Math.random() * ancestries.length)],
      job: jobs[Math.floor(Math.random() * jobs.length)],
      company: companies[Math.floor(Math.random() * companies.length)],
      character_class: randomClass,
      subclass: randomSub,
      community: communities[Math.floor(Math.random() * communities.length)],
      level: Math.floor(Math.random() * 10) + 1,
      credit_rating: Math.floor(Math.random() * 1000) + 100,
      charisma_score: Math.floor(Math.random() * 20) + 1,
      notes: '',
      is_searchable: Math.random() > 0.3,
      has_succubus_profile: Math.random() > 0.7,
      agility: Math.floor(Math.random() * 20) + 1,
      strength: Math.floor(Math.random() * 20) + 1,
      finesse: Math.floor(Math.random() * 20) + 1,
      instinct: Math.floor(Math.random() * 20) + 1,
      presence: Math.floor(Math.random() * 20) + 1,
      knowledge: Math.floor(Math.random() * 20) + 1,
      age: Math.floor(Math.random() * 50) + 18,
      bio: `A mysterious figure with connections.`,
      employer: companies[Math.floor(Math.random() * companies.length)],
      education: 'Street University',
      address: 'Night City',
      aliases: [],
      security_rating: ['D', 'C', 'B', 'A', 'S'][Math.floor(Math.random() * 5)]
    });
  };

  const syncCharacterSheet = async (userId: string) => {
    // Upsert the character_sheet to keep Doppleganger in sync
    const { error } = await supabase
      .from('character_sheets')
      .upsert({
        user_id: userId,
        class: form.character_class || null,
        subclass: form.subclass || null,
        community: form.community || null,
        ancestry: form.ancestry || null,
        level: form.level,
      }, { onConflict: 'user_id' });

    if (error) {
      console.error('Character sheet sync error:', error);
    }
  };

  const handleSubmit = async () => {
    if (!form.character_name.trim()) {
      toast({ title: "Error", description: "Character name is required", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      if (npc) {
        // Update existing profile
        const { error } = await supabase
          .from('profiles')
          .update({
            character_name: form.character_name,
            ancestry: form.ancestry,
            job: form.job,
            company: form.company,
            character_class: form.character_class,
            level: form.level,
            credit_rating: form.credit_rating,
            credits: form.credit_rating,
            charisma_score: form.charisma_score,
            notes: form.notes,
            is_searchable: form.is_searchable,
            has_succubus_profile: form.has_succubus_profile,
            agility: form.agility,
            strength: form.strength,
            finesse: form.finesse,
            instinct: form.instinct,
            presence: form.presence,
            knowledge: form.knowledge,
            age: form.age,
            bio: form.bio,
            employer: form.employer,
            education: form.education,
            address: form.address,
            aliases: form.aliases,
            security_rating: form.security_rating,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', npc.user_id);

        if (error) throw error;

        // Sync character_sheet
        await syncCharacterSheet(npc.user_id);

        toast({ title: "NPC Updated", description: `${form.character_name} has been updated successfully.` });
      } else {
        // Create new NPC via edge function
        const { data, error } = await supabase.functions.invoke('create-npc', {
          body: {
            character_name: form.character_name,
            ancestry: form.ancestry,
            job: form.job,
            company: form.company,
            character_class: form.character_class,
            subclass: form.subclass,
            community: form.community,
            level: form.level,
            credit_rating: form.credit_rating,
            charisma_score: form.charisma_score,
            notes: form.notes,
            is_searchable: form.is_searchable,
            has_succubus_profile: form.has_succubus_profile,
            agility: form.agility,
            strength: form.strength,
            finesse: form.finesse,
            instinct: form.instinct,
            presence: form.presence,
            knowledge: form.knowledge,
            age: form.age,
            bio: form.bio,
            employer: form.employer,
            education: form.education,
            address: form.address,
            aliases: form.aliases,
            security_rating: form.security_rating
          }
        });

        if (error) throw error;

        // Sync character_sheet for the newly created NPC
        if (data?.npc_id) {
          await syncCharacterSheet(data.npc_id);
        }

        toast({ title: "NPC Created", description: data.message });
      }

      if (!npc) {
        setForm({
          character_name: '', ancestry: '', job: '', company: '',
          character_class: '', subclass: '', community: '',
          level: 1, credit_rating: 100, charisma_score: 10,
          notes: '', is_searchable: true, has_succubus_profile: false,
          agility: 10, strength: 10, finesse: 10,
          instinct: 10, presence: 10, knowledge: 10,
          age: null, bio: '', employer: '', education: '',
          address: '', aliases: [], security_rating: 'C'
        });
      }

      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('NPC operation error:', error);
      toast({ title: "Error", description: error.message || "Failed to save NPC", variant: "destructive" });
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
            {npc ? 'Edit Character' : 'Create New NPC'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex gap-2 mb-4">
            <Button onClick={generateRandomNPC} variant="outline" className="flex items-center gap-2" type="button">
              <Zap className="h-4 w-4" />
              Generate Random
            </Button>
          </div>

          {/* Identity Section - mirrors Doppleganger header */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Identity</h4>
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
                <Label htmlFor="level">Level</Label>
                <Select value={String(form.level)} onValueChange={(v) => setForm(prev => ({ ...prev, level: Number(v) }))}>
                  <SelectTrigger id="level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="character_class">Class</Label>
                <Select
                  value={form.character_class || '__none__'}
                  onValueChange={(v) => setForm(prev => ({
                    ...prev,
                    character_class: v === '__none__' ? '' : v,
                    subclass: '' // reset subclass when class changes
                  }))}
                >
                  <SelectTrigger id="character_class">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {classCards.map(c => (
                      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subclass">Subclass</Label>
                <Select
                  value={form.subclass || '__none__'}
                  onValueChange={(v) => setForm(prev => ({ ...prev, subclass: v === '__none__' ? '' : v }))}
                  disabled={!form.character_class}
                >
                  <SelectTrigger id="subclass">
                    <SelectValue placeholder={form.character_class ? "Select subclass" : "Choose class first"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {filteredSubclasses.map(c => (
                      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ancestry">Ancestry</Label>
                <Input
                  id="ancestry"
                  value={form.ancestry}
                  onChange={(e) => setForm(prev => ({ ...prev, ancestry: e.target.value }))}
                  placeholder="Type or pick ancestry"
                  list="ancestry-options"
                />
                <datalist id="ancestry-options">
                  {ancestryNames.map(name => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-2">
                <Label htmlFor="community">Community</Label>
                <Select
                  value={form.community || '__none__'}
                  onValueChange={(v) => setForm(prev => ({ ...prev, community: v === '__none__' ? '' : v }))}
                >
                  <SelectTrigger id="community">
                    <SelectValue placeholder="Select community" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {communityNames.map(name => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Profile Section */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Profile</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="job">Job</Label>
                <Input id="job" value={form.job} onChange={(e) => setForm(prev => ({ ...prev, job: e.target.value }))} placeholder="e.g., Netrunner, Bartender" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input id="company" value={form.company} onChange={(e) => setForm(prev => ({ ...prev, company: e.target.value }))} placeholder="e.g., Arasaka" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="credit_rating">Credit Rating</Label>
                <Input id="credit_rating" type="number" min="0" value={form.credit_rating} onChange={(e) => setForm(prev => ({ ...prev, credit_rating: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="charisma_score">Charisma Score</Label>
                <Input id="charisma_score" type="number" min="1" max="20" value={form.charisma_score} onChange={(e) => setForm(prev => ({ ...prev, charisma_score: parseInt(e.target.value) || 10 }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input id="age" type="number" min="1" value={form.age || ''} onChange={(e) => setForm(prev => ({ ...prev, age: e.target.value ? parseInt(e.target.value) : null }))} placeholder="Enter age" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="security_rating">Security Rating</Label>
                <Select value={form.security_rating} onValueChange={(value) => setForm(prev => ({ ...prev, security_rating: value }))}>
                  <SelectTrigger><SelectValue placeholder="Select rating" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="D">D - Minimal</SelectItem>
                    <SelectItem value="C">C - Standard</SelectItem>
                    <SelectItem value="B">B - Enhanced</SelectItem>
                    <SelectItem value="A">A - High</SelectItem>
                    <SelectItem value="S">S - Maximum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="employer">Employer</Label>
                <Input id="employer" value={form.employer} onChange={(e) => setForm(prev => ({ ...prev, employer: e.target.value }))} placeholder="Current employer" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="education">Education</Label>
                <Input id="education" value={form.education} onChange={(e) => setForm(prev => ({ ...prev, education: e.target.value }))} placeholder="Educational background" />
              </div>
            </div>
          </div>

          {/* Core Stats */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Core Stats</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {(['agility', 'strength', 'finesse', 'instinct', 'presence', 'knowledge'] as const).map(stat => (
                <div key={stat} className="space-y-2">
                  <Label htmlFor={stat} className="capitalize">{stat}</Label>
                  <Input id={stat} type="number" value={form[stat]} onChange={(e) => setForm(prev => ({ ...prev, [stat]: parseInt(e.target.value) || 10 }))} />
                </div>
              ))}
            </div>
          </div>

          {/* Text Fields */}
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" value={form.address} onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))} placeholder="Current address" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Biography</Label>
            <Textarea id="bio" value={form.bio} onChange={(e) => setForm(prev => ({ ...prev, bio: e.target.value }))} placeholder="Character background and personality" rows={3} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Profile Notes (Private)</Label>
            <Textarea id="notes" value={form.notes} onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))} placeholder="Internal notes (not visible to players)" rows={3} />
          </div>

          {/* Toggles */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox id="is_searchable" checked={form.is_searchable} onCheckedChange={(checked) => setForm(prev => ({ ...prev, is_searchable: !!checked }))} />
              <Label htmlFor="is_searchable">Searchable (Players can find this character)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="has_succubus_profile" checked={form.has_succubus_profile} onCheckedChange={(checked) => setForm(prev => ({ ...prev, has_succubus_profile: !!checked }))} />
              <Label htmlFor="has_succubus_profile">Create default Succubus profile</Label>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSubmit} disabled={isSubmitting || !form.character_name.trim()} className="flex-1">
              {isSubmitting ? 'Saving...' : (npc ? 'Update Character' : 'Create NPC')}
            </Button>
            <Button onClick={() => setOpen(false)} variant="outline">Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
