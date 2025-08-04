import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Share2 } from 'lucide-react';
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

export const TomeShareDialog = ({ tomeEntry, children }: TomeShareDialogProps) => {
  const { user } = useAuth();
  const { impersonatedUser } = useAdmin();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const displayUser = impersonatedUser || user;

  useEffect(() => {
    if (isOpen) {
      loadProfiles();
    }
  }, [isOpen, displayUser]);

  const loadProfiles = async () => {
    if (!displayUser) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('user_id', displayUser.user_id || displayUser.id)
        .neq('bio', 'NPC Account'); // Exclude NPCs based on bio

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error loading profiles:', error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    }
  };

  const shareTome = async () => {
    if (!selectedRecipient || !displayUser) return;

    setIsSharing(true);
    try {
      // Create tome share entry
      const { error: shareError } = await supabase
        .from('tome_shares')
        .insert({
          tome_entry_id: tomeEntry.id,
          sender_id: displayUser.user_id || displayUser.id,
          recipient_id: selectedRecipient,
          message: shareMessage.trim() || `${displayUser.character_name || 'Someone'} has shared a ToMe entry with you: "${tomeEntry.title}"`
        });

      if (shareError) throw shareError;

      // Create a notification message in Sending
      const { data: existingStone } = await supabase
        .from('stones')
        .select('id')
        .or(`and(participant_one_id.eq.${displayUser.user_id || displayUser.id},participant_two_id.eq.${selectedRecipient}),and(participant_one_id.eq.${selectedRecipient},participant_two_id.eq.${displayUser.user_id || displayUser.id})`)
        .single();

      let stoneId = existingStone?.id;

      // Create stone if it doesn't exist
      if (!stoneId) {
        const { data: newStone, error: stoneError } = await supabase
          .from('stones')
          .insert({
            participant_one_id: displayUser.user_id || displayUser.id,
            participant_two_id: selectedRecipient
          })
          .select('id')
          .single();

        if (stoneError) throw stoneError;
        stoneId = newStone.id;
      }

      // Send notification message
      const notificationMessage = `📚 ToMe Share: "${tomeEntry.title}" has been shared with you! Check your ToMe section to accept or decline.`;
      
      const { error: castError } = await supabase
        .from('casts')
        .insert({
          stone_id: stoneId,
          sender_id: displayUser.user_id || displayUser.id,
          message: notificationMessage
        });

      if (castError) throw castError;

      toast({
        title: "Success",
        description: "ToMe entry shared successfully!",
      });

      setIsOpen(false);
      setSelectedRecipient("");
      setShareMessage("");
    } catch (error) {
      console.error('Error sharing tome:', error);
      toast({
        title: "Error", 
        description: "Failed to share ToMe entry",
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share "{tomeEntry.title}"
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="recipient">Share with</Label>
            <Select value={selectedRecipient} onValueChange={setSelectedRecipient}>
              <SelectTrigger>
                <SelectValue placeholder="Select a user..." />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.user_id}>
                    {profile.character_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="message">Custom message (optional)</Label>
            <Textarea
              id="message"
              value={shareMessage}
              onChange={(e) => setShareMessage(e.target.value)}
              placeholder="Add a personal message..."
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={shareTome}
              disabled={!selectedRecipient || isSharing}
            >
              {isSharing ? 'Sharing...' : 'Share'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};