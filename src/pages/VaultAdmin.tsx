import { useState, useEffect } from "react";
import { ArrowLeft, Users, Receipt, RefreshCw, Plus, Play, PlayCircle, XCircle, Check, DollarSign, Send, Minus, Calculator } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatHex } from "@/lib/currency";

const VaultAdmin = () => {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const { toast } = useToast();
  const [allBills, setAllBills] = useState<any[]>([]);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [recurringPayments, setRecurringPayments] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Admin Dialog States
  const [billDialogOpen, setBillDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);
  const [recurringDialogOpen, setRecurringDialogOpen] = useState(false);
  
  // Admin Form States
  const [billForm, setBillForm] = useState({
    recipient_ids: [] as string[],
    amount: "",
    description: "",
    due_date: "",
    is_recurring: false,
    recurring_interval: "",
    process_immediately: false
  });
  
  const [paymentForm, setPaymentForm] = useState({
    recipient_ids: [] as string[],
    amount: "",
    description: "",
    is_recurring: false,
    recurring_interval: "",
    process_immediately: false
  });
  
  const [creditForm, setCreditForm] = useState({
    user_ids: [] as string[],
    amount: "",
    operation: "set" as "set" | "add" | "subtract"
  });
  
  const [recurringForm, setRecurringForm] = useState({
    recipient_ids: [] as string[],
    amount: "",
    description: "",
    interval_type: "",
    type: "payment" as "bill" | "payment"
  });

  const loadData = async () => {
    if (!user || !isAdmin) return;
    
    try {
      // Load all profiles
      const { data: profileData } = await supabase
        .from("profiles")
        .select("user_id, character_name, credits");
      
      setProfiles(profileData || []);

      // Load all bills (both paid and unpaid)
      const { data: allBillData } = await supabase
        .from("bills")
        .select(`
          *,
          from_profile:from_user_id(character_name),
          to_profile:to_user_id(character_name)
        `)
        .order("created_at", { ascending: false });
      
      setAllBills(allBillData || []);

      // Load all transactions
      const { data: transactionData } = await supabase
        .from("transactions")
        .select(`
          *,
          from_profile:from_user_id(character_name),
          to_profile:to_user_id(character_name)
        `)
        .order("created_at", { ascending: false })
        .limit(50);
      
      setAllTransactions(transactionData || []);

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

    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user, isAdmin]);

  // Admin Functions
  const handleSendBill = async () => {
    if (!billForm.recipient_ids.length || !billForm.amount || !billForm.description) {
      toast({
        title: "Error",
        description: "Please fill in all required fields and select at least one recipient",
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
      const promises = billForm.recipient_ids.map(recipientId => 
        supabase.functions.invoke('admin-financial', {
          body: {
            operation: 'send_bill',
            to_user_id: recipientId,
            amount,
            description: billForm.description,
            due_date: billForm.due_date || null,
            is_recurring: billForm.is_recurring,
            recurring_interval: billForm.is_recurring ? billForm.recurring_interval : null,
            process_immediately: billForm.process_immediately
          }
        })
      );

      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error);
      
      if (errors.length > 0) {
        throw new Error(`Failed to send ${errors.length} bills`);
      }

      toast({
        title: "Success",
        description: `Bills sent to ${billForm.recipient_ids.length} recipients successfully`
      });

      setBillDialogOpen(false);
      setBillForm({ 
        recipient_ids: [], 
        amount: "", 
        description: "", 
        due_date: "", 
        is_recurring: false, 
        recurring_interval: "",
        process_immediately: false
      });
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send bills",
        variant: "destructive"
      });
    }
  };

  const handleSendPayment = async () => {
    if (!paymentForm.recipient_ids.length || !paymentForm.amount || !paymentForm.description) {
      toast({
        title: "Error",
        description: "Please fill in all required fields and select at least one recipient",
        variant: "destructive"
      });
      return;
    }

    const amount = parseInt(paymentForm.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive"
      });
      return;
    }

    try {
      const promises = paymentForm.recipient_ids.map(recipientId => 
        supabase.functions.invoke('admin-financial', {
          body: {
            operation: 'send_payment',
            to_user_id: recipientId,
            amount,
            description: paymentForm.description
          }
        })
      );

      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error);
      
      if (errors.length > 0) {
        throw new Error(`Failed to send ${errors.length} payments`);
      }

      toast({
        title: "Success",
        description: `Payments sent to ${paymentForm.recipient_ids.length} recipients successfully`
      });

      setPaymentDialogOpen(false);
      setPaymentForm({ 
        recipient_ids: [], 
        amount: "", 
        description: "", 
        is_recurring: false, 
        recurring_interval: "",
        process_immediately: false
      });
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send payments",
        variant: "destructive"
      });
    }
  };

  const handleSetCredits = async () => {
    if (!creditForm.user_ids.length || !creditForm.amount) {
      toast({
        title: "Error",
        description: "Please fill in all fields and select at least one user",
        variant: "destructive"
      });
      return;
    }

    let amount = parseFloat(creditForm.amount);
    if (isNaN(amount)) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive"
      });
      return;
    }

    try {
      const promises = creditForm.user_ids.map(async (userId) => {
        const currentProfile = profiles.find(p => p.user_id === userId);
        const currentCredits = currentProfile?.credits || 0;
        
        let finalAmount = amount;
        if (creditForm.operation === "add") {
          finalAmount = currentCredits + amount;
        } else if (creditForm.operation === "subtract") {
          finalAmount = Math.max(0, currentCredits - amount);
        }

        return supabase.functions.invoke('admin-financial', {
          body: {
            operation: 'set_user_credits',
            user_id: userId,
            amount: Math.floor(finalAmount)
          }
        });
      });

      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error);
      
      if (errors.length > 0) {
        throw new Error(`Failed to update ${errors.length} user credits`);
      }

      toast({
        title: "Success",
        description: `Credits updated for ${creditForm.user_ids.length} users successfully`
      });

      setCreditDialogOpen(false);
      setCreditForm({ user_ids: [], amount: "", operation: "set" });
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
    if (!recurringForm.recipient_ids.length || !recurringForm.amount || !recurringForm.description || !recurringForm.interval_type) {
      toast({
        title: "Error",
        description: "Please fill in all fields and select at least one recipient",
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
      const promises = recurringForm.recipient_ids.map(recipientId => 
        supabase.functions.invoke('admin-financial', {
          body: {
            operation: 'create_recurring_payment',
            to_user_id: recipientId,
            amount,
            description: recurringForm.description,
            interval_type: recurringForm.interval_type
          }
        })
      );

      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error);
      
      if (errors.length > 0) {
        throw new Error(`Failed to create ${errors.length} recurring payments`);
      }

      toast({
        title: "Success",
        description: `Recurring payments created for ${recurringForm.recipient_ids.length} recipients successfully`
      });

      setRecurringDialogOpen(false);
      setRecurringForm({ 
        recipient_ids: [], 
        amount: "", 
        description: "", 
        interval_type: "",
        type: "payment"
      });
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create recurring payments",
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-xl">Loading Admin Panel...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">You don't have admin permissions.</p>
          <Link to="/admin">
            <Button variant="outline">Back to Admin</Button>
          </Link>
        </div>
      </div>
    );
  }

  const unpaidBills = allBills.filter(bill => bill.status === 'unpaid');
  const totalCredits = profiles.reduce((sum, profile) => sum + (profile.credits || 0), 0);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/admin">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Admin
              </Button>
            </Link>
            <h1 className="text-3xl font-bold">App of Holding - Admin Panel</h1>
          </div>
        </div>

        {/* Admin Panel */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="bills">Bills</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="credits">Credits</TabsTrigger>
            <TabsTrigger value="recurring">Recurring</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{profiles.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Unpaid Bills</CardTitle>
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{unpaidBills.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Recurring</CardTitle>
                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {recurringPayments.filter(p => p.is_active).length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatHex(totalCredits)}</div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {allTransactions.slice(0, 10).map((transaction) => (
                    <div key={transaction.id} className="flex justify-between items-center p-2 border rounded">
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {transaction.from_profile?.character_name || 'System'} → {transaction.to_profile?.character_name || 'System'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatHex(transaction.amount)}</p>
                        <p className="text-sm text-muted-foreground">{transaction.transaction_type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bills" className="space-y-6">
            {/* Bills Management */}
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Bills Management</h2>
              <Dialog open={billDialogOpen} onOpenChange={setBillDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Send Bill
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Send Bill to Multiple Recipients</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label>Recipients (Select Multiple)</Label>
                      <div className="border rounded p-3 max-h-32 overflow-y-auto">
                        {profiles.map((profile) => (
                          <div key={profile.user_id} className="flex items-center space-x-2 py-1">
                            <Checkbox
                              id={`bill-recipient-${profile.user_id}`}
                              checked={billForm.recipient_ids.includes(profile.user_id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setBillForm({
                                    ...billForm,
                                    recipient_ids: [...billForm.recipient_ids, profile.user_id]
                                  });
                                } else {
                                  setBillForm({
                                    ...billForm,
                                    recipient_ids: billForm.recipient_ids.filter(id => id !== profile.user_id)
                                  });
                                }
                              }}
                            />
                            <Label htmlFor={`bill-recipient-${profile.user_id}`} className="text-sm">
                              {profile.character_name}
                            </Label>
                          </div>
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Selected: {billForm.recipient_ids.length} recipients
                      </p>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="bill-amount">Amount</Label>
                      <Input
                        id="bill-amount"
                        type="number"
                        placeholder="Enter amount"
                        value={billForm.amount}
                        onChange={(e) => setBillForm({...billForm, amount: e.target.value})}
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="bill-description">Description</Label>
                      <Textarea
                        id="bill-description"
                        placeholder="Enter description"
                        value={billForm.description}
                        onChange={(e) => setBillForm({...billForm, description: e.target.value})}
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="bill-due-date">Due Date (Optional)</Label>
                      <Input
                        id="bill-due-date"
                        type="date"
                        value={billForm.due_date}
                        onChange={(e) => setBillForm({...billForm, due_date: e.target.value})}
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="bill-process-immediately"
                        checked={billForm.process_immediately}
                        onCheckedChange={(checked) => setBillForm({...billForm, process_immediately: checked})}
                      />
                      <Label htmlFor="bill-process-immediately">Process Payment Immediately</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="bill-recurring"
                        checked={billForm.is_recurring}
                        onCheckedChange={(checked) => setBillForm({...billForm, is_recurring: checked})}
                      />
                      <Label htmlFor="bill-recurring">Make Recurring</Label>
                    </div>
                    
                    {billForm.is_recurring && (
                      <div className="grid gap-2">
                        <Label htmlFor="bill-interval">Recurring Interval</Label>
                        <Select value={billForm.recurring_interval} onValueChange={(value) => setBillForm({...billForm, recurring_interval: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select interval" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setBillDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSendBill}>Send Bills</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Bills List */}
            <div className="space-y-4">
              {allBills.map((bill) => (
                <Card key={bill.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{bill.description}</h3>
                        <p className="text-sm text-muted-foreground">
                          To: {bill.to_profile?.character_name} • 
                          From: {bill.from_profile?.character_name} • 
                          Amount: {formatHex(bill.amount)}
                        </p>
                        {bill.due_date && (
                          <p className="text-sm text-muted-foreground">
                            Due: {new Date(bill.due_date).toLocaleDateString()}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          Created: {new Date(bill.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={bill.status === 'paid' ? 'default' : 'destructive'}>
                        {bill.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="payments" className="space-y-6">
            {/* Payments Management */}
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Payments Management</h2>
              <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Send className="w-4 h-4 mr-2" />
                    Send Payment
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Send Payment to Multiple Recipients</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label>Recipients (Select Multiple)</Label>
                      <div className="border rounded p-3 max-h-32 overflow-y-auto">
                        {profiles.map((profile) => (
                          <div key={profile.user_id} className="flex items-center space-x-2 py-1">
                            <Checkbox
                              id={`payment-recipient-${profile.user_id}`}
                              checked={paymentForm.recipient_ids.includes(profile.user_id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setPaymentForm({
                                    ...paymentForm,
                                    recipient_ids: [...paymentForm.recipient_ids, profile.user_id]
                                  });
                                } else {
                                  setPaymentForm({
                                    ...paymentForm,
                                    recipient_ids: paymentForm.recipient_ids.filter(id => id !== profile.user_id)
                                  });
                                }
                              }}
                            />
                            <Label htmlFor={`payment-recipient-${profile.user_id}`} className="text-sm">
                              {profile.character_name}
                            </Label>
                          </div>
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Selected: {paymentForm.recipient_ids.length} recipients
                      </p>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="payment-amount">Amount</Label>
                      <Input
                        id="payment-amount"
                        type="number"
                        placeholder="Enter amount"
                        value={paymentForm.amount}
                        onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="payment-description">Description</Label>
                      <Textarea
                        id="payment-description"
                        placeholder="Enter description"
                        value={paymentForm.description}
                        onChange={(e) => setPaymentForm({...paymentForm, description: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSendPayment}>Send Payments</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </TabsContent>

          <TabsContent value="credits" className="space-y-6">
            {/* Credits Management */}
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Credits Management</h2>
              <Dialog open={creditDialogOpen} onOpenChange={setCreditDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Calculator className="w-4 h-4 mr-2" />
                    Modify Credits
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Modify User Credits</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label>Users (Select Multiple)</Label>
                      <div className="border rounded p-3 max-h-32 overflow-y-auto">
                        {profiles.map((profile) => (
                          <div key={profile.user_id} className="flex items-center space-x-2 py-1">
                            <Checkbox
                              id={`credit-user-${profile.user_id}`}
                              checked={creditForm.user_ids.includes(profile.user_id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setCreditForm({
                                    ...creditForm,
                                    user_ids: [...creditForm.user_ids, profile.user_id]
                                  });
                                } else {
                                  setCreditForm({
                                    ...creditForm,
                                    user_ids: creditForm.user_ids.filter(id => id !== profile.user_id)
                                  });
                                }
                              }}
                            />
                            <Label htmlFor={`credit-user-${profile.user_id}`} className="text-sm">
                              {profile.character_name} (Current: {formatHex(profile.credits || 0)})
                            </Label>
                          </div>
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Selected: {creditForm.user_ids.length} users
                      </p>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="credit-operation">Operation</Label>
                      <Select value={creditForm.operation} onValueChange={(value: any) => setCreditForm({...creditForm, operation: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select operation" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="set">Set to amount</SelectItem>
                          <SelectItem value="add">Add amount</SelectItem>
                          <SelectItem value="subtract">Subtract amount</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="credit-amount">
                        Amount {creditForm.operation === 'add' && '(+)'} {creditForm.operation === 'subtract' && '(-)'}
                      </Label>
                      <Input
                        id="credit-amount"
                        type="number"
                        placeholder="Enter amount"
                        value={creditForm.amount}
                        onChange={(e) => setCreditForm({...creditForm, amount: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setCreditDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSetCredits}>Update Credits</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* User Credits List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {profiles.map((profile) => (
                <Card key={profile.user_id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold">{profile.character_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Credits: {formatHex(profile.credits || 0)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="recurring" className="space-y-6">
            {/* Recurring Payments */}
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Recurring Payments</h2>
              <div className="flex gap-2">
                <Button onClick={handleProcessAllRecurring} variant="outline">
                  <PlayCircle className="w-4 h-4 mr-2" />
                  Process All
                </Button>
                <Dialog open={recurringDialogOpen} onOpenChange={setRecurringDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Recurring
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create Recurring Payment</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label>Recipients (Select Multiple)</Label>
                        <div className="border rounded p-3 max-h-32 overflow-y-auto">
                          {profiles.map((profile) => (
                            <div key={profile.user_id} className="flex items-center space-x-2 py-1">
                              <Checkbox
                                id={`recurring-recipient-${profile.user_id}`}
                                checked={recurringForm.recipient_ids.includes(profile.user_id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setRecurringForm({
                                      ...recurringForm,
                                      recipient_ids: [...recurringForm.recipient_ids, profile.user_id]
                                    });
                                  } else {
                                    setRecurringForm({
                                      ...recurringForm,
                                      recipient_ids: recurringForm.recipient_ids.filter(id => id !== profile.user_id)
                                    });
                                  }
                                }}
                              />
                              <Label htmlFor={`recurring-recipient-${profile.user_id}`} className="text-sm">
                                {profile.character_name}
                              </Label>
                            </div>
                          ))}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Selected: {recurringForm.recipient_ids.length} recipients
                        </p>
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="recurring-amount">Amount</Label>
                        <Input
                          id="recurring-amount"
                          type="number"
                          placeholder="Enter amount"
                          value={recurringForm.amount}
                          onChange={(e) => setRecurringForm({...recurringForm, amount: e.target.value})}
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="recurring-description">Description</Label>
                        <Textarea
                          id="recurring-description"
                          placeholder="Enter description"
                          value={recurringForm.description}
                          onChange={(e) => setRecurringForm({...recurringForm, description: e.target.value})}
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="recurring-interval">Interval</Label>
                        <Select value={recurringForm.interval_type} onValueChange={(value) => setRecurringForm({...recurringForm, interval_type: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select interval" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setRecurringDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateRecurringPayment}>Create</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Recurring Payments List */}
            <div className="space-y-4">
              {recurringPayments.map((payment) => (
                <Card key={payment.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{payment.description}</h3>
                        <p className="text-sm text-muted-foreground">
                          To: {payment.to_profile?.character_name} • 
                          From: {payment.from_profile?.character_name} • 
                          Amount: {formatHex(payment.amount)} • 
                          Interval: {payment.interval_type}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Last processed: {payment.last_sent_at ? new Date(payment.last_sent_at).toLocaleDateString() : 'Never'} •
                          Next: {payment.next_send_at ? new Date(payment.next_send_at).toLocaleDateString() : 'Not scheduled'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={payment.is_active ? 'default' : 'secondary'}>
                          {payment.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleProcessRecurring(payment.id)}
                          disabled={!payment.is_active}
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleRecurring(payment.id, payment.is_active)}
                        >
                          {payment.is_active ? <XCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default VaultAdmin;