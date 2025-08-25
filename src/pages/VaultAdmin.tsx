import { useState, useEffect } from "react";
import { ArrowLeft, Users, Receipt, RefreshCw, Plus, Play, PlayCircle, XCircle, Check, DollarSign } from "lucide-react";
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

const VaultAdmin = () => {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const { toast } = useToast();
  const [allBills, setAllBills] = useState<any[]>([]);
  const [recurringPayments, setRecurringPayments] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Admin Dialog States
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

  const loadData = async () => {
    if (!user || !isAdmin) return;
    
    try {
      // Load all profiles
      const { data: profileData } = await supabase
        .from("profiles")
        .select("user_id, character_name, credits");
      
      setProfiles(profileData || []);

      // Load all bills
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="bills">Bills</TabsTrigger>
            <TabsTrigger value="credits">Credits</TabsTrigger>
            <TabsTrigger value="recurring">Recurring</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                  <div className="text-2xl font-bold">{allBills.length}</div>
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
            </div>
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
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Send Bill</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="bill-recipient">To</Label>
                      <Select value={billForm.to_user_id} onValueChange={(value) => setBillForm({...billForm, to_user_id: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select recipient" />
                        </SelectTrigger>
                        <SelectContent>
                          {profiles.map((profile) => (
                            <SelectItem key={profile.user_id} value={profile.user_id}>
                              {profile.character_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                    <Button onClick={handleSendBill}>Send Bill</Button>
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
                          Amount: {bill.amount} credits
                        </p>
                        {bill.due_date && (
                          <p className="text-sm text-muted-foreground">
                            Due: {new Date(bill.due_date).toLocaleDateString()}
                          </p>
                        )}
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

          <TabsContent value="credits" className="space-y-6">
            {/* Credits Management */}
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Credits Management</h2>
              <Dialog open={creditDialogOpen} onOpenChange={setCreditDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <DollarSign className="w-4 h-4 mr-2" />
                    Set Credits
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Set User Credits</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="credit-user">User</Label>
                      <Select value={creditForm.user_id} onValueChange={(value) => setCreditForm({...creditForm, user_id: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select user" />
                        </SelectTrigger>
                        <SelectContent>
                          {profiles.map((profile) => (
                            <SelectItem key={profile.user_id} value={profile.user_id}>
                              {profile.character_name} (Current: {profile.credits || 0})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="credit-amount">New Amount</Label>
                      <Input
                        id="credit-amount"
                        type="number"
                        placeholder="Enter new amount"
                        value={creditForm.amount}
                        onChange={(e) => setCreditForm({...creditForm, amount: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setCreditDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSetCredits}>Set Credits</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* User Credits List */}
            <div className="space-y-4">
              {profiles.map((profile) => (
                <Card key={profile.user_id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold">{profile.character_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Credits: {profile.credits || 0}
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
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Create Recurring Payment</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="recurring-recipient">To</Label>
                        <Select value={recurringForm.to_user_id} onValueChange={(value) => setRecurringForm({...recurringForm, to_user_id: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select recipient" />
                          </SelectTrigger>
                          <SelectContent>
                            {profiles.map((profile) => (
                              <SelectItem key={profile.user_id} value={profile.user_id}>
                                {profile.character_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                          Amount: {payment.amount} credits • 
                          Interval: {payment.interval_type}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Last processed: {payment.last_processed ? new Date(payment.last_processed).toLocaleDateString() : 'Never'}
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