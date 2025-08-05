import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";

interface AddContactDialogProps {
  onContactAdded: () => void;
  existingContacts: any[];
}

export const AddContactDialog = ({ onContactAdded, existingContacts }: AddContactDialogProps) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [availableProfiles, setAvailableProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { impersonatedUser } = useAdmin();
  const { toast } = useToast();

  // Use impersonated user if available, otherwise use authenticated user
  const effectiveUser = impersonatedUser || user;

  useEffect(() => {
    if (open) {
      loadAvailableProfiles();
    }
  }, [open, existingContacts, effectiveUser]);

  const loadAvailableProfiles = async () => {
    if (!effectiveUser) return;
    
    try {
      setLoading(true);
      
      // Get all profiles except current effective user
      const { data: profilesData, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('user_id', effectiveUser.user_id || effectiveUser.id);

      if (error) throw error;

      // Get all contacts (both active and inactive) to filter properly
      const { data: allContacts } = await supabase
        .from('contacts')
        .select('contact_user_id, is_active')
        .eq('user_id', effectiveUser.user_id || effectiveUser.id);

      // Filter out profiles that are already active contacts
      const activeContactUserIds = (allContacts || [])
        .filter(contact => contact.is_active)
        .map(contact => contact.contact_user_id);
      
      const available = (profilesData || []).filter(profile => 
        !activeContactUserIds.includes(profile.user_id)
      );

      setAvailableProfiles(available);
    } catch (error) {
      console.error('Error loading available profiles:', error);
      toast({
        title: "Error",
        description: "Failed to load available contacts.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredProfiles = availableProfiles.filter(profile =>
    !searchTerm || 
    profile.character_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    profile.character_class?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddContact = async (profileUserId: string, profileName: string) => {
    if (!effectiveUser) return;
    
    try {
      const effectiveUserId = effectiveUser.user_id || effectiveUser.id;
      
      // Check if contact already exists (including inactive ones)
      const { data: existingContact } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', effectiveUserId)
        .eq('contact_user_id', profileUserId)
        .maybeSingle();

      if (existingContact) {
        // Reactivate existing contact
        const { error } = await supabase
          .from('contacts')
          .update({ is_active: true })
          .eq('id', existingContact.id);
        
        if (error) throw error;
      } else {
        // Create new contact
        const { error } = await supabase
          .from('contacts')
          .insert({
            user_id: effectiveUserId,
            contact_user_id: profileUserId,
            personal_rating: 3,
            is_active: true
          });

        if (error) throw error;
      }

      // Create mutual contact - check if the reverse contact exists
      const { data: existingMutualContact } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', profileUserId)
        .eq('contact_user_id', effectiveUserId)
        .maybeSingle();

      if (existingMutualContact) {
        // Reactivate existing mutual contact
        const { error } = await supabase
          .from('contacts')
          .update({ is_active: true })
          .eq('id', existingMutualContact.id);
        
        if (error) throw error;
      } else {
        // Create new mutual contact
        const { error } = await supabase
          .from('contacts')
          .insert({
            user_id: profileUserId,
            contact_user_id: effectiveUserId,
            personal_rating: 3,
            is_active: true
          });

        if (error) throw error;
      }
      
      toast({
        title: "Contact added",
        description: `${profileName} has been added to your contacts mutually.`,
      });

      onContactAdded();
      loadAvailableProfiles(); // Refresh the list
    } catch (error) {
      console.error('Error adding contact:', error);
      toast({
        title: "Error",
        description: "Failed to add contact.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600">
          <Plus className="w-4 h-4 mr-2" />
          Add Contact
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl text-blue-400">
            Add New Contact
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Search */}
          <div className="flex items-center space-x-2">
            <Search className="w-5 h-5 text-blue-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search for characters to add..."
              className="bg-gray-800 border-gray-600 text-white"
            />
          </div>

          {/* Available Contacts List */}
          <div className="flex-1 overflow-y-auto space-y-3">
            {loading ? (
              <div className="text-center py-8 text-gray-400">
                Loading available characters...
              </div>
            ) : filteredProfiles.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                {searchTerm ? 'No characters found matching your search.' : 'No new characters available to add.'}
              </div>
            ) : (
              filteredProfiles.map((profile) => (
                <div
                  key={profile.id}
                  className="flex items-center justify-between p-4 bg-gray-800/50 border border-gray-700 rounded-lg hover:border-blue-500/30 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <img
                      src={profile.avatar_url || `https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face`}
                      alt={profile.character_name || 'Character'}
                      className="w-12 h-12 rounded-full object-cover border-2 border-gray-600"
                    />
                    <div>
                      <h3 className="font-semibold text-white">
                        {profile.character_name || 'Unknown Character'}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {profile.character_class || 'Unknown Class'} • Level {profile.level || 1}
                      </p>
                      {profile.bio && (
                        <p className="text-xs text-gray-500 truncate max-w-xs">
                          {profile.bio}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => handleAddContact(profile.user_id, profile.character_name || 'Unknown Character')}
                    size="sm"
                    className="bg-blue-500 hover:bg-blue-600"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};