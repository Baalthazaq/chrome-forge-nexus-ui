import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, AlertTriangle, Plus, Package, Swords, Shield, Pill, Cpu, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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

const tierColorMap: Record<number, string> = {
  1: "text-gray-400",
  2: "text-green-400",
  3: "text-blue-400",
  4: "text-purple-400",
};
function getTierColor(tier: number) {
  if (tier >= 5) return "text-orange-400";
  return tierColorMap[tier] || "text-gray-400";
}

const tierBorderMap: Record<number, string> = {
  1: "border-gray-600/50",
  2: "border-green-500/50",
  3: "border-blue-500/50",
  4: "border-purple-500/50",
};
function getTierBorder(tier: number) {
  if (tier >= 5) return "border-orange-500/50";
  return tierBorderMap[tier] || "border-gray-600/50";
}

function getCategoryIcon(category: string) {
  switch (category.toLowerCase()) {
    case "weapon": return Swords;
    case "armor": return Shield;
    case "consumable": return Pill;
    case "cyberwear": return Cpu;
    case "service": return Wrench;
    default: return Package;
  }
}

const emptyCustomForm = {
  name: "",
  category: "Item",
  description: "",
  tier: "1",
  company: "",
  ability: "",
  hand: "",
  range: "",
  damage: "",
  armorBase: "",
  armorThreshold: "",
};

const Atunes = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [gear, setGear] = useState<UserGear[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [customForm, setCustomForm] = useState(emptyCustomForm);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [gearRes, subRes] = await Promise.all([
        supabase.from("user_augmentations").select("*").eq("user_id", user?.id).order("installed_at", { ascending: false }),
        supabase.from("recurring_payments").select("*").eq("to_user_id", user?.id).order("created_at", { ascending: false })
      ]);
      if (gearRes.error) throw gearRes.error;
      if (subRes.error) throw subRes.error;
      setGear(gearRes.data || []);
      setSubscriptions(subRes.data || []);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCustomItem = async () => {
    if (!customForm.name || !user) return;
    const specs: any = {
      type: customForm.category,
      tier: parseInt(customForm.tier) || 1,
      company: customForm.company || "Custom",
      description: customForm.description,
      custom_item: true,
    };
    if (customForm.category === "Weapon") {
      if (customForm.ability) specs.ability = customForm.ability;
      if (customForm.hand) specs.hand = customForm.hand;
      if (customForm.range) specs.range = customForm.range;
      if (customForm.damage) specs.damage = customForm.damage;
    }
    if (customForm.category === "Armor") {
      if (customForm.armorBase) specs.armorBase = parseInt(customForm.armorBase);
      if (customForm.armorThreshold) specs.armorThreshold = customForm.armorThreshold;
    }

    try {
      const { error } = await supabase.from("user_augmentations").insert({
        user_id: user.id,
        name: customForm.name,
        category: customForm.category.toLowerCase(),
        metadata: { specifications: specs, custom_item: true }
      });
      if (error) throw error;
      toast({ title: "Item Added", description: `${customForm.name} added to your inventory.` });
      setCustomDialogOpen(false);
      setCustomForm(emptyCustomForm);
      loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const renderGearCard = (item: UserGear) => {
    const specs = item.metadata?.specifications || {};
    const tier = specs.tier || 1;
    const tierColor = getTierColor(tier);
    const tierBorder = getTierBorder(tier);
    const type = specs.type || item.category;
    const Icon = getCategoryIcon(type);
    const company = specs.company;
    const description = specs.description || item.metadata?.description;
    const isCustom = item.metadata?.custom_item || specs.custom_item;

    return (
      <Card key={item.id} className={`bg-gray-900/50 ${tierBorder} hover:brightness-110 transition-all`}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Icon className={`w-5 h-5 ${tierColor}`} />
              <div>
                <CardTitle className={`${tierColor} font-medium text-lg`}>{item.name}</CardTitle>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className={`text-xs ${tierBorder} ${tierColor}`}>
                    {type}
                  </Badge>
                  <span className={`text-xs ${tierColor}`}>Tier {tier}</span>
                  {isCustom && (
                    <Badge variant="outline" className="text-xs border-cyan-500/50 text-cyan-400">Custom</Badge>
                  )}
                </div>
              </div>
            </div>
            <Badge className={
              item.status === "active" ? "bg-green-900/50 text-green-400 border-green-700" :
              item.status === "maintenance" ? "bg-yellow-900/50 text-yellow-400 border-yellow-700" :
              item.status === "damaged" ? "bg-red-900/50 text-red-400 border-red-700" :
              "bg-gray-900/50 text-gray-400 border-gray-700"
            }>{item.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {description && (
            <p className="text-sm text-gray-400">{description}</p>
          )}

          {/* Weapon Stats */}
          {type?.toLowerCase() === "weapon" && (specs.ability || specs.hand || specs.range || specs.damage) && (
            <div className="flex flex-wrap gap-3 text-xs text-blue-300">
              {specs.ability && <span>Ability: {specs.ability}</span>}
              {specs.hand && <span>Hand: {specs.hand}</span>}
              {specs.range && <span>Range: {specs.range}</span>}
              {specs.damage && <span>Damage: {specs.damage}</span>}
            </div>
          )}

          {/* Armor Stats */}
          {type?.toLowerCase() === "armor" && (specs.armorBase || specs.armorThreshold) && (
            <div className="flex flex-wrap gap-3 text-xs text-orange-300">
              {specs.armorBase && <span>Base: {specs.armorBase}</span>}
              {specs.armorThreshold && <span>Threshold: {specs.armorThreshold}</span>}
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>Efficiency: <span className={
                item.efficiency_percent >= 90 ? "text-green-400" :
                item.efficiency_percent >= 70 ? "text-yellow-400" : "text-red-400"
              }>{item.efficiency_percent}%</span></span>
              <span>Installed: {new Date(item.installed_at).toLocaleDateString()}</span>
            </div>
            {company && (
              <span className="text-xs text-gray-500">{company}</span>
            )}
          </div>

          {/* Purchase price if available */}
          {item.metadata?.purchase_price != null && (
            <div className="text-xs text-gray-500">
              Purchased for: <span className="text-green-400">⏣{item.metadata.purchase_price}</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
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
          </div>
        </div>

        <Tabs defaultValue="gear" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-900/50 border border-gray-700">
            <TabsTrigger value="gear" className="text-gray-300 data-[state=active]:text-cyan-400">
              Personal Gear ({gear.length})
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="text-gray-300 data-[state=active]:text-cyan-400">
              Subscriptions ({subscriptions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gear" className="space-y-4">
            <div className="flex justify-end">
              <Button
                size="sm"
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
                onClick={() => setCustomDialogOpen(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Custom Item
              </Button>
            </div>

            {gear.length === 0 ? (
              <Card className="bg-gray-900/50 border-gray-700">
                <CardContent className="p-6 text-center">
                  <p className="text-gray-400">No gear installed yet.</p>
                  <p className="text-sm text-gray-500 mt-2">Visit Wyrmcart to purchase equipment or add custom items.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {gear.map(renderGearCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="subscriptions" className="space-y-4">
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
          </TabsContent>
        </Tabs>

        {/* Custom Item Dialog */}
        <Dialog open={customDialogOpen} onOpenChange={setCustomDialogOpen}>
          <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-cyan-400">Add Custom Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-gray-300">Name</Label>
                <Input value={customForm.name} onChange={(e) => setCustomForm({...customForm, name: e.target.value})} className="bg-gray-800 border-gray-700 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Category</Label>
                  <Select value={customForm.category} onValueChange={(v) => setCustomForm({...customForm, category: v})}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["Weapon", "Armor", "Consumable", "Cyberwear", "Item", "Service"].map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-300">Tier</Label>
                  <Select value={customForm.tier} onValueChange={(v) => setCustomForm({...customForm, tier: v})}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5].map(t => (
                        <SelectItem key={t} value={String(t)}>Tier {t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-gray-300">Description</Label>
                <Textarea value={customForm.description} onChange={(e) => setCustomForm({...customForm, description: e.target.value})} className="bg-gray-800 border-gray-700 text-white" />
              </div>
              <div>
                <Label className="text-gray-300">Company / Source</Label>
                <Input value={customForm.company} onChange={(e) => setCustomForm({...customForm, company: e.target.value})} className="bg-gray-800 border-gray-700 text-white" placeholder="e.g. Found, Looted, Gift" />
              </div>

              {/* Weapon-specific fields */}
              {customForm.category === "Weapon" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Ability</Label>
                    <Input value={customForm.ability} onChange={(e) => setCustomForm({...customForm, ability: e.target.value})} className="bg-gray-800 border-gray-700 text-white" placeholder="Str, Fin, Agi..." />
                  </div>
                  <div>
                    <Label className="text-gray-300">Hand</Label>
                    <Input value={customForm.hand} onChange={(e) => setCustomForm({...customForm, hand: e.target.value})} className="bg-gray-800 border-gray-700 text-white" placeholder="Pri, Sec, 2H" />
                  </div>
                  <div>
                    <Label className="text-gray-300">Range</Label>
                    <Input value={customForm.range} onChange={(e) => setCustomForm({...customForm, range: e.target.value})} className="bg-gray-800 border-gray-700 text-white" placeholder="Melee, Close, Far..." />
                  </div>
                  <div>
                    <Label className="text-gray-300">Damage</Label>
                    <Input value={customForm.damage} onChange={(e) => setCustomForm({...customForm, damage: e.target.value})} className="bg-gray-800 border-gray-700 text-white" placeholder="d8+1 phy" />
                  </div>
                </div>
              )}

              {/* Armor-specific fields */}
              {customForm.category === "Armor" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Armor Base</Label>
                    <Input type="number" value={customForm.armorBase} onChange={(e) => setCustomForm({...customForm, armorBase: e.target.value})} className="bg-gray-800 border-gray-700 text-white" />
                  </div>
                  <div>
                    <Label className="text-gray-300">Threshold</Label>
                    <Input value={customForm.armorThreshold} onChange={(e) => setCustomForm({...customForm, armorThreshold: e.target.value})} className="bg-gray-800 border-gray-700 text-white" placeholder="5 / 11" />
                  </div>
                </div>
              )}

              <Button className="w-full bg-cyan-600 hover:bg-cyan-700 text-white" onClick={handleAddCustomItem} disabled={!customForm.name}>
                Add to Inventory
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Atunes;
