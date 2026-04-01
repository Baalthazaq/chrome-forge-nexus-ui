import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { useToast } from "@/hooks/use-toast";
import { Shield, ArrowLeft, Search, UserPlus, Trash2, Loader2 } from "lucide-react";

const SuccubusAdmin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, isLoading } = useAdmin();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [creators, setCreators] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [promoting, setPromoting] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAdmin) navigate('/');
    if (isAdmin) loadProfiles();
  }, [isAdmin, isLoading]);

  const loadProfiles = async () => {
    const { data } = await supabase
      .from('succubus_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setProfiles(data);
      // Load creator names
      const creatorIds = [...new Set(data.map(p => p.created_by))];
      if (creatorIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, character_name')
          .in('user_id', creatorIds);
        const map: Record<string, string> = {};
        profilesData?.forEach(p => { map[p.user_id] = p.character_name || 'Unknown'; });
        setCreators(map);
      }
    }
  };

  const promoteToNPC = async (profile: any) => {
    setPromoting(profile.id);
    try {
      const { data, error } = await supabase.functions.invoke('create-npc', {
        body: {
          character_name: profile.character_name,
          ancestry: profile.ancestry,
          job: profile.job,
          community: profile.community,
          age: profile.age,
          bio: profile.bio,
          is_searchable: true,
          has_succubus_profile: true,
          character_class: 'NPC',
        }
      });

      if (error) throw error;

      // Update the succubus profile with the NPC id
      if (data?.npc_id) {
        await supabase
          .from('succubus_profiles')
          .update({ promoted_to_npc_id: data.npc_id })
          .eq('id', profile.id);

        // If avatar exists, update the NPC profile with it
        if (profile.avatar_url) {
          const serviceClient = supabase;
          await serviceClient
            .from('profiles')
            .update({ avatar_url: profile.avatar_url })
            .eq('user_id', data.npc_id);
        }
      }

      toast({ title: "NPC Created!", description: `${profile.character_name} has been promoted to a full NPC.` });
      loadProfiles();
    } catch (e: any) {
      toast({ title: "Promotion failed", description: e.message, variant: "destructive" });
    } finally {
      setPromoting(null);
    }
  };

  const deleteProfile = async (id: string) => {
    const { error } = await supabase.from('succubus_profiles').delete().eq('id', id);
    if (!error) {
      setProfiles(prev => prev.filter(p => p.id !== id));
      toast({ title: "Profile deleted" });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Shield className="h-12 w-12 text-primary animate-pulse" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const filtered = profiles.filter(p =>
    !searchTerm ||
    p.character_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.ancestry?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.job?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Succubus Admin</h1>
            <Badge variant="outline">{profiles.length} profiles</Badge>
          </div>
          <Button onClick={() => navigate('/admin')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />Back to Admin
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search profiles..."
            className="pl-10"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(profile => (
            <Card key={profile.id}>
              <div className="relative h-40 bg-muted flex items-center justify-center overflow-hidden rounded-t-lg">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.character_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-6xl">👤</div>
                )}
                {profile.promoted_to_npc_id && (
                  <Badge className="absolute top-2 right-2 bg-green-600">NPC</Badge>
                )}
              </div>
              <CardContent className="p-4 space-y-2">
                <h3 className="font-semibold">{profile.character_name}, {profile.age}</h3>
                <p className="text-sm text-muted-foreground">{profile.ancestry} • {profile.job}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{profile.bio}</p>

                <div className="flex flex-wrap gap-1">
                  {(profile.tags || []).slice(0, 4).map((tag: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground">
                  Saved by: {creators[profile.created_by] || 'Unknown'} • Purpose: {profile.search_purpose}
                </p>

                <div className="flex justify-between pt-2">
                  {!profile.promoted_to_npc_id ? (
                    <Button
                      size="sm"
                      onClick={() => promoteToNPC(profile)}
                      disabled={promoting === profile.id}
                    >
                      {promoting === profile.id ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <UserPlus className="w-4 h-4 mr-1" />
                      )}
                      Make NPC
                    </Button>
                  ) : (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      Promoted
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteProfile(profile.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No saved profiles found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuccubusAdmin;
