import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Share2, Check, X, BookOpen } from 'lucide-react';
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

  const displayUser = impersonatedUser || user;

  useEffect(() => {
    if (displayUser) {
      loadPendingShares();
    }
  }, [displayUser]);

  const loadPendingShares = async () => {
    if (!displayUser) return;

    try {
      const { data, error } = await supabase
        .from('tome_shares')
        .select(`
          *,
          tome_entries (title, content, tags, pages)
        `)
        .eq('recipient_id', displayUser.user_id || displayUser.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch sender profiles separately
      const sharesWithProfiles = await Promise.all(
        (data || []).map(async (share) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('character_name')
            .eq('user_id', share.sender_id)
            .single();

          return {
            ...share,
            sender_profile: profile || { character_name: 'Unknown' }
          };
        })
      );

      setPendingShares(sharesWithProfiles);
    } catch (error) {
      console.error('Error loading pending shares:', error);
    } finally {
      setLoading(false);
    }
  };

  const acceptShare = async (share: TomeShare) => {
    try {
      console.log('Accepting share:', share.id);
      
      // Copy the tome entry to the recipient's collection
      const { error: tomeError } = await supabase
        .from('tome_entries')
        .insert({
          user_id: displayUser?.user_id || displayUser?.id,
          title: `[Shared] ${share.tome_entries.title}`,
          content: share.tome_entries.content,
          tags: share.tome_entries.tags,
          pages: share.tome_entries.pages
        });

      if (tomeError) throw tomeError;

      // Update share status
      const { error: shareError } = await supabase
        .from('tome_shares')
        .update({ status: 'accepted' })
        .eq('id', share.id);

      if (shareError) throw shareError;
      console.log('Share status updated to accepted');

      // Remove from pending shares immediately
      setPendingShares(prev => {
        const filtered = prev.filter(s => s.id !== share.id);
        console.log('Pending shares after filtering:', filtered.length);
        return filtered;
      });
      setIsPreviewOpen(false);
      
      // Trigger parent refresh if callback provided
      if (onTomeAdded) {
        onTomeAdded();
      }
      
      toast({
        title: "Success",
        description: "ToMe entry added to your collection!",
      });
    } catch (error) {
      console.error('Error accepting share:', error);
      toast({
        title: "Error",
        description: "Failed to accept ToMe share",
        variant: "destructive",
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

      // Remove from pending shares immediately
      setPendingShares(prev => prev.filter(s => s.id !== shareId));
      setIsPreviewOpen(false);
      
      // Reload pending shares to ensure UI is in sync
      await loadPendingShares();
      
      toast({
        title: "Declined",
        description: "ToMe share declined",
      });
    } catch (error) {
      console.error('Error rejecting share:', error);
      toast({
        title: "Error",
        description: "Failed to decline share",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const parseContent = (content: string) => {
    try {
      const chapters = JSON.parse(content);
      return chapters.map((chapter: any) => chapter.content).join('\n\n');
    } catch {
      return content;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Shared ToMe Entries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (pendingShares.length === 0) {
    return null; // Don't show the card if there are no pending shares
  }

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
                    <h4 className="font-semibold">{share.tome_entries.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      Shared by {share.sender_profile.character_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(share.created_at)}
                    </p>
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => acceptShare(share)}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Accept
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => rejectShare(share.id)}
                    >
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

      {/* Preview Dialog */}
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
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Shared by {selectedShare.sender_profile.character_name}</span>
                <Badge variant="outline">{selectedShare.tome_entries.pages} pages</Badge>
                {selectedShare.tome_entries.tags.length > 0 && (
                  <div className="flex gap-1">
                    {selectedShare.tome_entries.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
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
                <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
                  Close
                </Button>
                <Button
                  variant="outline"
                  onClick={() => rejectShare(selectedShare.id)}
                >
                  <X className="h-4 w-4 mr-1" />
                  Decline
                </Button>
                <Button onClick={() => acceptShare(selectedShare)}>
                  <Check className="h-4 w-4 mr-1" />
                  Accept & Add to Collection
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};