import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatHex } from "@/lib/currency";

interface Subscription {
  id: string;
  amount: number;
  description: string;
  interval_type: string;
  is_active: boolean;
  last_sent_at: string;
  next_send_at: string;
  metadata: any;
}

const Atunes = () => {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("recurring_payments")
        .select("*")
        .eq("to_user_id", user?.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setSubscriptions(data || []);
    } catch (error) {
      console.error("Error loading subscriptions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-cyan-400 text-xl font-mono">Loading @tunes...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900/20 via-black to-slate-900/20" />

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="sm" className="text-cyan-400 hover:text-cyan-300">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Nexus
              </Button>
            </Link>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-400 to-slate-500 bg-clip-text text-transparent">
              @tunes
            </h1>
            <span className="text-sm text-gray-500">Subscriptions ({subscriptions.length})</span>
          </div>
        </div>

        {subscriptions.length === 0 ? (
          <Card className="bg-gray-900/50 border-gray-700">
            <CardContent className="p-6 text-center">
              <p className="text-gray-400">No active subscriptions.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {subscriptions.map((sub) => (
              <Card key={sub.id} className={`border ${sub.is_active ? "bg-gray-900/50 border-gray-700" : "bg-red-900/20 border-red-700/50"}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-cyan-400 font-light">{sub.description}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant={sub.is_active ? "default" : "destructive"}>
                        {sub.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <Badge variant="outline" className="text-xs">{sub.interval_type}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Cost:</span>
                    <span className="font-mono text-red-400">{formatHex(sub.amount)}</span>
                  </div>
                  {sub.last_sent_at && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Last Charged:</span>
                      <span className="text-sm font-mono text-gray-300">
                        {new Date(sub.last_sent_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {!sub.is_active && (
                    <div className="flex items-center gap-2 text-red-400 text-sm">
                      <AlertTriangle className="w-4 h-4" />
                      <span>This subscription is no longer active</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Atunes;
