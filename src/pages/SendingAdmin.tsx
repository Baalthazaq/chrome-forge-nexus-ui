import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, MessageCircle, Users, Eye, Clock } from 'lucide-react';

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
}

interface StoneWithParticipants {
  id: string;
  name: string | null;
  is_group: boolean;
  participant_one_id: string | null;
  participant_two_id: string | null;
  created_at: string;
  updated_at: string;
  last_cast_at: string | null;
  display_name: string;
  participant_names: string[];
  cast_count: number;
  latest_cast?: {
    message: string;
    sender_id: string;
    created_at: string;
    is_deleted: boolean;
    is_edited: boolean;
    original_message: string | null;
  };
}

const SendingAdmin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, isLoading } = useAdmin();
  const [stones, setStones] = useState<StoneWithParticipants[]>([]);
  const [selectedStone, setSelectedStone] = useState<StoneWithParticipants | null>(null);
  const [conversationCasts, setConversationCasts] = useState<Cast[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCasts, setLoadingCasts] = useState(false);
  const [profMap, setProfMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      navigate('/admin');
      return;
    }
    if (isAdmin) {
      loadAllConversations();
    }
  }, [isAdmin, isLoading, navigate]);

  const loadAllConversations = async () => {
    try {
      const { data: profs } = await supabase.from('profiles').select('user_id, character_name');
      const pm = new Map((profs || []).map(p => [p.user_id, p.character_name || 'Unknown']));
      setProfMap(pm);

      const { data: stonesData, error } = await supabase
        .from('stones')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const stonesWithInfo = await Promise.all(
        (stonesData || []).map(async (stone) => {
          const { data: participants } = await supabase
            .from('stone_participants')
            .select('user_id, left_at')
            .eq('stone_id', stone.id);

          const participantNames = (participants || []).map(p => {
            const name = pm.get(p.user_id) || 'Unknown';
            return p.left_at ? `${name} (left)` : name;
          });

          let displayName: string;
          if (stone.is_group && stone.name) {
            displayName = stone.name;
          } else {
            displayName = participantNames.join(' ↔ ');
          }

          const { count } = await supabase
            .from('casts')
            .select('*', { count: 'exact', head: true })
            .eq('stone_id', stone.id);

          const { data: latestCast } = await supabase
            .from('casts')
            .select('message, sender_id, created_at, is_deleted, is_edited, original_message')
            .eq('stone_id', stone.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            ...stone,
            display_name: displayName,
            participant_names: participantNames,
            cast_count: count || 0,
            latest_cast: latestCast,
          } as StoneWithParticipants;
        })
      );

      setStones(stonesWithInfo);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadConversationCasts = async (stone: StoneWithParticipants) => {
    setLoadingCasts(true);
    try {
      const { data, error } = await supabase
        .from('casts')
        .select('*')
        .eq('stone_id', stone.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setConversationCasts(data || []);
      setSelectedStone(stone);
    } catch (error) {
      console.error('Error loading conversation casts:', error);
    } finally {
      setLoadingCasts(false);
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

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <MessageCircle className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
          <p className="text-lg">Loading conversations...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">You don't have admin permissions.</p>
          <Button onClick={() => navigate('/admin')} variant="outline">Back to Admin</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button onClick={() => navigate('/admin')} variant="outline" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Admin
            </Button>
            <MessageCircle className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Sending - Admin View</h1>
          </div>
          <Badge variant="outline" className="bg-primary/10 text-primary">
            <Eye className="h-3 w-3 mr-1" />
            Read Only
          </Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              All Conversations ({stones.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stones.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No conversations found</p>
                </div>
              ) : (
                stones.map((stone) => (
                  <Dialog
                    key={stone.id}
                    onOpenChange={(open) => { if (open) loadConversationCasts(stone); }}
                  >
                    <DialogTrigger asChild>
                      <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                            {stone.is_group ? <Users className="h-6 w-6 text-primary" /> : <MessageCircle className="h-6 w-6 text-primary" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-lg">{stone.display_name}</h3>
                              {stone.is_group && <Badge variant="secondary" className="text-xs">Group</Badge>}
                              <Badge variant="secondary" className="text-xs">{stone.cast_count} messages</Badge>
                            </div>
                            {stone.is_group && (
                              <p className="text-xs text-muted-foreground mb-1">{stone.participant_names.join(', ')}</p>
                            )}
                            {stone.latest_cast ? (
                              <div className="space-y-1">
                                <p className="text-sm text-muted-foreground truncate max-w-lg">
                                  Latest: "{stone.latest_cast.message}"
                                  {stone.latest_cast.is_deleted && <span className="text-red-400 ml-2">[DELETED]</span>}
                                  {stone.latest_cast.is_edited && <span className="text-yellow-400 ml-2">[EDITED]</span>}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  <span>{formatTime(stone.latest_cast.created_at)}</span>
                                  <span>•</span>
                                  <span>Sent by: {profMap.get(stone.latest_cast.sender_id) || 'Unknown'}</span>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">No messages yet</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <p className="text-xs text-muted-foreground">Created: {new Date(stone.created_at).toLocaleDateString()}</p>
                          {stone.last_cast_at && <p className="text-xs text-muted-foreground">Last activity: {formatTime(stone.last_cast_at)}</p>}
                        </div>
                      </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh]">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          {stone.is_group ? <Users className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
                          {stone.display_name}
                          {stone.is_group && <Badge variant="secondary">Group</Badge>}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                          <Badge variant="outline">{stone.cast_count} messages</Badge>
                          <span>Created: {new Date(stone.created_at).toLocaleDateString()}</span>
                          {stone.last_cast_at && <span>Last activity: {formatTime(stone.last_cast_at)}</span>}
                          {stone.is_group && <span>Members: {stone.participant_names.join(', ')}</span>}
                        </div>
                        <ScrollArea className="h-[400px] border rounded-lg p-4">
                          {loadingCasts ? (
                            <div className="flex items-center justify-center h-full">
                              <MessageCircle className="h-8 w-8 mx-auto mb-2 text-primary animate-pulse" />
                            </div>
                          ) : conversationCasts.length === 0 ? (
                            <div className="text-center text-muted-foreground py-8">
                              <p>No messages in this conversation yet</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {conversationCasts.map((cast) => {
                                const senderName = profMap.get(cast.sender_id) || 'Unknown';
                                return (
                                  <div key={cast.id} className="flex justify-start">
                                    <div className={`max-w-sm lg:max-w-md px-4 py-3 rounded-lg ${
                                      cast.is_deleted ? 'opacity-50 border-2 border-dashed border-red-400' : 'bg-muted'
                                    }`}>
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-medium">{senderName}</span>
                                        <span className="text-xs opacity-70">{formatTime(cast.created_at)}</span>
                                        {cast.is_deleted && <span className="text-xs font-bold text-red-400">[DELETED]</span>}
                                        {cast.is_edited && <span className="text-xs font-bold text-yellow-400">[EDITED]</span>}
                                      </div>
                                      {cast.is_deleted ? (
                                        <p className="text-sm font-mono leading-relaxed text-red-400 italic">[Message was deleted]</p>
                                      ) : (
                                        <p className="text-sm font-mono leading-relaxed">{cast.message}</p>
                                      )}
                                      {cast.is_edited && cast.original_message && !cast.is_deleted && (
                                        <div className="mt-2 pt-2 border-t border-gray-300/20">
                                          <p className="text-xs text-muted-foreground mb-1">Original:</p>
                                          <p className="text-xs font-mono opacity-70 italic">{cast.original_message}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </ScrollArea>
                      </div>
                    </DialogContent>
                  </Dialog>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SendingAdmin;
