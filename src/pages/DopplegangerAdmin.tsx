import { useNavigate } from "react-router-dom";
import { useAdmin } from "@/hooks/useAdmin";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, ArrowLeft, UserPlus, Edit, Eye, Search, Download, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NPCDialog } from "@/components/NPCDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
const DopplegangerAdmin = () => {
  const navigate = useNavigate();
  const { isAdmin, isLoading, startImpersonation, impersonatedUser } = useAdmin();
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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

  const exportFields = [
    'character_name', 'ancestry', 'job', 'company', 'character_class', 'level',
    'credit_rating', 'notes', 'is_searchable', 'has_succubus_profile',
    'agility', 'strength', 'finesse', 'instinct', 'presence', 'knowledge',
    'age', 'bio', 'employer', 'education', 'address', 'aliases', 'alias',
  ];

  const handleExport = () => {
    const data = filteredUsers.map(u => {
      const obj: Record<string, any> = {};
      for (const f of exportFields) {
        if (u[f] !== undefined && u[f] !== null) obj[f] = u[f];
      }
      return obj;
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Characters");
    XLSX.writeFile(wb, `npcs-export-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast({ title: "Exported", description: `${data.length} characters exported as XLSX.` });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      let records: any[];
      if (file.name.endsWith('.json')) {
        const text = await file.text();
        records = JSON.parse(text);
      } else {
        const data = await file.arrayBuffer();
        const wb = XLSX.read(data);
        records = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      }
      if (!Array.isArray(records)) throw new Error("File must contain an array/sheet of characters.");

      let created = 0;
      let failed = 0;
      for (const rec of records) {
        if (!rec.character_name) { failed++; continue; }
        const { data, error } = await supabase.functions.invoke('create-npc', { body: rec });
        if (error) { console.error('Import error:', error); failed++; }
        else {
          // Sync character sheet
          if (data?.npc_id) {
            await supabase.from('character_sheets').upsert({
              user_id: data.npc_id,
              class: rec.character_class || null,
              subclass: rec.subclass || null,
              community: rec.community || null,
              ancestry: rec.ancestry || null,
              level: rec.level || 1,
            }, { onConflict: 'user_id' });
          }
          created++;
        }
      }
      toast({ title: "Import Complete", description: `${created} created, ${failed} failed.` });
      loadUsers();
    } catch (err: any) {
      toast({ title: "Import Error", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };


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
          <CardContent className="flex gap-4 items-center flex-wrap">
            <NPCDialog onSuccess={loadUsers} />
            <Button onClick={handleExport} variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export {filteredUsers.length === users.length ? 'All' : `${filteredUsers.length} Filtered`}
            </Button>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.xlsx,.xls,.csv"
                className="hidden"
                onChange={handleImport}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="flex items-center gap-2"
                disabled={importing}
              >
                <Upload className="h-4 w-4" />
                {importing ? 'Importing...' : 'Bulk Import'}
              </Button>
            </div>
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
                    <NPCDialog npc={u} onSuccess={loadUsers} showDelete={true} currentUserId={user?.id} trigger={
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
