import { useNavigate } from "react-router-dom";
import { useAdmin } from "@/hooks/useAdmin";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, ArrowLeft, UserPlus, Edit, Eye, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NPCDialog } from "@/components/NPCDialog";
import { supabase } from "@/integrations/supabase/client";

const DopplegangerAdmin = () => {
  const navigate = useNavigate();
  const { isAdmin, isLoading, startImpersonation, impersonatedUser } = useAdmin();
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");

  useEffect(() => {
    if (isAdmin) loadUsers();
  }, [isAdmin]);

  const loadUsers = async () => {
    const { data } = await supabase.from("profiles").select("*").order("character_name");
    setUsers(data || []);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Shield className="h-12 w-12 text-primary animate-pulse" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <Button onClick={() => navigate("/")} variant="outline">Back to Home</Button>
        </div>
      </div>
    );
  }

  const characterClasses = [...new Set(users.map(u => u.character_class).filter(Boolean))].sort();

  const filteredUsers = users.filter(u => {
    const matchesSearch = !searchTerm ||
      u.character_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.character_class?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.ancestry?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = levelFilter === "all" ||
      (levelFilter === "low" && u.level <= 3) ||
      (levelFilter === "medium" && u.level >= 4 && u.level <= 7) ||
      (levelFilter === "high" && u.level >= 8);
    const matchesClass = classFilter === "all" ||
      u.character_class === classFilter ||
      (classFilter === "none" && !u.character_class);
    return matchesSearch && matchesLevel && matchesClass;
  });

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Doppleganger Admin</h1>
          </div>
          <Button onClick={() => navigate("/admin")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin
          </Button>
        </div>

        {/* NPC Creation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              NPC Management
            </CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4 items-center">
            <NPCDialog onSuccess={loadUsers} />
          </CardContent>
        </Card>

        {/* Character List */}
        <Card>
          <CardHeader>
            <CardTitle>All Characters ({filteredUsers.length} of {users.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
              <div className="space-y-2">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Level</Label>
                <Select value={levelFilter} onValueChange={setLevelFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="low">Low (1-3)</SelectItem>
                    <SelectItem value="medium">Medium (4-7)</SelectItem>
                    <SelectItem value="high">High (8+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Class</Label>
                <Select value={classFilter} onValueChange={setClassFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    <SelectItem value="none">No Class</SelectItem>
                    {characterClasses.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              {filteredUsers.map(u => (
                <div key={u.user_id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-semibold">{u.character_name || "Unnamed"}</p>
                    <p className="text-sm text-muted-foreground">
                      Level {u.level} • {u.character_class || "No class"} • {u.ancestry || "Unknown ancestry"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <NPCDialog npc={u} onSuccess={loadUsers} trigger={
                      <Button size="sm" variant="outline"><Edit className="h-4 w-4 mr-1" />Edit</Button>
                    } />
                    <Button size="sm" variant="outline"
                      onClick={() => startImpersonation(u.user_id)}
                      disabled={impersonatedUser?.user_id === u.user_id}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      {impersonatedUser?.user_id === u.user_id ? "Viewing" : "View As"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DopplegangerAdmin;
