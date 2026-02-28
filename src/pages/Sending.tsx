
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send, Clock, User, MessageCircle, Users, Edit, Trash2, Plus, LogOut, UserPlus, Pencil } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { z } from 'zod';

const groupNameSchema = z.string().trim().min(1, 'Group name is required').max(100, 'Group name too long (max 100 chars)');
const messageSchema = z.string().trim().min(1).max(500, 'Message too long');
const renameSchema = z.string().trim().min(1, 'Name is required').max(100, 'Name too long (max 100 chars)');

interface Participant {
  user_id: string;
  joined_at: string;
  left_at: string | null;
  character_name?: string;
}

interface Stone {
  id: string;
  name: string | null;
  is_group: boolean;
  created_by: string | null;
  participant_one_id: string | null;
  participant_two_id: string | null;
  updated_at: string;
  last_cast_at: string | null;
  participants: Participant[];
  display_name: string;
  latest_cast?: {
    message: string;
    sender_id: string;
    created_at: string;
    sender_name?: string;
  };
  unread_count?: number;
}

interface Cast {
  id: string;
  stone_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  read_at: string | null;
  deleted_at: string | null;
  edited_at: string | null;
  original_message: string | null;
  is_deleted: boolean;
  is_edited: boolean;
  sender_name?: string;
}

interface Profile {
  id: string;
  user_id: string;
  character_name: string;
}

const Sending = () => {
  const { user } = useAuth();
  const { impersonatedUser } = useAdmin();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentUserId = impersonatedUser ? impersonatedUser.user_id : user?.id;
  const currentUser = useMemo(() => currentUserId ? { id: currentUserId } : null, [currentUserId]);

  const [message, setMessage] = useState("");
  const [selectedStone, setSelectedStone] = useState<Stone | null>(null);
  const [stones, setStones] = useState<Stone[]>([]);
  const [casts, setCasts] = useState<Cast[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showNewStone, setShowNewStone] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newRecipientId, setNewRecipientId] = useState("");
  const [editingCast, setEditingCast] = useState<Cast | null>(null);
  const [editMessage, setEditMessage] = useState("");
  const [groupName, setGroupName] = useState("");
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const wordCount = message.trim().split(/\s+/).filter(word => word.length > 0).length;

  const pendingStoneId = useRef<string | null>(searchParams.get('stone'));

  useEffect(() => {
    if (currentUser) {
      loadStones();
      loadProfiles();
      loadAllProfiles();
      // Clear the stone param from URL
      if (searchParams.get('stone')) {
        setSearchParams({}, { replace: true });
      }
    }
  }, [currentUser]);

  // Auto-select stone from query param once stones are loaded
  useEffect(() => {
    if (pendingStoneId.current && stones.length > 0) {
      const target = stones.find(s => s.id === pendingStoneId.current);
      if (target) {
        setSelectedStone(target);
        pendingStoneId.current = null;
      }
    }
  }, [stones]);

  useEffect(() => {
    if (selectedStone) {
      loadCasts(selectedStone.id);
      markMessagesAsRead(selectedStone.id);
    }
  }, [selectedStone?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [casts]);

  const getProfileName = (userId: string, profilesList: Profile[]) => {
    return profilesList.find(p => p.user_id === userId)?.character_name || 'Unknown';
  };

  const loadAllProfiles = async () => {
    const { data } = await supabase.from('profiles').select('id, user_id, character_name');
    if (data) setAllProfiles(data as Profile[]);
  };

  const loadStones = async () => {
    try {
      // Get stones where user is a participant (via junction table)
      const { data: participantRows, error: pError } = await supabase
        .from('stone_participants')
        .select('stone_id')
        .eq('user_id', currentUser?.id);

      if (pError) throw pError;

      const stoneIds = participantRows?.map(r => r.stone_id) || [];

      // Also get legacy 1:1 stones
      const { data: legacyStones, error: lError } = await supabase
        .from('stones')
        .select('id')
        .or(`participant_one_id.eq.${currentUser?.id},participant_two_id.eq.${currentUser?.id}`);

      if (lError) throw lError;

      const allStoneIds = [...new Set([...stoneIds, ...(legacyStones?.map(s => s.id) || [])])];

      if (allStoneIds.length === 0) {
        setStones([]);
        setLoading(false);
        return;
      }

      const { data: stonesData, error: sError } = await supabase
        .from('stones')
        .select('*')
        .in('id', allStoneIds)
        .order('updated_at', { ascending: false });

      if (sError) throw sError;

      // Load all profiles for name lookups
      const { data: profs } = await supabase.from('profiles').select('user_id, character_name');
      const profMap = new Map((profs || []).map(p => [p.user_id, p.character_name || 'Unknown']));

      const stonesWithInfo = await Promise.all(
        (stonesData || []).map(async (stone) => {
          // Get participants from junction table
          const { data: participants } = await supabase
            .from('stone_participants')
            .select('user_id, joined_at, left_at')
            .eq('stone_id', stone.id);

          const participantList: Participant[] = (participants || []).map(p => ({
            ...p,
            character_name: profMap.get(p.user_id) || 'Unknown',
          }));

          // Display name
          let displayName: string;
          if (stone.is_group && stone.name) {
            displayName = stone.name;
          } else {
            const others = participantList.filter(p => p.user_id !== currentUser?.id && !p.left_at);
            displayName = others.map(p => p.character_name).join(', ') || 'Empty conversation';
          }

          // Latest cast
          const { data: latestCast } = await supabase
            .from('casts')
            .select('*')
            .eq('stone_id', stone.id)
            .eq('is_deleted', false)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Unread count
          const { count: unreadCount } = await supabase
            .from('casts')
            .select('*', { count: 'exact' })
            .eq('stone_id', stone.id)
            .eq('is_deleted', false)
            .neq('sender_id', currentUser?.id)
            .is('read_at', null);

          return {
            ...stone,
            participants: participantList,
            display_name: displayName,
            latest_cast: latestCast ? {
              ...latestCast,
              sender_name: profMap.get(latestCast.sender_id),
            } : undefined,
            unread_count: unreadCount || 0,
          } as Stone;
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
      const { data: contactsData, error } = await supabase
        .from('contacts')
        .select('contact_user_id')
        .eq('user_id', currentUser?.id)
        .eq('is_active', true);

      if (error) throw error;
      if (!contactsData || contactsData.length === 0) { setProfiles([]); return; }

      const contactUserIds = contactsData.map(c => c.contact_user_id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', contactUserIds);

      setProfiles((profilesData || []) as Profile[]);
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
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Load profile names for senders
      const { data: profs } = await supabase.from('profiles').select('user_id, character_name');
      const profMap = new Map((profs || []).map(p => [p.user_id, p.character_name || 'Unknown']));

      setCasts((data || []).map(c => ({ ...c, sender_name: profMap.get(c.sender_id) })));
    } catch (error) {
      console.error('Error loading casts:', error);
      toast.error('Failed to load messages');
    }
  };

  const markMessagesAsRead = async (stoneId: string) => {
    try {
      await supabase
        .from('casts')
        .update({ read_at: new Date().toISOString() })
        .eq('stone_id', stoneId)
        .neq('sender_id', currentUser?.id)
        .is('read_at', null);
      loadStones();
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const createNewStone = async (recipientId: string) => {
    try {
      // Check if 1:1 stone already exists via participants
      const { data: myStones } = await supabase
        .from('stone_participants')
        .select('stone_id')
        .eq('user_id', currentUser?.id);

      const { data: theirStones } = await supabase
        .from('stone_participants')
        .select('stone_id')
        .eq('user_id', recipientId);

      const myStoneIds = new Set(myStones?.map(s => s.stone_id) || []);
      const commonStoneIds = (theirStones || []).filter(s => myStoneIds.has(s.stone_id)).map(s => s.stone_id);

      // Check if any common stone is a non-group 1:1
      if (commonStoneIds.length > 0) {
        const { data: commonStones } = await supabase
          .from('stones')
          .select('id, is_group')
          .in('id', commonStoneIds)
          .eq('is_group', false);

        if (commonStones && commonStones.length > 0) {
          toast.error('Conversation already exists with this user');
          return;
        }
      }

      const { data, error } = await supabase
        .from('stones')
        .insert({
          participant_one_id: currentUser?.id,
          participant_two_id: recipientId,
          is_group: false,
          created_by: currentUser?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Add both participants to junction table
      await supabase.from('stone_participants').insert([
        { stone_id: data.id, user_id: currentUser?.id },
        { stone_id: data.id, user_id: recipientId },
      ]);

      setShowNewStone(false);
      setNewRecipientId("");
      toast.success('Conversation started');
      await loadStones();
    } catch (error) {
      console.error('Error creating stone:', error);
      toast.error('Failed to start conversation');
    }
  };

  const createGroupStone = async () => {
    const nameResult = groupNameSchema.safeParse(groupName);
    if (!nameResult.success || selectedGroupMembers.length === 0) {
      toast.error(nameResult.error?.errors[0]?.message || 'Please enter a group name and select at least one member');
      return;
    }

    try {
      const allMembers = [currentUser?.id!, ...selectedGroupMembers].sort();

      // Check for duplicate group with exact same active members
      const { data: myGroupStones } = await supabase
        .from('stone_participants')
        .select('stone_id')
        .eq('user_id', currentUser?.id);

      if (myGroupStones && myGroupStones.length > 0) {
        const groupStoneIds = myGroupStones.map(s => s.stone_id);
        const { data: groupStones } = await supabase
          .from('stones')
          .select('id')
          .in('id', groupStoneIds)
          .eq('is_group', true);

        if (groupStones) {
          for (const gs of groupStones) {
            const { data: participants } = await supabase
              .from('stone_participants')
              .select('user_id')
              .eq('stone_id', gs.id)
              .is('left_at', null);

            const existingMembers = (participants || []).map(p => p.user_id).sort();
            if (existingMembers.length === allMembers.length && existingMembers.every((id, i) => id === allMembers[i])) {
              toast.error('A group with these exact members already exists');
              return;
            }
          }
        }
      }

      const { data, error } = await supabase
        .from('stones')
        .insert({
          is_group: true,
          name: nameResult.data,
          created_by: currentUser?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Add all participants
      const participantInserts = allMembers.map(userId => ({
        stone_id: data.id,
        user_id: userId,
      }));

      await supabase.from('stone_participants').insert(participantInserts);

      // Auto-create contacts for all members (batched)
      await autoCreateContacts(allMembers, groupName.trim());

      setShowNewGroup(false);
      setGroupName("");
      setSelectedGroupMembers([]);
      toast.success('Group created!');
      await loadStones();
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('Failed to create group');
    }
  };

  const autoCreateContacts = async (memberIds: string[], chatName: string) => {
    try {
      // Build all possible contact pairs
      const pairs: { user_id: string; contact_user_id: string }[] = [];
      for (const userId of memberIds) {
        for (const otherUserId of memberIds) {
          if (userId !== otherUserId) pairs.push({ user_id: userId, contact_user_id: otherUserId });
        }
      }

      // Batch check existing contacts
      const { data: existingContacts } = await supabase
        .from('contacts')
        .select('user_id, contact_user_id')
        .in('user_id', memberIds)
        .in('contact_user_id', memberIds);

      const existingSet = new Set(
        (existingContacts || []).map(c => `${c.user_id}:${c.contact_user_id}`)
      );

      const newContacts = pairs
        .filter(p => !existingSet.has(`${p.user_id}:${p.contact_user_id}`))
        .map(p => ({
          ...p,
          relationship: `From: ${chatName}`,
          is_active: true,
        }));

      if (newContacts.length > 0) {
        await supabase.from('contacts').insert(newContacts);
      }
    } catch (error) {
      console.error('Error auto-creating contacts:', error);
    }
  };

  const addMemberToGroup = async (userId: string) => {
    if (!selectedStone || !selectedStone.is_group) return;

    try {
      // Check if already a participant
      const existing = selectedStone.participants.find(p => p.user_id === userId);
      if (existing && !existing.left_at) {
        toast.error('Already a member');
        return;
      }

      if (existing && existing.left_at) {
        // Re-join: clear left_at
        await supabase
          .from('stone_participants')
          .update({ left_at: null, joined_at: new Date().toISOString() })
          .eq('stone_id', selectedStone.id)
          .eq('user_id', userId);
      } else {
        await supabase.from('stone_participants').insert({
          stone_id: selectedStone.id,
          user_id: userId,
        });
      }

      // Auto-create contacts
      const activeMembers = selectedStone.participants
        .filter(p => !p.left_at)
        .map(p => p.user_id);
      await autoCreateContacts([...activeMembers, userId], selectedStone.name || selectedStone.display_name);

      setShowAddMember(false);
      toast.success('Member added');
      await loadStones();
    } catch (error) {
      console.error('Error adding member:', error);
      toast.error('Failed to add member');
    }
  };

  const leaveGroup = async () => {
    if (!selectedStone) return;

    try {
      await supabase
        .from('stone_participants')
        .update({ left_at: new Date().toISOString() })
        .eq('stone_id', selectedStone.id)
        .eq('user_id', currentUser?.id);

      setSelectedStone(null);
      toast.success('Left the group');
      await loadStones();
    } catch (error) {
      console.error('Error leaving group:', error);
      toast.error('Failed to leave group');
    }
  };

  const renameGroup = async () => {
    const renameResult = renameSchema.safeParse(renameValue);
    if (!selectedStone || !renameResult.success) {
      toast.error(renameResult?.error?.errors[0]?.message || 'Invalid name');
      return;
    }

    try {
      await supabase
        .from('stones')
        .update({ name: renameResult.data })
        .eq('id', selectedStone.id);

      setShowRename(false);
      toast.success('Group renamed');
      await loadStones();
    } catch (error) {
      console.error('Error renaming:', error);
      toast.error('Failed to rename');
    }
  };

  const sendCast = async () => {
    const msgResult = messageSchema.safeParse(message);
    if (!selectedStone || !msgResult.success || wordCount > 25) return;

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

      setCasts(prev => [...prev, { ...data, sender_name: getProfileName(currentUser?.id!, allProfiles) }]);
      setMessage("");
      toast.success('Message sent');
      loadStones();
    } catch (error) {
      console.error('Error sending cast:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const editCast = async () => {
    if (!editingCast || !editMessage.trim()) return;

    try {
      const { error } = await supabase
        .from('casts')
        .update({
          original_message: editingCast.message,
          message: editMessage.trim(),
          is_edited: true,
          edited_at: new Date().toISOString()
        })
        .eq('id', editingCast.id);

      if (error) throw error;

      setCasts(prev => prev.map(cast =>
        cast.id === editingCast.id
          ? { ...cast, original_message: cast.message, message: editMessage.trim(), is_edited: true, edited_at: new Date().toISOString() }
          : cast
      ));

      setEditingCast(null);
      setEditMessage("");
      toast.success('Message updated');
      loadStones();
    } catch (error) {
      console.error('Error editing cast:', error);
      toast.error('Failed to edit message');
    }
  };

  const deleteCast = async (castId: string) => {
    try {
      const { error } = await supabase
        .from('casts')
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq('id', castId);

      if (error) throw error;

      setCasts(prev => prev.filter(cast => cast.id !== castId));
      toast.success('Message deleted');
      loadStones();
    } catch (error) {
      console.error('Error deleting cast:', error);
      toast.error('Failed to delete message');
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

  const toggleGroupMember = (userId: string) => {
    setSelectedGroupMembers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  // Check if current user has left this stone
  const hasLeft = selectedStone?.participants.find(p => p.user_id === currentUser?.id)?.left_at;

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
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setShowNewStone(!showNewStone); setShowNewGroup(false); }}
                    className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                  >
                    <User className="w-4 h-4 mr-1" />
                    DM
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setShowNewGroup(!showNewGroup); setShowNewStone(false); }}
                    className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                  >
                    <Users className="w-4 h-4 mr-1" />
                    Group
                  </Button>
                </div>
              </div>

              {/* New DM */}
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
                    <Button size="sm" onClick={() => createNewStone(newRecipientId)} disabled={!newRecipientId} className="bg-cyan-500 hover:bg-cyan-600">Start</Button>
                    <Button size="sm" variant="outline" onClick={() => { setShowNewStone(false); setNewRecipientId(""); }} className="border-gray-600 text-gray-400">Cancel</Button>
                  </div>
                </div>
              )}

              {/* New Group */}
              {showNewGroup && (
                <div className="mt-4 space-y-2">
                  <Input
                    placeholder="Group name..."
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                  <p className="text-xs text-gray-400">Select members:</p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {profiles.map(profile => (
                      <label key={profile.id} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white">
                        <input
                          type="checkbox"
                          checked={selectedGroupMembers.includes(profile.user_id)}
                          onChange={() => toggleGroupMember(profile.user_id)}
                          className="rounded"
                        />
                        {profile.character_name}
                      </label>
                    ))}
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" onClick={createGroupStone} disabled={!groupName.trim() || selectedGroupMembers.length === 0} className="bg-cyan-500 hover:bg-cyan-600">Create</Button>
                    <Button size="sm" variant="outline" onClick={() => { setShowNewGroup(false); setGroupName(""); setSelectedGroupMembers([]); }} className="border-gray-600 text-gray-400">Cancel</Button>
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
                    className={`p-3 rounded-lg cursor-pointer transition-colors relative ${
                      selectedStone?.id === stone.id
                        ? 'bg-cyan-500/20 border border-cyan-500/30'
                        : 'bg-gray-800/50 hover:bg-gray-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {stone.is_group && <Users className="w-3 h-3 text-cyan-400" />}
                        <span className="font-semibold text-cyan-400 truncate max-w-[160px]">
                          {stone.display_name}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {stone.unread_count > 0 && (
                          <span className="bg-cyan-500 text-black text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                            {stone.unread_count}
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          {stone.latest_cast ? formatTime(stone.latest_cast.created_at) : 'New'}
                        </span>
                      </div>
                    </div>
                    {stone.latest_cast && (
                      <p className="text-sm text-gray-300 truncate">
                        {stone.is_group && stone.latest_cast.sender_name
                          ? `${stone.latest_cast.sender_id === currentUser?.id ? 'You' : stone.latest_cast.sender_name}: `
                          : stone.latest_cast.sender_id === currentUser?.id ? 'You: ' : ''}
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
              <div className="h-[600px] flex flex-col">
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-700/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        {selectedStone.is_group && <Users className="w-5 h-5 text-cyan-400" />}
                        {selectedStone.display_name}
                      </h3>
                      {selectedStone.is_group && (
                        <p className="text-xs text-gray-400 mt-1">
                          {selectedStone.participants.filter(p => !p.left_at).map(p => p.character_name).join(', ')}
                        </p>
                      )}
                    </div>
                    {selectedStone.is_group && !hasLeft && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white" onClick={() => { setShowRename(true); setRenameValue(selectedStone.name || ''); }}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white" onClick={() => setShowAddMember(true)}>
                          <UserPlus className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300" onClick={leaveGroup}>
                          <LogOut className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Rename dialog */}
                  {showRename && (
                    <div className="mt-2 flex gap-2">
                      <Input value={renameValue} onChange={e => setRenameValue(e.target.value)} className="bg-gray-800 border-gray-600 text-white text-sm" placeholder="New name..." />
                      <Button size="sm" onClick={renameGroup} className="bg-cyan-500 hover:bg-cyan-600">Save</Button>
                      <Button size="sm" variant="outline" onClick={() => setShowRename(false)} className="border-gray-600 text-gray-400">Cancel</Button>
                    </div>
                  )}

                  {/* Add member */}
                  {showAddMember && (
                    <div className="mt-2">
                      <select
                        onChange={(e) => { if (e.target.value) addMemberToGroup(e.target.value); }}
                        className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                        defaultValue=""
                      >
                        <option value="">Add a member...</option>
                        {profiles
                          .filter(p => !selectedStone.participants.find(sp => sp.user_id === p.user_id && !sp.left_at))
                          .map(p => (
                            <option key={p.id} value={p.user_id}>{p.character_name}</option>
                          ))
                        }
                      </select>
                    </div>
                  )}
                </div>

                {/* Messages */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                  {casts.map((cast) => (
                    <div
                      key={cast.id}
                      className={`flex ${cast.sender_id === currentUser?.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg relative group ${
                          cast.sender_id === currentUser?.id
                            ? 'bg-cyan-500 text-white ml-12'
                            : 'bg-gray-700 text-gray-100 mr-12'
                        }`}
                      >
                        {selectedStone.is_group && cast.sender_id !== currentUser?.id && (
                          <p className="text-xs font-semibold mb-1 opacity-80">{cast.sender_name}</p>
                        )}
                        <p className="text-sm font-mono leading-relaxed">{cast.message}</p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs opacity-70">
                            {formatTime(cast.created_at)}
                            {cast.is_edited && <span className="ml-1">(edited)</span>}
                          </p>
                          {cast.sender_id === currentUser?.id && (
                            <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <button
                                    onClick={() => { setEditingCast(cast); setEditMessage(cast.message); }}
                                    className="p-1 hover:bg-white/20 rounded"
                                  >
                                    <Edit className="w-3 h-3" />
                                  </button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Edit Message</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <Textarea value={editMessage} onChange={(e) => setEditMessage(e.target.value)} className="bg-gray-800/50 border-gray-600 text-white" rows={3} />
                                    <div className="flex justify-end space-x-2">
                                      <Button variant="outline" onClick={() => setEditingCast(null)}>Cancel</Button>
                                      <Button onClick={editCast}>Save Changes</Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              <button onClick={() => deleteCast(cast.id)} className="p-1 hover:bg-red-500/20 rounded">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                {!hasLeft ? (
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
                ) : (
                  <div className="p-4 border-t border-gray-700/50 text-center text-gray-500 text-sm">
                    You left this group. You can still view the history.
                  </div>
                )}
              </div>
            ) : (
              <div className="h-[600px] flex items-center justify-center">
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
