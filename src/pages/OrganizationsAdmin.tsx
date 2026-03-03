import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Shield, ArrowLeft, Plus, Pencil, Trash2, Search, Building2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Organization {
  id: string;
  name: string;
  quick_description: string | null;
  notes: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

const emptyOrg = { name: '', quick_description: '', notes: '', is_public: true };

const OrganizationsAdmin = () => {
  const navigate = useNavigate();
  const { isAdmin, isLoading: adminLoading } = useAdmin();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'public' | 'private'>('all');
  const [editOrg, setEditOrg] = useState<typeof emptyOrg & { id?: string }>(emptyOrg);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seedingLoading, setSeedingLoading] = useState(false);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/admin');
      return;
    }
    if (isAdmin) loadOrgs();
  }, [isAdmin, adminLoading]);

  const loadOrgs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .order('name');
    if (error) {
      toast.error('Failed to load organizations');
    } else {
      setOrgs(data || []);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!editOrg.name.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    if (editOrg.id) {
      const { error } = await supabase
        .from('organizations')
        .update({
          name: editOrg.name,
          quick_description: editOrg.quick_description || null,
          notes: editOrg.notes || null,
          is_public: editOrg.is_public,
        })
        .eq('id', editOrg.id);
      if (error) toast.error(error.message);
      else toast.success('Organization updated');
    } else {
      const { error } = await supabase
        .from('organizations')
        .insert({
          name: editOrg.name,
          quick_description: editOrg.quick_description || null,
          notes: editOrg.notes || null,
          is_public: editOrg.is_public,
        });
      if (error) toast.error(error.message);
      else toast.success('Organization created');
    }
    setSaving(false);
    setDialogOpen(false);
    loadOrgs();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    const { error } = await supabase.from('organizations').delete().eq('id', id);
    if (error) toast.error(error.message);
    else {
      toast.success('Deleted');
      loadOrgs();
    }
  };

  const handleSeed = async () => {
    setSeedingLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('seed-organizations');
      if (error) throw error;
      toast.success(data?.message || 'Seeded successfully');
      loadOrgs();
    } catch (e: any) {
      toast.error(e.message || 'Seed failed');
    }
    setSeedingLoading(false);
  };

  const openEdit = (org: Organization) => {
    setEditOrg({
      id: org.id,
      name: org.name,
      quick_description: org.quick_description || '',
      notes: org.notes || '',
      is_public: org.is_public,
    });
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditOrg(emptyOrg);
    setDialogOpen(true);
  };

  const filtered = orgs.filter(o => {
    const matchesSearch = !searchTerm ||
      o.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.quick_description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' ||
      (filter === 'public' && o.is_public) ||
      (filter === 'private' && !o.is_public);
    return matchesSearch && matchesFilter;
  });

  if (adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Shield className="h-12 w-12 text-primary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Organizations</h1>
            <Badge variant="secondary">{orgs.length}</Badge>
          </div>
          <div className="flex gap-2">
            {orgs.length === 0 && (
              <Button onClick={handleSeed} disabled={seedingLoading} variant="outline">
                {seedingLoading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Seed Data
              </Button>
            )}
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" />
              Add Organization
            </Button>
            <Button onClick={() => navigate('/admin')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 items-end">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search organizations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-1">
            {(['all', 'public', 'private'] as const).map(f => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? 'default' : 'outline'}
                onClick={() => setFilter(f)}
                className="capitalize"
              >
                {f}
              </Button>
            ))}
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {orgs.length === 0 ? 'No organizations yet. Seed or add some!' : 'No results match your search.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Public</th>
                      <th className="text-left p-3 font-medium">Name</th>
                      <th className="text-left p-3 font-medium">Description</th>
                      <th className="text-left p-3 font-medium">Notes</th>
                      <th className="text-right p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(org => (
                      <tr key={org.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <Badge variant={org.is_public ? 'default' : 'secondary'} className="text-xs">
                            {org.is_public ? 'Y' : 'N'}
                          </Badge>
                        </td>
                        <td className="p-3 font-medium whitespace-nowrap">{org.name}</td>
                        <td className="p-3 text-muted-foreground max-w-md truncate">{org.quick_description}</td>
                        <td className="p-3 text-muted-foreground max-w-xs truncate">{org.notes || '—'}</td>
                        <td className="p-3 text-right whitespace-nowrap">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(org)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(org.id, org.name)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit/Create Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editOrg.id ? 'Edit Organization' : 'New Organization'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={editOrg.name} onChange={e => setEditOrg(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Quick Description</Label>
                <Textarea value={editOrg.quick_description} onChange={e => setEditOrg(p => ({ ...p, quick_description: e.target.value }))} rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={editOrg.notes} onChange={e => setEditOrg(p => ({ ...p, notes: e.target.value }))} rows={3} />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={editOrg.is_public} onCheckedChange={v => setEditOrg(p => ({ ...p, is_public: v }))} />
                <Label>Public</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  {editOrg.id ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default OrganizationsAdmin;
