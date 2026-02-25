
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Bug, Lightbulb, ExternalLink, Filter } from "lucide-react";

const ICON_URL = "https://csyajgxbptbtluxdiepi.supabase.co/storage/v1/object/public/icons/Suggestion.gif";

const STATUS_OPTIONS = ["open", "reviewed", "planned", "done", "dismissed"];

const statusColors: Record<string, string> = {
  open: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  reviewed: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  planned: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  done: "bg-green-500/20 text-green-300 border-green-500/30",
  dismissed: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const SuggestionAdmin = () => {
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  const { data: suggestions, isLoading } = useQuery({
    queryKey: ["admin-suggestions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suggestions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      // Get profiles for user names
      const userIds = [...new Set(data.map((s: any) => s.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, character_name")
        .in("user_id", userIds);
      const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p.character_name]));
      return data.map((s: any) => ({ ...s, character_name: profileMap[s.user_id] || "Unknown" }));
    },
    enabled: isAdmin,
  });

  const updateSuggestion = async (id: string, updates: Record<string, any>) => {
    const { error } = await supabase.from("suggestions").update(updates).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Updated" });
      queryClient.invalidateQueries({ queryKey: ["admin-suggestions"] });
    }
  };

  const filtered = (suggestions || []).filter((s: any) => {
    if (filterStatus !== "all" && s.status !== filterStatus) return false;
    if (filterType !== "all" && s.type !== filterType) return false;
    return true;
  });

  if (!isAdmin) return <div className="min-h-screen bg-black flex items-center justify-center text-red-400">Access Denied</div>;

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900" />
      <div className="relative z-10 container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold text-green-400">Suggestion Admin</h1>
          </div>
          <div className="w-12 h-12 rounded-lg border border-green-500/40 overflow-hidden">
            <img src={ICON_URL} alt="Suggestion" className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px] bg-gray-800/80 border-gray-600 text-gray-200">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="all" className="text-gray-200">All Statuses</SelectItem>
              {STATUS_OPTIONS.map(s => (
                <SelectItem key={s} value={s} className="text-gray-200 capitalize">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[140px] bg-gray-800/80 border-gray-600 text-gray-200">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="all" className="text-gray-200">All Types</SelectItem>
              <SelectItem value="suggestion" className="text-gray-200">Suggestions</SelectItem>
              <SelectItem value="issue" className="text-gray-200">Issues</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-gray-500 text-sm self-center font-mono">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {/* List */}
        {isLoading ? (
          <p className="text-gray-400 text-center py-8">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No suggestions found.</p>
        ) : (
          <div className="space-y-4">
            {filtered.map((s: any) => (
              <SuggestionCard key={s.id} suggestion={s} onUpdate={updateSuggestion} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const SuggestionCard = ({ suggestion: s, onUpdate }: { suggestion: any; onUpdate: (id: string, u: any) => void }) => {
  const [notes, setNotes] = useState(s.admin_notes || "");
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="p-4 bg-gray-900/50 border-gray-700/50">
      <div className="flex items-start gap-3">
        <div className="mt-1">
          {s.type === "issue" ? <Bug className="w-5 h-5 text-red-400" /> : <Lightbulb className="w-5 h-5 text-green-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-cyan-300 font-semibold text-sm">{s.character_name}</span>
            <Badge className={`${s.type === "issue" ? "bg-red-500/20 text-red-300 border-red-500/30" : "bg-green-500/20 text-green-300 border-green-500/30"} text-xs`}>
              {s.type}
            </Badge>
            {s.related_app && <Badge variant="outline" className="text-xs text-gray-400 border-gray-600">{s.related_app}</Badge>}
            <Select value={s.status} onValueChange={(val) => onUpdate(s.id, { status: val })}>
              <SelectTrigger className={`h-6 text-xs px-2 w-auto border ${statusColors[s.status]}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {STATUS_OPTIONS.map(st => (
                  <SelectItem key={st} value={st} className="text-gray-200 capitalize text-xs">{st}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-gray-300 text-sm whitespace-pre-wrap">{s.description}</p>

          {s.screenshot_url && (
            <a href={s.screenshot_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-xs text-cyan-400 hover:underline">
              <ExternalLink className="w-3 h-3" /> View screenshot
            </a>
          )}

          <p className="text-xs text-gray-500 mt-2 font-mono">{new Date(s.created_at).toLocaleString()}</p>

          {/* Admin notes */}
          <button onClick={() => setExpanded(!expanded)} className="text-xs text-gray-400 hover:text-gray-200 mt-2">
            {expanded ? "Hide notes" : "Admin notes..."}
          </button>
          {expanded && (
            <div className="mt-2 flex gap-2">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add admin notes..."
                className="bg-gray-800/80 border-gray-600 text-gray-200 text-sm min-h-[60px] flex-1"
              />
              <Button size="sm" className="bg-green-600 hover:bg-green-700 self-end" onClick={() => onUpdate(s.id, { admin_notes: notes })}>
                Save
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default SuggestionAdmin;
