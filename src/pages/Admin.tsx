import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User, Shield, Eye, Settings, UserPlus, Zap } from 'lucide-react';

const Admin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, isLoading, impersonatedUser, startImpersonation, stopImpersonation, getAllUsers } = useAdmin();
  const [users, setUsers] = useState<any[]>([]);
  const [isCreatingNPC, setIsCreatingNPC] = useState(false);
  const [npcForm, setNpcForm] = useState({
    character_name: '',
    character_class: '',
    level: 1,
    credits: 100
  });
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      navigate('/');
      return;
    }

    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin, isLoading, navigate]);

  const loadUsers = async () => {
    const usersList = await getAllUsers();
    setUsers(usersList);
  };

  const createNPCAccount = async () => {
    if (!npcForm.character_name.trim()) {
      toast({
        title: "Error",
        description: "Character name is required",
        variant: "destructive"
      });
      return;
    }

    setIsCreatingNPC(true);
    try {
      // Create a random email for the NPC
      const randomEmail = `npc_${Date.now()}@nexus.game`;
      const randomPassword = `npc_${Math.random().toString(36).substring(7)}`;

      // Create the auth user using admin function
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: randomEmail,
        password: randomPassword,
        email_confirm: true,
        user_metadata: {
          character_name: npcForm.character_name,
          is_npc: true
        }
      });

      if (authError) throw authError;

      // Create the profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: authData.user.id,
          character_name: npcForm.character_name,
          character_class: npcForm.character_class || 'NPC',
          level: npcForm.level,
          credits: npcForm.credits,
          bio: 'NPC Account'
        });

      if (profileError) throw profileError;

      toast({
        title: "NPC Created",
        description: `${npcForm.character_name} has been created successfully`,
      });

      // Reset form and reload users
      setNpcForm({
        character_name: '',
        character_class: '',
        level: 1,
        credits: 100
      });
      loadUsers();

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create NPC account",
        variant: "destructive"
      });
    } finally {
      setIsCreatingNPC(false);
    }
  };

  const generateRandomNPC = () => {
    const names = ['Vex', 'Cypher', 'Nova', 'Raven', 'Ghost', 'Phoenix', 'Shadow', 'Echo', 'Byte', 'Neon'];
    const classes = ['Netrunner', 'Street Samurai', 'Corpo', 'Techie', 'Medic', 'Fixer', 'Solo', 'Nomad'];
    
    const randomName = names[Math.floor(Math.random() * names.length)];
    const randomClass = classes[Math.floor(Math.random() * classes.length)];
    const randomLevel = Math.floor(Math.random() * 10) + 1;
    const randomCredits = Math.floor(Math.random() * 1000) + 100;

    setNpcForm({
      character_name: `${randomName}-${Math.floor(Math.random() * 1000)}`,
      character_class: randomClass,
      level: randomLevel,
      credits: randomCredits
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-primary" />
          <p className="text-lg">Checking admin permissions...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">You don't have admin permissions.</p>
          <Button onClick={() => navigate('/')} variant="outline">
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const apps = [
    'charisma', 'sending', 'vault', 'questseek', 'succubus',
    'doppleganger', 'beholdr', 'crucible', 'nexuswire', 
    'brittlewisp', 'wyrmcart', 'tome', 'roldex'
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            {impersonatedUser && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-warning/10 text-warning">
                  <Eye className="h-3 w-3 mr-1" />
                  Viewing as: {impersonatedUser.character_name}
                </Badge>
                <Button onClick={stopImpersonation} variant="outline" size="sm">
                  Stop Impersonation
                </Button>
              </div>
            )}
            <Button onClick={() => navigate('/')} variant="outline">
              Back to Home
            </Button>
          </div>
        </div>

        {/* Admin Apps Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Admin App Access
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {apps.map((app) => (
                <Button
                  key={app}
                  onClick={() => navigate(`/admin/${app}`)}
                  variant="outline"
                  className="h-16 flex flex-col gap-2 hover:bg-primary/10"
                >
                  <span className="font-semibold capitalize">{app}</span>
                  <span className="text-xs text-muted-foreground">Admin View</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick NPC Creation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Quick NPC Creation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="space-y-2">
                <Label htmlFor="character_name">Character Name</Label>
                <Input
                  id="character_name"
                  value={npcForm.character_name}
                  onChange={(e) => setNpcForm(prev => ({ ...prev, character_name: e.target.value }))}
                  placeholder="Enter NPC name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="character_class">Class</Label>
                <Select
                  value={npcForm.character_class}
                  onValueChange={(value) => setNpcForm(prev => ({ ...prev, character_class: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Netrunner">Netrunner</SelectItem>
                    <SelectItem value="Street Samurai">Street Samurai</SelectItem>
                    <SelectItem value="Corpo">Corpo</SelectItem>
                    <SelectItem value="Techie">Techie</SelectItem>
                    <SelectItem value="Medic">Medic</SelectItem>
                    <SelectItem value="Fixer">Fixer</SelectItem>
                    <SelectItem value="Solo">Solo</SelectItem>
                    <SelectItem value="Nomad">Nomad</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="level">Level</Label>
                <Input
                  id="level"
                  type="number"
                  min="1"
                  max="50"
                  value={npcForm.level}
                  onChange={(e) => setNpcForm(prev => ({ ...prev, level: parseInt(e.target.value) || 1 }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="credits">Credits</Label>
                <Input
                  id="credits"
                  type="number"
                  min="0"
                  value={npcForm.credits}
                  onChange={(e) => setNpcForm(prev => ({ ...prev, credits: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={createNPCAccount}
                disabled={isCreatingNPC || !npcForm.character_name.trim()}
                className="flex items-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                {isCreatingNPC ? 'Creating...' : 'Create NPC'}
              </Button>
              
              <Button
                onClick={generateRandomNPC}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Zap className="h-4 w-4" />
                Random NPC
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* User Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              User Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {users.map((userProfile) => (
                <div key={userProfile.user_id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{userProfile.character_name || 'Unnamed Character'}</p>
                      <p className="text-sm text-muted-foreground">
                        Level {userProfile.level} • {userProfile.credits} credits
                      </p>
                      {userProfile.character_class && (
                        <p className="text-xs text-muted-foreground">
                          Class: {userProfile.character_class}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => startImpersonation(userProfile.user_id)}
                      disabled={impersonatedUser?.user_id === userProfile.user_id}
                      size="sm"
                      variant="outline"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      {impersonatedUser?.user_id === userProfile.user_id ? 'Current View' : 'View As'}
                    </Button>
                  </div>
                </div>
              ))}
              {users.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No users found
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;