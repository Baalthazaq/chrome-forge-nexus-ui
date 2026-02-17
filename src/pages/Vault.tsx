import { useState, useEffect } from "react";
import { ArrowLeft, CreditCard, Wallet, Package, Send, RefreshCw, Receipt, Plus, Trash2, ChevronDown, ChevronUp, TrendingUp } from "lucide-react";
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
import { storeItems, type StoreItem } from "@/data/storeItems";

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  status: string | null;
  efficiency_percent: number | null;
  metadata: any;
}

const categoryColors: Record<string, string> = {
  weapon: "border-red-500 bg-red-900/20",
  armor: "border-blue-500 bg-blue-900/20",
  cybernetic: "border-purple-500 bg-purple-900/20",
  cyberwear: "border-purple-500 bg-purple-900/20",
  consumable: "border-green-500 bg-green-900/20",
  tool: "border-yellow-500 bg-yellow-900/20",
  item: "border-yellow-500 bg-yellow-900/20",
  service: "border-cyan-500 bg-cyan-900/20",
  misc: "border-gray-500 bg-gray-800/50",
};

const tierColors: Record<number, string> = {
  1: "text-gray-400 border-gray-500",
  2: "text-green-400 border-green-500",
  3: "text-blue-400 border-blue-500",
  4: "text-purple-400 border-purple-500",
  5: "text-orange-400 border-orange-500",
};

const CATEGORIES = ["weapon", "armor", "cybernetic", "cyberwear", "consumable", "item", "tool", "service", "misc"];

const getItemFinalValue = (item: InventoryItem): number => {
  const meta = item.metadata;
  if (!meta?.purchase_price) return 0;
  const tier = meta?.specifications?.tier || 1;
  const subFee = meta?.specifications?.subscription_fee || 0;
  // Final value = purchase price + (subscription * tier multiplier)
  return meta.purchase_price + (subFee * tier * 30);
};

const Vault = () => {
  const { user } = useAuth();
  const { isAdmin, impersonatedUser } = useAdmin();
  const { toast } = useToast();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [recurringPayments, setRecurringPayments] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBills, setSelectedBills] = useState<string[]>([]);
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [showAllRecurring, setShowAllRecurring] = useState(false);

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

  // Add Item Dialog State
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [addExistingOpen, setAddExistingOpen] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("misc");
  const [newItemNotes, setNewItemNotes] = useState("");
  const [newItemTier, setNewItemTier] = useState("1");
  const [newItemCompany, setNewItemCompany] = useState("");
  const [newItemDescription, setNewItemDescription] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemSubFee, setNewItemSubFee] = useState("");
  const [newItemSubInterval, setNewItemSubInterval] = useState("daily");
  // Weapon fields
  const [newItemAbility, setNewItemAbility] = useState("");
  const [newItemHand, setNewItemHand] = useState("");
  const [newItemRange, setNewItemRange] = useState("");
  const [newItemDamage, setNewItemDamage] = useState("");
  // Armor fields
  const [newItemArmorBase, setNewItemArmorBase] = useState("");
  const [newItemArmorThreshold, setNewItemArmorThreshold] = useState("");
  // Store search
  const [storeSearchQuery, setStoreSearchQuery] = useState("");

  // Delete Item Confirm
  const [deleteItemDialogOpen, setDeleteItemDialogOpen] = useState(false);
  const [pendingDeleteItem, setPendingDeleteItem] = useState<InventoryItem | null>(null);

  const loadData = async () => {
    const activeUserId = impersonatedUser?.user_id || user?.id;
    if (!activeUserId) return;
    
    try {
      const [profileRes, transactionRes, billRes, profilesRes, rpRes, inventoryRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", activeUserId).single(),
        supabase.from("transactions").select("*")
          .or(`user_id.eq.${activeUserId},from_user_id.eq.${activeUserId},to_user_id.eq.${activeUserId}`)
          .order("created_at", { ascending: false }).limit(50),
        supabase.from("bills").select("*").eq("to_user_id", activeUserId).eq("status", "unpaid")
          .order("created_at", { ascending: false }),
        supabase.from("profiles").select("user_id, character_name").neq("user_id", activeUserId),
        supabase.from("recurring_payments").select("*").eq("to_user_id", activeUserId)
          .order("created_at", { ascending: false }),
        supabase.from("user_augmentations").select("*").eq("user_id", activeUserId)
          .order("installed_at", { ascending: false }),
      ]);

      setUserProfile(profileRes.data);
      setTransactions(transactionRes.data || []);
      setBills(billRes.data || []);
      setProfiles(profilesRes.data || []);
      setRecurringPayments(rpRes.data || []);
      setInventoryItems(inventoryRes.data || []);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user, impersonatedUser]);

  const totalAssets = inventoryItems.reduce((sum, item) => sum + getItemFinalValue(item), 0);

  const handleSendMoney = async () => {
    if (!sendRecipient || !sendAmount || !sendDescription) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }

    const amount = parseInt(sendAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Error", description: "Please enter a valid amount", variant: "destructive" });
      return;
    }

    try {
      const activeUserId = impersonatedUser?.user_id || user?.id;
      const { error } = await supabase.functions.invoke('financial-operations', {
        body: { operation: 'send_money', to_user_id: sendRecipient, amount, description: sendDescription, ...(impersonatedUser ? { targetUserId: impersonatedUser.user_id } : {}) }
      });
      if (error) throw error;
      toast({ title: "Success", description: "Money sent successfully" });
      setSendMoneyOpen(false);
      setSendAmount("");
      setSendRecipient("");
      setSendDescription("");
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to send money", variant: "destructive" });
    }
  };

  const checkOverdraftAndPay = (billIds: string[]) => {
    const totalAmount = billIds.reduce((sum, billId) => {
      const bill = bills.find(b => b.id === billId);
      return sum + (bill?.amount || 0);
    }, 0);

    const currentCredits = userProfile?.credits || 0;
    const resultingBalance = currentCredits - totalAmount;

    if (resultingBalance >= 0) {
      processPayment(billIds);
      return;
    }

    if (resultingBalance >= -600) {
      setPendingBillPayment({ billIds, totalAmount });
      setOverdraftDialogOpen(true);
    } else {
      toast({ title: "Error", description: "Payment exceeds overdraft limit. Maximum overdraft is 1 Bag (600 Hex).", variant: "destructive" });
    }
  };

  const processPayment = async (billIds: string[]) => {
    try {
      const promises = billIds.map(billId =>
        supabase.functions.invoke('financial-operations', {
          body: { operation: 'pay_bill', bill_id: billId, ...(impersonatedUser ? { targetUserId: impersonatedUser.user_id } : {}) }
        })
      );
      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error);
      if (errors.length > 0) throw new Error(`Failed to pay ${errors.length} bills`);
      toast({ title: "Success", description: `Successfully paid ${billIds.length} bill${billIds.length > 1 ? 's' : ''}` });
      setSelectedBills([]);
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to pay bills", variant: "destructive" });
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
      toast({ title: "Error", description: "Please select bills to pay", variant: "destructive" });
      return;
    }
    checkOverdraftAndPay(selectedBills);
  };

  const handlePayBill = async (billId: string) => {
    checkOverdraftAndPay([billId]);
  };

  const resetAddItemForm = () => {
    setNewItemName(""); setNewItemCategory("misc"); setNewItemNotes("");
    setNewItemTier("1"); setNewItemCompany(""); setNewItemDescription("");
    setNewItemPrice(""); setNewItemSubFee(""); setNewItemSubInterval("daily");
    setNewItemAbility(""); setNewItemHand(""); setNewItemRange("");
    setNewItemDamage(""); setNewItemArmorBase(""); setNewItemArmorThreshold("");
    setStoreSearchQuery("");
  };

  const populateFromStoreItem = (si: StoreItem) => {
    setNewItemName(si.name);
    setNewItemCategory(si.type.toLowerCase());
    setNewItemDescription(si.description);
    setNewItemCompany(si.company);
    setNewItemTier(String(si.tier));
    setNewItemPrice(String(si.priceUpfront));
    setNewItemSubFee(String(si.priceSub));
    setNewItemSubInterval("daily");
    setNewItemAbility(si.ability || "");
    setNewItemHand(si.hand || "");
    setNewItemRange(si.range || "");
    setNewItemDamage(si.damage || "");
    setNewItemArmorBase(si.armorBase !== undefined ? String(si.armorBase) : "");
    setNewItemArmorThreshold(si.armorThreshold || "");
    setNewItemNotes("");
    setAddExistingOpen(false);
    setAddItemOpen(true);
  };

  const handleAddItem = async () => {
    const activeUserId = impersonatedUser?.user_id || user?.id;
    if (!activeUserId || !newItemName.trim()) {
      toast({ title: "Error", description: "Please enter an item name", variant: "destructive" });
      return;
    }

    const tier = parseInt(newItemTier) || 1;
    const price = parseInt(newItemPrice) || 0;
    const subFee = parseInt(newItemSubFee) || 0;

    const specs: any = {
      tier,
      company: newItemCompany || undefined,
      description: newItemDescription || undefined,
      subscription_fee: subFee,
    };

    if (newItemCategory === "weapon") {
      if (newItemAbility) specs.ability = newItemAbility;
      if (newItemHand) specs.hand = newItemHand;
      if (newItemRange) specs.range = newItemRange;
      if (newItemDamage) specs.damage = newItemDamage;
    }
    if (newItemCategory === "armor") {
      if (newItemArmorBase) specs.armorBase = parseInt(newItemArmorBase);
      if (newItemArmorThreshold) specs.armorThreshold = newItemArmorThreshold;
    }

    try {
      const { error } = await supabase.from("user_augmentations").insert({
        user_id: activeUserId,
        name: newItemName.trim(),
        category: newItemCategory,
        metadata: {
          purchase_price: price,
          specifications: specs,
          notes: newItemNotes || undefined,
        },
      });
      if (error) throw error;

      // Create subscription if subFee > 0
      if (subFee > 0) {
        await supabase.from("recurring_payments").insert({
          to_user_id: activeUserId,
          amount: subFee,
          description: `${newItemName.trim()} subscription`,
          interval_type: newItemSubInterval,
          next_send_at: new Date(Date.now() + 86400000).toISOString(),
          metadata: { source: "inventory_add" },
        });
      }

      toast({ title: "Item Added", description: `${newItemName} added to inventory` });
      setAddItemOpen(false);
      resetAddItemForm();
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteItem = async (item: InventoryItem) => {
    setPendingDeleteItem(item);
    setDeleteItemDialogOpen(true);
  };

  const confirmDeleteItem = async () => {
    if (!pendingDeleteItem) return;
    const item = pendingDeleteItem;
    const activeUserId = impersonatedUser?.user_id || user?.id;

    try {
      // Delete the augmentation
      const { error } = await supabase.from("user_augmentations").delete().eq("id", item.id);
      if (error) throw error;

      // Also delete any linked recurring payment (subscription)
      const shopItemId = item.metadata?.purchase_id;
      if (shopItemId && activeUserId) {
        // Find and delete recurring payments linked to this shop item
        const { data: linkedSubs } = await supabase
          .from("recurring_payments")
          .select("id, metadata")
          .eq("to_user_id", activeUserId);

        if (linkedSubs) {
          const matchingSubs = linkedSubs.filter(
            (sub: any) => (sub.metadata as any)?.shop_item_id === shopItemId
          );
          for (const sub of matchingSubs) {
            await supabase.from("recurring_payments").delete().eq("id", sub.id);
          }
          if (matchingSubs.length > 0) {
            toast({ title: "Item Removed", description: `${item.name} and its subscription removed from inventory` });
          } else {
            toast({ title: "Item Removed", description: `${item.name} removed from inventory` });
          }
        } else {
          toast({ title: "Item Removed", description: `${item.name} removed from inventory` });
        }
      } else {
        toast({ title: "Item Removed", description: `${item.name} removed from inventory` });
      }

      setPendingDeleteItem(null);
      setDeleteItemDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Get full store item details for an inventory item
  const getStoreDetails = (item: InventoryItem) => {
    const specs = item.metadata?.specifications;
    if (!specs) return null;
    // Try to match by name from storeItems for full details
    const storeItem = storeItems.find(si => si.name === item.name);
    return storeItem || null;
  };

  const displayedTransactions = showAllTransactions ? transactions : transactions.slice(0, 5);
  const displayedRecurring = showAllRecurring ? recurringPayments : recurringPayments.slice(0, 5);

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
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <Link to="/">
              <Button variant="ghost" size="sm" className="text-cyan-400 hover:text-cyan-300">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Nexus
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={loadData} className="text-gray-400 hover:text-gray-300">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
            App of Holding
          </h1>
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
              <Dialog open={sendMoneyOpen} onOpenChange={setSendMoneyOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="mt-3 w-full bg-green-900/50 border-green-700 hover:bg-green-800/50 text-green-400">
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
              <Link to="/atunes">
                <Button variant="outline" size="sm" className="mt-3 w-full bg-red-900/50 border-red-700 hover:bg-red-800/50 text-red-400">
                  <Receipt className="w-4 h-4 mr-2" />
                  Pay Bills
                </Button>
              </Link>
            </CardContent>
          </Card>
          <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Total Assets</CardTitle>
              <TrendingUp className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              {(() => {
                const unpaidTotal = bills.reduce((sum, bill) => sum + bill.amount, 0);
                const netAssets = (userProfile?.credits || 0) + totalAssets - unpaidTotal;
                return (
                  <>
                    <div className="text-2xl font-bold text-yellow-400">
                      ⏣{netAssets}
                    </div>
                    <div className="text-sm text-yellow-400 mt-1">
                      {getHexBreakdown(netAssets).breakdown}
                    </div>
                    <div className="text-xs text-gray-500 mt-2 space-y-0.5">
                      <p>Hex Balance: ⏣{userProfile?.credits || 0}</p>
                      <p>Inventory: ⏣{totalAssets}</p>
                      <p>Unpaid Bills: -⏣{unpaidTotal}</p>
                    </div>
                  </>
                );
              })()}
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
                  <Button onClick={handlePaySelectedBills} size="sm" className="bg-red-600 hover:bg-red-700">
                    Pay Selected ({selectedBills.length})
                  </Button>
                  <Button onClick={() => setSelectedBills([])} size="sm" variant="outline" className="border-gray-600 text-gray-400 hover:bg-gray-800">
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
                          <p className="text-sm text-gray-400">From: {getName(bill.from_user_id)}</p>
                          <p className="text-sm text-gray-400">Created: {new Date(bill.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-red-400">{formatHex(bill.amount)}</div>
                        <div className="text-sm text-red-400">{getHexBreakdown(bill.amount).breakdown}</div>
                        <Button onClick={() => handlePayBill(bill.id)} size="sm" className="mt-2 bg-red-600 hover:bg-red-700">
                          Pay Bill
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {/* Quick Actions */}
              <div className="flex items-center justify-between p-4 bg-gray-900/30 border border-gray-700/50 rounded-lg">
                <div className="text-sm text-gray-400">Quick Actions:</div>
                <div className="flex gap-2">
                  <Button onClick={() => setSelectedBills(bills.map(b => b.id))} size="sm" variant="outline" className="border-red-600 text-red-400 hover:bg-red-900/30">
                    Select All
                  </Button>
                  <Button
                    onClick={() => {
                      const affordableBills = bills.filter(bill => userProfile && userProfile.credits >= bill.amount).map(b => b.id);
                      setSelectedBills(affordableBills);
                    }}
                    size="sm" variant="outline" className="border-yellow-600 text-yellow-400 hover:bg-yellow-900/30"
                  >
                    Select Affordable
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Inventory Grid - Subcategorized */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-yellow-400 flex items-center">
              <Package className="w-5 h-5 mr-2" />
              Inventory ({inventoryItems.length})
            </h2>
            <div className="flex flex-col gap-2">
              <Dialog open={addExistingOpen} onOpenChange={setAddExistingOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="border-cyan-600 text-cyan-400 hover:bg-cyan-900/30">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Existing
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] bg-gray-900 border-gray-700 max-h-[80vh] overflow-hidden flex flex-col">
                  <DialogHeader>
                    <DialogTitle className="text-white">Add Existing Store Item</DialogTitle>
                    <DialogDescription className="text-gray-400">
                      Pick an item from the store to prepopulate fields. This does not purchase the item.
                    </DialogDescription>
                  </DialogHeader>
                  <Input
                    value={storeSearchQuery}
                    onChange={(e) => setStoreSearchQuery(e.target.value)}
                    className="bg-gray-800 border-gray-600 text-white"
                    placeholder="Search store items..."
                  />
                  <div className="overflow-y-auto flex-1 max-h-[50vh] space-y-1 pr-1">
                    {storeItems
                      .filter(si => si.name.toLowerCase().includes(storeSearchQuery.toLowerCase()) || si.type.toLowerCase().includes(storeSearchQuery.toLowerCase()) || si.company.toLowerCase().includes(storeSearchQuery.toLowerCase()))
                      .map((si, idx) => {
                        const tc = tierColors[si.tier] || tierColors[1];
                        return (
                          <button
                            key={idx}
                            onClick={() => populateFromStoreItem(si)}
                            className="w-full text-left p-3 rounded bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <span className="text-white font-medium">{si.name}</span>
                                <div className="flex gap-1 mt-1">
                                  <Badge variant="outline" className="text-xs capitalize border-gray-600 text-gray-400">{si.type}</Badge>
                                  <Badge variant="outline" className={`text-xs ${tc}`}>T{si.tier}</Badge>
                                  <Badge variant="outline" className="text-xs border-gray-600 text-gray-500">{si.company}</Badge>
                                </div>
                              </div>
                              <div className="text-right text-sm">
                                <div className="text-yellow-400">⏣{si.priceUpfront}</div>
                                {si.priceSub > 0 && <div className="text-gray-500 text-xs">+⏣{si.priceSub}/day</div>}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={addItemOpen} onOpenChange={(open) => { setAddItemOpen(open); if (!open) resetAddItemForm(); }}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="border-yellow-600 text-yellow-400 hover:bg-yellow-900/30">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Custom
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[550px] bg-gray-900 border-gray-700 max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-white">Add Item to Inventory</DialogTitle>
                    <DialogDescription className="text-gray-400">
                      Build a full item with all specifications.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-3 py-2">
                    {/* Core fields */}
                    <div className="grid grid-cols-4 items-center gap-3">
                      <Label className="text-right text-gray-300 text-sm">Name</Label>
                      <Input value={newItemName} onChange={(e) => setNewItemName(e.target.value)} className="col-span-3 bg-gray-800 border-gray-600 text-white" placeholder="Item name" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-3">
                      <Label className="text-right text-gray-300 text-sm">Category</Label>
                      <Select value={newItemCategory} onValueChange={setNewItemCategory}>
                        <SelectTrigger className="col-span-3 bg-gray-800 border-gray-600 text-white"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-600">
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat} className="text-white hover:bg-gray-700 capitalize">{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-3">
                      <Label className="text-right text-gray-300 text-sm">Tier</Label>
                      <Select value={newItemTier} onValueChange={setNewItemTier}>
                        <SelectTrigger className="col-span-3 bg-gray-800 border-gray-600 text-white"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-600">
                          {[1,2,3,4,5].map((t) => (
                            <SelectItem key={t} value={String(t)} className="text-white hover:bg-gray-700">Tier {t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-3">
                      <Label className="text-right text-gray-300 text-sm">Company</Label>
                      <Input value={newItemCompany} onChange={(e) => setNewItemCompany(e.target.value)} className="col-span-3 bg-gray-800 border-gray-600 text-white" placeholder="Manufacturer" />
                    </div>
                    <div className="grid grid-cols-4 items-start gap-3">
                      <Label className="text-right text-gray-300 text-sm mt-2">Description</Label>
                      <Textarea value={newItemDescription} onChange={(e) => setNewItemDescription(e.target.value)} className="col-span-3 bg-gray-800 border-gray-600 text-white" placeholder="Item description / ability" rows={2} />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-3">
                      <Label className="text-right text-gray-300 text-sm">Price</Label>
                      <Input type="number" value={newItemPrice} onChange={(e) => setNewItemPrice(e.target.value)} className="col-span-3 bg-gray-800 border-gray-600 text-white" placeholder="Upfront cost in Hex" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-3">
                      <Label className="text-right text-gray-300 text-sm">Sub Fee</Label>
                      <div className="col-span-3 flex gap-2">
                        <Input type="number" value={newItemSubFee} onChange={(e) => setNewItemSubFee(e.target.value)} className="flex-1 bg-gray-800 border-gray-600 text-white" placeholder="0" />
                        <Select value={newItemSubInterval} onValueChange={setNewItemSubInterval}>
                          <SelectTrigger className="w-28 bg-gray-800 border-gray-600 text-white"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-600">
                            <SelectItem value="daily" className="text-white hover:bg-gray-700">Daily</SelectItem>
                            <SelectItem value="weekly" className="text-white hover:bg-gray-700">Weekly</SelectItem>
                            <SelectItem value="monthly" className="text-white hover:bg-gray-700">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Weapon-specific fields */}
                    {/* Weapon-specific fields */}
                    {newItemCategory === "weapon" && (
                      <>
                        <div className="border-t border-gray-700 pt-2 mt-1">
                          <p className="text-xs text-red-400 font-semibold mb-2 ml-1">Weapon Stats</p>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <Label className="text-gray-300 text-sm mb-1 block">Ability</Label>
                            <Input value={newItemAbility} onChange={(e) => setNewItemAbility(e.target.value)} className="bg-gray-800 border-gray-600 text-white" placeholder="Str, Fin, Agi, etc." />
                          </div>
                          <div>
                            <Label className="text-gray-300 text-sm mb-1 block">Hand</Label>
                            <Input value={newItemHand} onChange={(e) => setNewItemHand(e.target.value)} className="bg-gray-800 border-gray-600 text-white" placeholder="Pri, Sec, 2H" />
                          </div>
                          <div>
                            <Label className="text-gray-300 text-sm mb-1 block">Range</Label>
                            <Input value={newItemRange} onChange={(e) => setNewItemRange(e.target.value)} className="bg-gray-800 border-gray-600 text-white" placeholder="Melee, Close, Far, etc." />
                          </div>
                          <div>
                            <Label className="text-gray-300 text-sm mb-1 block">Damage</Label>
                            <Input value={newItemDamage} onChange={(e) => setNewItemDamage(e.target.value)} className="bg-gray-800 border-gray-600 text-white" placeholder="d8+1 phy" />
                          </div>
                        </div>
                      </>
                    )}

                    {/* Armor-specific fields */}
                    {newItemCategory === "armor" && (
                      <>
                        <div className="border-t border-gray-700 pt-2 mt-1">
                          <p className="text-xs text-blue-400 font-semibold mb-2 ml-1">Armor Stats</p>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <Label className="text-gray-300 text-sm mb-1 block">Armor Base</Label>
                            <Input type="number" value={newItemArmorBase} onChange={(e) => setNewItemArmorBase(e.target.value)} className="bg-gray-800 border-gray-600 text-white" placeholder="Base armor value" />
                          </div>
                          <div>
                            <Label className="text-gray-300 text-sm mb-1 block">Threshold</Label>
                            <Input value={newItemArmorThreshold} onChange={(e) => setNewItemArmorThreshold(e.target.value)} className="bg-gray-800 border-gray-600 text-white" placeholder="e.g. 5 / 11" />
                          </div>
                        </div>
                      </>
                    )}

                    <div className="grid grid-cols-4 items-start gap-3">
                      <Label className="text-right text-gray-300 text-sm mt-2">Notes</Label>
                      <Textarea value={newItemNotes} onChange={(e) => setNewItemNotes(e.target.value)} className="col-span-3 bg-gray-800 border-gray-600 text-white" placeholder="Optional notes" rows={2} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleAddItem} className="bg-yellow-600 hover:bg-yellow-700">
                      Add Item
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {inventoryItems.length === 0 ? (
            <Card className="bg-gray-900/50 border-gray-700/50">
              <CardContent className="p-6 text-center">
                <Package className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                <p className="text-gray-400">No items in inventory. Add custom items or purchase from Wyrmcart.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {CATEGORIES.filter(cat => inventoryItems.some(item => item.category.toLowerCase() === cat)).map(cat => {
                const catItems = inventoryItems.filter(item => item.category.toLowerCase() === cat);
                const colorClass = categoryColors[cat] || categoryColors.misc;
                return (
                  <div key={cat}>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${colorClass.includes('red') ? 'bg-red-500' : colorClass.includes('blue') ? 'bg-blue-500' : colorClass.includes('purple') ? 'bg-purple-500' : colorClass.includes('green') ? 'bg-green-500' : colorClass.includes('yellow') ? 'bg-yellow-500' : colorClass.includes('cyan') ? 'bg-cyan-500' : 'bg-gray-500'}`}></span>
                      {cat} ({catItems.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {catItems.map((item) => {
                        const itemColorClass = categoryColors[item.category.toLowerCase()] || categoryColors.misc;
                        const storeDetail = getStoreDetails(item);
                        const specs = item.metadata?.specifications;
                        const tier = specs?.tier;
                        const tierClass = tier ? tierColors[tier] || tierColors[1] : null;
                        const notes = (item.metadata as any)?.notes;
                        const itemValue = getItemFinalValue(item);

                        return (
                          <Card key={item.id} className={`${itemColorClass} backdrop-blur-sm group relative`}>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-white truncate">{item.name}</h3>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {tierClass && (
                                      <Badge variant="outline" className={`text-xs ${tierClass}`}>T{tier}</Badge>
                                    )}
                                    {specs?.company && (
                                      <Badge variant="outline" className="text-xs border-gray-600 text-gray-500">{specs.company}</Badge>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  variant="ghost" size="sm"
                                  className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/30"
                                  onClick={() => handleDeleteItem(item)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>

                              {(storeDetail?.description || specs?.description) && (
                                <p className="text-xs text-gray-300 mb-2">{storeDetail?.description || specs?.description}</p>
                              )}

                              {specs && (specs.damage || specs.armorBase) && (
                                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs mt-2 bg-black/30 rounded p-2">
                                  {specs.ability && <div className="text-gray-400">Ability: <span className="text-white">{specs.ability}</span></div>}
                                  {specs.hand && <div className="text-gray-400">Hand: <span className="text-white">{specs.hand}</span></div>}
                                  {specs.range && <div className="text-gray-400">Range: <span className="text-white">{specs.range}</span></div>}
                                  {specs.damage && <div className="text-gray-400">Damage: <span className="text-white">{specs.damage}</span></div>}
                                  {specs.armorBase !== undefined && <div className="text-gray-400">Armor: <span className="text-white">{specs.armorBase}</span></div>}
                                  {specs.armorThreshold && <div className="text-gray-400">Threshold: <span className="text-white">{specs.armorThreshold}</span></div>}
                                </div>
                              )}

                              {notes && <p className="text-xs text-gray-400 mt-2 line-clamp-2 italic">{notes}</p>}

                              {itemValue > 0 && (
                                <div className="text-xs text-yellow-400/70 mt-2 text-right">Value: ⏣{itemValue}</div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {/* Items not matching known categories */}
              {inventoryItems.filter(item => !CATEGORIES.includes(item.category.toLowerCase())).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">Other</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {inventoryItems.filter(item => !CATEGORIES.includes(item.category.toLowerCase())).map((item) => {
                      const itemValue = getItemFinalValue(item);
                      const specs = item.metadata?.specifications;
                      const notes = (item.metadata as any)?.notes;
                      return (
                        <Card key={item.id} className="border-gray-500 bg-gray-800/50 backdrop-blur-sm group relative">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="font-semibold text-white truncate">{item.name}</h3>
                              <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/30" onClick={() => handleDeleteItem(item)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                            {specs?.description && <p className="text-xs text-gray-300 mb-2">{specs.description}</p>}
                            {notes && <p className="text-xs text-gray-400 mt-1 italic">{notes}</p>}
                            {itemValue > 0 && <div className="text-xs text-yellow-400/70 mt-2 text-right">Value: ⏣{itemValue}</div>}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recurring Payments - Under Inventory */}
        {recurringPayments.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-green-400 mb-4 flex items-center">
              <RefreshCw className="w-5 h-5 mr-2" />
              Recurring Payments ({recurringPayments.length})
            </h2>
            <div className="grid gap-4">
              {displayedRecurring.map((rp) => (
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
            {recurringPayments.length > 5 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllRecurring(!showAllRecurring)}
                className="mt-3 w-full text-green-400 hover:text-green-300 hover:bg-green-900/20"
              >
                {showAllRecurring ? (
                  <><ChevronUp className="w-4 h-4 mr-2" /> Show Less</>
                ) : (
                  <><ChevronDown className="w-4 h-4 mr-2" /> Show All ({recurringPayments.length})</>
                )}
              </Button>
            )}
          </div>
        )}

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
                  displayedTransactions.map((transaction) => (
                    <div key={transaction.id} className="p-4 flex items-center justify-between hover:bg-gray-800/30 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${
                          transaction.amount > 0 ? 'bg-green-400' : 'bg-red-400'
                        }`}></div>
                        <div>
                          <p className="text-white font-medium">{transaction.description}</p>
                          <p className="text-xs text-gray-400">{new Date(transaction.created_at).toLocaleString()}</p>
                          <p className="text-xs text-blue-400">From: {getName(transaction.from_user_id)}</p>
                          <p className="text-xs text-blue-400">To: {getName(transaction.to_user_id)}</p>
                        </div>
                      </div>
                      <div className={`text-right ${transaction.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                       <span className="font-mono font-bold">
                         {transaction.amount > 0 ? '+' : ''}⏣{Math.abs(transaction.amount)}
                       </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {transactions.length > 5 && (
                <div className="border-t border-gray-700">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAllTransactions(!showAllTransactions)}
                    className="w-full text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/20 py-3"
                  >
                    {showAllTransactions ? (
                      <><ChevronUp className="w-4 h-4 mr-2" /> Show Less</>
                    ) : (
                      <><ChevronDown className="w-4 h-4 mr-2" /> Show All ({transactions.length})</>
                    )}
                  </Button>
                </div>
              )}
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

      {/* Delete Item Confirmation Dialog */}
      <AlertDialog open={deleteItemDialogOpen} onOpenChange={setDeleteItemDialogOpen}>
        <AlertDialogContent className="bg-gray-900 border-red-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-400">Delete Item</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              Are you sure you want to remove <strong>{pendingDeleteItem?.name}</strong> from your inventory?
              {pendingDeleteItem?.metadata?.purchase_id && (
                <><br /><br />This will also cancel any linked subscription for this item.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 border-gray-600 text-gray-300">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteItem}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Item
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Vault;
