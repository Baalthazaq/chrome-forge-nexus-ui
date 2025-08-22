import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { CreditCard, Receipt, Send, RefreshCw, DollarSign, Clock, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const AdminFinancialPanel = () => {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [recurringPayments, setRecurringPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog states
  const [sendBillOpen, setSendBillOpen] = useState(false);
  const [sendPaymentOpen, setSendPaymentOpen] = useState(false);
  const [setCreditOpen, setSetCreditOpen] = useState(false);
  const [recurringOpen, setRecurringOpen] = useState(false);

  // Form states
  const [billForm, setBillForm] = useState({
    to_user_id: "",
    amount: "",
    description: "",
    due_date: "",
    is_recurring: false,
    recurring_interval: ""
  });

  const [paymentForm, setPaymentForm] = useState({
    to_user_id: "",
    amount: "",
    description: ""
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
    try {
      // Load all profiles
      const { data: profileData } = await supabase
        .from("profiles")
        .select("user_id, character_name, credits")
        .order("character_name");
      
      setProfiles(profileData || []);

      // Load all unpaid bills
      const { data: billData } = await supabase
        .from("bills")
        .select(`
          *,
          from_profile:from_user_id(character_name),
          to_profile:to_user_id(character_name)
        `)
        .eq("status", "unpaid")
        .order("created_at", { ascending: false });
      
      setBills(billData || []);

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
  }, []);

  const handleSendBill = async () => {
    if (!billForm.to_user_id || !billForm.amount || !billForm.description) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('admin-financial', {
        body: {
          operation: 'send_bill',
          ...billForm,
          amount: parseInt(billForm.amount)
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Bill sent successfully"
      });

      setSendBillOpen(false);
      setBillForm({
        to_user_id: "",
        amount: "",
        description: "",
        due_date: "",
        is_recurring: false,
        recurring_interval: ""
      });
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send bill",
        variant: "destructive"
      });
    }
  };

  const handleSendPayment = async () => {
    if (!paymentForm.to_user_id || !paymentForm.amount || !paymentForm.description) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('admin-financial', {
        body: {
          operation: 'send_payment',
          ...paymentForm,
          amount: parseInt(paymentForm.amount)
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment sent successfully"
      });

      setSendPaymentOpen(false);
      setPaymentForm({
        to_user_id: "",
        amount: "",
        description: ""
      });
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send payment",
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

    try {
      const { error } = await supabase.functions.invoke('admin-financial', {
        body: {
          operation: 'set_user_credits',
          user_id: creditForm.user_id,
          amount: parseInt(creditForm.amount)
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "User credits updated successfully"
      });

      setSetCreditOpen(false);
      setCreditForm({
        user_id: "",
        amount: ""
      });
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update credits",
        variant: "destructive"
      });
    }
  };

  const handleCreateRecurring = async () => {
    if (!recurringForm.to_user_id || !recurringForm.amount || !recurringForm.description || !recurringForm.interval_type) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('admin-financial', {
        body: {
          operation: 'create_recurring_payment',
          ...recurringForm,
          amount: parseInt(recurringForm.amount)
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Recurring payment created successfully"
      });

      setRecurringOpen(false);
      setRecurringForm({
        to_user_id: "",
        amount: "",
        description: "",
        interval_type: ""
      });
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
      <div className="p-4">
        <div className="text-cyan-400 text-xl font-mono">Loading Financial Panel...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-yellow-400">Financial Management</h2>
        <Button onClick={loadData} variant="ghost" size="sm" className="text-gray-400 hover:text-gray-300">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Dialog open={sendBillOpen} onOpenChange={setSendBillOpen}>
          <DialogTrigger asChild>
            <Button className="bg-red-600 hover:bg-red-700">
              <Receipt className="w-4 h-4 mr-2" />
              Send Bill
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-red-400">Send Bill</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Recipient</Label>
                <Select value={billForm.to_user_id} onValueChange={(value) => setBillForm({...billForm, to_user_id: value})}>
                  <SelectTrigger className="bg-gray-800 border-gray-600">
                    <SelectValue placeholder="Select recipient" />
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
                <Label>Amount</Label>
                <Input
                  type="number"
                  value={billForm.amount}
                  onChange={(e) => setBillForm({...billForm, amount: e.target.value})}
                  className="bg-gray-800 border-gray-600"
                  placeholder="Enter amount"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={billForm.description}
                  onChange={(e) => setBillForm({...billForm, description: e.target.value})}
                  className="bg-gray-800 border-gray-600"
                  placeholder="Enter description"
                />
              </div>
              <div>
                <Label>Due Date (Optional)</Label>
                <Input
                  type="date"
                  value={billForm.due_date}
                  onChange={(e) => setBillForm({...billForm, due_date: e.target.value})}
                  className="bg-gray-800 border-gray-600"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={billForm.is_recurring}
                  onCheckedChange={(checked) => setBillForm({...billForm, is_recurring: checked})}
                />
                <Label>Recurring Bill</Label>
              </div>
              {billForm.is_recurring && (
                <div>
                  <Label>Recurring Interval</Label>
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

        <Dialog open={sendPaymentOpen} onOpenChange={setSendPaymentOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              <Send className="w-4 h-4 mr-2" />
              Send Payment
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-green-400">Send Payment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Recipient</Label>
                <Select value={paymentForm.to_user_id} onValueChange={(value) => setPaymentForm({...paymentForm, to_user_id: value})}>
                  <SelectTrigger className="bg-gray-800 border-gray-600">
                    <SelectValue placeholder="Select recipient" />
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
                <Label>Amount</Label>
                <Input
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                  className="bg-gray-800 border-gray-600"
                  placeholder="Enter amount"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={paymentForm.description}
                  onChange={(e) => setPaymentForm({...paymentForm, description: e.target.value})}
                  className="bg-gray-800 border-gray-600"
                  placeholder="Enter description"
                />
              </div>
              <Button onClick={handleSendPayment} className="w-full bg-green-600 hover:bg-green-700">
                Send Payment
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={setCreditOpen} onOpenChange={setSetCreditOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <DollarSign className="w-4 h-4 mr-2" />
              Set Credits
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-blue-400">Set User Credits</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>User</Label>
                <Select value={creditForm.user_id} onValueChange={(value) => setCreditForm({...creditForm, user_id: value})}>
                  <SelectTrigger className="bg-gray-800 border-gray-600">
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    {profiles.map((profile) => (
                      <SelectItem key={profile.user_id} value={profile.user_id}>
                        {profile.character_name} (Current: {profile.credits || 0})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>New Amount</Label>
                <Input
                  type="number"
                  value={creditForm.amount}
                  onChange={(e) => setCreditForm({...creditForm, amount: e.target.value})}
                  className="bg-gray-800 border-gray-600"
                  placeholder="Enter new credit amount"
                />
              </div>
              <Button onClick={handleSetCredits} className="w-full bg-blue-600 hover:bg-blue-700">
                Set Credits
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={recurringOpen} onOpenChange={setRecurringOpen}>
          <DialogTrigger asChild>
            <Button className="bg-purple-600 hover:bg-purple-700">
              <Clock className="w-4 h-4 mr-2" />
              Recurring Payment
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-purple-400">Create Recurring Payment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Recipient</Label>
                <Select value={recurringForm.to_user_id} onValueChange={(value) => setRecurringForm({...recurringForm, to_user_id: value})}>
                  <SelectTrigger className="bg-gray-800 border-gray-600">
                    <SelectValue placeholder="Select recipient" />
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
                <Label>Amount</Label>
                <Input
                  type="number"
                  value={recurringForm.amount}
                  onChange={(e) => setRecurringForm({...recurringForm, amount: e.target.value})}
                  className="bg-gray-800 border-gray-600"
                  placeholder="Enter amount"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={recurringForm.description}
                  onChange={(e) => setRecurringForm({...recurringForm, description: e.target.value})}
                  className="bg-gray-800 border-gray-600"
                  placeholder="Enter description"
                />
              </div>
              <div>
                <Label>Interval</Label>
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
              <Button onClick={handleCreateRecurring} className="w-full bg-purple-600 hover:bg-purple-700">
                Create Recurring Payment
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gray-900/50 border-gray-700/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Total Users</CardTitle>
            <Users className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-400">{profiles.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-700/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Unpaid Bills</CardTitle>
            <Receipt className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">{bills.length}</div>
            <p className="text-xs text-gray-400 mt-1">
              Total: {bills.reduce((sum, bill) => sum + bill.amount, 0).toLocaleString()} credits
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-700/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Active Recurring</CardTitle>
            <Clock className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-400">
              {recurringPayments.filter(p => p.is_active).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unpaid Bills */}
      {bills.length > 0 && (
        <Card className="bg-gray-900/50 border-gray-700/50">
          <CardHeader>
            <CardTitle className="text-red-400">Unpaid Bills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bills.map((bill) => (
                <div key={bill.id} className="flex items-center justify-between p-4 bg-red-900/20 rounded-lg border border-red-700/50">
                  <div>
                    <h4 className="font-semibold text-white">{bill.description}</h4>
                    <p className="text-sm text-gray-400">
                      To: {bill.to_profile?.character_name} | 
                      From: {bill.from_profile?.character_name || "System"}
                    </p>
                    <p className="text-sm text-gray-400">
                      Due: {bill.due_date ? new Date(bill.due_date).toLocaleDateString() : "No due date"}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-red-400">
                      {bill.amount.toLocaleString()} credits
                    </div>
                    {bill.is_recurring && (
                      <Badge variant="outline" className="text-xs mt-1">
                        Recurring ({bill.recurring_interval})
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recurring Payments */}
      {recurringPayments.length > 0 && (
        <Card className="bg-gray-900/50 border-gray-700/50">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-purple-400">Recurring Payments</CardTitle>
            <Button onClick={handleProcessAllRecurring} className="bg-purple-600 hover:bg-purple-700">
              Process All
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recurringPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 bg-purple-900/20 rounded-lg border border-purple-700/50">
                  <div>
                    <h4 className="font-semibold text-white">{payment.description}</h4>
                    <p className="text-sm text-gray-400">
                      To: {payment.to_profile?.character_name} | 
                      Interval: {payment.interval_type}
                    </p>
                    <p className="text-sm text-gray-400">
                      Sent {payment.total_times_sent} times | 
                      Next: {payment.next_send_at ? new Date(payment.next_send_at).toLocaleDateString() : "N/A"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right mr-4">
                      <div className="text-lg font-bold text-purple-400">
                        {payment.amount.toLocaleString()} credits
                      </div>
                      <Badge variant={payment.is_active ? "default" : "secondary"} className="text-xs">
                        {payment.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() => handleProcessRecurring(payment.id)}
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700"
                        disabled={!payment.is_active}
                      >
                        Process Now
                      </Button>
                      <Button
                        onClick={() => handleToggleRecurring(payment.id, payment.is_active)}
                        size="sm"
                        variant="outline"
                        className="border-purple-600 text-purple-400 hover:bg-purple-900/50"
                      >
                        {payment.is_active ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminFinancialPanel;