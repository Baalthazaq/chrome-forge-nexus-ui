import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, MessageCircle, Users, Eye, Clock } from 'lucide-react';

interface StoneWithParticipants {
  id: string;
  participant_one_id: string;
  participant_two_id: string;
  created_at: string;
  updated_at: string;
  last_cast_at: string | null;
  participant_one_name: string;
  participant_two_name: string;
  cast_count: number;
  latest_cast?: {
    message: string;
    sender_id: string;
    created_at: string;
  };
}

const SendingAdmin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, isLoading } = useAdmin();
  const [stones, setStones] = useState<StoneWithParticipants[]>([]);
  const [loading, setLoading] = useState(true);

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
      // Get all stones
      const { data: stonesData, error: stonesError } = await supabase
        .from('stones')
        .select('*')
        .order('updated_at', { ascending: false });

      if (stonesError) throw stonesError;

      // Get participant names and additional info for each stone
      const stonesWithInfo = await Promise.all(
        stonesData.map(async (stone) => {
          // Get participant names
          const { data: participantOne } = await supabase
            .from('profiles')
            .select('character_name')
            .eq('user_id', stone.participant_one_id)
            .single();

          const { data: participantTwo } = await supabase
            .from('profiles')
            .select('character_name')
            .eq('user_id', stone.participant_two_id)
            .single();

          // Get cast count
          const { count } = await supabase
            .from('casts')
            .select('*', { count: 'exact', head: true })
            .eq('stone_id', stone.id);

          // Get latest cast
          const { data: latestCast } = await supabase
            .from('casts')
            .select('message, sender_id, created_at')
            .eq('stone_id', stone.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            ...stone,
            participant_one_name: participantOne?.character_name || 'Unknown',
            participant_two_name: participantTwo?.character_name || 'Unknown',
            cast_count: count || 0,
            latest_cast: latestCast
          };
        })
      );

      setStones(stonesWithInfo);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
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
          <Button onClick={() => navigate('/admin')} variant="outline">
            Back to Admin
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              onClick={() => navigate('/admin')} 
              variant="outline" 
              size="sm"
              className="flex items-center gap-2"
            >
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

        {/* Conversations List */}
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
                  <p className="text-sm">No stones have been created yet</p>
                </div>
              ) : (
                stones.map((stone) => (
                  <div 
                    key={stone.id} 
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <MessageCircle className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg">
                            {stone.participant_one_name} ↔ {stone.participant_two_name}
                          </h3>
                          <Badge variant="secondary" className="text-xs">
                            {stone.cast_count} messages
                          </Badge>
                        </div>
                        {stone.latest_cast ? (
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground truncate max-w-lg">
                              Latest: "{stone.latest_cast.message}"
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>{formatTime(stone.latest_cast.created_at)}</span>
                              <span>•</span>
                              <span>
                                Sent by: {
                                  stone.latest_cast.sender_id === stone.participant_one_id 
                                    ? stone.participant_one_name 
                                    : stone.participant_two_name
                                }
                              </span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No messages yet</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-xs text-muted-foreground">
                        Created: {new Date(stone.created_at).toLocaleDateString()}
                      </p>
                      {stone.last_cast_at && (
                        <p className="text-xs text-muted-foreground">
                          Last activity: {formatTime(stone.last_cast_at)}
                        </p>
                      )}
                    </div>
                  </div>
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