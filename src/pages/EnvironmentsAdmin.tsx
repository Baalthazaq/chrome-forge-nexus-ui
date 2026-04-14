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
import { Shield, ArrowLeft, ChevronDown, RefreshCw, TreePine, Plus, Search, Copy, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { EnvironmentDialog } from '@/components/bestiary/EnvironmentDialog';

const EnvironmentsAdmin = () => {
  const navigate = useNavigate();
  const { isAdmin, isLoading: adminLoading } = useAdmin();
  const [environments, setEnvironments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editEnvironment, setEditEnvironment] = useState<any | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/admin');
      return;
    }
    if (isAdmin) loadEnvironments();
  }, [isAdmin, adminLoading]);

  const loadEnvironments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('bestiary_environments')
      .select('*')
      .order('tier')
      .order('name');
    if (error) {
      toast.error('Failed to load environments');
    } else {
      setEnvironments(data || []);
    }
    setLoading(false);
  };

  const seedEnvironments = async () => {
    setSeeding(true);
    try {
      const { data, error } = await supabase.functions.invoke('seed-environments');
      if (error) throw error;
      toast.success(`Seeded ${data.count} environments`);
      loadEnvironments();
    } catch (e: any) {
      toast.error('Failed to seed: ' + e.message);
    } finally {
      setSeeding(false);
    }
  };

  const deleteEnvironment = async (id: string) => {
    const { error } = await supabase.from('bestiary_environments').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete');
    } else {
      toast.success('Environment deleted');
      loadEnvironments();
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filtered = environments.filter(e => {
    const matchTier = tierFilter === 'all' || e.tier === parseInt(tierFilter);
    const matchType = typeFilter === 'all' || e.environment_type === typeFilter;
    const matchSearch = !searchTerm ||
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.environment_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.potential_adversaries?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchTier && matchType && matchSearch;
  });

  const envTypes = [...new Set(environments.map(e => e.environment_type))].sort();

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      Exploration: 'bg-emerald-500/20 text-emerald-300',
      Social: 'bg-indigo-500/20 text-indigo-300',
      Event: 'bg-red-500/20 text-red-300',
      Traversal: 'bg-amber-500/20 text-amber-300',
    };
    return colors[type] || 'bg-muted text-muted-foreground';
  };

  const getFeatureTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      Passive: 'text-blue-400',
      Action: 'text-red-400',
      Reaction: 'text-yellow-400',
    };
    return colors[type] || 'text-muted-foreground';
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
            <TreePine className="h-7 w-7 text-emerald-400" />
            <h1 className="text-2xl font-bold">Environments</h1>
            <Badge variant="outline">{filtered.length} / {environments.length}</Badge>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowCreateDialog(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" /> Add Environment
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search environments..."
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
              {envTypes.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Environment List */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading environments...</div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {environments.length === 0
                ? 'No environments yet. Click "Seed from Source" to populate.'
                : 'No environments match the current filters.'}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map(env => (
              <Collapsible key={env.id} open={expandedIds.has(env.id)} onOpenChange={() => toggleExpanded(env.id)}>
                <Card className="overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3 px-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="font-mono text-xs">T{env.tier}</Badge>
                          <span className="font-semibold">{env.name}</span>
                          <Badge className={`text-xs ${getTypeColor(env.environment_type)}`}>
                            {env.environment_type}
                          </Badge>
                          {env.difficulty && (
                            <span className="text-xs text-muted-foreground">
                              Difficulty: {env.difficulty}
                            </span>
                          )}
                        </div>
                        <ChevronDown className={`h-4 w-4 transition-transform ${expandedIds.has(env.id) ? 'rotate-180' : ''}`} />
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-4 px-4 space-y-4">
                      {/* Image */}
                      {env.image_url && (
                        <img src={env.image_url} alt={env.name} className="h-32 w-32 object-cover rounded-md border" />
                      )}

                      {/* Impulses */}
                      {env.impulses && env.impulses.length > 0 && (
                        <div>
                          <span className="text-xs font-semibold text-muted-foreground">Impulses: </span>
                          <span className="text-sm">{env.impulses.join(', ')}</span>
                        </div>
                      )}

                      {/* Potential Adversaries */}
                      {env.potential_adversaries && (
                        <div>
                          <span className="text-xs font-semibold text-muted-foreground">Potential Adversaries: </span>
                          <span className="text-sm">{env.potential_adversaries}</span>
                        </div>
                      )}

                      {/* Features */}
                      {env.features && env.features.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold border-b border-border pb-1">Features</h4>
                          {env.features.map((feat: any, i: number) => (
                            <div key={i} className="bg-muted/30 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-sm">{feat.name}</span>
                                {feat.type && (
                                  <Badge variant="outline" className={`text-xs ${getFeatureTypeColor(feat.type)}`}>
                                    {feat.type}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{feat.description}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" variant="outline" onClick={() => setEditEnvironment(env)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => {
                          const { id, created_at, updated_at, ...rest } = env;
                          setEditEnvironment({ ...rest, name: `${rest.name} (Copy)`, _isClone: true });
                        }}>
                          <Copy className="h-3 w-3 mr-1" /> Duplicate
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(env)}>
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      {editEnvironment && (
        <EnvironmentDialog
          environment={editEnvironment}
          open={!!editEnvironment}
          onClose={() => setEditEnvironment(null)}
          onSaved={loadEnvironments}
        />
      )}

      {/* Create Dialog */}
      {showCreateDialog && (
        <EnvironmentDialog
          environment={null}
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onSaved={loadEnvironments}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this environment. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) deleteEnvironment(deleteTarget.id);
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

export default EnvironmentsAdmin;
