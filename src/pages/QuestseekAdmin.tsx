import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Check, RefreshCw, Settings, Package, Download, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import { formatHexDenomination, formatHex } from "@/lib/currency";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

const QuestseekAdmin = () => {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const { toast } = useToast();

  const [quests, setQuests] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [profileMap, setProfileMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [downtimeConfig, setDowntimeConfig] = useState({ hours_per_day: 10 });

  // Create/Edit dialog
  const [questDialogOpen, setQuestDialogOpen] = useState(false);
  const [editingQuest, setEditingQuest] = useState<any>(null);
  const [questForm, setQuestForm] = useState({
    title: "", description: "", client: "", reward: 0, reward_min: 0,
    difficulty: "Low Risk", job_type: "commission", downtime_cost: 0,
    available_quantity: "", pay_interval: "daily", tags: "", time_limit: "",
  });

  // Complete dialog
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [finalPayment, setFinalPayment] = useState("");
  const [participants, setParticipants] = useState<string[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  // Replenish dialog
  const [replenishDialogOpen, setReplenishDialogOpen] = useState(false);
  const [replenishQuestId, setReplenishQuestId] = useState("");
  const [replenishQty, setReplenishQty] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdmin) {
      loadData();
      loadUsers();
    }
  }, [isAdmin]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [questRes, subRes, configRes] = await Promise.all([
        supabase.functions.invoke("quest-admin", { body: { operation: "get_all_quests" } }),
        supabase.functions.invoke("quest-admin", { body: { operation: "get_submitted_quests" } }),
        supabase.functions.invoke("quest-admin", { body: { operation: "get_downtime_config" } }),
      ]);
      if (questRes.data?.quests) setQuests(questRes.data.quests);
      if (questRes.data?.profileMap) setProfileMap(prev => ({ ...prev, ...questRes.data.profileMap }));
      if (subRes.data?.submissions) setSubmissions(subRes.data.submissions);
      if (subRes.data?.profileMap) setProfileMap(prev => ({ ...prev, ...subRes.data.profileMap }));
      if (configRes.data?.config) setDowntimeConfig(configRes.data.config);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    const { data } = await supabase.from("profiles").select("user_id, character_name").order("character_name");
    if (data) setAllUsers(data);
  };

  const openCreateDialog = () => {
    setEditingQuest(null);
    setQuestForm({ title: "", description: "", client: "", reward: 0, reward_min: 0, difficulty: "Low Risk", job_type: "commission", downtime_cost: 0, available_quantity: "", pay_interval: "daily", tags: "", time_limit: "" });
    setQuestDialogOpen(true);
  };

  const openEditDialog = (quest: any) => {
    setEditingQuest(quest);
    setQuestForm({
      title: quest.title, description: quest.description || "", client: quest.client || "",
      reward: quest.reward, reward_min: quest.reward_min || 0, difficulty: quest.difficulty || "Low Risk",
      job_type: quest.job_type, downtime_cost: quest.downtime_cost || 0,
      available_quantity: quest.available_quantity?.toString() || "",
      pay_interval: quest.pay_interval || "daily",
      tags: quest.tags?.join(", ") || "", time_limit: quest.time_limit || "",
    });
    setQuestDialogOpen(true);
  };

  const saveQuest = async () => {
    const payload: any = {
      title: questForm.title,
      description: questForm.description || null,
      client: questForm.client || null,
      reward: questForm.reward,
      reward_min: questForm.reward_min,
      difficulty: questForm.difficulty,
      job_type: questForm.job_type,
      downtime_cost: questForm.downtime_cost,
      available_quantity: questForm.available_quantity ? parseInt(questForm.available_quantity) : null,
      pay_interval: questForm.job_type === "full_time" ? questForm.pay_interval : null,
      tags: questForm.tags ? questForm.tags.split(",").map(t => t.trim()).filter(Boolean) : null,
      time_limit: questForm.time_limit || null,
    };

    const operation = editingQuest ? "update_quest" : "create_quest";
    if (editingQuest) payload.id = editingQuest.id;

    const { data, error } = await supabase.functions.invoke("quest-admin", {
      body: { operation, ...payload },
    });

    if (error || data?.error) {
      toast({ title: "Error", description: data?.error || "Failed to save", variant: "destructive" });
    } else {
      toast({ title: editingQuest ? "Quest updated" : "Quest created" });
      setQuestDialogOpen(false);
      loadData();
    }
  };

  const deleteQuest = async (id: string) => {
    const { data, error } = await supabase.functions.invoke("quest-admin", {
      body: { operation: "delete_quest", id },
    });
    if (!error && !data?.error) {
      toast({ title: "Quest cancelled" });
      loadData();
    }
  };

  const openCompleteDialog = (sub: any) => {
    setSelectedSubmission(sub);
    setFinalPayment(sub.quests?.reward?.toString() || "0");
    setParticipants([sub.user_id]);
    setCompleteDialogOpen(true);
  };

  const completeQuest = async () => {
    if (!selectedSubmission) return;
    const { data, error } = await supabase.functions.invoke("quest-admin", {
      body: {
        operation: "complete_quest",
        acceptanceId: selectedSubmission.id,
        finalPayment: parseInt(finalPayment) || 0,
        participants,
      },
    });
    if (error || data?.error) {
      toast({ title: "Error", description: data?.error || "Failed", variant: "destructive" });
    } else {
      toast({ title: `Paid ${data.participantsPaid} participant(s)` });
      setCompleteDialogOpen(false);
      loadData();
    }
  };

  const replenishQuest = async () => {
    const { data, error } = await supabase.functions.invoke("quest-admin", {
      body: { operation: "replenish_quest", questId: replenishQuestId, quantity: parseInt(replenishQty) || 0 },
    });
    if (!error && !data?.error) {
      toast({ title: `Replenished to ${data.newQuantity}` });
      setReplenishDialogOpen(false);
      loadData();
    }
  };

  const updateDowntimeHours = async (hours: number) => {
    const { data, error } = await supabase.functions.invoke("quest-admin", {
      body: { operation: "update_downtime_config", hoursPerDay: hours },
    });
    if (!error && !data?.error) {
      setDowntimeConfig(prev => ({ ...prev, hours_per_day: hours }));
      toast({ title: `Downtime set to ${hours}h/day` });
    }
  };

  const toggleParticipant = (userId: string) => {
    setParticipants(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  if (!isAdmin) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-red-400">Admin access required</div>;
  }

  const activeQuests = quests.filter(q => q.status === "active");
  const cancelledQuests = quests.filter(q => q.status === "cancelled");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const exportQuests = () => {
    const rows = quests.map(q => ({
      title: q.title,
      description: q.description || "",
      client: q.client || "",
      job_type: q.job_type,
      reward_min: q.reward_min || 0,
      reward: q.reward || 0,
      difficulty: q.difficulty || "",
      downtime_cost: q.downtime_cost || 0,
      available_quantity: q.available_quantity ?? "",
      pay_interval: q.pay_interval || "",
      tags: q.tags?.join(", ") || "",
      time_limit: q.time_limit || "",
      status: q.status || "active",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Quests");
    XLSX.writeFile(wb, "questseek_export.xlsx");
    toast({ title: `Exported ${rows.length} quests` });
  };

  const importQuests = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws);

      let created = 0, updated = 0, errors = 0;
      for (const row of rows) {
        const payload = {
          title: String(row.title || "").trim(),
          description: row.description ? String(row.description) : null,
          client: row.client ? String(row.client) : null,
          job_type: row.job_type || "commission",
          reward_min: parseInt(row.reward_min) || 0,
          reward: parseInt(row.reward) || 0,
          difficulty: row.difficulty || "Low Risk",
          downtime_cost: parseInt(row.downtime_cost) || 0,
          available_quantity: row.available_quantity !== "" && row.available_quantity != null ? parseInt(row.available_quantity) : null,
          pay_interval: row.pay_interval || null,
          tags: row.tags ? String(row.tags).split(",").map((t: string) => t.trim()).filter(Boolean) : null,
          time_limit: row.time_limit ? String(row.time_limit) : null,
          status: row.status || "active",
        };
        if (!payload.title) { errors++; continue; }

        // Check if quest with same title exists
        const existing = quests.find(q => q.title.toLowerCase() === payload.title.toLowerCase());
        if (existing) {
          const { error } = await supabase.functions.invoke("quest-admin", {
            body: { operation: "update_quest", id: existing.id, ...payload },
          });
          if (error) errors++; else updated++;
        } else {
          const { error } = await supabase.functions.invoke("quest-admin", {
            body: { operation: "create_quest", ...payload },
          });
          if (error) errors++; else created++;
        }
      }
      toast({ title: "Import complete", description: `Created: ${created}, Updated: ${updated}${errors ? `, Errors: ${errors}` : ""}` });
      loadData();
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 via-black to-teal-900/20" />

      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <Link to="/admin">
            <Button variant="ghost" className="text-cyan-400 hover:text-cyan-300">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Button>
          </Link>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
            Questseek Admin
          </h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportQuests} className="border-gray-700 text-gray-300 hover:text-white">
              <Download className="w-4 h-4 mr-1" /> Export
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="border-gray-700 text-gray-300 hover:text-white">
              <Upload className="w-4 h-4 mr-1" /> Import
            </Button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={importQuests} className="hidden" />
          </div>
        </div>




        <Tabs defaultValue="submissions" className="space-y-6">
          <TabsList className="bg-gray-900/50 border border-gray-700/50">
            <TabsTrigger value="submissions">
              Submissions {submissions.length > 0 && `(${submissions.length})`}
            </TabsTrigger>
            <TabsTrigger value="quests">All Quests</TabsTrigger>
          </TabsList>

          {/* Submissions Tab */}
          <TabsContent value="submissions" className="space-y-4">
            {submissions.length === 0 ? (
              <Card className="p-8 bg-gray-900/30 border-gray-700/50 text-center text-gray-400">
                No pending submissions.
              </Card>
            ) : (
              submissions.map(sub => (
                <Card key={sub.id} className="p-4 bg-yellow-900/10 border-yellow-500/30">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-white font-medium">{sub.quests?.title}</h4>
                      <p className="text-sm text-gray-400">
                        By: {profileMap[sub.user_id] || "Unknown"} • Reward range: {formatHex(sub.quests?.reward_min || 0)} – {formatHex(sub.quests?.reward || 0)}
                      </p>
                      <div className="flex gap-3 mt-2 text-sm">
                        {sub.roll_result !== null && (
                          <Badge variant="outline" className="text-cyan-400 border-cyan-500/50">
                            Roll: {sub.roll_result}
                          </Badge>
                        )}
                        {sub.roll_type && (
                          <Badge variant="outline" className={
                            sub.roll_type === "hope" ? "text-green-400 border-green-500/50" :
                            sub.roll_type === "fear" ? "text-red-400 border-red-500/50" :
                            sub.roll_type === "critical_success" ? "text-yellow-400 border-yellow-500/50" :
                            "text-purple-400 border-purple-500/50"
                          }>
                            {sub.roll_type.replace("_", " ")}
                          </Badge>
                        )}
                      </div>
                      {sub.notes && <p className="text-sm text-gray-400 mt-1 italic">"{sub.notes}"</p>}
                    </div>
                    <Button size="sm" onClick={() => openCompleteDialog(sub)}
                      className="bg-gradient-to-r from-emerald-500 to-teal-500">
                      <Check className="w-4 h-4 mr-1" /> Approve
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Quests Tab */}
          <TabsContent value="quests" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={openCreateDialog} className="bg-gradient-to-r from-emerald-500 to-teal-500">
                <Plus className="w-4 h-4 mr-1" /> New Quest
              </Button>
            </div>

            {activeQuests.map(quest => (
              <Card key={quest.id} className="p-4 bg-gray-900/30 border-gray-700/50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-white font-medium">{quest.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        {quest.job_type === "full_time" ? "Full-Time" : "Commission"}
                      </Badge>
                      {quest.difficulty && (
                        <Badge className="text-xs">{quest.difficulty}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-400">
                      {quest.reward_min > 0 ? `${formatHex(quest.reward_min)} – ${formatHex(quest.reward)}` : formatHex(quest.reward)}
                      {quest.downtime_cost > 0 && ` • ${quest.downtime_cost}h downtime`}
                      {quest.available_quantity !== null && ` • ${quest.available_quantity} available`}
                      {quest.pay_interval && ` • Pays ${quest.pay_interval}`}
                    </p>
                    {quest.quest_acceptances?.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {quest.quest_acceptances.map((a: any) => (
                          <Badge key={a.id} variant="outline" className="text-xs">
                            {profileMap[a.user_id] || "?"} ({a.status})
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {quest.available_quantity !== null && (
                      <Button size="sm" variant="outline" className="text-orange-400 border-orange-500/50"
                        onClick={() => { setReplenishQuestId(quest.id); setReplenishQty("5"); setReplenishDialogOpen(true); }}>
                        <Package className="w-4 h-4 mr-1" /> Replenish
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-gray-400" onClick={() => openEditDialog(quest)}>Edit</Button>
                    <Button size="sm" variant="ghost" className="text-red-400" onClick={() => deleteQuest(quest.id)}>Cancel</Button>
                  </div>
                </div>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      {/* Create/Edit Quest Dialog */}
      <Dialog open={questDialogOpen} onOpenChange={setQuestDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">{editingQuest ? "Edit Quest" : "Create Quest"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">Title</Label>
              <Input value={questForm.title} onChange={e => setQuestForm(f => ({ ...f, title: e.target.value }))}
                className="bg-gray-800 border-gray-600 text-white" />
            </div>
            <div>
              <Label className="text-gray-300">Description</Label>
              <Textarea value={questForm.description} onChange={e => setQuestForm(f => ({ ...f, description: e.target.value }))}
                className="bg-gray-800 border-gray-600 text-white" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Client</Label>
                <Input value={questForm.client} onChange={e => setQuestForm(f => ({ ...f, client: e.target.value }))}
                  className="bg-gray-800 border-gray-600 text-white" />
              </div>
              <div>
                <Label className="text-gray-300">Job Type</Label>
                <Select value={questForm.job_type} onValueChange={v => setQuestForm(f => ({ ...f, job_type: v }))}>
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="commission">Commission</SelectItem>
                    <SelectItem value="full_time">Full-Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Reward Min (⏣)</Label>
                <Input type="number" value={questForm.reward_min} onChange={e => setQuestForm(f => ({ ...f, reward_min: parseInt(e.target.value) || 0 }))}
                  className="bg-gray-800 border-gray-600 text-white" />
              </div>
              <div>
                <Label className="text-gray-300">Reward Max (⏣)</Label>
                <Input type="number" value={questForm.reward} onChange={e => setQuestForm(f => ({ ...f, reward: parseInt(e.target.value) || 0 }))}
                  className="bg-gray-800 border-gray-600 text-white" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Difficulty</Label>
                <Select value={questForm.difficulty} onValueChange={v => setQuestForm(f => ({ ...f, difficulty: v }))}>
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="Low Risk">Low Risk</SelectItem>
                    <SelectItem value="Medium Risk">Medium Risk</SelectItem>
                    <SelectItem value="High Risk">High Risk</SelectItem>
                    <SelectItem value="Illegal">Illegal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300">Downtime Cost (hours)</Label>
                <Input type="number" value={questForm.downtime_cost} onChange={e => setQuestForm(f => ({ ...f, downtime_cost: parseInt(e.target.value) || 0 }))}
                  className="bg-gray-800 border-gray-600 text-white" />
              </div>
            </div>
            {questForm.job_type === "commission" && (
              <div>
                <Label className="text-gray-300">Available Quantity (blank = unlimited)</Label>
                <Input type="number" value={questForm.available_quantity}
                  onChange={e => setQuestForm(f => ({ ...f, available_quantity: e.target.value }))}
                  className="bg-gray-800 border-gray-600 text-white" placeholder="Leave blank for unlimited" />
              </div>
            )}
            {questForm.job_type === "full_time" && (
              <div>
                <Label className="text-gray-300">Pay Interval</Label>
                <Select value={questForm.pay_interval} onValueChange={v => setQuestForm(f => ({ ...f, pay_interval: v }))}>
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label className="text-gray-300">Time Limit</Label>
              <Input value={questForm.time_limit} onChange={e => setQuestForm(f => ({ ...f, time_limit: e.target.value }))}
                className="bg-gray-800 border-gray-600 text-white" placeholder="e.g. 48 hours" />
            </div>
            <div>
              <Label className="text-gray-300">Tags (comma-separated)</Label>
              <Input value={questForm.tags} onChange={e => setQuestForm(f => ({ ...f, tags: e.target.value }))}
                className="bg-gray-800 border-gray-600 text-white" placeholder="Stealth, Hacking" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setQuestDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveQuest} className="bg-gradient-to-r from-emerald-500 to-teal-500">
              {editingQuest ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete/Approve Dialog */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Approve: {selectedSubmission?.quests?.title}</DialogTitle>
            <DialogDescription className="text-gray-400">
              By: {profileMap[selectedSubmission?.user_id] || "Unknown"}
              {selectedSubmission?.roll_result != null && ` • Roll: ${selectedSubmission?.roll_result} (${selectedSubmission?.roll_type?.replace("_", " ")})`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">Final Payment (⏣ Hex)</Label>
              <Input type="number" value={finalPayment} onChange={e => setFinalPayment(e.target.value)}
                className="bg-gray-800 border-gray-600 text-white" />
              <p className="text-xs text-gray-500 mt-1">
                Range: {formatHex(selectedSubmission?.quests?.reward_min || 0)} – {formatHex(selectedSubmission?.quests?.reward || 0)}
                {participants.length > 1 && ` • Split: ${formatHex(Math.floor((parseInt(finalPayment) || 0) / participants.length))} each`}
              </p>
            </div>
            <div>
              <Label className="text-gray-300">Participants (split payment)</Label>
              <div className="max-h-40 overflow-y-auto space-y-1 mt-1">
                {allUsers.map(u => (
                  <label key={u.user_id} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white p-1">
                    <input type="checkbox" checked={participants.includes(u.user_id)}
                      onChange={() => toggleParticipant(u.user_id)}
                      className="accent-emerald-500" />
                    {u.character_name}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCompleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={completeQuest} className="bg-gradient-to-r from-emerald-500 to-teal-500">
              <Check className="w-4 h-4 mr-1" /> Approve & Pay
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Replenish Dialog */}
      <Dialog open={replenishDialogOpen} onOpenChange={setReplenishDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Replenish Quantity</DialogTitle>
          </DialogHeader>
          <div>
            <Label className="text-gray-300">Add quantity</Label>
            <Input type="number" value={replenishQty} onChange={e => setReplenishQty(e.target.value)}
              className="bg-gray-800 border-gray-600 text-white" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReplenishDialogOpen(false)}>Cancel</Button>
            <Button onClick={replenishQuest} className="bg-orange-600 hover:bg-orange-700">Replenish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuestseekAdmin;
