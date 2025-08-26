import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Settings, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatHex } from "@/lib/currency";

interface UserGear {
  id: string;
  name: string;
  category: string;
  status: string;
  efficiency_percent: number;
  installed_at: string;
  last_maintenance: string;
  metadata: any;
}

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
  const [gear, setGear] = useState<UserGear[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load user gear
      const { data: gearData, error: gearError } = await supabase
        .from('user_augmentations')
        .select('*')
        .eq('user_id', user?.id)
        .order('installed_at', { ascending: false });

      if (gearError) throw gearError;
      setGear(gearData || []);

      // Load subscriptions
      const { data: subData, error: subError } = await supabase
        .from('recurring_payments')
        .select('*')
        .eq('to_user_id', user?.id)
        .order('created_at', { ascending: false });

      if (subError) throw subError;
      setSubscriptions(subData || []);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'cybernetic': return '🧠';
      case 'armor': return '🛡️';
      case 'weapon': return '⚔️';
      case 'magic': return '✨';
      case 'equipment': return '🔧';
      default: return '📦';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-900/50 text-green-400 border-green-700';
      case 'maintenance': return 'bg-yellow-900/50 text-yellow-400 border-yellow-700';
      case 'damaged': return 'bg-red-900/50 text-red-400 border-red-700';
      case 'offline': return 'bg-gray-900/50 text-gray-400 border-gray-700';
      default: return 'bg-blue-900/50 text-blue-400 border-blue-700';
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
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900/20 via-black to-slate-900/20"></div>
      
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
          </div>
        </div>

        <Tabs defaultValue="gear" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-900/50 border border-gray-700">
            <TabsTrigger value="gear" className="text-gray-300 data-[state=active]:text-cyan-400">
              Personal Gear
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="text-gray-300 data-[state=active]:text-cyan-400">
              Subscriptions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gear" className="space-y-6">
            <div className="grid gap-4">
              {gear.length === 0 ? (
                <Card className="bg-gray-900/50 border-gray-700">
                  <CardContent className="p-6 text-center">
                    <p className="text-gray-400">No gear installed yet.</p>
                    <p className="text-sm text-gray-500 mt-2">Visit Wyrmcart to purchase cybernetics and equipment.</p>
                  </CardContent>
                </Card>
              ) : (
                gear.map((item) => (
                  <Card key={item.id} className="bg-gray-900/50 border-gray-700 hover:border-cyan-600/50 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getCategoryIcon(item.category)}</span>
                          <div>
                            <CardTitle className="text-cyan-400 font-light text-lg">{item.name}</CardTitle>
                            <p className="text-sm text-gray-400 capitalize">{item.category}</p>
                          </div>
                        </div>
                        <Badge className={getStatusColor(item.status)}>{item.status}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Efficiency:</span>
                        <span className={`font-mono ${item.efficiency_percent >= 90 ? 'text-green-400' : 
                          item.efficiency_percent >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {item.efficiency_percent}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Installed:</span>
                        <span className="text-sm font-mono text-gray-300">
                          {new Date(item.installed_at).toLocaleDateString()}
                        </span>
                      </div>
                      {item.metadata && Object.keys(item.metadata).length > 0 && (
                        <div className="mt-3 p-3 bg-black/30 rounded border border-gray-700">
                          <p className="text-xs text-gray-400 mb-2">Specifications:</p>
                          <div className="text-xs text-gray-300 font-mono">
                            {JSON.stringify(item.metadata, null, 2)}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="subscriptions" className="space-y-6">
            <div className="grid gap-4">
              {subscriptions.length === 0 ? (
                <Card className="bg-gray-900/50 border-gray-700">
                  <CardContent className="p-6 text-center">
                    <p className="text-gray-400">No active subscriptions.</p>
                  </CardContent>
                </Card>
              ) : (
                subscriptions.map((sub) => (
                  <Card key={sub.id} className={`border ${sub.is_active ? 'bg-gray-900/50 border-gray-700' : 'bg-red-900/20 border-red-700/50'}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-cyan-400 font-light">{sub.description}</CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant={sub.is_active ? "default" : "destructive"}>
                            {sub.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {sub.interval_type}
                          </Badge>
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
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Atunes;