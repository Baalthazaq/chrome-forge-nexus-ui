import { useState, useEffect } from "react";
import { ArrowLeft, CreditCard, Wallet, Package, TrendingUp, TrendingDown, Send, RefreshCw, Receipt } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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
  const [recurringPayments, setRecurringPayments] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBills, setSelectedBills] = useState<string[]>([]);

  const getName = (id?: string | null) => {
    const p = profiles.find((pr) => pr.user_id === id);
    return p?.character_name || "System";
  };
  
  // Send Money Dialog State
  const [sendMoneyOpen, setSendMoneyOpen] = useState(false);
  const [sendAmount, setSendAmount] = useState("");
  const [sendRecipient, setSendRecipient] = useState("");
  const [sendDescription, setSendDescription] = useState("");
  const [overdraftDialogOpen, setOverdraftDialogOpen] = useState(false);
  const [pendingBillPayment, setPendingBillPayment] = useState<{ billIds: string[], totalAmount: number } | null>(null);

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
        .select("*")
        .or(`user_id.eq.${activeUserId},from_user_id.eq.${activeUserId},to_user_id.eq.${activeUserId}`)
        .order("created_at", { ascending: false })
        .limit(10);
      
      setTransactions(transactionData || []);

      // Load bills
      const { data: billData } = await supabase
        .from("bills")
        .select("*")
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
      
      // Load recurring payments for this user
      const { data: rpData } = await supabase
        .from("recurring_payments")
        .select("*")
        .eq("to_user_id", activeUserId)
        .order("created_at", { ascending: false });
      setRecurringPayments(rpData || []);


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

  const checkOverdraftAndPay = (billIds: string[]) => {
    const totalAmount = billIds.reduce((sum, billId) => {
      const bill = bills.find(b => b.id === billId);
      return sum + (bill?.amount || 0);
    }, 0);

    const currentCredits = userProfile?.credits || 0;
    const resultingBalance = currentCredits - totalAmount;

    // If sufficient funds, pay immediately
    if (resultingBalance >= 0) {
      processPayment(billIds);
      return;
    }

    // Check if overdraft is within limits (up to 1 bag = 600 hex)
    if (resultingBalance >= -600) {
      setPendingBillPayment({ billIds, totalAmount });
      setOverdraftDialogOpen(true);
    } else {
      toast({
        title: "Error",
        description: "Payment exceeds overdraft limit. Maximum overdraft is 1 Bag (600 Hex).",
        variant: "destructive"
      });
    }
  };

  const processPayment = async (billIds: string[]) => {
    try {
      const promises = billIds.map(billId =>
        supabase.functions.invoke('financial-operations', {
          body: {
            operation: 'pay_bill',
            bill_id: billId
          }
        })
      );

      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error);
      
      if (errors.length > 0) {
        throw new Error(`Failed to pay ${errors.length} bills`);
      }

      toast({
        title: "Success",
        description: `Successfully paid ${billIds.length} bill${billIds.length > 1 ? 's' : ''}`
      });

      setSelectedBills([]);
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to pay bills",
        variant: "destructive"
      });
    }
  };

  const handleOverdraftConfirm = () => {
    if (pendingBillPayment) {
      processPayment(pendingBillPayment.billIds);
      setPendingBillPayment(null);
      setOverdraftDialogOpen(false);
    }
  };

  const handlePaySelectedBills = async () => {
    if (selectedBills.length === 0) {
      toast({
        title: "Error",
        description: "Please select bills to pay",
        variant: "destructive"
      });
      return;
    }

    checkOverdraftAndPay(selectedBills);
  };

  const handlePayBill = async (billId: string) => {
    checkOverdraftAndPay([billId]);
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
              <DialogContent className="sm:max-w-[425px] bg-gray-900 border-gray-700">
                <DialogHeader>
                  <DialogTitle className="text-white">Send Hex</DialogTitle>
                  <DialogDescription className="text-gray-400">
                    Transfer Hex to another character.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="recipient" className="text-right text-gray-300">Recipient</Label>
                    <Select value={sendRecipient} onValueChange={setSendRecipient}>
                      <SelectTrigger className="col-span-3 bg-gray-800 border-gray-600 text-white">
                        <SelectValue placeholder="Select recipient" />
                      </SelectTrigger>
                       <SelectContent className="bg-gray-800 border-gray-600">
                         {profiles.map((profile) => (
                             <SelectItem key={profile.user_id} value={profile.user_id} className="text-white hover:bg-gray-700">
                               {profile.character_name}
                             </SelectItem>
                         ))}
                       </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="amount" className="text-right text-gray-300">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={sendAmount}
                      onChange={(e) => setSendAmount(e.target.value)}
                      className="col-span-3 bg-gray-800 border-gray-600 text-white"
                      placeholder="Enter amount in Hex"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="description" className="text-right text-gray-300 mt-2">Description</Label>
                    <Textarea
                      id="description"
                      value={sendDescription}
                      onChange={(e) => setSendDescription(e.target.value)}
                      className="col-span-3 bg-gray-800 border-gray-600 text-white"
                      placeholder="Enter description"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    onClick={handleSendMoney} 
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
                  >
                    Send Hex
                  </Button>
                </DialogFooter>
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
                ⏣{userProfile?.credits || 0}
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
              <div className="text-2xl font-bold text-red-400">
                ⏣{bills.reduce((sum, bill) => sum + bill.amount, 0)}
              </div>
              <div className="text-sm text-red-400 mt-1">
                {getHexBreakdown(bills.reduce((sum, bill) => sum + bill.amount, 0)).breakdown}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Total owed ({bills.length} bill{bills.length !== 1 ? 's' : ''})
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
                ⏣{inventoryItems.reduce((sum, item) => sum + item.value, 0)}
              </div>
              <div className="text-sm text-yellow-400 mt-1">
                {getHexBreakdown(inventoryItems.reduce((sum, item) => sum + item.value, 0)).breakdown}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Estimated inventory value
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Bills Section */}
        {bills.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-red-400 flex items-center">
                <Receipt className="w-5 h-5 mr-2" />
                Unpaid Bills ({bills.length})
              </h2>
              {selectedBills.length > 0 && (
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-400">
                    {selectedBills.length} selected • Total: {formatHex(selectedBills.reduce((sum, billId) => {
                      const bill = bills.find(b => b.id === billId);
                      return sum + (bill?.amount || 0);
                    }, 0))}
                  </span>
                  <Button
                    onClick={handlePaySelectedBills}
                    size="sm"
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Pay Selected ({selectedBills.length})
                  </Button>
                  <Button
                    onClick={() => setSelectedBills([])}
                    size="sm"
                    variant="outline"
                    className="border-gray-600 text-gray-400 hover:bg-gray-800"
                  >
                    Clear Selection
                  </Button>
                </div>
              )}
            </div>
            
            <div className="grid gap-4">
              {bills.map((bill) => (
                <Card key={bill.id} className="bg-red-900/20 border-red-700/50 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedBills.includes(bill.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedBills([...selectedBills, bill.id]);
                            } else {
                              setSelectedBills(selectedBills.filter(id => id !== bill.id));
                            }
                          }}
                          className="border-red-400 data-[state=checked]:bg-red-600"
                        />
                        <div>
                          <h3 className="font-semibold text-red-400">{bill.description}</h3>
                          <p className="text-sm text-gray-400">
                            From: {getName(bill.from_user_id)}
                          </p>
                          <p className="text-sm text-gray-400">
                            Created: {new Date(bill.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-red-400">
                          {formatHex(bill.amount)}
                        </div>
                        <div className="text-sm text-red-400">
                          {getHexBreakdown(bill.amount).breakdown}
                        </div>
                        <Button
                          onClick={() => handlePayBill(bill.id)}
                          size="sm"
                          className="mt-2 bg-red-600 hover:bg-red-700"
                        >
                          Pay Bill
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {/* Quick Actions */}
              <div className="flex items-center justify-between p-4 bg-gray-900/30 border border-gray-700/50 rounded-lg">
                <div className="text-sm text-gray-400">
                  Quick Actions:
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setSelectedBills(bills.map(b => b.id))}
                    size="sm"
                    variant="outline"
                    className="border-red-600 text-red-400 hover:bg-red-900/30"
                  >
                    Select All
                  </Button>
                  <Button
                    onClick={() => {
                      const affordableBills = bills.filter(bill => 
                        userProfile && userProfile.credits >= bill.amount
                      ).map(b => b.id);
                      setSelectedBills(affordableBills);
                    }}
                    size="sm"
                    variant="outline"
                    className="border-yellow-600 text-yellow-400 hover:bg-yellow-900/30"
                  >
                    Select Affordable
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recurring Payments */}
        {recurringPayments.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-green-400 mb-4">Recurring Payments</h2>
            <div className="grid gap-4">
              {recurringPayments.map((rp) => (
                <Card key={rp.id} className="bg-green-900/20 border-green-700/50 backdrop-blur-sm">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-green-400">{rp.description}</h3>
                      <p className="text-sm text-gray-400">Amount: {formatHex(rp.amount)} • Interval: {rp.interval_type}</p>
                      <p className="text-xs text-gray-500">Last: {rp.last_sent_at ? new Date(rp.last_sent_at).toLocaleDateString() : 'Never'} • Next: {rp.next_send_at ? new Date(rp.next_send_at).toLocaleDateString() : 'Not scheduled'}</p>
                    </div>
                    <Badge variant={rp.is_active ? 'default' : 'secondary'}>
                      {rp.is_active ? 'Active' : 'Inactive'}
                    </Badge>
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
                         ⏣{item.value}
                       </div>
                       <div className="text-yellow-400 font-mono text-xs">
                         {getHexBreakdown(item.value).breakdown}
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
                          <p className="text-xs text-blue-400">
                            From: {getName(transaction.from_user_id)}
                          </p>
                          <p className="text-xs text-blue-400">
                            To: {getName(transaction.to_user_id)}
                          </p>
                        </div>
                      </div>
                      <div className={`text-right ${
                        transaction.amount > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                       <span className="font-mono font-bold">
                         {transaction.amount > 0 ? '+' : ''}⏣{Math.abs(transaction.amount)}
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

      {/* Overdraft Warning Dialog */}
      <AlertDialog open={overdraftDialogOpen} onOpenChange={setOverdraftDialogOpen}>
        <AlertDialogContent className="bg-gray-900 border-red-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-400">Account Overdraft Warning</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              This payment will overdraw your account by {pendingBillPayment ? formatHex(pendingBillPayment.totalAmount - (userProfile?.credits || 0)) : ''}.
              <br /><br />
              <strong>Current Balance:</strong> {formatHex(userProfile?.credits || 0)}
              <br />
              <strong>Payment Amount:</strong> {pendingBillPayment ? formatHex(pendingBillPayment.totalAmount) : ''}
              <br />
              <strong>Resulting Balance:</strong> <span className="text-red-400">{pendingBillPayment ? formatHex((userProfile?.credits || 0) - pendingBillPayment.totalAmount) : ''}</span>
              <br /><br />
              You have an overdraft limit of 1 Bag (600 Hex). Do you want to proceed with this payment?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 border-gray-600 text-gray-300">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleOverdraftConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Proceed with Overdraft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Vault;