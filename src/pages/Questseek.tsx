import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Clock, User, Briefcase, Timer, Package, AlertTriangle, Moon, Sun } from "lucide-react";
import { Link } from "react-router-dom";
import RestDialog from "@/components/RestDialog";
import { formatHexDenomination } from "@/lib/currency";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Quest {
  id: string;
  title: string;
  description: string | null;
  client: string | null;
  reward: number;
  reward_min: number;
  difficulty: string | null;
  time_limit: string | null;
  tags: string[] | null;
  job_type: string;
  downtime_cost: number;
  available_quantity: number | null;
  pay_interval: string | null;
  status: string | null;
}

interface QuestAcceptance {
  id: string;
  quest_id: string;
  user_id: string;
  status: string | null;
  notes: string | null;
  roll_result: number | null;
  roll_type: string | null;
  submitted_at: string | null;
  completed_at: string | null;
  final_payment: number | null;
  times_completed: number;
  quests: Quest;
}

const difficultyColors: Record<string, string> = {
  "Low Risk": "bg-green-900/30 text-green-400 border-green-500/50",
  "Medium Risk": "bg-yellow-900/30 text-yellow-400 border-yellow-500/50",
  "High Risk": "bg-red-900/30 text-red-400 border-red-500/50",
  "Illegal": "bg-purple-900/30 text-purple-400 border-purple-500/50",
};

const Questseek = () => {
  const { user } = useAuth();
  const { isAdmin, impersonatedUser } = useAdmin();
  const { toast } = useToast();
  const effectiveUserId = impersonatedUser?.user_id || user?.id;

  const [quests, setQuests] = useState<Quest[]>([]);
  const [myQuests, setMyQuests] = useState<QuestAcceptance[]>([]);
  const [downtimeBalance, setDowntimeBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [selectedQuest, setSelectedQuest] = useState<QuestAcceptance | null>(null);
  const [rollResult, setRollResult] = useState("");
  const [rollType, setRollType] = useState("");
  const [submitNotes, setSubmitNotes] = useState("");
  const [restType, setRestType] = useState<"short" | "long">("short");
  const [restOpen, setRestOpen] = useState(false);
  const [gameDate, setGameDate] = useState<{ day: number; month: number; year: number } | undefined>();

  useEffect(() => {
    supabase.from("game_calendar").select("*").limit(1).single().then(({ data }) => {
      if (data) setGameDate({ day: data.current_day, month: data.current_month, year: data.current_year });
    });
  }, []);

  useEffect(() => {
    if (effectiveUserId) {
      loadData();
    }
  }, [effectiveUserId]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadQuests(), loadMyQuests(), loadDowntime()]);
    } finally {
      setLoading(false);
    }
  };

  const loadQuests = async () => {
    const { data, error } = await supabase
      .from("quests")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false });
    if (!error && data) setQuests(data as any);
  };

  const loadMyQuests = async () => {
    const { data, error } = await supabase.functions.invoke("quest-operations", {
      body: { operation: "get_user_quests", targetUserId: impersonatedUser?.user_id },
    });
    if (!error && data?.quests) setMyQuests(data.quests);
  };

  const loadDowntime = async () => {
    const { data, error } = await supabase.functions.invoke("quest-operations", {
      body: { operation: "get_downtime", targetUserId: impersonatedUser?.user_id },
    });
    if (!error && data?.downtime) setDowntimeBalance(data.downtime.balance);
  };

  const acceptQuest = async (questId: string) => {
    const { data, error } = await supabase.functions.invoke("quest-operations", {
      body: { operation: "accept_quest", questId, targetUserId: impersonatedUser?.user_id },
    });
    if (error || data?.error) {
      toast({ title: "Error", description: data?.error || "Failed to accept quest", variant: "destructive" });
    } else {
      toast({ title: "Quest accepted!" });
      loadData();
    }
  };

  const openSubmitDialog = (qa: QuestAcceptance) => {
    setSelectedQuest(qa);
    setRollResult("");
    setRollType("");
    setSubmitNotes("");
    setSubmitDialogOpen(true);
  };

  const submitQuest = async () => {
    if (!selectedQuest) return;
    const { data, error } = await supabase.functions.invoke("quest-operations", {
      body: {
        operation: "submit_quest",
        questId: selectedQuest.quest_id,
        rollResult: rollResult ? parseInt(rollResult) : undefined,
        rollType: rollType || undefined,
        notes: submitNotes,
        targetUserId: impersonatedUser?.user_id,
      },
    });
    if (error || data?.error) {
      toast({ title: "Error", description: data?.error || "Failed to submit", variant: "destructive" });
    } else {
      toast({ title: "Quest submitted for review!" });
      setSubmitDialogOpen(false);
      loadData();
    }
  };

  const resignQuest = async (questId: string) => {
    const { data, error } = await supabase.functions.invoke("quest-operations", {
      body: { operation: "resign_quest", questId, targetUserId: impersonatedUser?.user_id },
    });
    if (error || data?.error) {
      toast({ title: "Error", description: data?.error || "Failed to resign", variant: "destructive" });
    } else {
      toast({ title: "Resigned from job" });
      loadData();
    }
  };

  const commissions = quests.filter(q => q.job_type === "commission");
  const fullTimeJobs = quests.filter(q => q.job_type === "full_time");
  const activeAcceptances = myQuests.filter(q => q.status === "accepted");
  const pendingSubmissions = myQuests.filter(q => q.status === "submitted");
  const completedQuests = myQuests.filter(q => q.status === "completed");

  const formatRewardRange = (quest: Quest) => {
    if (quest.reward_min > 0 && quest.reward_min !== quest.reward) {
      return `${formatHexDenomination(quest.reward_min)} – ${formatHexDenomination(quest.reward)}`;
    }
    return formatHexDenomination(quest.reward);
  };

  const QuestCard = ({ quest, showAccept = true }: { quest: Quest; showAccept?: boolean }) => {
    const isAlreadyAccepted = myQuests.some(
      mq => mq.quest_id === quest.id && (mq.status === "accepted" || mq.status === "submitted")
    );

    return (
      <Card className="p-6 bg-gray-900/30 border-gray-700/50 hover:border-emerald-500/30 transition-all duration-300">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-white mb-2">{quest.title}</h3>
            <div className="flex items-center flex-wrap gap-3 text-sm text-gray-400 mb-3">
              {quest.client && (
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  <span>{quest.client}</span>
                </div>
              )}
              {quest.time_limit && (
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{quest.time_limit}</span>
                </div>
              )}
              {quest.downtime_cost > 0 && (
                <div className="flex items-center gap-1">
                  <Timer className="w-4 h-4 text-cyan-400" />
                  <span className="text-cyan-400">{quest.downtime_cost}h downtime</span>
                </div>
              )}
              {quest.available_quantity !== null && (
                <div className="flex items-center gap-1">
                  <Package className="w-4 h-4 text-orange-400" />
                  <span className="text-orange-400">{quest.available_quantity} available</span>
                </div>
              )}
            </div>
          </div>
          <div className="text-right ml-4">
            <div className="text-lg font-bold text-emerald-400 mb-1">
              {formatRewardRange(quest)}
            </div>
            {quest.difficulty && (
              <Badge className={difficultyColors[quest.difficulty] || "bg-gray-800 text-gray-400"}>
                {quest.difficulty}
              </Badge>
            )}
          </div>
        </div>

        {quest.description && <p className="text-gray-300 mb-4 text-sm">{quest.description}</p>}

        <div className="flex justify-between items-center">
          <div className="flex flex-wrap gap-2">
            {quest.tags?.map((tag, i) => (
              <Badge key={i} variant="outline" className="border-emerald-600 text-emerald-400 text-xs">
                {tag}
              </Badge>
            ))}
          </div>
          {showAccept && !isAlreadyAccepted && (
            <Button
              onClick={() => acceptQuest(quest.id)}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
            >
              {quest.job_type === "full_time" ? "Apply" : "Accept"}
            </Button>
          )}
          {isAlreadyAccepted && (
            <Badge className="bg-emerald-900/30 text-emerald-400 border-emerald-500/50">In Progress</Badge>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 via-black to-teal-900/20" />

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link to="/">
            <Button variant="ghost" className="text-cyan-400 hover:text-cyan-300">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to OS
            </Button>
          </Link>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
            Questseek
          </h1>
          <div className="w-20" />
        </div>

        {impersonatedUser && (
          <div className="mb-4 p-2 bg-yellow-900/30 border border-yellow-500/50 rounded text-yellow-400 text-sm text-center">
            Viewing as: {impersonatedUser.character_name}
          </div>
        )}

        {/* Downtime Balance */}
        <Card className="p-4 bg-gray-900/50 border-cyan-500/30 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Timer className="w-5 h-5 text-cyan-400" />
              <span className="text-white font-medium">Downtime Balance</span>
            </div>
            <span className={`text-2xl font-bold ${downtimeBalance > 0 ? "text-cyan-400" : "text-red-400"}`}>
              {downtimeBalance}h
            </span>
          </div>
        </Card>

        <Tabs defaultValue="commissions" className="space-y-6">
          <TabsList className="bg-gray-900/50 border border-gray-700/50">
            <TabsTrigger value="commissions">Commissions</TabsTrigger>
            <TabsTrigger value="full_time">Full-Time Jobs</TabsTrigger>
            <TabsTrigger value="my_quests">My Jobs ({activeAcceptances.length + pendingSubmissions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="commissions" className="space-y-4">
            {commissions.length === 0 ? (
              <Card className="p-8 bg-gray-900/30 border-gray-700/50 text-center text-gray-400">
                No commissions available right now.
              </Card>
            ) : (
              commissions.map(q => <QuestCard key={q.id} quest={q} />)
            )}
          </TabsContent>

          <TabsContent value="full_time" className="space-y-4">
            {fullTimeJobs.length === 0 ? (
              <Card className="p-8 bg-gray-900/30 border-gray-700/50 text-center text-gray-400">
                No full-time positions available.
              </Card>
            ) : (
              fullTimeJobs.map(q => <QuestCard key={q.id} quest={q} />)
            )}
          </TabsContent>

          <TabsContent value="my_quests" className="space-y-6">
            {/* Active Jobs */}
            {activeAcceptances.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Active</h3>
                <div className="space-y-3">
                  {activeAcceptances.map(qa => (
                    <Card key={qa.id} className="p-4 bg-gray-900/30 border-gray-700/50">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="text-white font-medium">{qa.quests.title}</h4>
                          <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {qa.quests.job_type === "full_time" ? "Full-Time" : "Commission"}
                            </Badge>
                            {qa.quests.client && <span>• {qa.quests.client}</span>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {qa.quests.job_type !== "full_time" && (
                            <Button size="sm" onClick={() => openSubmitDialog(qa)}
                              className="bg-gradient-to-r from-emerald-500 to-teal-500">
                              Mark Complete
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300"
                            onClick={() => resignQuest(qa.quest_id)}>
                            {qa.quests.job_type === "full_time" ? "Quit" : "Abandon"}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Submissions */}
            {pendingSubmissions.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-yellow-400 mb-3">Awaiting Approval</h3>
                <div className="space-y-3">
                  {pendingSubmissions.map(qa => (
                    <Card key={qa.id} className="p-4 bg-yellow-900/10 border-yellow-500/30">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="text-white font-medium">{qa.quests.title}</h4>
                          <div className="text-sm text-gray-400 mt-1">
                            {qa.roll_type && <span>Roll: {qa.roll_result} ({qa.roll_type})</span>}
                          </div>
                        </div>
                        <Badge className="bg-yellow-900/30 text-yellow-400 border-yellow-500/50">
                          Submitted
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Completed */}
            {completedQuests.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-emerald-400 mb-3">Completed</h3>
                <div className="space-y-3">
                  {completedQuests.slice(0, 10).map(qa => (
                    <Card key={qa.id} className="p-4 bg-emerald-900/10 border-emerald-500/20">
                      <div className="flex justify-between items-center">
                        <h4 className="text-gray-300">{qa.quests.title}</h4>
                        <span className="text-emerald-400 font-medium">
                          {qa.final_payment ? formatHexDenomination(qa.final_payment) : "—"}
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {activeAcceptances.length === 0 && pendingSubmissions.length === 0 && completedQuests.length === 0 && (
              <Card className="p-8 bg-gray-900/30 border-gray-700/50 text-center text-gray-400">
                No jobs yet. Check the board!
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Submit Dialog */}
      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Mark Complete: {selectedQuest?.quests.title}</DialogTitle>
            <DialogDescription className="text-gray-400">
              Submit your completion details for admin review.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">Roll Result</Label>
              <Input
                type="number"
                placeholder="What did you roll?"
                value={rollResult}
                onChange={e => setRollResult(e.target.value)}
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
            <div>
              <Label className="text-gray-300">Roll Type</Label>
              <Select value={rollType} onValueChange={setRollType}>
                <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                  <SelectValue placeholder="Hope, Fear, or Crit?" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="hope">With Hope</SelectItem>
                  <SelectItem value="fear">With Fear</SelectItem>
                  <SelectItem value="critical_success">Critical Success</SelectItem>
                  <SelectItem value="critical_failure">Critical Failure</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-300">Notes (optional)</Label>
              <Textarea
                placeholder="Anything else to report?"
                value={submitNotes}
                onChange={e => setSubmitNotes(e.target.value)}
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSubmitDialogOpen(false)}>Cancel</Button>
            <Button onClick={submitQuest} className="bg-gradient-to-r from-emerald-500 to-teal-500">
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Questseek;
