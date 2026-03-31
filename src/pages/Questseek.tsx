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
import { ArrowLeft, Clock, User, Briefcase, Timer, Package, AlertTriangle, Moon, Sun, RotateCcw, CheckCircle, XCircle, HourglassIcon, Plus, Check, X, Users } from "lucide-react";
import { Link } from "react-router-dom";
import RestDialog from "@/components/RestDialog";
import { formatHexDenomination, formatHex, formatHexRounded } from "@/lib/currency";
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
  posted_by_user_id?: string | null;
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
  admin_notes: string | null;
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
  const [communityQuests, setCommunityQuests] = useState<Quest[]>([]);
  const [communityPosterMap, setCommunityPosterMap] = useState<Record<string, string>>({});
  const [myPostedQuests, setMyPostedQuests] = useState<any[]>([]);
  const [myPostedProfileMap, setMyPostedProfileMap] = useState<Record<string, string>>({});
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

  // Post job dialog
  const [postJobOpen, setPostJobOpen] = useState(false);
  const [postForm, setPostForm] = useState({
    title: "", description: "", reward: "" as string, reward_min: "" as string, difficulty: "Low Risk",
    downtime_cost: "" as string, available_quantity: "", tags: "", time_limit: "",
    job_type: "commission", pay_interval: "daily",
  });

  // Approve player quest dialog
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [approveTarget, setApproveTarget] = useState<any>(null);
  const [approveFinalPayment, setApproveFinalPayment] = useState("");

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
      await Promise.all([loadQuests(), loadMyQuests(), loadDowntime(), loadCommunityQuests(), loadMyPostedQuests()]);
    } finally {
      setLoading(false);
    }
  };

  const loadQuests = async () => {
    const { data, error } = await supabase
      .from("quests")
      .select("*, quest_acceptances(id, status)")
      .eq("status", "active")
      .is("posted_by_user_id", null)
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

  const loadCommunityQuests = async () => {
    const { data, error } = await supabase.functions.invoke("quest-operations", {
      body: { operation: "get_community_quests" },
    });
    if (!error && data?.quests) {
      setCommunityQuests(data.quests);
      if (data.posterMap) setCommunityPosterMap(data.posterMap);
    }
  };

  const loadMyPostedQuests = async () => {
    const { data, error } = await supabase.functions.invoke("quest-operations", {
      body: { operation: "get_my_posted_quests", targetUserId: impersonatedUser?.user_id },
    });
    if (!error && data?.quests) {
      setMyPostedQuests(data.quests);
      if (data.profileMap) setMyPostedProfileMap(data.profileMap);
    }
  };

  const acceptQuest = async (questId: string) => {
    const { data, error } = await supabase.functions.invoke("quest-operations", {
      body: { operation: "accept_quest", questId, targetUserId: impersonatedUser?.user_id },
    });
    if (error || data?.error) {
      toast({ title: "Error", description: data?.error || "Failed to accept quest", variant: "destructive" });
    } else {
      const msg = data?.status === 'pending_approval' ? "Application submitted! Awaiting admin approval." : "Quest accepted!";
      toast({ title: msg });
      loadData();
    }
  };

  const repeatQuest = async (questId: string) => {
    const { data, error } = await supabase.functions.invoke("quest-operations", {
      body: { operation: "repeat_quest", questId, targetUserId: impersonatedUser?.user_id },
    });
    if (error || data?.error) {
      toast({ title: "Error", description: data?.error || "Failed to repeat quest", variant: "destructive" });
    } else {
      toast({ title: "Quest accepted again!" });
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

  const postJob = async () => {
    const { data, error } = await supabase.functions.invoke("quest-operations", {
      body: {
        operation: "create_player_quest",
        targetUserId: impersonatedUser?.user_id,
        ...postForm,
      },
    });
    if (error || data?.error) {
      toast({ title: "Error", description: data?.error || "Failed to post job", variant: "destructive" });
    } else {
      toast({ title: "Job posted!" });
      setPostJobOpen(false);
      setPostForm({ title: "", description: "", reward: "", reward_min: "", difficulty: "Low Risk", downtime_cost: "", available_quantity: "", tags: "", time_limit: "", job_type: "commission", pay_interval: "daily" });
      loadData();
    }
  };

  const openApproveDialog = (acceptance: any, quest: any) => {
    setApproveTarget({ ...acceptance, quests: quest });
    setApproveFinalPayment(quest.reward?.toString() || "0");
    setApproveDialogOpen(true);
  };

  const approvePlayerSubmission = async () => {
    if (!approveTarget) return;
    const { data, error } = await supabase.functions.invoke("quest-operations", {
      body: {
        operation: "approve_player_quest",
        acceptanceId: approveTarget.id,
        finalPayment: parseInt(approveFinalPayment) || 0,
        targetUserId: impersonatedUser?.user_id,
      },
    });
    if (error || data?.error) {
      toast({ title: "Error", description: data?.error || "Failed to approve", variant: "destructive" });
    } else {
      toast({ title: `Paid ${formatHex(data.payment)} to the worker!` });
      setApproveDialogOpen(false);
      loadData();
    }
  };

  const rejectPlayerSubmission = async (acceptanceId: string) => {
    const { data, error } = await supabase.functions.invoke("quest-operations", {
      body: {
        operation: "reject_player_quest",
        acceptanceId,
        targetUserId: impersonatedUser?.user_id,
      },
    });
    if (error || data?.error) {
      toast({ title: "Error", description: data?.error || "Failed", variant: "destructive" });
    } else {
      toast({ title: "Submission rejected" });
      loadData();
    }
  };

  const approvePlayerApplication = async (acceptanceId: string) => {
    const { data, error } = await supabase.functions.invoke("quest-operations", {
      body: {
        operation: "approve_player_application",
        acceptanceId,
        targetUserId: impersonatedUser?.user_id,
      },
    });
    if (error || data?.error) {
      toast({ title: "Error", description: data?.error || "Failed to approve", variant: "destructive" });
    } else {
      toast({ title: "Application approved! Recurring payment created in @tunes." });
      loadData();
    }
  };

  const rejectPlayerApplication = async (acceptanceId: string) => {
    const { data, error } = await supabase.functions.invoke("quest-operations", {
      body: {
        operation: "reject_player_application",
        acceptanceId,
        targetUserId: impersonatedUser?.user_id,
      },
    });
    if (error || data?.error) {
      toast({ title: "Error", description: data?.error || "Failed", variant: "destructive" });
    } else {
      toast({ title: "Application rejected" });
      loadData();
    }
  };

  const commissions = quests.filter(q => q.job_type === "commission");
  const fullTimeJobs = quests.filter(q => q.job_type === "full_time");
  const activeAcceptances = myQuests.filter(q => q.status === "accepted");
  const pendingApproval = myQuests.filter(q => q.status === "pending_approval");
  const pendingSubmissions = myQuests.filter(q => q.status === "submitted");
  const completedQuests = myQuests.filter(q => q.status === "completed");
  const rejectedQuests = myQuests.filter(q => q.status === "rejected");

  const repeatableCompleted = completedQuests.filter(q => 
    q.quests?.job_type === "commission" && 
    q.quests?.status === "active" &&
    !myQuests.some(mq => mq.quest_id === q.quest_id && (mq.status === "accepted" || mq.status === "submitted"))
  );

  const uniqueRepeatables = repeatableCompleted.reduce((acc, q) => {
    if (!acc.find(a => a.quest_id === q.quest_id)) acc.push(q);
    return acc;
  }, [] as QuestAcceptance[]);

  const myJobsCount = activeAcceptances.length + pendingApproval.length + pendingSubmissions.length + uniqueRepeatables.length;

  // Count pending submissions + pending applications on my posted quests
  const myPostedPendingCount = myPostedQuests.reduce((sum, q) => 
    sum + (q.quest_acceptances?.filter((a: any) => a.status === 'submitted' || a.status === 'pending_approval').length || 0), 0);

  const formatRewardRange = (quest: Quest) => {
    if (quest.reward_min > 0 && quest.reward_min !== quest.reward) {
      return `${formatHexRounded(quest.reward_min, 'down')} – ${formatHexRounded(quest.reward, 'up')}`;
    }
    return formatHexRounded(quest.reward, 'nearest');
  };

  const QuestCard = ({ quest, showAccept = true, posterName }: { quest: Quest & { quest_acceptances?: any[] }; showAccept?: boolean; posterName?: string }) => {
    const isAlreadyAccepted = myQuests.some(
      mq => mq.quest_id === quest.id && (mq.status === "accepted" || mq.status === "submitted" || mq.status === "pending_approval")
    );
    const isOwnQuest = quest.posted_by_user_id === effectiveUserId;
    const isPositionFilled = quest.job_type === "full_time" && quest.quest_acceptances?.some((a: any) => a.status === "accepted");

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
              {posterName && (
                <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-400">
                  <Users className="w-3 h-3 mr-1" /> Posted by {posterName}
                </Badge>
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
              {quest.available_quantity !== null && quest.available_quantity > 0 && (
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
            {quest.available_quantity !== null && quest.available_quantity <= 0 && quest.job_type === "commission" && (
              <Badge className="bg-red-900/30 text-red-400 border border-red-500/50 mt-1">
                Not Available
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
          {showAccept && !isAlreadyAccepted && !isOwnQuest && (
            <Button
              onClick={() => acceptQuest(quest.id)}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
            >
              {quest.job_type === "full_time" ? "Apply" : "Accept"}
            </Button>
          )}
          {isOwnQuest && (
            <Badge className="bg-amber-900/30 text-amber-400 border-amber-500/50">Your Job</Badge>
          )}
          {isAlreadyAccepted && !isOwnQuest && (
            <Badge className="bg-emerald-900/30 text-emerald-400 border-emerald-500/50">
              {myQuests.find(mq => mq.quest_id === quest.id && mq.status === "pending_approval") ? "Applied" : "In Progress"}
            </Badge>
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

        {/* Notification banners */}
        {rejectedQuests.length > 0 && (
          <div className="mb-4 space-y-2">
            {rejectedQuests.slice(0, 5).map(rq => (
              <div key={rq.id} className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-red-300 font-medium text-sm">
                    {rq.quests?.job_type === "full_time" ? "Application rejected" : "Submission rejected"}: {rq.quests?.title}
                  </p>
                  {rq.admin_notes && <p className="text-red-400/70 text-xs mt-1">{rq.admin_notes}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Downtime Balance + Rest Buttons */}
        <Card className="p-4 bg-gray-900/50 border-cyan-500/30 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Timer className="w-5 h-5 text-cyan-400" />
              <span className="text-white font-medium">Downtime Balance</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="border-amber-600 text-amber-400 hover:bg-amber-900/30" onClick={() => { setRestType("short"); setRestOpen(true); }}>
                  <Sun className="w-3 h-3 mr-1" /> Short Rest
                </Button>
                <Button size="sm" variant="outline" className="border-indigo-600 text-indigo-400 hover:bg-indigo-900/30" onClick={() => { setRestType("long"); setRestOpen(true); }}>
                  <Moon className="w-3 h-3 mr-1" /> Long Rest
                </Button>
              </div>
              <span className={`text-2xl font-bold ${downtimeBalance > 0 ? "text-cyan-400" : "text-red-400"}`}>
                {downtimeBalance}h
              </span>
            </div>
          </div>
        </Card>

        <RestDialog
          type={restType}
          open={restOpen}
          onClose={() => setRestOpen(false)}
          userId={effectiveUserId}
          impersonatedUserId={impersonatedUser?.user_id}
          currentBalance={downtimeBalance}
          gameDate={gameDate}
          onComplete={loadData}
        />

        <Tabs defaultValue="commissions" className="space-y-6">
          <TabsList className="bg-gray-900/50 border border-gray-700/50">
            <TabsTrigger value="commissions">Commissions</TabsTrigger>
            <TabsTrigger value="full_time">Full-Time Jobs</TabsTrigger>
            <TabsTrigger value="community">
              Community Jobs {communityQuests.length > 0 && `(${communityQuests.length})`}
            </TabsTrigger>
            <TabsTrigger value="my_quests">My Jobs ({myJobsCount})</TabsTrigger>
            {myPostedQuests.length > 0 && (
              <TabsTrigger value="my_posted">
                My Posted {myPostedPendingCount > 0 && `(${myPostedPendingCount})`}
              </TabsTrigger>
            )}
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

          {/* Community Jobs Tab */}
          <TabsContent value="community" className="space-y-4">
            <div className="flex justify-end mb-2">
              <Button onClick={() => setPostJobOpen(true)} className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
                <Plus className="w-4 h-4 mr-1" /> Post a Job
              </Button>
            </div>
            {communityQuests.length === 0 ? (
              <Card className="p-8 bg-gray-900/30 border-gray-700/50 text-center text-gray-400">
                No community jobs posted yet. Be the first to post one!
              </Card>
            ) : (
              communityQuests.map(q => (
                <QuestCard key={q.id} quest={q} posterName={communityPosterMap[q.posted_by_user_id!]} />
              ))
            )}
          </TabsContent>

          <TabsContent value="my_quests" className="space-y-6">
            {/* Pending Approval */}
            {pendingApproval.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-blue-400 mb-3 flex items-center gap-2">
                  <HourglassIcon className="w-5 h-5" /> Pending Approval
                </h3>
                <div className="space-y-3">
                  {pendingApproval.map(qa => (
                    <Card key={qa.id} className="p-4 bg-blue-900/10 border-blue-500/30">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="text-white font-medium">{qa.quests?.title}</h4>
                          <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                            <Badge variant="outline" className="text-xs text-blue-400 border-blue-500/50">Full-Time Application</Badge>
                            {qa.quests?.client && <span>• {qa.quests.client}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-blue-900/30 text-blue-400 border-blue-500/50">Awaiting Response</Badge>
                          <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300"
                            onClick={() => resignQuest(qa.quest_id)}>
                            Withdraw
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Active Jobs */}
            {activeAcceptances.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Active</h3>
                <div className="space-y-3">
                  {activeAcceptances.map(qa => (
                    <Card key={qa.id} className="p-4 bg-gray-900/30 border-gray-700/50">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="text-white font-medium">{qa.quests?.title}</h4>
                          <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {qa.quests?.job_type === "full_time" ? "Full-Time" : "Commission"}
                            </Badge>
                            {qa.quests?.client && <span>• {qa.quests.client}</span>}
                            {qa.quests?.downtime_cost > 0 && (
                              <span className="text-cyan-400">• {qa.quests.downtime_cost}h downtime on submit</span>
                            )}
                            {qa.admin_notes && qa.quests?.job_type === "full_time" && (
                              <span className="text-emerald-400 text-xs">✓ {qa.admin_notes}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {qa.quests?.job_type !== "full_time" && (
                            <Button size="sm" onClick={() => openSubmitDialog(qa)}
                              className="bg-gradient-to-r from-emerald-500 to-teal-500">
                              Mark Complete
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300"
                            onClick={() => resignQuest(qa.quest_id)}>
                            {qa.quests?.job_type === "full_time" ? "Quit" : "Abandon"}
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
                    <Card key={qa.id} className="p-4 bg-yellow-900/10 border-yellow-500/50">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="text-white font-medium">{qa.quests?.title}</h4>
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

            {/* Repeatable Commissions */}
            {uniqueRepeatables.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-cyan-400 mb-3 flex items-center gap-2">
                  <RotateCcw className="w-5 h-5" /> Available to Repeat
                </h3>
                <div className="space-y-3">
                  {uniqueRepeatables.map(qa => (
                    <Card key={qa.id} className="p-4 bg-cyan-900/10 border-cyan-500/20">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="text-gray-300">{qa.quests?.title}</h4>
                          <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                            <span>Completed {qa.times_completed}x</span>
                            {qa.final_payment != null && <span>• Last pay: {formatHexDenomination(qa.final_payment)}</span>}
                            {qa.quests?.downtime_cost > 0 && <span>• {qa.quests.downtime_cost}h downtime</span>}
                          </div>
                        </div>
                        <Button size="sm" onClick={() => repeatQuest(qa.quest_id)}
                          className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600">
                          <RotateCcw className="w-3 h-3 mr-1" /> Repeat
                        </Button>
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
                        <div>
                          <h4 className="text-gray-300">{qa.quests?.title}</h4>
                          {qa.admin_notes && <p className="text-xs text-gray-500 mt-1">{qa.admin_notes}</p>}
                        </div>
                        <span className="text-emerald-400 font-medium">
                          {qa.final_payment ? formatHexDenomination(qa.final_payment) : "—"}
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {myJobsCount === 0 && completedQuests.length === 0 && rejectedQuests.length === 0 && (
              <Card className="p-8 bg-gray-900/30 border-gray-700/50 text-center text-gray-400">
                No jobs yet. Check the board!
              </Card>
            )}
          </TabsContent>

          {/* My Posted Quests Tab */}
          {myPostedQuests.length > 0 && (
            <TabsContent value="my_posted" className="space-y-4">
              {myPostedQuests.map(quest => {
                const submissions = quest.quest_acceptances?.filter((a: any) => a.status === 'submitted') || [];
                const pendingApps = quest.quest_acceptances?.filter((a: any) => a.status === 'pending_approval') || [];
                const accepted = quest.quest_acceptances?.filter((a: any) => a.status === 'accepted') || [];
                const completed = quest.quest_acceptances?.filter((a: any) => a.status === 'completed') || [];
                return (
                  <Card key={quest.id} className="p-4 bg-gray-900/30 border-amber-500/20">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="text-white font-medium">{quest.title}</h4>
                        <p className="text-sm text-gray-400">
                          {quest.job_type === 'full_time' ? (
                            <Badge variant="outline" className="text-xs text-purple-400 border-purple-500/50 mr-2">Full-Time • {quest.pay_interval}</Badge>
                          ) : null}
                          Reward: {formatRewardRange(quest)}
                          {quest.status !== 'active' && <span className="text-red-400 ml-2">({quest.status})</span>}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-400">
                        {pendingApps.length > 0 ? `${pendingApps.length} applicants • ` : ''}{accepted.length} working • {submissions.length} submitted • {completed.length} done
                      </Badge>
                    </div>

                    {/* Pending applications (full-time) */}
                    {pendingApps.length > 0 && (
                      <div className="space-y-2 mt-3">
                        <p className="text-xs text-blue-400 font-medium">Applications</p>
                        {pendingApps.map((app: any) => (
                          <div key={app.id} className="p-3 bg-blue-900/10 border border-blue-500/20 rounded-lg flex justify-between items-center">
                            <div>
                              <p className="text-sm text-white font-medium">{myPostedProfileMap[app.user_id] || "Unknown"}</p>
                              <p className="text-xs text-gray-500">Wants to work this job</p>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => approvePlayerApplication(app.id)}
                                className="bg-gradient-to-r from-emerald-500 to-teal-500">
                                <Check className="w-3 h-3 mr-1" /> Hire
                              </Button>
                              <Button size="sm" variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-900/30"
                                onClick={() => rejectPlayerApplication(app.id)}>
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Submissions needing review (commissions) */}
                    {submissions.length > 0 && (
                      <div className="space-y-2 mt-3">
                        <p className="text-xs text-yellow-400 font-medium">Submissions</p>
                        {submissions.map((sub: any) => (
                          <div key={sub.id} className="p-3 bg-yellow-900/10 border border-yellow-500/20 rounded-lg flex justify-between items-start">
                            <div>
                              <p className="text-sm text-white font-medium">{myPostedProfileMap[sub.user_id] || "Unknown"}</p>
                              <div className="flex gap-2 mt-1 text-xs">
                                {sub.roll_result != null && <Badge variant="outline" className="text-cyan-400 border-cyan-500/50">Roll: {sub.roll_result}</Badge>}
                                {sub.roll_type && <Badge variant="outline" className="text-gray-400">{sub.roll_type}</Badge>}
                              </div>
                              {sub.notes && <p className="text-xs text-gray-400 mt-1 italic">"{sub.notes}"</p>}
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => openApproveDialog(sub, quest)}
                                className="bg-gradient-to-r from-emerald-500 to-teal-500">
                                <Check className="w-3 h-3 mr-1" /> Pay
                              </Button>
                              <Button size="sm" variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-900/30"
                                onClick={() => rejectPlayerSubmission(sub.id)}>
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                );
              })}
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Submit Dialog */}
      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Mark Complete: {selectedQuest?.quests?.title}</DialogTitle>
            <DialogDescription className="text-gray-400">
              Submit your completion details for review.
              {selectedQuest?.quests?.downtime_cost ? ` This will cost ${selectedQuest.quests.downtime_cost}h downtime.` : ""}
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

      {/* Post Job Dialog */}
      <Dialog open={postJobOpen} onOpenChange={setPostJobOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Post a Community Job</DialogTitle>
            <DialogDescription className="text-gray-400">
              {postForm.job_type === 'full_time'
                ? "Hire someone full-time. This creates a recurring payment (subscription) in @tunes that you pay."
                : "Hire someone to do work for you. You'll pay from your own credits when you approve completion."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">Job Type</Label>
              <Select value={postForm.job_type} onValueChange={v => setPostForm(f => ({ ...f, job_type: v }))}>
                <SelectTrigger className="bg-gray-800 border-gray-600 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="commission">Commission (one-off / repeatable)</SelectItem>
                  <SelectItem value="full_time">Full-Time (recurring payment)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {postForm.job_type === 'full_time' && (
              <div>
                <Label className="text-gray-300">Pay Interval</Label>
                <Select value={postForm.pay_interval} onValueChange={v => setPostForm(f => ({ ...f, pay_interval: v }))}>
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
              <Label className="text-gray-300">Job Title *</Label>
              <Input value={postForm.title} onChange={e => setPostForm(f => ({ ...f, title: e.target.value }))}
                className="bg-gray-800 border-gray-600 text-white" placeholder="What needs doing?" />
            </div>
            <div>
              <Label className="text-gray-300">Description</Label>
              <Textarea value={postForm.description} onChange={e => setPostForm(f => ({ ...f, description: e.target.value }))}
                className="bg-gray-800 border-gray-600 text-white" placeholder="Describe the job..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">{postForm.job_type === 'full_time' ? 'Pay Rate (⏣)' : 'Reward Min (⏣)'}</Label>
                <Input type="number" value={postForm.job_type === 'full_time' ? postForm.reward : postForm.reward_min} onChange={e => {
                  const val = e.target.value;
                  if (postForm.job_type === 'full_time') {
                    setPostForm(f => ({ ...f, reward: val, reward_min: val }));
                  } else {
                    setPostForm(f => ({ ...f, reward_min: val }));
                  }
                }}
                  className="bg-gray-800 border-gray-600 text-white" placeholder="0" />
              </div>
              {postForm.job_type !== 'full_time' && (
                <div>
                  <Label className="text-gray-300">Reward Max (⏣)</Label>
                  <Input type="number" value={postForm.reward} onChange={e => setPostForm(f => ({ ...f, reward: e.target.value }))}
                    className="bg-gray-800 border-gray-600 text-white" placeholder="0" />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Difficulty</Label>
                <Select value={postForm.difficulty} onValueChange={v => setPostForm(f => ({ ...f, difficulty: v }))}>
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="Low Risk">Low Risk</SelectItem>
                    <SelectItem value="Medium Risk">Medium Risk</SelectItem>
                    <SelectItem value="High Risk">High Risk</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300">
                  {postForm.job_type === "full_time" ? "Downtime per Pay Period (hours)" : "Downtime Cost (hours)"}
                </Label>
                <Input type="number" value={postForm.downtime_cost} onChange={e => setPostForm(f => ({ ...f, downtime_cost: e.target.value }))}
                  className="bg-gray-800 border-gray-600 text-white" placeholder="0" />
                {postForm.job_type === "full_time" && Number(postForm.downtime_cost) > 0 && (
                  <p className="text-xs text-cyan-400 mt-1">
                    ≈ {Math.ceil(Number(postForm.downtime_cost) / (postForm.pay_interval === "weekly" ? 7 : postForm.pay_interval === "monthly" ? 28 : postForm.pay_interval === "yearly" ? 365 : 1))}h/day
                  </p>
                )}
              </div>
            </div>
            {postForm.job_type !== 'full_time' && (
              <div>
                <Label className="text-gray-300">Available Quantity (blank = unlimited)</Label>
                <Input value={postForm.available_quantity} onChange={e => setPostForm(f => ({ ...f, available_quantity: e.target.value }))}
                  className="bg-gray-800 border-gray-600 text-white" placeholder="Leave blank for unlimited" />
              </div>
            )}
            <div>
              <Label className="text-gray-300">Tags (comma-separated)</Label>
              <Input value={postForm.tags} onChange={e => setPostForm(f => ({ ...f, tags: e.target.value }))}
                className="bg-gray-800 border-gray-600 text-white" placeholder="Stealth, Hacking" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPostJobOpen(false)}>Cancel</Button>
            <Button onClick={postJob} disabled={!postForm.title} className="bg-gradient-to-r from-amber-500 to-orange-500">
              <Plus className="w-4 h-4 mr-1" /> Post Job
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Player Quest Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Pay Worker: {approveTarget?.quests?.title}</DialogTitle>
            <DialogDescription className="text-gray-400">
              Worker: {myPostedProfileMap[approveTarget?.user_id] || "Unknown"}
              {approveTarget?.roll_result != null && ` • Roll: ${approveTarget.roll_result} (${approveTarget.roll_type})`}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label className="text-gray-300">Payment Amount (⏣ Hex)</Label>
            <Input type="number" value={approveFinalPayment} onChange={e => setApproveFinalPayment(e.target.value)}
              className="bg-gray-800 border-gray-600 text-white" />
            <p className="text-xs text-gray-500 mt-1">
              Range: {formatHex(approveTarget?.quests?.reward_min || 0)} – {formatHex(approveTarget?.quests?.reward || 0)}
              • This will be deducted from your credits.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setApproveDialogOpen(false)}>Cancel</Button>
            <Button onClick={approvePlayerSubmission} className="bg-gradient-to-r from-emerald-500 to-teal-500">
              <Check className="w-4 h-4 mr-1" /> Pay & Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Questseek;
