import { useState, useEffect } from "react";
import { ArrowLeft, CreditCard, Wallet, Package, TrendingUp, TrendingDown, Send, Receipt, RefreshCw, Settings, Users, Plus, Play, PlayCircle, XCircle, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Vault = () => {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const { toast } = useToast();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [allBills, setAllBills] = useState<any[]>([]);
  const [recurringPayments, setRecurringPayments] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Send Money Dialog State
  const [sendMoneyOpen, setSendMoneyOpen] = useState(false);
  const [sendAmount, setSendAmount] = useState("");
  const [sendRecipient, setSendRecipient] = useState("");
  const [sendDescription, setSendDescription] = useState("");
  
  // Admin Dialog States
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [billDialogOpen, setBillDialogOpen] = useState(false);
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);
  const [recurringDialogOpen, setRecurringDialogOpen] = useState(false);
  
  // Admin Form States
  const [billForm, setBillForm] = useState({
    to_user_id: "",
    amount: "",
    description: "",
    due_date: "",
    is_recurring: false,
    recurring_interval: ""
  });
  const [creditForm, setCreditForm] = useState({
    user_id: "",
    amount: ""
  });
  const [recurringForm, setRecurringForm] = useState({
    to_user_id: "",
    amount: "",
    description: "",
    interval_type: ""
  });

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
    if (!user) return;
    
    try {
      // Load user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
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
        .or(`user_id.eq.${user.id},from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
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
        .eq("to_user_id", user.id)
        .eq("status", "unpaid")
        .order("created_at", { ascending: false });
      
      setBills(billData || []);

      // Load all profiles for send money dropdown
      const { data: profileData } = await supabase
        .from("profiles")
        .select("user_id, character_name")
        .neq("user_id", user.id);
      
      setProfiles(profileData || []);

      // Load admin data if user is admin
      if (isAdmin) {
        // Load all bills for admin view
        const { data: allBillData } = await supabase
          .from("bills")
          .select(`
            *,
            from_profile:from_user_id(character_name),
            to_profile:to_user_id(character_name)
          `)
          .eq("status", "unpaid")
          .order("created_at", { ascending: false });
        
        setAllBills(allBillData || []);

        // Load recurring payments
        const { data: recurringData } = await supabase
          .from("recurring_payments")
          .select(`
            *,
            from_profile:from_user_id(character_name),
            to_profile:to_user_id(character_name)
          `)
          .order("created_at", { ascending: false });
        
        setRecurringPayments(recurringData || []);
      }

    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user, isAdmin]);

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

  // Admin Functions
  const handleSendBill = async () => {
    if (!billForm.to_user_id || !billForm.amount || !billForm.description) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const amount = parseInt(billForm.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('admin-financial', {
        body: {
          operation: 'send_bill',
          to_user_id: billForm.to_user_id,
          amount,
          description: billForm.description,
          due_date: billForm.due_date || null,
          is_recurring: billForm.is_recurring,
          recurring_interval: billForm.is_recurring ? billForm.recurring_interval : null
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Bill sent successfully"
      });

      setBillDialogOpen(false);
      setBillForm({ to_user_id: "", amount: "", description: "", due_date: "", is_recurring: false, recurring_interval: "" });
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send bill",
        variant: "destructive"
      });
    }
  };

  const handleSetCredits = async () => {
    if (!creditForm.user_id || !creditForm.amount) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    const amount = parseInt(creditForm.amount);
    if (isNaN(amount) || amount < 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('admin-financial', {
        body: {
          operation: 'set_user_credits',
          user_id: creditForm.user_id,
          amount
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Credits updated successfully"
      });

      setCreditDialogOpen(false);
      setCreditForm({ user_id: "", amount: "" });
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update credits",
        variant: "destructive"
      });
    }
  };

  const handleCreateRecurringPayment = async () => {
    if (!recurringForm.to_user_id || !recurringForm.amount || !recurringForm.description || !recurringForm.interval_type) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    const amount = parseInt(recurringForm.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('admin-financial', {
        body: {
          operation: 'create_recurring_payment',
          to_user_id: recurringForm.to_user_id,
          amount,
          description: recurringForm.description,
          interval_type: recurringForm.interval_type
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Recurring payment created successfully"
      });

      setRecurringDialogOpen(false);
      setRecurringForm({ to_user_id: "", amount: "", description: "", interval_type: "" });
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create recurring payment",
        variant: "destructive"
      });
    }
  };

  const handleProcessRecurring = async (recurringId: string) => {
    try {
      const { error } = await supabase.functions.invoke('admin-financial', {
        body: {
          operation: 'process_recurring_payment',
          recurring_payment_id: recurringId
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Recurring payment processed successfully"
      });

      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process recurring payment",
        variant: "destructive"
      });
    }
  };

  const handleProcessAllRecurring = async () => {
    try {
      const { error } = await supabase.functions.invoke('admin-financial', {
        body: {
          operation: 'process_all_recurring'
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "All recurring payments processed successfully"
      });

      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process recurring payments",
        variant: "destructive"
      });
    }
  };

  const handleToggleRecurring = async (recurringId: string, isActive: boolean) => {
    try {
      const { error } = await supabase.functions.invoke('admin-financial', {
        body: {
          operation: 'toggle_recurring_status',
          recurring_payment_id: recurringId,
          is_active: !isActive
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Recurring payment ${!isActive ? 'activated' : 'deactivated'} successfully`
      });

      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to toggle recurring payment",
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
            {isAdmin && (
              <Dialog open={adminDialogOpen} onOpenChange={setAdminDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="bg-purple-900/50 border-purple-700 hover:bg-purple-800/50 text-purple-400">
                    <Settings className="w-4 h-4 mr-2" />
                    Admin Panel
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gray-900 border-gray-700 max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-purple-400 font-light">Financial Administration</DialogTitle>
                  </DialogHeader>
                  <Tabs defaultValue="bills" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="bills">Bills</TabsTrigger>
                      <TabsTrigger value="credits">Credits</TabsTrigger>
                      <TabsTrigger value="recurring">Recurring</TabsTrigger>
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="bills" className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-gray-300">All Unpaid Bills</h3>
                        <Dialog open={billDialogOpen} onOpenChange={setBillDialogOpen}>
                          <DialogTrigger asChild>
                            <Button size="sm" className="bg-red-600 hover:bg-red-700">
                              <Plus className="w-4 h-4 mr-2" />
                              Send Bill
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-gray-900 border-gray-700">
                            <DialogHeader>
                              <DialogTitle className="text-red-400">Send Bill</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label className="text-gray-300">To User</Label>
                                <Select value={billForm.to_user_id} onValueChange={(value) => setBillForm({...billForm, to_user_id: value})}>
                                  <SelectTrigger className="bg-gray-800 border-gray-600">
                                    <SelectValue placeholder="Select user" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-gray-800 border-gray-600">
                                    {profiles.map((profile) => (
                                      <SelectItem key={profile.user_id} value={profile.user_id}>
                                        {profile.character_name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-gray-300">Amount</Label>
                                <Input
                                  type="number"
                                  value={billForm.amount}
                                  onChange={(e) => setBillForm({...billForm, amount: e.target.value})}
                                  className="bg-gray-800 border-gray-600 text-gray-300"
                                  placeholder="Amount in Hex"
                                />
                              </div>
                              <div>
                                <Label className="text-gray-300">Description</Label>
                                <Textarea
                                  value={billForm.description}
                                  onChange={(e) => setBillForm({...billForm, description: e.target.value})}
                                  className="bg-gray-800 border-gray-600 text-gray-300"
                                  placeholder="Bill description"
                                />
                              </div>
                              <div>
                                <Label className="text-gray-300">Due Date (Optional)</Label>
                                <Input
                                  type="date"
                                  value={billForm.due_date}
                                  onChange={(e) => setBillForm({...billForm, due_date: e.target.value})}
                                  className="bg-gray-800 border-gray-600 text-gray-300"
                                />
                              </div>
                              <div className="flex items-center space-x-2">
                                <Switch
                                  checked={billForm.is_recurring}
                                  onCheckedChange={(checked) => setBillForm({...billForm, is_recurring: checked})}
                                />
                                <Label className="text-gray-300">Recurring Bill</Label>
                              </div>
                              {billForm.is_recurring && (
                                <div>
                                  <Label className="text-gray-300">Interval</Label>
                                  <Select value={billForm.recurring_interval} onValueChange={(value) => setBillForm({...billForm, recurring_interval: value})}>
                                    <SelectTrigger className="bg-gray-800 border-gray-600">
                                      <SelectValue placeholder="Select interval" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-gray-800 border-gray-600">
                                      <SelectItem value="daily">Daily</SelectItem>
                                      <SelectItem value="weekly">Weekly</SelectItem>
                                      <SelectItem value="monthly">Monthly</SelectItem>
                                      <SelectItem value="yearly">Yearly</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                              <Button onClick={handleSendBill} className="w-full bg-red-600 hover:bg-red-700">
                                Send Bill
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {allBills.map((bill) => (
                          <Card key={bill.id} className="bg-red-900/20 border-red-700/50 p-3">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-red-400 font-medium">{bill.description}</p>
                                <p className="text-sm text-gray-400">
                                  From: {bill.from_profile?.character_name || "System"} → To: {bill.to_profile?.character_name}
                                </p>
                                <p className="text-sm text-gray-400">Amount: ⬡{bill.amount.toLocaleString()}</p>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="credits" className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-gray-300">Manage User Credits</h3>
                        <Dialog open={creditDialogOpen} onOpenChange={setCreditDialogOpen}>
                          <DialogTrigger asChild>
                            <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700">
                              <CreditCard className="w-4 h-4 mr-2" />
                              Set Credits
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-gray-900 border-gray-700">
                            <DialogHeader>
                              <DialogTitle className="text-cyan-400">Set User Credits</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label className="text-gray-300">User</Label>
                                <Select value={creditForm.user_id} onValueChange={(value) => setCreditForm({...creditForm, user_id: value})}>
                                  <SelectTrigger className="bg-gray-800 border-gray-600">
                                    <SelectValue placeholder="Select user" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-gray-800 border-gray-600">
                                    {profiles.map((profile) => (
                                      <SelectItem key={profile.user_id} value={profile.user_id}>
                                        {profile.character_name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-gray-300">New Credit Amount</Label>
                                <Input
                                  type="number"
                                  value={creditForm.amount}
                                  onChange={(e) => setCreditForm({...creditForm, amount: e.target.value})}
                                  className="bg-gray-800 border-gray-600 text-gray-300"
                                  placeholder="Total credits to set"
                                />
                              </div>
                              <Button onClick={handleSetCredits} className="w-full bg-cyan-600 hover:bg-cyan-700">
                                Set Credits
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TabsContent>

                    <TabsContent value="recurring" className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-gray-300">Recurring Payments</h3>
                        <div className="flex gap-2">
                          <Button 
                            onClick={handleProcessAllRecurring}
                            size="sm" 
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <PlayCircle className="w-4 h-4 mr-2" />
                            Process All
                          </Button>
                          <Dialog open={recurringDialogOpen} onOpenChange={setRecurringDialogOpen}>
                            <DialogTrigger asChild>
                              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                                <Plus className="w-4 h-4 mr-2" />
                                New Recurring
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-gray-900 border-gray-700">
                              <DialogHeader>
                                <DialogTitle className="text-blue-400">Create Recurring Payment</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label className="text-gray-300">To User</Label>
                                  <Select value={recurringForm.to_user_id} onValueChange={(value) => setRecurringForm({...recurringForm, to_user_id: value})}>
                                    <SelectTrigger className="bg-gray-800 border-gray-600">
                                      <SelectValue placeholder="Select user" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-gray-800 border-gray-600">
                                      {profiles.map((profile) => (
                                        <SelectItem key={profile.user_id} value={profile.user_id}>
                                          {profile.character_name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-gray-300">Amount</Label>
                                  <Input
                                    type="number"
                                    value={recurringForm.amount}
                                    onChange={(e) => setRecurringForm({...recurringForm, amount: e.target.value})}
                                    className="bg-gray-800 border-gray-600 text-gray-300"
                                    placeholder="Amount per payment"
                                  />
                                </div>
                                <div>
                                  <Label className="text-gray-300">Description</Label>
                                  <Input
                                    value={recurringForm.description}
                                    onChange={(e) => setRecurringForm({...recurringForm, description: e.target.value})}
                                    className="bg-gray-800 border-gray-600 text-gray-300"
                                    placeholder="Payment description"
                                  />
                                </div>
                                <div>
                                  <Label className="text-gray-300">Interval</Label>
                                  <Select value={recurringForm.interval_type} onValueChange={(value) => setRecurringForm({...recurringForm, interval_type: value})}>
                                    <SelectTrigger className="bg-gray-800 border-gray-600">
                                      <SelectValue placeholder="Select interval" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-gray-800 border-gray-600">
                                      <SelectItem value="daily">Daily</SelectItem>
                                      <SelectItem value="weekly">Weekly</SelectItem>
                                      <SelectItem value="monthly">Monthly</SelectItem>
                                      <SelectItem value="yearly">Yearly</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <Button onClick={handleCreateRecurringPayment} className="w-full bg-blue-600 hover:bg-blue-700">
                                  Create Recurring Payment
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {recurringPayments.map((payment) => (
                          <Card key={payment.id} className="bg-blue-900/20 border-blue-700/50 p-3">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-blue-400 font-medium">{payment.description}</p>
                                <p className="text-sm text-gray-400">
                                  From: {payment.from_profile?.character_name || "System"} → To: {payment.to_profile?.character_name}
                                </p>
                                <p className="text-sm text-gray-400">
                                  ⬡{payment.amount.toLocaleString()} • {payment.interval_type} • Sent {payment.total_times_sent} times
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => handleProcessRecurring(payment.id)}
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <Play className="w-4 h-4" />
                                </Button>
                                <Button
                                  onClick={() => handleToggleRecurring(payment.id, payment.is_active)}
                                  size="sm"
                                  variant={payment.is_active ? "destructive" : "default"}
                                  className={payment.is_active ? "bg-red-600 hover:bg-red-700" : "bg-gray-600 hover:bg-gray-700"}
                                >
                                  {payment.is_active ? <XCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="overview" className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-300">Financial Overview</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <Card className="bg-gray-800/50 border-gray-600 p-4">
                          <h4 className="text-red-400 font-medium">Total Unpaid Bills</h4>
                          <p className="text-2xl font-bold text-red-400">{allBills.length}</p>
                          <p className="text-sm text-gray-400">⬡{allBills.reduce((sum, bill) => sum + bill.amount, 0).toLocaleString()} total</p>
                        </Card>
                        <Card className="bg-gray-800/50 border-gray-600 p-4">
                          <h4 className="text-blue-400 font-medium">Active Recurring Payments</h4>
                          <p className="text-2xl font-bold text-blue-400">{recurringPayments.filter(p => p.is_active).length}</p>
                          <p className="text-sm text-gray-400">{recurringPayments.length} total configured</p>
                        </Card>
                      </div>
                    </TabsContent>
                  </Tabs>
                </DialogContent>
              </Dialog>
            )}
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
              <div className="text-2xl font-bold text-cyan-400">
                ⬡{userProfile?.credits?.toLocaleString() || 0}
              </div>
              <p className="text-xs text-gray-400 mt-1">
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
                Total owed: ⬡{bills.reduce((sum, bill) => sum + bill.amount, 0).toLocaleString()}
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
                          ⬡{bill.amount.toLocaleString()}
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
                          {transaction.amount > 0 ? '+' : ''}⬡{transaction.amount.toLocaleString()}
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