import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Heart, X, Loader2, Sparkles, Users, Trash2, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { useToast } from "@/hooks/use-toast";

interface GeneratedProfile {
  character_name: string;
  ancestry: string;
  job: string;
  community: string;
  age: number;
  bio: string;
  avatar_url: string | null;
  tags: string[];
  search_purpose: string;
  compatibility: number;
}

const ANCESTRIES = [
  "Human", "Elf", "Dwarf", "Halfling", "Orc", "Gnome", "Tiefling",
  "Dragonborn", "Half-Elf", "Goblin", "Firbolg", "Genasi", "Aasimar"
];

const PURPOSES = ["Dating", "Hiring", "Specialist", "General"];

const Succubus = () => {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("discover");
  const [currentProfile, setCurrentProfile] = useState<GeneratedProfile | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [savedProfiles, setSavedProfiles] = useState<any[]>([]);

  // Filters
  const [filterAncestry, setFilterAncestry] = useState("");
  const [filterJob, setFilterJob] = useState("");
  const [filterCommunity, setFilterCommunity] = useState("");
  const [filterPurpose, setFilterPurpose] = useState("General");

  useEffect(() => {
    if (user) loadSavedProfiles();
  }, [user]);

  const loadSavedProfiles = async () => {
    const { data } = await supabase
      .from('succubus_profiles')
      .select('*')
      .eq('created_by', user!.id)
      .order('created_at', { ascending: false });
    setSavedProfiles(data || []);
  };

  const generateProfile = async () => {
    if (!user) return;
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-succubus-profile', {
        body: {
          action: 'generate',
          filters: {
            ancestry: filterAncestry || undefined,
            job: filterJob || undefined,
            community: filterCommunity || undefined,
            search_purpose: filterPurpose,
          }
        }
      });

      if (error) throw error;
      setCurrentProfile(data);
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const swipeRight = async () => {
    if (!currentProfile || !user) return;
    try {
      const { error } = await supabase.functions.invoke('generate-succubus-profile', {
        body: { action: 'save', profile: currentProfile }
      });
      if (error) throw error;
      toast({ title: "Connection saved!", description: `${currentProfile.character_name} added to your connections.` });
      loadSavedProfiles();
      setCurrentProfile(null);
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
  };

  const swipeLeft = () => {
    setCurrentProfile(null);
  };

  const deleteProfile = async (id: string) => {
    const { error } = await supabase.from('succubus_profiles').delete().eq('id', id);
    if (!error) {
      setSavedProfiles(prev => prev.filter(p => p.id !== id));
      toast({ title: "Connection removed" });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-muted-foreground">Please log in to use Succubus.</p>
      </div>
    );
  }

  // Admin-only gate
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-black relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-900/20 via-black to-pink-900/20" />
        <div className="relative z-10 container mx-auto px-4 py-8">
          <div className="flex items-center mb-8">
            <Link to="/">
              <Button variant="ghost" className="text-red-400 hover:text-red-300">
                <ArrowLeft className="w-4 h-4 mr-2" />Back to OS
              </Button>
            </Link>
          </div>
          <div className="flex flex-col items-center justify-center mt-32 text-center">
            <Lock className="w-16 h-16 text-red-500/50 mb-4" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-red-400 to-pink-400 bg-clip-text text-transparent mb-2">
              Succubus
            </h1>
            <p className="text-gray-400 text-lg">Coming Soon</p>
            <p className="text-gray-500 text-sm mt-2">This app is currently in development.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-red-900/20 via-black to-pink-900/20" />

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/">
            <Button variant="ghost" className="text-red-400 hover:text-red-300">
              <ArrowLeft className="w-4 h-4 mr-2" />Back to OS
            </Button>
          </Link>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-red-400 to-pink-400 bg-clip-text text-transparent">
            Succubus
          </h1>
          <div className="w-20" />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-gray-900/50 border border-red-500/20">
            <TabsTrigger value="discover" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400">
              <Sparkles className="w-4 h-4 mr-2" />Discover
            </TabsTrigger>
            <TabsTrigger value="connections" className="data-[state=active]:bg-pink-500/20 data-[state=active]:text-pink-400">
              <Users className="w-4 h-4 mr-2" />Connections ({savedProfiles.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="discover" className="space-y-6">
            {/* Filters */}
            <Card className="p-6 bg-gray-900/30 border-red-500/20">
              <h3 className="text-lg font-semibold text-white mb-4">Who are you looking for?</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-gray-400">Purpose</Label>
                  <Select value={filterPurpose} onValueChange={setFilterPurpose}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PURPOSES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-400">Ancestry (optional)</Label>
                  <Select value={filterAncestry || "any"} onValueChange={v => setFilterAncestry(v === "any" ? "" : v)}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      {ANCESTRIES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-400">Job (optional)</Label>
                  <Input
                    value={filterJob}
                    onChange={e => setFilterJob(e.target.value)}
                    placeholder="Any job..."
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-gray-400">Community (optional)</Label>
                  <Input
                    value={filterCommunity}
                    onChange={e => setFilterCommunity(e.target.value)}
                    placeholder="Any community..."
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              </div>
              {isAdmin ? (
                <Button
                  onClick={generateProfile}
                  disabled={isGenerating}
                  className="mt-4 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600"
                >
                  {isGenerating ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
                  ) : currentProfile ? (
                    <><Sparkles className="w-4 h-4 mr-2" />Generate Another</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-2" />Find Someone</>
                  )}
                </Button>
              ) : (
                <div className="mt-4 flex items-center gap-2 text-muted-foreground">
                  <Lock className="w-4 h-4" />
                  <span className="text-sm">Profile generation is currently admin-only.</span>
                </div>
              )}
            </Card>

            {/* Profile Card */}
            {currentProfile && (
              <Card className="max-w-md mx-auto bg-gray-900/50 border-red-500/30 overflow-hidden">
                {/* Avatar */}
                <div className="relative h-64 bg-gradient-to-br from-red-900/40 to-pink-900/40 flex items-center justify-center">
                  {currentProfile.avatar_url ? (
                    <img
                      src={currentProfile.avatar_url}
                      alt={currentProfile.character_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-8xl">👤</div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                    <h2 className="text-2xl font-bold text-white">{currentProfile.character_name}, {currentProfile.age}</h2>
                    <p className="text-gray-300 text-sm">{currentProfile.ancestry} • {currentProfile.job}</p>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  {/* Compatibility */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-400">Compatibility</span>
                      <span className="text-sm font-semibold text-green-400">{currentProfile.compatibility}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-red-500 to-pink-500 h-2 rounded-full transition-all"
                        style={{ width: `${currentProfile.compatibility}%` }}
                      />
                    </div>
                  </div>

                  <p className="text-gray-300 text-sm">{currentProfile.bio}</p>

                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <span>📍 {currentProfile.community}</span>
                    <span>• Looking for: {currentProfile.search_purpose}</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {currentProfile.tags.map((tag, i) => (
                      <Badge key={i} variant="outline" className="border-red-600/50 text-red-400 text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  {/* Swipe Buttons */}
                  <div className="flex justify-center gap-6 pt-4">
                    <Button
                      onClick={swipeLeft}
                      size="lg"
                      variant="outline"
                      className="rounded-full w-16 h-16 border-gray-600 text-gray-400 hover:border-red-500 hover:text-red-400"
                    >
                      <X className="w-8 h-8" />
                    </Button>
                    <Button
                      onClick={swipeRight}
                      size="lg"
                      className="rounded-full w-16 h-16 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600"
                    >
                      <Heart className="w-8 h-8" />
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {!currentProfile && !isGenerating && (
              <div className="text-center py-16">
                <Heart className="w-16 h-16 mx-auto text-red-500/30 mb-4" />
                <p className="text-gray-500 text-lg">Set your preferences and tap "Find Someone" to discover new connections.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="connections" className="space-y-4">
            {savedProfiles.length === 0 ? (
              <div className="text-center py-16">
                <Users className="w-16 h-16 mx-auto text-pink-500/30 mb-4" />
                <p className="text-gray-500 text-lg">No connections yet. Start swiping to find people!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedProfiles.map(profile => (
                  <Card key={profile.id} className="bg-gray-900/30 border-gray-700/50 overflow-hidden">
                    <div className="relative h-40 bg-gradient-to-br from-red-900/30 to-pink-900/30 flex items-center justify-center">
                      {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt={profile.character_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-6xl">👤</div>
                      )}
                      {profile.promoted_to_npc_id && (
                        <Badge className="absolute top-2 right-2 bg-green-600 text-white">NPC</Badge>
                      )}
                    </div>
                    <div className="p-4 space-y-2">
                      <h3 className="font-semibold text-white">{profile.character_name}, {profile.age}</h3>
                      <p className="text-gray-400 text-sm">{profile.ancestry} • {profile.job}</p>
                      <p className="text-gray-500 text-xs line-clamp-2">{profile.bio}</p>
                      <div className="flex flex-wrap gap-1">
                        {(profile.tags || []).slice(0, 3).map((tag: string, i: number) => (
                          <Badge key={i} variant="outline" className="border-red-600/30 text-red-400/70 text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex justify-end pt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteProfile(profile.id)}
                          className="text-gray-500 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Succubus;
