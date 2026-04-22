import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, X, LogOut, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { useToast } from '@/hooks/use-toast';

interface Collaborator {
  id: string;
  user_id: string;
  role: 'owner' | 'editor';
  character_name: string;
}

interface Props {
  tomeEntryId: string;
  tomeTitle: string;
  children: React.ReactNode;
  onChanged?: () => void;
}

export const TomeAccessDialog = ({ tomeEntryId, tomeTitle, children, onChanged }: Props) => {
  const { user } = useAuth();
  const { impersonatedUser } = useAdmin();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(false);

  const me: any = impersonatedUser || user;
  const myId = me?.user_id || me?.id;

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tome_collaborators')
        .select('id, user_id, role')
        .eq('tome_entry_id', tomeEntryId);
      if (error) throw error;
      const ids = (data || []).map((r) => r.user_id);
      let names: Record<string, string> = {};
      if (ids.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('user_id, character_name')
          .in('user_id', ids);
        names = Object.fromEntries((profs || []).map((p) => [p.user_id, p.character_name || 'Unknown']));
      }
      setRows(
        (data || []).map((r) => ({
          id: r.id,
          user_id: r.user_id,
          role: r.role as 'owner' | 'editor',
          character_name: names[r.user_id] || 'Unknown',
        }))
      );
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to load collaborators', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load();
  }, [open, tomeEntryId]);

  const isOwner = rows.some((r) => r.user_id === myId && r.role === 'owner');

  const removeRow = async (row: Collaborator) => {
    try {
      const { error } = await supabase.from('tome_collaborators').delete().eq('id', row.id);
      if (error) throw error;
      toast({ title: 'Removed', description: `${row.character_name} no longer has access.` });
      await load();
      onChanged?.();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to remove', variant: 'destructive' });
    }
  };

  const leave = async () => {
    const myRow = rows.find((r) => r.user_id === myId);
    if (!myRow) return;
    if (myRow.role === 'owner') {
      toast({ title: 'Cannot leave', description: 'Owners must delete the entry instead.', variant: 'destructive' });
      return;
    }
    await removeRow(myRow);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Access — {tomeTitle}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!loading && rows.length === 0 && (
            <p className="text-sm text-muted-foreground">No collaborators.</p>
          )}
          {rows.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-md border border-border bg-card p-2"
            >
              <div className="flex items-center gap-2">
                {r.role === 'owner' ? (
                  <Crown className="h-4 w-4 text-yellow-500" />
                ) : (
                  <Users className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-sm">{r.character_name}</span>
                {r.user_id === myId && (
                  <Badge variant="outline" className="text-xs">you</Badge>
                )}
                <Badge variant="secondary" className="text-xs capitalize">{r.role}</Badge>
              </div>
              {isOwner && r.role !== 'owner' && (
                <Button variant="ghost" size="icon" onClick={() => removeRow(r)}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}

          {!isOwner && rows.some((r) => r.user_id === myId) && (
            <div className="pt-2">
              <Button variant="outline" className="w-full" onClick={leave}>
                <LogOut className="h-4 w-4 mr-2" />
                Leave this ToMe
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
