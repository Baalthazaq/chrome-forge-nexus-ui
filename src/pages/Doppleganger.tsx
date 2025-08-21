import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, User, Shield, Zap, Eye, Settings, Camera, Activity, Dumbbell, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

const Doppleganger = () => {
  const { user } = useAuth();
  const { impersonatedUser, isAdmin } = useAdmin();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [reputationTags, setReputationTags] = useState<string[]>([]);
  const [userActivity, setUserActivity] = useState<any[]>([]);
  const [augmentations, setAugmentations] = useState<any[]>([]);
  const [selectedDisplayName, setSelectedDisplayName] = useState('');
  
  const [form, setForm] = useState({
    character_name: '',
    job: '',
    employer: '',
    education: '',
    address: '',
    bio: '',
    age: null as number | null,
    aliases: [] as string[],
    security_rating: 'C',
    ancestry: '',
    agility: 10,
    strength: 10,
    finesse: 10,
    instinct: 10,
    presence: 10,
    knowledge: 10,
  });

  // Use impersonated user if available, otherwise use authenticated user
  const displayUser = impersonatedUser || user;

  useEffect(() => {
    const fetchData = async () => {
      if (!displayUser) {
        setLoading(false);
        return;
      }

      const userId = (displayUser as any).user_id || (displayUser as any).id;

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!profileError && profileData) {
        setProfile(profileData);
        setForm({
          character_name: profileData.character_name || '',
          job: profileData.job || '',
          employer: profileData.employer || '',
          education: profileData.education || '',
          address: profileData.address || '',
          bio: profileData.bio || '',
          age: profileData.age,
          aliases: profileData.aliases || [],
          security_rating: profileData.security_rating || 'C',
          ancestry: profileData.ancestry || '',
          agility: profileData.agility || 10,
          strength: profileData.strength || 10,
          finesse: profileData.finesse || 10,
          instinct: profileData.instinct || 10,
          presence: profileData.presence || 10,
          knowledge: profileData.knowledge || 10,
        });
        
        // Set initial display name
        const displayOptions = [profileData.character_name, ...(profileData.aliases || [])].filter(Boolean);
        setSelectedDisplayName(displayOptions[0] || profileData.character_name || '');
      }

      // Fetch reputation tags from contact_tags where user is the contact
      const { data: tagsData } = await supabase
        .from('contact_tags')
        .select(`
          tag,
          contacts!inner(contact_user_id)
        `)
        .eq('contacts.contact_user_id', userId);
      
      if (tagsData) {
        setReputationTags(tagsData.map(t => t.tag));
      }

      // Fetch user activity
      const { data: activityData } = await supabase
        .from('user_activity')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (activityData) {
        setUserActivity(activityData);
      }

      // Fetch augmentations
      const { data: augData } = await supabase
        .from('user_augmentations')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active');
      
      if (augData) {
        setAugmentations(augData);
      }

      setLoading(false);
    };

    fetchData();
  }, [displayUser]);

  useEffect(() => {
    if (!profile) return;
    document.title = `Doppleganger – ${profile.character_name || 'Profile'}`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute('content', `Identity profile for ${profile.character_name || 'user'} with enhanced biometric data and augmentation status.`);
    }
  }, [profile]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !displayUser) return;

    setAvatarUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar_${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { 
          cacheControl: '3600',
          upsert: true 
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL');
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('user_id', (displayUser as any).user_id || (displayUser as any).id);

      if (updateError) throw updateError;

      setProfile((prev: any) => ({ ...prev, avatar_url: urlData.publicUrl }));
      toast({ title: 'Avatar updated successfully' });
    } catch (e: any) {
      toast({ 
        title: 'Avatar upload failed', 
        description: e.message || 'Unknown error occurred', 
        variant: 'destructive' 
      });
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSave = async () => {
    if (!displayUser) return;
    try {
      setLoading(true);
      const updates: any = {
        character_name: form.character_name,
        job: form.job,
        employer: form.employer,
        education: form.education,
        address: form.address,
        bio: form.bio,
        age: form.age,
        aliases: form.aliases,
        security_rating: form.security_rating,
        ancestry: form.ancestry,
        agility: form.agility,
        strength: form.strength,
        finesse: form.finesse,
        instinct: form.instinct,
        presence: form.presence,
        knowledge: form.knowledge,
        updated_at: new Date().toISOString(),
      };

      // Track activity
      await supabase.from('user_activity').insert({
        user_id: (displayUser as any).user_id || (displayUser as any).id,
        activity_type: 'profile_update',
        activity_description: 'Updated profile information',
        metadata: { fields_updated: Object.keys(updates) }
      });

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', (displayUser as any).user_id || (displayUser as any).id)
        .select('*')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile(data);
        // Update display name options
        const displayOptions = [data.character_name, ...(data.aliases || [])].filter(Boolean);
        if (!displayOptions.includes(selectedDisplayName)) {
          setSelectedDisplayName(displayOptions[0] || data.character_name || '');
        }
      }

      toast({ title: 'Profile updated' });
      setIsEditing(false);
    } catch (e: any) {
      toast({ title: 'Update failed', description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const addAlias = () => {
    setForm(prev => ({ ...prev, aliases: [...prev.aliases, ''] }));
  };

  const updateAlias = (index: number, value: string) => {
    setForm(prev => ({
      ...prev,
      aliases: prev.aliases.map((alias, i) => i === index ? value : alias)
    }));
  };

  const removeAlias = (index: number) => {
    setForm(prev => ({
      ...prev,
      aliases: prev.aliases.filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Please log in to access your profile.</div>
      </div>
    );
  }

  const displayOptions = [profile.character_name, ...(profile.aliases || [])].filter(Boolean);
  const repScore = profile.charisma_score || 10;

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-black to-purple-900/20"></div>
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/">
            <Button variant="ghost" className="text-cyan-400 hover:text-cyan-300">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to OS
            </Button>
          </Link>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Doppleganger
          </h1>
          <div className="w-20"></div>
        </div>

        {/* Profile Header */}
        <Card className="p-6 bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border-indigo-500/30 mb-8">
          <div className="flex items-center space-x-6">
            <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-indigo-500">
              <img 
                src={profile.avatar_url || `https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face`}
                alt={profile.character_name || 'Character'}
                className="w-full h-full object-cover"
              />
              {isEditing && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <label className="cursor-pointer">
                    <Camera className="w-6 h-6 text-white" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      disabled={avatarUploading}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
              {avatarUploading && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                  <div className="text-white text-xs">Uploading...</div>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="mb-2">
                <h2 className="text-3xl font-bold text-white break-words overflow-wrap-anywhere">
                  {selectedDisplayName}
                </h2>
              </div>
              <div className="text-indigo-400 text-lg mb-2">{profile.job || 'Netrunner'}</div>
              <div className="flex space-x-2">
                <Badge className="bg-green-600">Verified</Badge>
                <Badge className="bg-blue-600">Premium</Badge>
                <Badge className="bg-purple-600">Elite Status</Badge>
              </div>
            </div>
            <Button variant="outline" className="border-indigo-500 text-indigo-400" onClick={() => setIsEditing((v) => !v)}>
              <Settings className="w-4 h-4 mr-2" />
              {isEditing ? "Cancel" : "Edit Profile"}
            </Button>
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-4 bg-gray-900/30 border-gray-700/50">
            <div className="flex items-center space-x-3">
              <Shield className="w-8 h-8 text-blue-400" />
              <div>
                <div className="text-gray-400 text-sm">Security Level</div>
                <div className="text-2xl font-bold text-white">{profile.security_rating || 'C'}</div>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-gray-900/30 border-gray-700/50">
            <div className="flex items-center space-x-3">
              <Zap className="w-8 h-8 text-yellow-400" />
              <div>
                <div className="text-gray-400 text-sm">Neural Rating</div>
                <div className="text-2xl font-bold text-white">{Math.round((profile.neural_rating || 0) * 10) / 10}</div>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-gray-900/30 border-gray-700/50">
            <div className="flex items-center space-x-3">
              <Eye className="w-8 h-8 text-green-400" />
              <div>
                <div className="text-gray-400 text-sm">Stealth Index</div>
                <div className="text-2xl font-bold text-white">{Math.round((profile.stealth_index || 0) * 10) / 10}</div>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-gray-900/30 border-gray-700/50">
            <div className="flex items-center space-x-3">
              <User className="w-8 h-8 text-purple-400" />
              <div>
                <div className="text-gray-400 text-sm">Rep Score (Cha)</div>
                <div className="text-2xl font-bold text-white">{repScore}</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Identity & Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Identity */}
          <Card className="p-6 bg-gray-900/30 border-gray-700/50">
            <h3 className="text-xl font-semibold text-white mb-4">Identity</h3>
            {!isEditing ? (
              <div className="space-y-3">
                <div>
                  <div className="text-gray-400 text-sm">Name</div>
                  <div className="text-white">{profile.character_name || '-'}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm">Aliases</div>
                  <div className="text-white">{(profile.aliases || []).join(', ') || '-'}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm">Ancestry</div>
                  <div className="text-white">{profile.ancestry || '-'}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm">Job</div>
                  <div className="text-white">{profile.job || '-'}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm">Employer</div>
                  <div className="text-white">{profile.employer || '-'}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm">Education</div>
                  <div className="text-white">{profile.education || '-'}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm">Address</div>
                  <div className="text-white">{profile.address || '-'}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm">Age</div>
                  <div className="text-white">{profile.age ?? '-'}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm">Bio</div>
                  <div className="text-white">{profile.bio || '-'}</div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Name</label>
                  <Input value={form.character_name} onChange={(e) => setForm({ ...form, character_name: e.target.value })} />
                </div>
                
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Display Name</label>
                  <Select value={selectedDisplayName} onValueChange={setSelectedDisplayName}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select display name" />
                    </SelectTrigger>
                    <SelectContent>
                      {displayOptions.map((name, index) => (
                        <SelectItem key={index} value={name}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Aliases</label>
                  {form.aliases.map((alias, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <Input value={alias} onChange={(e) => updateAlias(index, e.target.value)} />
                      <Button variant="outline" size="sm" onClick={() => removeAlias(index)}>Remove</Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addAlias}>Add Alias</Button>
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Ancestry</label>
                  <Input value={form.ancestry} onChange={(e) => setForm({ ...form, ancestry: e.target.value })} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-400 text-sm mb-1 block">Job</label>
                    <Input value={form.job} onChange={(e) => setForm({ ...form, job: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm mb-1 block">Employer</label>
                    <Input value={form.employer} onChange={(e) => setForm({ ...form, employer: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm mb-1 block">Education</label>
                    <Input value={form.education} onChange={(e) => setForm({ ...form, education: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm mb-1 block">Age</label>
                    <Input type="number" min={0} value={form.age ?? ''} onChange={(e) => setForm({ ...form, age: e.target.value === '' ? null : Number(e.target.value) })} />
                  </div>
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Address</label>
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>

                {isAdmin && (
                  <div>
                    <label className="text-gray-400 text-sm mb-1 block">Security Rating</label>
                    <Select value={form.security_rating} onValueChange={(value) => setForm({ ...form, security_rating: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="F">F</SelectItem>
                        <SelectItem value="E">E</SelectItem>
                        <SelectItem value="D">D</SelectItem>
                        <SelectItem value="C">C</SelectItem>
                        <SelectItem value="B">B</SelectItem>
                        <SelectItem value="A">A</SelectItem>
                        <SelectItem value="AA">AA</SelectItem>
                        <SelectItem value="AAA">AAA</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Bio</label>
                  <Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={4} />
                </div>
              </div>
            )}
          </Card>

          {/* Core Stats */}
          <Card className="p-6 bg-gray-900/30 border-gray-700/50">
            <h3 className="text-xl font-semibold text-white mb-4">Core Stats</h3>
            {!isEditing ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-gray-400 text-sm">Agility</div>
                  <div className="text-white text-xl font-bold">{profile.agility || 10}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm">Strength</div>
                  <div className="text-white text-xl font-bold">{profile.strength || 10}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm">Finesse</div>
                  <div className="text-white text-xl font-bold">{profile.finesse || 10}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm">Instinct</div>
                  <div className="text-white text-xl font-bold">{profile.instinct || 10}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm">Presence</div>
                  <div className="text-white text-xl font-bold">{profile.presence || 10}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm">Knowledge</div>
                  <div className="text-white text-xl font-bold">{profile.knowledge || 10}</div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Agility</label>
                  <Input type="number" value={form.agility} onChange={(e) => setForm({ ...form, agility: Number(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Strength</label>
                  <Input type="number" value={form.strength} onChange={(e) => setForm({ ...form, strength: Number(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Finesse</label>
                  <Input type="number" value={form.finesse} onChange={(e) => setForm({ ...form, finesse: Number(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Instinct</label>
                  <Input type="number" value={form.instinct} onChange={(e) => setForm({ ...form, instinct: Number(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Presence</label>
                  <Input type="number" value={form.presence} onChange={(e) => setForm({ ...form, presence: Number(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Knowledge</label>
                  <Input type="number" value={form.knowledge} onChange={(e) => setForm({ ...form, knowledge: Number(e.target.value) || 0 })} />
                </div>
              </div>
            )}
            <p className="text-xs text-gray-400 mt-4">
              These stats auto-calculate Fitness ({Math.round((profile.fitness_rating || 0) * 10) / 10}), Neural ({Math.round((profile.neural_rating || 0) * 10) / 10}), and Stealth ({Math.round((profile.stealth_index || 0) * 10) / 10}) ratings.
            </p>
          </Card>

          {/* Fitness Rating when not editing */}
          {!isEditing && (
            <Card className="p-6 bg-gray-900/30 border-gray-700/50">
              <h3 className="text-xl font-semibold text-white mb-4">Physical Metrics</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Dumbbell className="w-8 h-8 text-orange-400" />
                  <div>
                    <div className="text-gray-400 text-sm">Fitness Rating</div>
                    <div className="text-2xl font-bold text-white">{Math.round((profile.fitness_rating || 0) * 10) / 10}</div>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>

        {isEditing && (
          <div className="mb-8">
            <Button onClick={handleSave} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
              Save Changes
            </Button>
          </div>
        )}

        {/* Augmentations */}
        <Card className="p-6 bg-gray-900/30 border-gray-700/50 mb-8">
          <h3 className="text-xl font-semibold text-white mb-4">Active Augmentations</h3>
          {augmentations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {augmentations.map((aug) => (
                <div key={aug.id} className="p-4 bg-gray-800/50 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="text-white font-semibold">{aug.name}</div>
                      <div className="text-gray-400 text-sm">{aug.category}</div>
                    </div>
                    <Badge className={aug.status === "active" ? "bg-green-600" : "bg-red-600"}>
                      {aug.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Efficiency</span>
                    <span className="text-green-400 font-mono">{aug.efficiency_percent}%</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-400 text-center py-8">No active augmentations</div>
          )}
        </Card>

        {/* Tags & Activity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 bg-gray-900/30 border-gray-700/50">
            <h3 className="text-xl font-semibold text-white mb-4">Reputation Tags</h3>
            <div className="flex flex-wrap gap-2">
              {reputationTags.length > 0 ? reputationTags.map((tag, index) => (
                <Badge key={index} variant="outline" className="border-indigo-500 text-indigo-400">
                  {tag}
                </Badge>
              )) : (
                <div className="text-gray-400 text-sm">No reputation tags yet</div>
              )}
            </div>
          </Card>

          <Card className="p-6 bg-gray-900/30 border-gray-700/50">
            <h3 className="text-xl font-semibold text-white mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {userActivity.length > 0 ? userActivity.map((activity) => (
                <div key={activity.id} className="text-gray-300 text-sm p-2 bg-gray-800/50 rounded">
                  <div>{activity.activity_description}</div>
                  <div className="text-xs text-gray-500">{new Date(activity.created_at).toLocaleDateString()}</div>
                </div>
              )) : (
                <div className="text-gray-400 text-sm">No recent activity</div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Doppleganger;