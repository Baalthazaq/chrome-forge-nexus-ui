import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { useToast } from "@/hooks/use-toast";
import { Tag, Plus, X } from "lucide-react";

interface ReputationTagDialogProps {
  targetProfile: any;
  onUpdate: () => void;
}

export const ReputationTagDialog = ({ targetProfile, onUpdate }: ReputationTagDialogProps) => {
  const [open, setOpen] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { impersonatedUser } = useAdmin();
  const { toast } = useToast();

  const effectiveUser = impersonatedUser || user;

  useEffect(() => {
    if (open && effectiveUser) {
      loadExistingTags();
    }
  }, [open, effectiveUser, targetProfile.user_id]);

  const loadExistingTags = async () => {
    if (!effectiveUser) return;

    try {
      const { data, error } = await supabase
        .from('reputation_tags')
        .select('tag')
        .eq('target_user_id', targetProfile.user_id)
        .eq('tagger_user_id', effectiveUser.user_id || effectiveUser.id);

      if (error) throw error;
      setExistingTags(data?.map(t => t.tag) || []);
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  };

  const handleAddTag = async () => {
    if (!newTag.trim() || !effectiveUser) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('reputation_tags')
        .insert({
          target_user_id: targetProfile.user_id,
          tagger_user_id: effectiveUser.user_id || effectiveUser.id,
          tag: newTag.trim()
        });

      if (error) throw error;

      // Track activity
      await supabase.from('user_activity').insert({
        user_id: effectiveUser.user_id || effectiveUser.id,
        activity_type: 'reputation_tag',
        activity_description: `Added reputation tag "${newTag}" to ${targetProfile.character_name}`,
        metadata: { target_user_id: targetProfile.user_id, tag: newTag }
      });

      setNewTag('');
      loadExistingTags();
      onUpdate();
      toast({ title: 'Reputation tag added' });
    } catch (error: any) {
      toast({ 
        title: 'Failed to add tag', 
        description: error.message,
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTag = async (tag: string) => {
    if (!effectiveUser) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('reputation_tags')
        .delete()
        .eq('target_user_id', targetProfile.user_id)
        .eq('tagger_user_id', effectiveUser.user_id || effectiveUser.id)
        .eq('tag', tag);

      if (error) throw error;

      loadExistingTags();
      onUpdate();
      toast({ title: 'Reputation tag removed' });
    } catch (error: any) {
      toast({ 
        title: 'Failed to remove tag', 
        description: error.message,
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white">
          <Tag className="w-3 h-3 mr-1" />
          Rep Tags
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white">
            Reputation Tags for {targetProfile.character_name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Add reputation tag..."
              className="flex-1 bg-gray-800 border-gray-600 text-white"
              onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
            />
            <Button 
              onClick={handleAddTag}
              disabled={!newTag.trim() || loading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-300">Your tags for this user:</h4>
            <div className="flex flex-wrap gap-2">
              {existingTags.length > 0 ? existingTags.map((tag, index) => (
                <Badge 
                  key={index} 
                  variant="outline" 
                  className="border-purple-500 text-purple-400 relative group"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )) : (
                <p className="text-gray-400 text-sm">No reputation tags added yet</p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};