import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Star, Save, FileText, X, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";

interface ContactNotesDialogProps {
  contact: any;
  contactId?: string;
  relationship?: string;
  onUpdate: () => void;
}

export const ContactNotesDialog = ({ contact, contactId, relationship: initialRelationship, onUpdate }: ContactNotesDialogProps) => {
  const [notes, setNotes] = useState("");
  const [rating, setRating] = useState(3);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [open, setOpen] = useState(false);
  const [relationship, setRelationship] = useState(initialRelationship || "");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { impersonatedUser } = useAdmin();
  
  // Use impersonated user if available, otherwise use authenticated user
  const effectiveUser = impersonatedUser || user;

  useEffect(() => {
    if (open && contactId) {
      loadContactData();
    }
  }, [open, contactId]);

  const loadContactData = async () => {
    if (!contactId) return;
    
    try {
      // Load contact details
      const { data: contactData } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .single();

      if (contactData) {
        setNotes(contactData.notes || "");
        setRating(contactData.personal_rating || 3);
        setRelationship(contactData.relationship || "");
      }

      // Load tags
      const { data: tagsData } = await supabase
        .from('contact_tags')
        .select('tag')
        .eq('contact_id', contactId);

      if (tagsData) {
        setTags(tagsData.map(t => t.tag));
      }
    } catch (error) {
      console.error('Error loading contact data:', error);
    }
  };

  const handleSave = async () => {
    if (!contactId) return;
    
    setLoading(true);
    try {
      // Update contact notes and rating
      await supabase
        .from('contacts')
        .update({
          notes,
          personal_rating: rating,
          relationship: relationship || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', contactId);

      // Delete existing tags and insert new ones
      await supabase
        .from('contact_tags')
        .delete()
        .eq('contact_id', contactId);

      if (tags.length > 0) {
        const tagInserts = tags.map(tag => ({
          contact_id: contactId,
          tag
        }));
        
        await supabase
          .from('contact_tags')
          .insert(tagInserts);
      }

      toast({
        title: "Notes updated",
        description: "Contact notes and rating have been saved.",
      });

      onUpdate();
      setOpen(false);
    } catch (error) {
      console.error('Error saving contact data:', error);
      toast({
        title: "Error",
        description: "Failed to save contact notes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveAsToMe = async () => {
    if (!notes.trim()) {
      toast({
        title: "No notes to save",
        description: "Please add some notes before saving as ToMe.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (!effectiveUser) throw new Error('Not authenticated');

      await supabase
        .from('tome_entries')
        .insert({
          user_id: effectiveUser.user_id || effectiveUser.id,
          title: `Notes on ${contact.name}`,
          content: notes,
          tags: [`Contact: ${contact.name}`, ...tags]
        });

      toast({
        title: "Saved to ToMe",
        description: "Notes have been archived in your ToMe.",
      });
    } catch (error) {
      console.error('Error saving to ToMe:', error);
      toast({
        title: "Error",
        description: "Failed to save notes to ToMe.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white">
          <FileText className="w-3 h-3 mr-1" />
          Notes
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl text-blue-400">
            Notes on {contact.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Trustworthiness Rating */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">
              Trustworthiness
            </label>
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`p-1 ${star <= rating ? 'text-yellow-400' : 'text-gray-600'} hover:text-yellow-300`}
                >
                  <Star className="w-6 h-6 fill-current" />
                </button>
              ))}
            </div>
          </div>

          {/* Relationship */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">
              Relationship
            </label>
            <Input
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              placeholder="e.g. Colleague, Friend, Parent, Teacher..."
              className="bg-gray-800 border-gray-600 text-white"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">
              Personal Tags
            </label>
            <div className="flex space-x-2 mb-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add a tag..."
                className="flex-1 bg-gray-800 border-gray-600 text-white"
                onKeyPress={(e) => e.key === 'Enter' && addTag()}
              />
              <Button onClick={addTag} size="sm" variant="outline">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {tags.map((tag, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="border-blue-600 text-blue-400 cursor-pointer hover:bg-blue-600 hover:text-white"
                  onClick={() => removeTag(tag)}
                >
                  {tag}
                  <X className="w-3 h-3 ml-1" />
                </Badge>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">
              Notes
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add your personal notes about this contact..."
              className="min-h-32 bg-gray-800 border-gray-600 text-white"
              rows={6}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4">
            <Button
              onClick={saveAsToMe}
              variant="outline"
              disabled={loading || !notes.trim()}
              className="border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white"
            >
              <FileText className="w-4 h-4 mr-2" />
              Save as ToMe
            </Button>
            
            <Button
              onClick={handleSave}
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Notes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};