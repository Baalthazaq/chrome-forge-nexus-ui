import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Shield, ArrowLeft, Search, ChevronDown, Swords, Heart, Brain, Zap, RefreshCw, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { BestiaryCreatureDialog } from '@/components/bestiary/BestiaryCreatureDialog';

const BestiaryAdmin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useAdmin();
  const [creatures, setCreatures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedingEnvs, setSeedingEnvs] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editCreature, setEditCreature] = useState<any | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/admin');
      return;
    }
    if (isAdmin) loadCreatures();
  }, [isAdmin, adminLoading]);

  const loadCreatures = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('bestiary_creatures')
      .select('*')
      .order('tier')
      .order('name');
    if (error) {
      toast.error('Failed to load creatures');
    } else {
      setCreatures(data || []);
    }
    setLoading(false);
  };

  const seedBestiary = async () => {
    setSeeding(true);
    try {
      const { data, error } = await supabase.functions.invoke('seed-bestiary');
      if (error) throw error;
      toast.success(`Seeded ${data.count} creatures`);
      loadCreatures();
    } catch (e: any) {
      toast.error('Failed to seed: ' + e.message);
    } finally {
      setSeeding(false);
    }
  };

  const deleteCreature = async (id: string) => {
    const { error } = await supabase.from('bestiary_creatures').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete');
    } else {
      toast.success('Creature deleted');
      loadCreatures();
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filtered = creatures.filter(c => {
    const matchSearch = !searchTerm ||
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.creature_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTier = tierFilter === 'all' || c.tier === parseInt(tierFilter);
    const matchType = typeFilter === 'all' || c.creature_type === typeFilter;
    return matchSearch && matchTier && matchType;
  });

  const creatureTypes = [...new Set(creatures.map(c => c.creature_type))].sort();

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      Solo: 'bg-red-500/20 text-red-300',
      Bruiser: 'bg-orange-500/20 text-orange-300',
      Leader: 'bg-yellow-500/20 text-yellow-300',
      Standard: 'bg-blue-500/20 text-blue-300',
      Skulk: 'bg-purple-500/20 text-purple-300',
      Ranged: 'bg-green-500/20 text-green-300',
      Horde: 'bg-pink-500/20 text-pink-300',
      Minion: 'bg-gray-500/20 text-gray-300',
      Support: 'bg-cyan-500/20 text-cyan-300',
      Social: 'bg-indigo-500/20 text-indigo-300',
    };
    return colors[type] || 'bg-muted text-muted-foreground';
  };

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
            <Swords className="h-7 w-7 text-red-400" />
            <h1 className="text-2xl font-bold">Bestiary</h1>
            <Badge variant="outline">{filtered.length} / {creatures.length}</Badge>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowCreateDialog(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" /> Add Creature
            </Button>
            <Button onClick={seedBestiary} disabled={seeding} variant="outline" size="sm">
              <RefreshCw className={`h-4 w-4 mr-1 ${seeding ? 'animate-spin' : ''}`} />
              {seeding ? 'Seeding...' : 'Seed from Source'}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search creatures..."
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
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {creatureTypes.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Creatures List */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading creatures...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Swords className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              {creatures.length === 0 ? 'No creatures yet. Click "Seed from Source" to populate.' : 'No creatures match filters.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(creature => {
              const thresholds = typeof creature.thresholds === 'string'
                ? JSON.parse(creature.thresholds)
                : creature.thresholds || { major: 0, severe: 0 };
              const features = typeof creature.features === 'string'
                ? JSON.parse(creature.features)
                : creature.features || [];
              const isExpanded = expandedIds.has(creature.id);

              return (
                <Card key={creature.id} className="border-border/50">
                  <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(creature.id)}>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-3 px-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="font-bold text-lg">{creature.name}</span>
                            <Badge variant="outline" className="text-xs">T{creature.tier}</Badge>
                            <Badge className={`text-xs ${getTypeColor(creature.creature_type)}`}>
                              {creature.creature_type}
                            </Badge>
                            {creature.horde_value && (
                              <Badge variant="outline" className="text-xs">{creature.horde_value}/HP</Badge>
                            )}
                            {creature.is_custom && (
                              <Badge variant="outline" className="text-xs bg-yellow-500/20 text-yellow-300">Custom</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="hidden md:flex items-center gap-3 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Shield className="h-3 w-3" /> {creature.difficulty}
                              </span>
                              <span className="flex items-center gap-1">
                                <Heart className="h-3 w-3" /> {creature.hp}
                              </span>
                              <span className="flex items-center gap-1">
                                <Brain className="h-3 w-3" /> {creature.stress}
                              </span>
                            </div>
                            <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0 px-4 pb-4 space-y-4">
                        {/* Description */}
                        {creature.description && (
                          <p className="text-sm italic text-muted-foreground">{creature.description}</p>
                        )}

                        {/* Motives */}
                        {creature.motives_tactics && (
                          <p className="text-sm"><strong>Motives & Tactics:</strong> {creature.motives_tactics}</p>
                        )}

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 text-sm">
                          <div className="bg-muted/50 rounded p-2 text-center">
                            <div className="text-xs text-muted-foreground">Difficulty</div>
                            <div className="font-bold">{creature.difficulty}</div>
                          </div>
                          <div className="bg-muted/50 rounded p-2 text-center">
                            <div className="text-xs text-muted-foreground">Thresholds</div>
                            <div className="font-bold">
                              {thresholds.major || '—'} / {thresholds.severe || '—'}
                            </div>
                          </div>
                          <div className="bg-muted/50 rounded p-2 text-center">
                            <div className="text-xs text-muted-foreground">HP</div>
                            <div className="font-bold">{creature.hp}</div>
                          </div>
                          <div className="bg-muted/50 rounded p-2 text-center">
                            <div className="text-xs text-muted-foreground">Stress</div>
                            <div className="font-bold">{creature.stress}</div>
                          </div>
                          <div className="bg-muted/50 rounded p-2 text-center">
                            <div className="text-xs text-muted-foreground">Attack</div>
                            <div className="font-bold">{creature.attack_modifier >= 0 ? '+' : ''}{creature.attack_modifier}</div>
                          </div>
                          <div className="bg-muted/50 rounded p-2 text-center">
                            <div className="text-xs text-muted-foreground">{creature.weapon_name || 'Weapon'}</div>
                            <div className="font-bold text-xs">{creature.weapon_range}</div>
                          </div>
                          <div className="bg-muted/50 rounded p-2 text-center">
                            <div className="text-xs text-muted-foreground">Damage</div>
                            <div className="font-bold text-xs">{creature.damage}</div>
                          </div>
                        </div>

                        {/* Experience */}
                        {creature.experience && (
                          <p className="text-sm"><strong>Experience:</strong> {creature.experience}</p>
                        )}

                        {/* Features */}
                        {features.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="font-semibold text-sm flex items-center gap-1">
                              <Zap className="h-4 w-4" /> Features
                            </h4>
                            {features.map((f: any, i: number) => (
                              <div key={i} className="bg-muted/30 rounded p-3 text-sm">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-semibold">{f.name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {f.type}
                                  </Badge>
                                </div>
                                <p className="text-muted-foreground text-xs leading-relaxed">{f.description}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 pt-2">
                          <Button size="sm" variant="outline" onClick={() => setEditCreature(creature)}>
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              if (confirm(`Delete ${creature.name}?`)) deleteCreature(creature.id);
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      {editCreature && (
        <BestiaryCreatureDialog
          creature={editCreature}
          open={!!editCreature}
          onClose={() => setEditCreature(null)}
          onSaved={loadCreatures}
        />
      )}

      {/* Create Dialog */}
      {showCreateDialog && (
        <BestiaryCreatureDialog
          creature={null}
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onSaved={loadCreatures}
        />
      )}
    </div>
  );
};

export default BestiaryAdmin;
