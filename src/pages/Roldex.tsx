import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Search, Star, Filter, Zap, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ContactNotesDialog } from "@/components/ContactNotesDialog";
import { AddContactDialog } from "@/components/AddContactDialog";

const Roldex = () => {
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [profiles, setProfiles] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Load all profiles (excluding current user)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .neq('user_id', user.id);

      if (profilesError) throw profilesError;

      // Load user's active contacts with their personal data
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select(`
          *,
          contact_tags (tag)
        `)
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (contactsError) throw contactsError;

      setProfiles(profilesData || []);
      setContacts(contactsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getContactData = (profileUserId: string) => {
    return contacts.find(contact => contact.contact_user_id === profileUserId);
  };

  const getContactTags = (profileUserId: string) => {
    const contactData = getContactData(profileUserId);
    return contactData?.contact_tags?.map((tag: any) => tag.tag) || [];
  };

  const getPersonalRating = (profileUserId: string) => {
    const contactData = getContactData(profileUserId);
    return contactData?.personal_rating || 3;
  };

  const getStatusColor = (status?: string) => {
    // For now, randomize status since we don't have real-time status
    const statuses = ['online', 'busy', 'away', 'offline'];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    switch (randomStatus) {
      case "online": return "bg-green-400";
      case "busy": return "bg-red-400";
      case "away": return "bg-yellow-400";
      case "offline": return "bg-gray-400";
      default: return "bg-gray-400";
    }
  };

  const getTrustColor = (rating: number) => {
    if (rating >= 5) return "text-green-400 border-green-400";
    if (rating >= 4) return "text-blue-400 border-blue-400";
    if (rating >= 3) return "text-purple-400 border-purple-400";
    if (rating >= 2) return "text-orange-400 border-orange-400";
    return "text-gray-400 border-gray-400";
  };

  const getTrustLevel = (rating: number) => {
    if (rating >= 5) return "Trusted";
    if (rating >= 4) return "Reliable";
    if (rating >= 3) return "Neutral";
    if (rating >= 2) return "Questionable";
    return "Untrusted";
  };

  // Only show profiles that are in the user's contacts
  const contactedProfiles = profiles.filter(profile => {
    return contacts.some(contact => contact.contact_user_id === profile.user_id);
  });

  const filteredProfiles = contactedProfiles.filter(profile => {
    const matchesSearch = !searchTerm || 
      profile.character_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.character_class?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (activeFilter === "all") return true;
    
    const rating = getPersonalRating(profile.user_id);
    const trustLevel = getTrustLevel(rating).toLowerCase();
    
    return trustLevel.includes(activeFilter);
  });

  const handleAddContact = async (profileUserId: string) => {
    if (!user) return;
    
    try {
      // Check if contact already exists (including inactive ones)
      const { data: existingContact } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user.id)
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
            user_id: user.id,
            contact_user_id: profileUserId,
            personal_rating: 3,
            is_active: true
          });

        if (error) throw error;
      }
      
      // Reload data
      loadData();
    } catch (error) {
      console.error('Error adding contact:', error);
    }
  };

  const handleRemoveContact = async (contactId: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('contacts')
        .update({ is_active: false })
        .eq('id', contactId)
        .eq('user_id', user.id);

      if (error) throw error;
      
      // Reload data
      loadData();
    } catch (error) {
      console.error('Error removing contact:', error);
    }
  };

  const updateContact = () => {
    loadData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading contacts...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-black to-indigo-900/20"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(59,130,246,0.1)_0%,transparent_50%)]"></div>
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/">
            <Button variant="ghost" className="text-cyan-400 hover:text-cyan-300">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to OS
            </Button>
          </Link>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Rol'dex
          </h1>
          <AddContactDialog 
            onContactAdded={loadData}
            existingContacts={contacts}
          />
        </div>

        {/* Search and Filters */}
        <Card className="p-4 bg-gray-900/50 border-blue-500/30 mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Search className="w-5 h-5 text-blue-400" />
            <input 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search contacts by name or class..."
              className="flex-1 bg-transparent text-white placeholder-gray-400 outline-none"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <div className="flex space-x-2 flex-wrap">
              {["all", "trusted", "reliable", "neutral", "questionable", "untrusted"].map((filter) => (
                <Button
                  key={filter}
                  variant={activeFilter === filter ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveFilter(filter)}
                  className={activeFilter === filter 
                    ? "bg-blue-500 text-white" 
                    : "border-gray-600 text-gray-400 hover:text-white hover:border-blue-400"
                  }
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        {/* Profiles Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredProfiles.map((profile) => {
            const contactData = getContactData(profile.user_id);
            const isContact = !!contactData;
            const personalRating = getPersonalRating(profile.user_id);
            const trustLevel = getTrustLevel(personalRating);
            const tags = getContactTags(profile.user_id);
            
            return (
              <Card key={profile.id} className="p-6 bg-gray-900/30 border-gray-700/50 hover:border-blue-500/30 transition-all duration-300">
                <div className="flex items-start space-x-4">
                  {/* Avatar */}
                  <div className="relative">
                    <img 
                      src={profile.avatar_url || `https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face`}
                      alt={profile.character_name || 'Character'}
                      className="w-16 h-16 rounded-full object-cover border-2 border-gray-600"
                    />
                    <div className={`absolute -bottom-1 -right-1 w-5 h-5 ${getStatusColor()} rounded-full border-2 border-gray-900`}></div>
                  </div>

                  {/* Contact Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between space-x-2 mb-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-semibold text-white truncate">
                          {profile.character_name || 'Unknown Character'}
                        </h3>
                        {isContact && (
                          <Badge variant="outline" className={getTrustColor(personalRating)}>
                            {trustLevel}
                          </Badge>
                        )}
                      </div>
                      {/* Delete button in top right */}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleRemoveContact(contactData.id)}
                        className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white p-1 h-8 w-8"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    
                    <div className="text-gray-300 text-sm mb-2 space-y-1">
                      <div>{profile.ancestry || 'Unknown Ancestry'} • {profile.job || 'Unknown Job'}</div>
                      <div>{profile.company || 'No Company'} • Cha: {profile.charisma_score || 10}</div>
                      {profile.alias && <div className="text-blue-300">@{profile.alias}</div>}
                    </div>
                    
                    {isContact && (
                      <>
                        <div className="flex items-center space-x-4 text-xs text-gray-400 mb-3">
                          <div className="flex items-center space-x-1">
                            <Star className="w-3 h-3 text-yellow-400" />
                            <span>{personalRating}/5</span>
                          </div>
                          <span>Cha Delta: {personalRating - 3 > 0 ? '+' : ''}{personalRating - 3}</span>
                        </div>

                        {/* Personal Tags */}
                        {tags.length > 0 && (
                          <div className="flex space-x-1 mb-4">
                            {tags.map((tag, tagIndex) => (
                              <Badge key={tagIndex} variant="outline" className="text-xs border-blue-600 text-blue-400">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </>
                    )}

                    {/* Contact Actions */}
                    <div className="flex space-x-2">
                      <Link to="/sending" className="flex-1">
                        <Button variant="outline" size="sm" className="w-full border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white">
                          <Zap className="w-3 h-3 mr-1" />
                          Stonecall
                        </Button>
                      </Link>
                      <ContactNotesDialog 
                        contact={profile}
                        contactId={contactData.id}
                        onUpdate={updateContact}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {filteredProfiles.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400">No characters found matching your search.</p>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
          <Card className="p-4 bg-gray-900/30 border-gray-700/50 text-center">
            <div className="text-2xl font-bold text-white">{profiles.length}</div>
            <div className="text-gray-400 text-sm">Total Characters</div>
          </Card>
          <Card className="p-4 bg-gray-900/30 border-gray-700/50 text-center">
            <div className="text-2xl font-bold text-blue-400">{contacts.length}</div>
            <div className="text-gray-400 text-sm">In Contacts</div>
          </Card>
          <Card className="p-4 bg-gray-900/30 border-gray-700/50 text-center">
            <div className="text-2xl font-bold text-green-400">
              {contacts.filter(c => getPersonalRating(c.contact_user_id) >= 4).length}
            </div>
            <div className="text-gray-400 text-sm">Trusted</div>
          </Card>
          <Card className="p-4 bg-gray-900/30 border-gray-700/50 text-center">
            <div className="text-2xl font-bold text-purple-400">
              {contacts.length > 0 ? 
                (contacts.reduce((sum, c) => sum + getPersonalRating(c.contact_user_id), 0) / contacts.length).toFixed(1) 
                : '0.0'
              }
            </div>
            <div className="text-gray-400 text-sm">Avg Rating</div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Roldex;