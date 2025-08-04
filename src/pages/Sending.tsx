
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send, Clock, User, MessageCircle, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { toast } from "sonner";

interface Stone {
  id: string;
  participant_one_id: string;
  participant_two_id: string;
  updated_at: string;
  last_cast_at: string;
  other_participant?: {
    character_name: string;
  };
  latest_cast?: {
    message: string;
    sender_id: string;
    created_at: string;
  };
}

interface Cast {
  id: string;
  stone_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  read_at: string | null;
}

interface Profile {
  id: string;
  user_id: string;
  character_name: string;
}

const Sending = () => {
  const { user } = useAuth();
  const { impersonatedUser } = useAdmin();
  
  // Use impersonated user if available, otherwise use authenticated user
  const currentUser = impersonatedUser ? { id: impersonatedUser.user_id } : user;
  const [message, setMessage] = useState("");
  const [selectedStone, setSelectedStone] = useState<Stone | null>(null);
  const [stones, setStones] = useState<Stone[]>([]);
  const [casts, setCasts] = useState<Cast[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showNewStone, setShowNewStone] = useState(false);
  const [newRecipientId, setNewRecipientId] = useState("");
  
  const wordCount = message.trim().split(/\s+/).filter(word => word.length > 0).length;

  useEffect(() => {
    if (currentUser) {
      loadStones();
      loadProfiles();
    }
  }, [currentUser]);

  useEffect(() => {
    if (selectedStone) {
      loadCasts(selectedStone.id);
    }
  }, [selectedStone]);

  const loadStones = async () => {
    try {
      const { data, error } = await supabase
        .from('stones')
        .select(`
          *,
          casts!inner(message, sender_id, created_at)
        `)
        .or(`participant_one_id.eq.${currentUser?.id},participant_two_id.eq.${currentUser?.id}`)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Get latest cast for each stone and other participant info
      const stonesWithInfo = await Promise.all(
        data.map(async (stone) => {
          const otherParticipantId = stone.participant_one_id === currentUser?.id 
            ? stone.participant_two_id 
            : stone.participant_one_id;

          const { data: profile } = await supabase
            .from('profiles')
            .select('character_name')
            .eq('user_id', otherParticipantId)
            .single();

          const { data: latestCast } = await supabase
            .from('casts')
            .select('*')
            .eq('stone_id', stone.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            ...stone,
            other_participant: profile,
            latest_cast: latestCast
          };
        })
      );

      setStones(stonesWithInfo);
    } catch (error) {
      console.error('Error loading stones:', error);
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const loadProfiles = async () => {
    try {
      console.log('Current user ID:', currentUser?.id);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('user_id', currentUser?.id);

      console.log('All profiles query result:', data, error);

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error loading profiles:', error);
    }
  };

  const loadCasts = async (stoneId: string) => {
    try {
      const { data, error } = await supabase
        .from('casts')
        .select('*')
        .eq('stone_id', stoneId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setCasts(data);
    } catch (error) {
      console.error('Error loading casts:', error);
      toast.error('Failed to load messages');
    }
  };

  const createNewStone = async (recipientId: string) => {
    try {
      // Check if stone already exists
      const { data: existingStone } = await supabase
        .from('stones')
        .select('*')
        .or(`and(participant_one_id.eq.${currentUser?.id},participant_two_id.eq.${recipientId}),and(participant_one_id.eq.${recipientId},participant_two_id.eq.${currentUser?.id})`)
        .single();

      if (existingStone) {
        toast.error('Conversation already exists with this user');
        return;
      }

      const { data, error } = await supabase
        .from('stones')
        .insert({
          participant_one_id: currentUser?.id,
          participant_two_id: recipientId
        })
        .select()
        .single();

      if (error) throw error;

      const { data: profile } = await supabase
        .from('profiles')
        .select('character_name')
        .eq('user_id', recipientId)
        .single();

      const newStone = {
        ...data,
        other_participant: profile,
        latest_cast: null
      };

      setStones(prev => [newStone, ...prev]);
      setSelectedStone(newStone);
      setShowNewStone(false);
      setNewRecipientId("");
      toast.success('New conversation started');
    } catch (error) {
      console.error('Error creating stone:', error);
      toast.error('Failed to start conversation');
    }
  };

  const sendCast = async () => {
    if (!selectedStone || !message.trim() || wordCount > 25) return;

    setSending(true);
    try {
      const { data, error } = await supabase
        .from('casts')
        .insert({
          stone_id: selectedStone.id,
          sender_id: currentUser?.id,
          message: message.trim()
        })
        .select()
        .single();

      if (error) throw error;

      setCasts(prev => [...prev, data]);
      setMessage("");
      toast.success('Message sent');
      
      // Reload stones to update latest cast
      loadStones();
    } catch (error) {
      console.error('Error sending cast:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-cyan-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 via-black to-blue-900/20"></div>
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/">
            <Button variant="ghost" className="text-cyan-400 hover:text-cyan-300">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to OS
            </Button>
          </Link>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            Sending
          </h1>
          <div className="w-20"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stones List */}
          <Card className="lg:col-span-1 bg-gray-900/30 border-gray-700/50">
            <div className="p-4 border-b border-gray-700/50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white flex items-center">
                  <MessageCircle className="w-5 h-5 mr-2 text-cyan-400" />
                  Stones
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewStone(!showNewStone)}
                  className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                >
                  <Users className="w-4 h-4 mr-1" />
                  New
                </Button>
              </div>
              
              {showNewStone && (
                <div className="mt-4 space-y-2">
                  <select
                    value={newRecipientId}
                    onChange={(e) => setNewRecipientId(e.target.value)}
                    className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
                  >
                    <option value="">Select recipient...</option>
                    {profiles.map(profile => (
                      <option key={profile.id} value={profile.user_id}>
                        {profile.character_name}
                      </option>
                    ))}
                  </select>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      onClick={() => createNewStone(newRecipientId)}
                      disabled={!newRecipientId}
                      className="bg-cyan-500 hover:bg-cyan-600"
                    >
                      Start
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowNewStone(false);
                        setNewRecipientId("");
                      }}
                      className="border-gray-600 text-gray-400"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
              {stones.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No conversations yet</p>
                  <p className="text-sm">Start a new stone to begin messaging</p>
                </div>
              ) : (
                stones.map((stone) => (
                  <div
                    key={stone.id}
                    onClick={() => setSelectedStone(stone)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedStone?.id === stone.id
                        ? 'bg-cyan-500/20 border border-cyan-500/30'
                        : 'bg-gray-800/50 hover:bg-gray-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-cyan-400">
                        {stone.other_participant?.character_name || 'Unknown'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {stone.latest_cast ? formatTime(stone.latest_cast.created_at) : 'New'}
                      </span>
                    </div>
                    {stone.latest_cast && (
                      <p className="text-sm text-gray-300 truncate">
                        {stone.latest_cast.sender_id === currentUser?.id ? 'You: ' : ''}
                        {stone.latest_cast.message}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Chat Area */}
          <Card className="lg:col-span-2 bg-gray-900/30 border-gray-700/50">
            {selectedStone ? (
              <div className="h-96 flex flex-col">
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-700/50">
                  <h3 className="text-lg font-semibold text-white">
                    {selectedStone.other_participant?.character_name || 'Unknown'}
                  </h3>
                </div>

                {/* Messages */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                  {casts.map((cast) => (
                    <div
                      key={cast.id}
                      className={`flex ${cast.sender_id === currentUser?.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          cast.sender_id === currentUser?.id
                            ? 'bg-cyan-500 text-white ml-12'
                            : 'bg-gray-700 text-gray-100 mr-12'
                        }`}
                      >
                        <p className="text-sm font-mono leading-relaxed">{cast.message}</p>
                        <p className="text-xs mt-1 opacity-70">
                          {formatTime(cast.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-gray-700/50">
                  <div className="space-y-3">
                    <div className="relative">
                      <Textarea
                        placeholder="Cast your message... (25 words max)"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 resize-none"
                        rows={2}
                      />
                      <div className={`absolute right-3 bottom-3 text-xs font-mono ${
                        wordCount > 25 ? 'text-red-400' : wordCount > 20 ? 'text-yellow-400' : 'text-gray-400'
                      }`}>
                        {wordCount}/25
                      </div>
                    </div>
                    <Button
                      onClick={sendCast}
                      disabled={wordCount === 0 || wordCount > 25 || sending}
                      className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {sending ? 'Casting...' : 'Cast Stone'}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-96 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Select a stone to start messaging</p>
                  <p className="text-sm">Choose a conversation from the left panel</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Sending;
