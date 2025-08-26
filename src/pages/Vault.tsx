import { useState, useEffect } from "react";
import { ArrowLeft, CreditCard, Wallet, Package, TrendingUp, TrendingDown, Send, RefreshCw, Receipt } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatHex, getHexBreakdown } from "@/lib/currency";

const Vault = () => {
  const { user } = useAuth();
  const { isAdmin, impersonatedUser } = useAdmin();
  const { toast } = useToast();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Send Money Dialog State
  const [sendMoneyOpen, setSendMoneyOpen] = useState(false);
  const [sendAmount, setSendAmount] = useState("");
  const [sendRecipient, setSendRecipient] = useState("");
  const [sendDescription, setSendDescription] = useState("");

  // Mock inventory data
  const inventoryItems = [
    { id: 1, name: "Neural Interface", quantity: 1, value: 25000, rarity: "legendary" },
    { id: 2, name: "Data Chips", quantity: 47, value: 2350, rarity: "common" },
    { id: 3, name: "Quantum Core", quantity: 3, value: 45000, rarity: "epic" },
    { id: 4, name: "Memory Banks", quantity: 12, value: 8400, rarity: "rare" },
    { id: 5, name: "Power Cells", quantity: 28, value: 5600, rarity: "common" },
    { id: 6, name: "Holo Projector", quantity: 2, value: 18000, rarity: "rare" }
  ];

  const loadData = async () => {
    const activeUserId = impersonatedUser?.user_id || user?.id;
    if (!activeUserId) return;
    
    try {
      // Load user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", activeUserId)
        .single();
      
      setUserProfile(profile);

      // Load transactions
      const { data: transactionData } = await supabase
        .from("transactions")
        .select(`
          *,
          from_profile:from_user_id(character_name),
          to_profile:to_user_id(character_name)
        `)
        .or(`user_id.eq.${activeUserId},from_user_id.eq.${activeUserId},to_user_id.eq.${activeUserId}`)
        .order("created_at", { ascending: false })
        .limit(10);
      
      setTransactions(transactionData || []);

      // Load bills
      const { data: billData } = await supabase
        .from("bills")
        .select(`
          *,
          from_profile:from_user_id(character_name)
        `)
        .eq("to_user_id", activeUserId)
        .eq("status", "unpaid")
        .order("created_at", { ascending: false });
      
      setBills(billData || []);

      // Load all profiles for send money dropdown
      const { data: profileData } = await supabase
        .from("profiles")
        .select("user_id, character_name")
        .neq("user_id", activeUserId);
      
      setProfiles(profileData || []);

    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user, impersonatedUser]);

  const handleSendMoney = async () => {
    if (!sendRecipient || !sendAmount || !sendDescription) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    const amount = parseInt(sendAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('financial-operations', {
        body: {
          operation: 'send_money',
          to_user_id: sendRecipient,
          amount,
          description: sendDescription
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Money sent successfully"
      });

      setSendMoneyOpen(false);
      setSendAmount("");
      setSendRecipient("");
      setSendDescription("");
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send money",
        variant: "destructive"
      });
    }
  };

  const handlePayBill = async (billId: string) => {
    try {
      const { error } = await supabase.functions.invoke('financial-operations', {
        body: {
          operation: 'pay_bill',
          bill_id: billId
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Bill paid successfully"
      });

      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to pay bill",
        variant: "destructive"
      });
    }
  };


  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-cyan-400 text-xl font-mono">Loading Vault...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-900/20 via-black to-orange-900/20"></div>
      
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
            <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              App of Holding
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={sendMoneyOpen} onOpenChange={setSendMoneyOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="bg-green-900/50 border-green-700 hover:bg-green-800/50 text-green-400">
                  <Send className="w-4 h-4 mr-2" />
                  Send Hex
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-gray-700">
                <DialogHeader>
                  <DialogTitle className="text-cyan-400 font-light">Send Hex</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="recipient" className="font-light text-foreground">Recipient</Label>
                    <Select value={sendRecipient} onValueChange={setSendRecipient}>
                      <SelectTrigger className="bg-gray-800 border-gray-600 font-light">
                        <SelectValue placeholder="Select recipient" className="text-gray-300" />
                      </SelectTrigger>
                       <SelectContent className="bg-gray-800 border-gray-600 text-gray-300">
                         {profiles.map((profile) => (
                             <SelectItem key={profile.user_id} value={profile.user_id} className="text-gray-300">
                               {profile.character_name}
                             </SelectItem>
                         ))}
                       </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="amount" className="font-light text-foreground">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={sendAmount}
                      onChange={(e) => setSendAmount(e.target.value)}
                      className="bg-gray-800 border-gray-600 font-light text-foreground"
                      placeholder="Enter amount in Hex"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description" className="font-light text-foreground">Description</Label>
                    <Textarea
                      id="description"
                      value={sendDescription}
                      onChange={(e) => setSendDescription(e.target.value)}
                      className="bg-gray-800 border-gray-600 font-light text-foreground"
                      placeholder="Enter description"
                    />
                  </div>
                  <Button onClick={handleSendMoney} className="w-full bg-green-600 hover:bg-green-700">
                    Send Hex
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="ghost" size="sm" onClick={loadData} className="text-gray-400 hover:text-gray-300">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Balance Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Hex Balance</CardTitle>
              <CreditCard className="h-4 w-4 text-cyan-400" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getHexBreakdown(userProfile?.credits || 0).colorClass}`}>
                {userProfile?.credits || 0} Hex
              </div>
              <div className={`text-sm ${getHexBreakdown(userProfile?.credits || 0).colorClass} mt-1`}>
                {getHexBreakdown(userProfile?.credits || 0).breakdown}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Available for transactions
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Unpaid Bills</CardTitle>
              <Receipt className="h-4 w-4 text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">{bills.length}</div>
              <p className="text-xs text-gray-400 mt-1">
                Total owed: {formatHex(bills.reduce((sum, bill) => sum + bill.amount, 0))}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Physical Assets</CardTitle>
              <Wallet className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-400">
                ⬡{inventoryItems.reduce((sum, item) => sum + item.value, 0).toLocaleString()}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Estimated inventory value
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Bills Section */}
        {bills.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-red-400 mb-4 flex items-center">
              <Receipt className="w-5 h-5 mr-2" />
              Unpaid Bills
            </h2>
            <div className="grid gap-4">
              {bills.map((bill) => (
                <Card key={bill.id} className="bg-red-900/20 border-red-700/50 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-red-400">{bill.description}</h3>
                        <p className="text-sm text-gray-400">
                          From: {bill.from_profile?.character_name || "System"}
                        </p>
                        <p className="text-sm text-gray-400">
                          Due: {bill.due_date ? new Date(bill.due_date).toLocaleDateString() : "No due date"}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-red-400">
                          {formatHex(bill.amount)}
                        </div>
                        <Button
                          onClick={() => handlePayBill(bill.id)}
                          size="sm"
                          className="mt-2 bg-red-600 hover:bg-red-700"
                          disabled={!userProfile || userProfile.credits < bill.amount}
                        >
                          Pay Bill
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Inventory Grid */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-yellow-400 mb-4 flex items-center">
            <Package className="w-5 h-5 mr-2" />
            Inventory
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {inventoryItems.map((item) => {
              const rarityColors = {
                common: "border-gray-500 bg-gray-800/50",
                uncommon: "border-green-500 bg-green-900/20", 
                rare: "border-blue-500 bg-blue-900/20",
                epic: "border-purple-500 bg-purple-900/20",
                legendary: "border-yellow-500 bg-yellow-900/20"
              };

              return (
                <Card key={item.id} className={`p-3 ${rarityColors[item.rarity as keyof typeof rarityColors]} backdrop-blur-sm`}>
                  <div className="text-center">
                    <h3 className="font-semibold text-white text-sm mb-2">{item.name}</h3>
                    <div className="space-y-1">
                       <Badge variant="outline" className="text-xs text-gray-300">
                         Qty: {item.quantity}
                       </Badge>
                      <div className="text-yellow-400 font-mono text-xs">
                        ⬡{item.value.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-cyan-400 mb-4">Recent Transactions</h2>
          <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
            <CardContent className="p-0">
              <div className="divide-y divide-gray-700">
                {transactions.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    No transactions yet
                  </div>
                ) : (
                  transactions.map((transaction) => (
                    <div key={transaction.id} className="p-4 flex items-center justify-between hover:bg-gray-800/30 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${
                          transaction.amount > 0 ? 'bg-green-400' : 'bg-red-400'
                        }`}></div>
                        <div>
                          <p className="text-white font-medium">{transaction.description}</p>
                          <p className="text-xs text-gray-400">
                            {new Date(transaction.created_at).toLocaleString()}
                          </p>
                          {transaction.from_profile && (
                            <p className="text-xs text-blue-400">
                              From: {transaction.from_profile.character_name}
                            </p>
                          )}
                          {transaction.to_profile && (
                            <p className="text-xs text-blue-400">
                              To: {transaction.to_profile.character_name}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className={`text-right ${
                        transaction.amount > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        <span className="font-mono font-bold">
                          {transaction.amount > 0 ? '+' : ''}{formatHex(Math.abs(transaction.amount))}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Vault;