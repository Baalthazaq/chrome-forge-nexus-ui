import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Share2, Check, X, BookOpen, Users, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { useToast } from '@/hooks/use-toast';

interface TomeShare {
  id: string;
  tome_entry_id: string;
  sender_id: string;
  recipient_id: string;
  message: string;
  status: string;
  share_type: 'copy' | 'collaborate';
  created_at: string;
  tome_entries: {
    title: string;
    content: string;
    tags: string[];
    pages: number;
  };
  sender_profile: {
    character_name: string;
  };
}

interface TomeShareNotificationsProps {
  onTomeAdded?: () => void;
}

export const TomeShareNotifications = ({ onTomeAdded }: TomeShareNotificationsProps) => {
  const { user } = useAuth();
  const { impersonatedUser } = useAdmin();
  const { toast } = useToast();
  const [pendingShares, setPendingShares] = useState<TomeShare[]>([]);
  const [selectedShare, setSelectedShare] = useState<TomeShare | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const displayUser: any = impersonatedUser || user;
  const myId = displayUser?.user_id || displayUser?.id;

  useEffect(() => {
    if (displayUser) loadPendingShares();
  }, [displayUser]);

  const loadPendingShares = async () => {
    if (!myId) return;
    try {
      const { data, error } = await supabase
        .from('tome_shares')
        .select(`*, tome_entries (title, content, tags, pages)`)
        .eq('recipient_id', myId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const validShares = (data || []).filter((s: any) => s.tome_entries != null);

      const sharesWithProfiles = await Promise.all(
        validShares.map(async (share: any) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('character_name')
            .eq('user_id', share.sender_id)
            .single();
          return { ...share, sender_profile: profile || { character_name: 'Unknown' } };
        })
      );
      setPendingShares(sharesWithProfiles as TomeShare[]);
    } catch (error) {
      console.error('Error loading pending shares:', error);
    } finally {
      setLoading(false);
    }
  };

  const acceptShare = async (share: TomeShare) => {
    try {
      if (share.share_type === 'collaborate') {
        // Join the existing entry as an editor
        const { error: collabError } = await supabase.from('tome_collaborators').insert({
          tome_entry_id: share.tome_entry_id,
          user_id: myId,
          role: 'editor',
          added_by: share.sender_id,
        });
        // Ignore unique-violation if already a collaborator
        if (collabError && !`${collabError.message}`.toLowerCase().includes('duplicate')) {
          throw collabError;
        }
      } else {
        // Legacy copy: create an independent entry
        const { error: tomeError } = await supabase.from('tome_entries').insert({
          user_id: myId,
          title: `[Shared] ${share.tome_entries.title}`,
          content: share.tome_entries.content,
          tags: share.tome_entries.tags,
          pages: share.tome_entries.pages,
        });
        if (tomeError) throw tomeError;
      }

      const { error: shareError } = await supabase
        .from('tome_shares')
        .update({ status: 'accepted' })
        .eq('id', share.id);
      if (shareError) throw shareError;

      setPendingShares((prev) => prev.filter((s) => s.id !== share.id));
      setIsPreviewOpen(false);
      onTomeAdded?.();

      toast({
        title: 'Accepted',
        description:
          share.share_type === 'collaborate'
            ? 'You are now a collaborator on this ToMe.'
            : 'Copy added to your ToMe.',
      });
    } catch (error: any) {
      console.error('Error accepting share:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to accept ToMe share',
        variant: 'destructive',
      });
    }
  };

  const rejectShare = async (shareId: string) => {
    try {
      const { error } = await supabase
        .from('tome_shares')
        .update({ status: 'rejected' })
        .eq('id', shareId);
      if (error) throw error;
      setPendingShares((prev) => prev.filter((s) => s.id !== shareId));
      setIsPreviewOpen(false);
      toast({ title: 'Declined', description: 'ToMe share declined' });
    } catch (error) {
      console.error('Error rejecting share:', error);
      toast({ title: 'Error', description: 'Failed to decline share', variant: 'destructive' });
    }
  };

  const formatDate = (s: string) => {
    const d = new Date(s);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const parseContent = (content: string) => {
    try {
      const chapters = JSON.parse(content);
      return chapters.map((c: any) => c.content).join('\n\n');
    } catch {
      return content;
    }
  };

  if (loading || pendingShares.length === 0) return null;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Shared ToMe Entries
            <Badge variant="secondary">{pendingShares.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pendingShares.map((share) => (
              <div key={share.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{share.tome_entries.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        {share.share_type === 'collaborate' ? (
                          <><Users className="h-3 w-3 mr-1" />Collab</>
                        ) : (
                          <><Copy className="h-3 w-3 mr-1" />Copy</>
                        )}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Shared by {share.sender_profile.character_name}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(share.created_at)}</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedShare(share);
                        setIsPreviewOpen(true);
                      }}
                    >
                      <BookOpen className="h-4 w-4 mr-1" />
                      Preview
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => acceptShare(share)}>
                      <Check className="h-4 w-4 mr-1" />
                      Accept
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => rejectShare(share.id)}>
                      <X className="h-4 w-4 mr-1" />
                      Decline
                    </Button>
                  </div>
                </div>
                {share.message && (
                  <div className="bg-muted/50 rounded p-2 mt-2">
                    <p className="text-sm">{share.message}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Preview: {selectedShare?.tome_entries.title}
            </DialogTitle>
          </DialogHeader>
          {selectedShare && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                <span>Shared by {selectedShare.sender_profile.character_name}</span>
                <Badge variant="outline">{selectedShare.tome_entries.pages} pages</Badge>
                <Badge variant="outline">
                  {selectedShare.share_type === 'collaborate' ? 'Collaboration invite' : 'Copy'}
                </Badge>
                {selectedShare.tome_entries.tags?.length > 0 && (
                  <div className="flex gap-1">
                    {selectedShare.tome_entries.tags.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                )}
              </div>
              <ScrollArea className="h-[400px] border rounded-lg p-4">
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap">{parseContent(selectedShare.tome_entries.content)}</p>
                </div>
              </ScrollArea>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>Close</Button>
                <Button variant="outline" onClick={() => rejectShare(selectedShare.id)}>
                  <X className="h-4 w-4 mr-1" />
                  Decline
                </Button>
                <Button onClick={() => acceptShare(selectedShare)}>
                  <Check className="h-4 w-4 mr-1" />
                  {selectedShare.share_type === 'collaborate' ? 'Accept Invite' : 'Accept & Add Copy'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
