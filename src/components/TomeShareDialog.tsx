import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Share2, Copy, Users, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  user_id: string;
  character_name: string;
}

interface TomeEntry {
  id: string;
  title: string;
  content: string;
  tags: string[];
  pages: number;
}

interface TomeShareDialogProps {
  tomeEntry: TomeEntry;
  children: React.ReactNode;
}

type Mode = 'choose' | 'copy' | 'collaborate';

export const TomeShareDialog = ({ tomeEntry, children }: TomeShareDialogProps) => {
  const { user } = useAuth();
  const { impersonatedUser } = useAdmin();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [shareMessage, setShareMessage] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [mode, setMode] = useState<Mode>('choose');

  const displayUser: any = impersonatedUser || user;
  const senderId = displayUser?.user_id || displayUser?.id;

  useEffect(() => {
    if (isOpen && mode !== 'choose') loadProfiles();
  }, [isOpen, mode, displayUser]);

  useEffect(() => {
    if (!isOpen) {
      // reset on close
      setTimeout(() => {
        setMode('choose');
        setSelectedRecipients([]);
        setShareMessage('');
      }, 200);
    }
  }, [isOpen]);

  const loadProfiles = async () => {
    if (!senderId) return;
    try {
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('contact_user_id')
        .eq('user_id', senderId)
        .eq('is_active', true);
      if (contactsError) throw contactsError;
      if (!contactsData?.length) {
        setProfiles([]);
        return;
      }
      const ids = contactsData.map((c) => c.contact_user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, character_name')
        .in('user_id', ids);
      if (profilesError) throw profilesError;
      setProfiles(profilesData || []);
    } catch (err) {
      console.error('Error loading profiles:', err);
      toast({ title: 'Error', description: 'Failed to load contacts', variant: 'destructive' });
    }
  };

  const toggleRecipient = (uid: string) => {
    setSelectedRecipients((prev) =>
      prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]
    );
  };

  const ensureStone = async (recipientId: string) => {
    const { data: existing } = await supabase
      .from('stones')
      .select('id')
      .or(
        `and(participant_one_id.eq.${senderId},participant_two_id.eq.${recipientId}),and(participant_one_id.eq.${recipientId},participant_two_id.eq.${senderId})`
      )
      .maybeSingle();
    if (existing?.id) return existing.id as string;
    const { data: newStone, error } = await supabase
      .from('stones')
      .insert({ participant_one_id: senderId, participant_two_id: recipientId })
      .select('id')
      .single();
    if (error) throw error;
    return newStone.id as string;
  };

  const sendNotification = async (recipientId: string, label: string) => {
    try {
      const stoneId = await ensureStone(recipientId);
      await supabase.from('casts').insert({
        stone_id: stoneId,
        sender_id: senderId,
        message: `📚 ${label}: "${tomeEntry.title}" — check your ToMe section.`,
      });
    } catch (err) {
      console.error('Notification error (non-fatal):', err);
    }
  };

  const submit = async () => {
    if (!senderId || selectedRecipients.length === 0) return;
    setIsSharing(true);
    try {
      const senderName = displayUser?.character_name || 'Someone';
      const defaultMsg =
        mode === 'collaborate'
          ? `${senderName} invited you to collaborate on "${tomeEntry.title}".`
          : `${senderName} shared a copy of "${tomeEntry.title}" with you.`;

      const rows = selectedRecipients.map((rid) => ({
        tome_entry_id: tomeEntry.id,
        sender_id: senderId,
        recipient_id: rid,
        share_type: mode,
        message: shareMessage.trim() || defaultMsg,
      }));

      const { error } = await supabase.from('tome_shares').insert(rows);
      if (error) throw error;

      // fire-and-forget notifications
      const label = mode === 'collaborate' ? 'Collab Invite' : 'ToMe Copy';
      await Promise.all(selectedRecipients.map((rid) => sendNotification(rid, label)));

      toast({
        title: 'Sent',
        description:
          mode === 'collaborate'
            ? `Collaboration invite sent to ${selectedRecipients.length} recipient(s).`
            : `Copy sent to ${selectedRecipients.length} recipient(s).`,
      });
      setIsOpen(false);
    } catch (err) {
      console.error('Share error:', err);
      toast({ title: 'Error', description: 'Failed to share ToMe entry', variant: 'destructive' });
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode !== 'choose' && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMode('choose')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <Share2 className="h-5 w-5" />
            Share "{tomeEntry.title}"
          </DialogTitle>
        </DialogHeader>

        {mode === 'choose' && (
          <div className="grid gap-3 pt-2">
            <button
              onClick={() => setMode('copy')}
              className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 text-left transition hover:border-primary hover:bg-accent"
            >
              <Copy className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <div className="font-semibold">Send a copy</div>
                <div className="text-sm text-muted-foreground">
                  Recipient gets their own independent copy. Edits don't sync back.
                </div>
              </div>
            </button>
            <button
              onClick={() => setMode('collaborate')}
              className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 text-left transition hover:border-primary hover:bg-accent"
            >
              <Users className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <div className="font-semibold">Invite to collaborate</div>
                <div className="text-sm text-muted-foreground">
                  Recipients join the same entry as editors. All changes are shared and version-tracked.
                </div>
              </div>
            </button>
          </div>
        )}

        {mode !== 'choose' && (
          <div className="space-y-4">
            <div>
              <Label>Recipients</Label>
              {profiles.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No contacts found.</p>
              ) : (
                <ScrollArea className="h-48 rounded-md border border-border p-2">
                  <div className="space-y-1">
                    {profiles.map((p) => (
                      <label
                        key={p.id}
                        className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-accent cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedRecipients.includes(p.user_id)}
                          onCheckedChange={() => toggleRecipient(p.user_id)}
                        />
                        <span className="text-sm">{p.character_name}</span>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>

            <div>
              <Label htmlFor="message">Custom message (optional)</Label>
              <Textarea
                id="message"
                value={shareMessage}
                onChange={(e) => setShareMessage(e.target.value)}
                placeholder="Add a personal message…"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submit} disabled={selectedRecipients.length === 0 || isSharing}>
                {isSharing
                  ? 'Sending…'
                  : mode === 'collaborate'
                  ? `Invite ${selectedRecipients.length || ''}`.trim()
                  : `Send ${selectedRecipients.length || ''} cop${selectedRecipients.length === 1 ? 'y' : 'ies'}`.trim()}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
