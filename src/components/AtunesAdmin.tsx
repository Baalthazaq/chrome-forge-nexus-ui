import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { formatHex } from "@/lib/currency";
import { Search, AlertTriangle, Clock, Play, Pause, Hand, XCircle, Building2, User } from "lucide-react";

interface AdminSubscription {
  id: string;
  amount: number;
  description: string;
  interval_type: string;
  is_active: boolean;
  status: string;
  accumulated_amount: number;
  last_sent_at: string | null;
  next_send_at: string;
  total_times_sent: number;
  max_cycles: number | null;
  remaining_cycles: number | null;
  metadata: any;
  from_user_id: string | null;
  to_user_id: string;
  created_at: string;
}

interface Profile {
  user_id: string;
  character_name: string | null;
}

const statusIcons: Record<string, any> = {
  active: Play,
  paused: Pause,
  manual: Hand,
  cancelled: XCircle,
};

const statusColors: Record<string, string> = {
  active: "text-green-400",
  paused: "text-yellow-400",
  manual: "text-blue-400",
  cancelled: "text-red-400",
};

const AtunesAdmin = () => {
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [owedFilter, setOwedFilter] = useState("all");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [subsResult, profilesResult] = await Promise.all([
        supabase.from("recurring_payments").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("user_id, character_name"),
      ]);
      if (subsResult.data) setSubscriptions(subsResult.data);
      if (profilesResult.data) {
        const map: Record<string, string> = {};
        profilesResult.data.forEach((p: Profile) => { map[p.user_id] = p.character_name || "Unknown"; });
        setProfiles(map);
      }
    } catch (error) {
      console.error("Error loading admin subs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = subscriptions.filter((sub) => {
    const userName = profiles[sub.to_user_id] || "";
    const matchesSearch = !searchTerm ||
      sub.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      userName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || sub.status === statusFilter;
    const matchesOwed = owedFilter === "all" ||
      (owedFilter === "owed" && sub.accumulated_amount > 0) ||
      (owedFilter === "current" && sub.accumulated_amount === 0);
    return matchesSearch && matchesStatus && matchesOwed;
  });

  const totalOwed = subscriptions.reduce((sum, s) => sum + s.accumulated_amount, 0);
  const unpaidCount = subscriptions.filter(s => s.accumulated_amount > 0).length;

  if (isLoading) return <p className="text-muted-foreground p-4">Loading subscriptions...</p>;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="bg-muted/30"><CardContent className="p-3 text-center">
          <p className="text-xl font-bold">{subscriptions.length}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </CardContent></Card>
        <Card className="bg-muted/30"><CardContent className="p-3 text-center">
          <p className="text-xl font-bold text-green-400">{subscriptions.filter(s => s.status === "active").length}</p>
          <p className="text-xs text-muted-foreground">Active</p>
        </CardContent></Card>
        <Card className="bg-muted/30"><CardContent className="p-3 text-center">
          <p className="text-xl font-bold text-yellow-400">{subscriptions.filter(s => s.status === "paused").length}</p>
          <p className="text-xs text-muted-foreground">Paused</p>
        </CardContent></Card>
        <Card className="bg-muted/30"><CardContent className="p-3 text-center">
          <p className="text-xl font-bold text-red-400">{unpaidCount}</p>
          <p className="text-xs text-muted-foreground">Unpaid</p>
        </CardContent></Card>
        <Card className="bg-muted/30"><CardContent className="p-3 text-center">
          <p className={`text-xl font-bold ${totalOwed > 0 ? "text-red-400" : "text-muted-foreground"}`}>{formatHex(totalOwed)}</p>
          <p className="text-xs text-muted-foreground">Total Owed</p>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or user..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={owedFilter} onValueChange={setOwedFilter}>
          <SelectTrigger><SelectValue placeholder="All payments" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payments</SelectItem>
            <SelectItem value="owed">Has Unpaid Balance</SelectItem>
            <SelectItem value="current">Up to Date</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results */}
      <p className="text-sm text-muted-foreground">{filtered.length} subscriptions</p>
      <div className="space-y-3">
        {filtered.map((sub) => {
          const StatusIcon = statusIcons[sub.status] || Play;
          const color = statusColors[sub.status] || "text-muted-foreground";
          const userName = profiles[sub.to_user_id] || "Unknown User";
          const specs = sub.metadata as any;

          return (
            <Card key={sub.id} className="border">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <StatusIcon className={`w-4 h-4 ${color}`} />
                    <div>
                      <p className={`font-medium ${color}`}>{sub.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <User className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{userName}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{sub.status}</Badge>
                    <Badge variant="outline" className="text-xs">{sub.interval_type}</Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Rate: </span>
                    <span className="font-mono">{formatHex(sub.amount)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Charged: </span>
                    <span>{sub.total_times_sent}x</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Remaining: </span>
                    <span>{sub.remaining_cycles != null ? sub.remaining_cycles : "∞"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Last: </span>
                    <span>{sub.last_sent_at ? new Date(sub.last_sent_at).toLocaleDateString() : "Never"}</span>
                  </div>
                  <div>
                    {sub.accumulated_amount > 0 ? (
                      <span className="flex items-center gap-1 text-red-400">
                        <AlertTriangle className="w-3 h-3" />
                        Owes {formatHex(sub.accumulated_amount)}
                      </span>
                    ) : (
                      <span className="text-green-400">Current</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No subscriptions match filters</p>
        )}
      </div>
    </div>
  );
};

export default AtunesAdmin;
