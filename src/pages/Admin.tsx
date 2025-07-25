import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Shield, Eye, Settings } from 'lucide-react';

const Admin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, isLoading, impersonatedUser, startImpersonation, stopImpersonation, getAllUsers } = useAdmin();
  const [users, setUsers] = useState<any[]>([]);

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
    return null;
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