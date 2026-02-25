import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Play, Pause, Hand, XCircle, CreditCard, AlertTriangle, Clock, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { formatHex } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Subscription {
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
  created_at: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: any; bgClass: string; borderClass: string }> = {
  active: { label: "Active", color: "text-green-400", icon: Play, bgClass: "bg-green-900/20", borderClass: "border-green-500/50" },
  paused: { label: "Paused", color: "text-yellow-400", icon: Pause, bgClass: "bg-yellow-900/20", borderClass: "border-yellow-500/50" },
  manual: { label: "Manual", color: "text-blue-400", icon: Hand, bgClass: "bg-blue-900/20", borderClass: "border-blue-500/50" },
  cancelled: { label: "Cancelled", color: "text-red-400", icon: XCircle, bgClass: "bg-red-900/20", borderClass: "border-red-500/50" },
};

const Atunes = () => {
  const { user } = useAuth();
  const { impersonatedUser } = useAdmin();
  const { toast } = useToast();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusDialog, setStatusDialog] = useState<{ sub: Subscription; newStatus: string } | null>(null);
  const [payDialog, setPayDialog] = useState<Subscription | null>(null);
  const [userBalance, setUserBalance] = useState(0);

  const effectiveUserId = impersonatedUser?.user_id || user?.id;

  useEffect(() => {
    if (effectiveUserId) loadData();
  }, [effectiveUserId]);

  const loadData = async () => {
    if (!effectiveUserId) return;
    setIsLoading(true);
    try {
      const [subsResult, profileResult] = await Promise.all([
        supabase.from("recurring_payments").select("*").eq("to_user_id", effectiveUserId).order("created_at", { ascending: false }),
        supabase.from("profiles").select("credits").eq("user_id", effectiveUserId).single(),
      ]);
      if (subsResult.error) throw subsResult.error;
      setSubscriptions(subsResult.data || []);
      setUserBalance(profileResult.data?.credits ?? 0);
    } catch (error) {
      console.error("Error loading subscriptions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const changeStatus = async (sub: Subscription, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("recurring_payments")
        .update({ status: newStatus, is_active: newStatus === "active" })
        .eq("id", sub.id);
      if (error) throw error;
      toast({ title: "Status Updated", description: `${sub.description} set to ${newStatus}` });
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setStatusDialog(null);
  };

  const payAccumulated = async (sub: Subscription) => {
    if (sub.accumulated_amount <= 0) return;
    try {
      if (sub.from_user_id) {
        // If there's a recipient, send money to them
        const { error } = await supabase.functions.invoke("financial-operations", {
          body: {
            operation: "send_money",
            to_user_id: sub.from_user_id,
            amount: sub.accumulated_amount,
            description: `Manual payment: ${sub.description}`,
            targetUserId: effectiveUserId,
          },
        });
        if (error) throw error;
      } else {
        // No recipient (system subscription) — just deduct credits directly
        const newBalance = userBalance - sub.accumulated_amount;
        const { error } = await supabase
          .from("profiles")
          .update({ credits: newBalance })
          .eq("user_id", effectiveUserId);
        if (error) throw error;
      }

      await supabase.from("recurring_payments").update({ accumulated_amount: 0 }).eq("id", sub.id);
      toast({ title: "Payment Sent", description: `Paid ${formatHex(sub.accumulated_amount)} for ${sub.description}` });
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setPayDialog(null);
  };

  const getIntervalLabel = (interval: string) => {
    const labels: Record<string, string> = { daily: "Daily", weekly: "Weekly", monthly: "Monthly", yearly: "Yearly" };
    return labels[interval] || interval;
  };

  const activeCount = subscriptions.filter(s => s.status === "active").length;
  const pausedCount = subscriptions.filter(s => s.status === "paused").length;
  const totalOwed = subscriptions.reduce((sum, s) => sum + s.accumulated_amount, 0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-cyan-400 text-xl font-mono">Loading @tunes...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-indigo-900/20" />

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
            <Link to="/">
              <Button variant="ghost" size="sm" className="text-purple-400 hover:text-purple-300">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Nexus
              </Button>
            </Link>
            <div className="text-right">
              <p className="text-xs text-gray-500">Balance</p>
              <p className={`text-sm font-mono ${userBalance >= 0 ? "text-green-400" : "text-red-400"}`}>
                {formatHex(userBalance)}
              </p>
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
            @tunes
          </h1>
          {impersonatedUser && (
            <p className="text-cyan-400 text-xs font-mono mt-1">
              👁 Viewing as: {impersonatedUser.character_name}
            </p>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <Card className="bg-gray-900/50 border-gray-700">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-purple-400">{subscriptions.length}</p>
              <p className="text-xs text-gray-500">Total Subs</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-900/50 border-gray-700">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-400">{activeCount}</p>
              <p className="text-xs text-gray-500">Active</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-900/50 border-gray-700">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-400">{pausedCount}</p>
              <p className="text-xs text-gray-500">Paused</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-900/50 border-gray-700">
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${totalOwed > 0 ? "text-red-400" : "text-gray-500"}`}>
                {formatHex(totalOwed)}
              </p>
              <p className="text-xs text-gray-500">Owed</p>
            </CardContent>
          </Card>
        </div>

        {/* Subscriptions */}
        {subscriptions.length === 0 ? (
          <Card className="bg-gray-900/50 border-gray-700">
            <CardContent className="p-6 text-center">
              <p className="text-gray-400">No subscriptions yet. Purchase items with recurring fees from Wyrmcart.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {subscriptions.map((sub) => {
              const config = statusConfig[sub.status] || statusConfig.active;
              const StatusIcon = config.icon;
              const specs = sub.metadata as any;
              const companyName = specs?.company || specs?.from_name || "Unknown";
              const itemName = specs?.item_name || sub.description;
              const tier = specs?.tier;

              return (
                <Card key={sub.id} className={`${config.bgClass} border ${config.borderClass} transition-all`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <StatusIcon className={`w-5 h-5 ${config.color}`} />
                        <div>
                          <CardTitle className={`text-lg font-medium ${config.color}`}>
                            {itemName}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Building2 className="w-3 h-3 text-gray-500" />
                            <span className="text-xs text-gray-400">{companyName}</span>
                            {tier && (
                              <Badge variant="outline" className="text-xs border-gray-600 text-gray-400">
                                Tier {tier}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`${config.bgClass} ${config.color} border ${config.borderClass}`}>
                          {config.label}
                        </Badge>
                        <Badge variant="outline" className="border-purple-500/50 text-purple-300">
                          {getIntervalLabel(sub.interval_type)}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Financial Info */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-black/30 rounded-lg">
                      <div>
                        <p className="text-xs text-gray-500">Rate</p>
                        <p className="font-mono text-sm text-purple-300">{formatHex(sub.amount)}/{sub.interval_type}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Times Charged</p>
                        <p className="font-mono text-sm text-gray-300">{sub.total_times_sent}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Remaining</p>
                        <p className="font-mono text-sm text-gray-300">
                          {sub.remaining_cycles != null ? `${sub.remaining_cycles} cycles` : "∞"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Accumulated</p>
                        <p className={`font-mono text-sm ${sub.accumulated_amount > 0 ? "text-red-400" : "text-gray-500"}`}>
                          {sub.accumulated_amount > 0 ? formatHex(sub.accumulated_amount) : "—"}
                        </p>
                      </div>
                    </div>

                    {/* Dates */}
                    {sub.last_sent_at && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        Last charged: {new Date(sub.last_sent_at).toLocaleDateString()}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-800">
                      {sub.status !== "active" && sub.status !== "cancelled" && (
                        <Button size="sm" variant="outline" className="border-green-600/50 text-green-400 hover:bg-green-900/30 text-xs"
                          onClick={() => setStatusDialog({ sub, newStatus: "active" })}>
                          <Play className="w-3 h-3 mr-1" /> Activate
                        </Button>
                      )}
                      {sub.status === "active" && (
                        <Button size="sm" variant="outline" className="border-yellow-600/50 text-yellow-400 hover:bg-yellow-900/30 text-xs"
                          onClick={() => setStatusDialog({ sub, newStatus: "paused" })}>
                          <Pause className="w-3 h-3 mr-1" /> Pause
                        </Button>
                      )}
                      {(sub.status === "active" || sub.status === "paused") && (
                        <Button size="sm" variant="outline" className="border-blue-600/50 text-blue-400 hover:bg-blue-900/30 text-xs"
                          onClick={() => setStatusDialog({ sub, newStatus: "manual" })}>
                          <Hand className="w-3 h-3 mr-1" /> Set Manual
                        </Button>
                      )}
                      {sub.status !== "cancelled" && (
                        <Button size="sm" variant="outline" className="border-red-600/50 text-red-400 hover:bg-red-900/30 text-xs"
                          onClick={() => setStatusDialog({ sub, newStatus: "cancelled" })}>
                          <XCircle className="w-3 h-3 mr-1" /> Cancel
                        </Button>
                      )}
                      {sub.status === "manual" && (
                        <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white text-xs"
                          onClick={() => setPayDialog(sub)}>
                          <CreditCard className="w-3 h-3 mr-1" /> Pay {sub.accumulated_amount > 0 ? formatHex(sub.accumulated_amount) : "Now"}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Status Change Confirmation */}
      <Dialog open={!!statusDialog} onOpenChange={() => setStatusDialog(null)}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-gray-100">Change Subscription Status</DialogTitle>
          </DialogHeader>
          {statusDialog && (
            <div className="space-y-3">
              <p className="text-gray-400 text-sm">
                Set <span className="text-purple-400 font-medium">{statusDialog.sub.description}</span> to{" "}
                <span className={statusConfig[statusDialog.newStatus]?.color}>{statusDialog.newStatus}</span>?
              </p>
              {statusDialog.newStatus === "paused" && (
                <p className="text-xs text-yellow-400/80">Charges will accumulate but won't be deducted until reactivated.</p>
              )}
              {statusDialog.newStatus === "manual" && (
                <p className="text-xs text-blue-400/80">Charges will accumulate. You must manually pay from this page.</p>
              )}
              {statusDialog.newStatus === "cancelled" && (
                <p className="text-xs text-red-400/80">This subscription will stop accumulating charges entirely.</p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="border-gray-600 text-gray-400" onClick={() => setStatusDialog(null)}>
              Cancel
            </Button>
            <Button className="bg-purple-600 hover:bg-purple-700"
              onClick={() => statusDialog && changeStatus(statusDialog.sub, statusDialog.newStatus)}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay Accumulated Dialog */}
      <Dialog open={!!payDialog} onOpenChange={() => setPayDialog(null)}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-gray-100">Pay Accumulated Balance</DialogTitle>
          </DialogHeader>
          {payDialog && (
            <div className="space-y-3">
              <p className="text-gray-400 text-sm">
                Pay <span className="text-red-400 font-mono">{formatHex(payDialog.accumulated_amount)}</span> for{" "}
                <span className="text-purple-400">{payDialog.description}</span>?
              </p>
              <p className="text-xs text-gray-500">
                Your balance: <span className="font-mono">{formatHex(userBalance)}</span>
              </p>
              {userBalance < payDialog.accumulated_amount && (
                <div className="flex items-center gap-2 text-yellow-400 text-xs">
                  <AlertTriangle className="w-3 h-3" />
                  <span>This will overdraft your account</span>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="border-gray-600 text-gray-400" onClick={() => setPayDialog(null)}>
              Cancel
            </Button>
            <Button className="bg-purple-600 hover:bg-purple-700"
              onClick={() => payDialog && payAccumulated(payDialog)}>
              Pay Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Atunes;
