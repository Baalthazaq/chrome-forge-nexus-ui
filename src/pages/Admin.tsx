import { useEffect, useState, useMemo } from 'react';
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
import { User, Shield, Eye, Settings, UserPlus, Zap, Trash2, Edit, Search } from 'lucide-react';
import { NPCDialog } from '@/components/NPCDialog';

const Admin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, isLoading, impersonatedUser, startImpersonation, stopImpersonation, getAllUsers } = useAdmin();
  const [users, setUsers] = useState<any[]>([]);
  const [isDeletingUser, setIsDeletingUser] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
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
    console.log('Admin: Loading users...');
    const usersList = await getAllUsers();
    console.log('Admin: Loaded users:', usersList);
    setUsers(usersList);
  };


  const deleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
      return;
    }

    setIsDeletingUser(userId);
    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { user_id: userId }
      });

      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: "User Deleted",
        description: data.message,
      });

      // Reload users
      loadUsers();

    } catch (error: any) {
      console.error('User deletion error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive"
      });
    } finally {
      setIsDeletingUser(null);
    }
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

  // Filter users based on search and filter criteria
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = !searchTerm || 
        user.character_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.character_class?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.ancestry?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.job?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.company?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesLevel = levelFilter === 'all' || 
        (levelFilter === 'low' && user.level <= 5) ||
        (levelFilter === 'medium' && user.level > 5 && user.level <= 15) ||
        (levelFilter === 'high' && user.level > 15);

      const matchesClass = classFilter === 'all' || 
        user.character_class === classFilter ||
        (classFilter === 'none' && !user.character_class);

      return matchesSearch && matchesLevel && matchesClass;
    });
  }, [users, searchTerm, levelFilter, classFilter]);

  // Get unique character classes for filter
  const characterClasses = useMemo(() => {
    const classes = users
      .map(user => user.character_class)
      .filter((className, index, arr) => className && arr.indexOf(className) === index)
      .sort();
    return classes;
  }, [users]);

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
              <Button
                onClick={() => navigate('/roldex-admin')}
                variant="outline"
                className="h-16 flex flex-col gap-2 hover:bg-primary/10"
              >
                <span className="font-semibold">Roldex Network</span>
                <span className="text-xs text-muted-foreground">Network Admin</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* NPC Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              NPC Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <NPCDialog onSuccess={loadUsers} />
          </CardContent>
        </Card>

        {/* User Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              User Management ({filteredUsers.length} of {users.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="search">Search Users</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by name, class, ancestry..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="level-filter">Level Range</Label>
                <Select value={levelFilter} onValueChange={setLevelFilter}>
                  <SelectTrigger id="level-filter">
                    <SelectValue placeholder="All levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="low">Low (1-5)</SelectItem>
                    <SelectItem value="medium">Medium (6-15)</SelectItem>
                    <SelectItem value="high">High (16+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="class-filter">Character Class</Label>
                <Select value={classFilter} onValueChange={setClassFilter}>
                  <SelectTrigger id="class-filter">
                    <SelectValue placeholder="All classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    <SelectItem value="none">No Class</SelectItem>
                    {characterClasses.map((className) => (
                      <SelectItem key={className} value={className}>
                        {className}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              {filteredUsers.map((userProfile) => (
                <div key={userProfile.user_id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{userProfile.character_name || 'Unnamed Character'}</p>
                      <p className="text-sm text-muted-foreground">
                        Level {userProfile.level} • {userProfile.credit_rating || userProfile.credits} credit rating
                      </p>
                      {userProfile.character_class && (
                        <p className="text-xs text-muted-foreground">
                          Class: {userProfile.character_class}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <NPCDialog 
                      npc={userProfile} 
                      onSuccess={loadUsers}
                      trigger={
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      }
                    />
                    <Button
                      onClick={() => startImpersonation(userProfile.user_id)}
                      disabled={impersonatedUser?.user_id === userProfile.user_id}
                      size="sm"
                      variant="outline"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      {impersonatedUser?.user_id === userProfile.user_id ? 'Current View' : 'View As'}
                    </Button>
                    <Button
                      onClick={() => deleteUser(userProfile.user_id, userProfile.character_name || 'Unknown User')}
                      disabled={isDeletingUser === userProfile.user_id || userProfile.user_id === user?.id}
                      size="sm"
                      variant="destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      {isDeletingUser === userProfile.user_id ? 'Deleting...' : 'Delete'}
                    </Button>
                  </div>
                </div>
              ))}
              {users.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No users found
                </p>
              )}
              {users.length > 0 && filteredUsers.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No users match the current filters
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
