
import { useState, useMemo, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PurchaseDialog } from "@/components/PurchaseDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { formatHex, getHexBreakdown } from "@/lib/currency";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  ArrowLeft,
  Search,
  Swords,
  Shield,
  Pill,
  Cpu,
  Package,
  Wrench,
  ShieldPlus,
  ShieldAlert,
  ShieldCheck,
  Crosshair,
  Axe,
  Sword,
  HandMetal,
  Megaphone,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Heart,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { formatHexDenomination } from "@/lib/currency";
import { storeItems, type StoreItem } from "@/data/storeItems";
import { ShoppingCart } from "lucide-react";

const typeFilters = ["All", "Weapon", "Armor", "Consumable", "Cyberwear", "Item", "Service"] as const;

const maxTier = Math.max(...storeItems.map((i) => i.tier));
const tierList = Array.from({ length: maxTier }, (_, i) => i + 1);

function getItemIcon(item: StoreItem) {
  switch (item.type) {
    case "Consumable":
      return Pill;
    case "Cyberwear":
      return Cpu;
    case "Item":
      return Package;
    case "Service":
      return Wrench;
    case "Armor":
      if (item.tier === 1) return Shield;
      if (item.tier === 2) return ShieldPlus;
      if (item.tier === 3) return ShieldAlert;
      return ShieldCheck;
    case "Weapon": {
      if (item.range && item.range !== "Melee") return Crosshair;
      if (item.hand === "2H") return Swords;
      if (item.hand === "Sec") return Sword;
      return Axe;
    }
    default:
      return Package;
  }
}

function tierLabel(tier: number) {
  return `Tier ${tier}`;
}

const tierColorMap: Record<number, string> = {
  1: "text-muted-foreground",
  2: "text-green-400",
  3: "text-blue-400",
  4: "text-purple-400",
};
function getTierColor(tier: number) {
  if (tier >= 5) return "text-orange-400";
  return tierColorMap[tier] || "text-muted-foreground";
}

const tierBorderMap: Record<number, string> = {
  1: "border-muted-foreground/30",
  2: "border-green-500/50",
  3: "border-blue-500/50",
  4: "border-purple-500/50",
};
function getTierBorder(tier: number) {
  if (tier >= 5) return "border-orange-500/50";
  return tierBorderMap[tier] || "border-muted-foreground/30";
}

type SortKey = "name" | "type" | "tier" | "priceUpfront" | "priceSub" | "company" | "ability" | "hand" | "range" | "damage" | "armorBase" | "armorThreshold";
type SortDir = "asc" | "desc";

function sortItems(items: StoreItem[], key: SortKey, dir: SortDir): StoreItem[] {
  return [...items].sort((a, b) => {
    let av: string | number = "";
    let bv: string | number = "";
    switch (key) {
      case "name": av = a.name; bv = b.name; break;
      case "type": av = a.type; bv = b.type; break;
      case "tier": av = a.tier; bv = b.tier; break;
      case "priceUpfront": av = a.priceUpfront; bv = b.priceUpfront; break;
      case "priceSub": av = a.priceSub; bv = b.priceSub; break;
      case "company": av = a.company; bv = b.company; break;
      case "ability": av = a.ability || ""; bv = b.ability || ""; break;
      case "hand": av = a.hand || ""; bv = b.hand || ""; break;
      case "range": av = a.range || ""; bv = b.range || ""; break;
      case "damage": av = a.damage || ""; bv = b.damage || ""; break;
      case "armorBase": av = a.armorBase ?? 0; bv = b.armorBase ?? 0; break;
      case "armorThreshold": av = a.armorThreshold ?? 0; bv = b.armorThreshold ?? 0; break;
    }
    if (typeof av === "number" && typeof bv === "number") {
      return dir === "asc" ? av - bv : bv - av;
    }
    const sa = String(av).toLowerCase();
    const sb = String(bv).toLowerCase();
    return dir === "asc" ? sa.localeCompare(sb) : sb.localeCompare(sa);
  });
}

interface WishlistItem {
  id: string;
  user_id: string;
  shop_item_id: string | null;
  name: string;
  description: string | null;
  category: string | null;
  price: number | null;
  specifications: any;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

const Wyrmcart = () => {
  const { user } = useAuth();
  const { isAdmin, impersonatedUser } = useAdmin();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState<string>("All");
  const [activeTier, setActiveTier] = useState<number | null>(null);
  const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [purchaseItem, setPurchaseItem] = useState<StoreItem | null>(null);
  const [userBalance, setUserBalance] = useState<number>(0);

  // Wishlist state
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestForm, setRequestForm] = useState({
    name: "", description: "", category: "", price: "",
  });

  const activeUserId = impersonatedUser?.user_id || user?.id;

  const fetchBalance = useCallback(async () => {
    if (!activeUserId) return;
    const { data } = await supabase
      .from("profiles")
      .select("credits")
      .eq("user_id", activeUserId)
      .single();
    if (data) setUserBalance(data.credits ?? 0);
  }, [activeUserId]);

  const fetchWishlist = useCallback(async () => {
    if (!activeUserId) return;
    const { data } = await supabase
      .from("wishlist_items")
      .select("*")
      .eq("user_id", activeUserId)
      .order("created_at", { ascending: false });
    if (data) setWishlist(data as WishlistItem[]);
  }, [activeUserId]);

  useEffect(() => {
    fetchBalance();
    fetchWishlist();
  }, [fetchBalance, fetchWishlist]);

  const addToWishlist = async (item: StoreItem) => {
    if (!activeUserId) return;
    // Check if already in wishlist
    const existing = wishlist.find(w => w.name === item.name && w.shop_item_id === null);
    if (existing) {
      toast({ title: "Already in wishlist" });
      return;
    }
    const { error } = await supabase.from("wishlist_items").insert({
      user_id: activeUserId,
      name: item.name,
      description: item.description,
      category: item.type,
      price: item.priceUpfront,
      status: "wished",
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `${item.name} added to wishlist` });
      fetchWishlist();
    }
  };

  const requestItem = async () => {
    if (!activeUserId || !requestForm.name) return;
    const { error } = await supabase.from("wishlist_items").insert({
      user_id: activeUserId,
      name: requestForm.name,
      description: requestForm.description || null,
      category: requestForm.category || null,
      price: requestForm.price ? parseInt(requestForm.price) : null,
      status: "requested",
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Item requested!" });
      setRequestDialogOpen(false);
      setRequestForm({ name: "", description: "", category: "", price: "" });
      fetchWishlist();
    }
  };

  const removeFromWishlist = async (id: string) => {
    await supabase.from("wishlist_items").delete().eq("id", id);
    fetchWishlist();
  };

  const filtered = useMemo(() => {
    let items = storeItems.filter((item) => {
      if (activeType !== "All" && item.type !== activeType) return false;
      if (activeTier !== null && item.tier !== activeTier) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.company.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.type.toLowerCase().includes(q)
        );
      }
      return true;
    });
    if (sortKey) {
      items = sortItems(items, sortKey, sortDir);
    }
    return items;
  }, [search, activeType, activeTier, sortKey, sortDir]);

  const hasWeapons = filtered.some((i) => i.type === "Weapon");
  const hasArmor = filtered.some((i) => i.type === "Armor");
  const showWeaponCols = activeType === "Weapon" || (activeType === "All" && hasWeapons);
  const showArmorCols = activeType === "Armor" || (activeType === "All" && hasArmor);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      if (sortDir === "asc") setSortDir("desc");
      else { setSortKey(null); setSortDir("asc"); }
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 ml-1 inline opacity-40" />;
    return sortDir === "asc"
      ? <ArrowUp className="w-3 h-3 ml-1 inline" />
      : <ArrowDown className="w-3 h-3 ml-1 inline" />;
  }

  const statusColors: Record<string, string> = {
    wished: "bg-blue-900/30 text-blue-400 border-blue-500/50",
    requested: "bg-amber-900/30 text-amber-400 border-amber-500/50",
    fulfilled: "bg-emerald-900/30 text-emerald-400 border-emerald-500/50",
    denied: "bg-red-900/30 text-red-400 border-red-500/50",
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-green-900/20 via-black to-emerald-900/20" />

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/">
            <Button variant="ghost" className="text-cyan-400 hover:text-cyan-300">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to OS
            </Button>
          </Link>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
            Wyrmcart
          </h1>
          {user && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Balance</p>
              <p className={`text-sm font-medium ${userBalance > 0 ? "text-green-400" : "text-red-400"}`}>
                ⏣{userBalance}
              </p>
            </div>
          )}
          {!user && <div className="w-24" />}
        </div>

        <Tabs defaultValue="shop" className="space-y-6">
          <TabsList className="bg-gray-900/50 border border-gray-700/50">
            <TabsTrigger value="shop">Shop</TabsTrigger>
            {user && (
              <TabsTrigger value="wishlist">
                Wishlist {wishlist.length > 0 && `(${wishlist.length})`}
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="shop" className="space-y-4">
            {/* Search */}
            <Card className="p-4 bg-gray-900/50 border-green-500/30">
              <div className="flex items-center space-x-4">
                <Search className="w-5 h-5 text-green-400" />
                <Input
                  placeholder="Search inventory..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 bg-transparent border-none text-green-400 placeholder:text-green-400/50 focus-visible:ring-0"
                />
              </div>
            </Card>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              {typeFilters.map((t) => (
                <Button
                  key={t}
                  variant={activeType === t ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveType(t)}
                  className={activeType === t ? "bg-green-600 hover:bg-green-700 text-white" : "border-green-600/50 text-green-400 hover:bg-green-900/20"}
                >
                  {t}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              {tierList.map((t) => (
                <Button
                  key={t}
                  variant={activeTier === t ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveTier(activeTier === t ? null : t)}
                  className={activeTier === t ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "border-emerald-600/50 text-emerald-400 hover:bg-emerald-900/20"}
                >
                  {tierLabel(t)}
                </Button>
              ))}
            </div>

            <p className="text-muted-foreground text-sm">{filtered.length} items found</p>

            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-green-500/20 text-left">
                    <th className="p-2 text-green-400 font-medium w-8" />
                    <th className="p-2 text-green-400 font-medium cursor-pointer select-none" onClick={() => handleSort("name")}>Name <SortIcon col="name" /></th>
                    <th className="p-2 text-green-400 font-medium cursor-pointer select-none" onClick={() => handleSort("type")}>Type <SortIcon col="type" /></th>
                    <th className="p-2 text-green-400 font-medium cursor-pointer select-none" onClick={() => handleSort("tier")}>Tier <SortIcon col="tier" /></th>
                    <th className="p-2 text-green-400 font-medium cursor-pointer select-none" onClick={() => handleSort("priceUpfront")}>Price <SortIcon col="priceUpfront" /></th>
                    <th className="p-2 text-green-400 font-medium cursor-pointer select-none" onClick={() => handleSort("priceSub")}>Sub/day <SortIcon col="priceSub" /></th>
                    <th className="p-2 text-green-400 font-medium">Description</th>
                    {showWeaponCols && (
                      <>
                        <th className="p-2 text-blue-400 font-medium cursor-pointer select-none" onClick={() => handleSort("ability")}>Ability <SortIcon col="ability" /></th>
                        <th className="p-2 text-blue-400 font-medium cursor-pointer select-none" onClick={() => handleSort("hand")}>Hand <SortIcon col="hand" /></th>
                        <th className="p-2 text-blue-400 font-medium cursor-pointer select-none" onClick={() => handleSort("range")}>Range <SortIcon col="range" /></th>
                        <th className="p-2 text-blue-400 font-medium cursor-pointer select-none" onClick={() => handleSort("damage")}>Damage <SortIcon col="damage" /></th>
                      </>
                    )}
                    {showArmorCols && (
                      <>
                        <th className="p-2 text-orange-400 font-medium cursor-pointer select-none" onClick={() => handleSort("armorBase")}>Base <SortIcon col="armorBase" /></th>
                        <th className="p-2 text-orange-400 font-medium cursor-pointer select-none" onClick={() => handleSort("armorThreshold")}>Threshold <SortIcon col="armorThreshold" /></th>
                      </>
                    )}
                    <th className="p-2 text-green-400 font-medium cursor-pointer select-none" onClick={() => handleSort("company")}>Company <SortIcon col="company" /></th>
                    {user && <th className="p-2 text-green-400 font-medium w-24" />}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item, idx) => {
                    const Icon = getItemIcon(item);
                    const tierColor = getTierColor(item.tier);
                    const tierBorder = getTierBorder(item.tier);
                    const isSelected = selectedItem?.name === item.name && selectedItem?.tier === item.tier;
                    return (
                      <HoverCard key={`${item.name}-${idx}`} openDelay={200} closeDelay={100}>
                        <HoverCardTrigger asChild>
                          <tr
                            className={`border-b border-gray-800/50 cursor-pointer transition-colors ${
                              isSelected ? "bg-green-900/30" : "hover:bg-gray-800/30"
                            }`}
                            onClick={() => setSelectedItem(isSelected ? null : item)}
                          >
                            <td className="p-2">
                              <Icon className={`w-4 h-4 ${tierColor}`} />
                            </td>
                            <td className={`p-2 font-medium ${tierColor}`}>{item.name}</td>
                            <td className="p-2">
                              <Badge variant="outline" className={`text-xs ${tierBorder} ${tierColor}`}>
                                {item.type}
                              </Badge>
                            </td>
                            <td className={`p-2 ${tierColor}`}>
                              {tierLabel(item.tier)}
                            </td>
                            <td className="p-2 text-green-400 whitespace-nowrap">
                              {formatHexDenomination(item.priceUpfront)}
                            </td>
                            <td className="p-2 text-yellow-400 whitespace-nowrap">
                              {item.priceSub > 0 ? `${formatHexDenomination(item.priceSub)}/day` : "—"}
                            </td>
                            <td className="p-2 text-muted-foreground max-w-[300px]">
                              <span className="whitespace-normal break-words">{item.description}</span>
                            </td>
                            {showWeaponCols && (
                              <>
                                <td className="p-2 text-blue-300">{item.type === "Weapon" ? item.ability : ""}</td>
                                <td className="p-2 text-blue-300">{item.type === "Weapon" ? item.hand : ""}</td>
                                <td className="p-2 text-blue-300">{item.type === "Weapon" ? item.range : ""}</td>
                                <td className="p-2 text-blue-300">{item.type === "Weapon" ? item.damage : ""}</td>
                              </>
                            )}
                            {showArmorCols && (
                              <>
                                <td className="p-2 text-orange-300">{item.type === "Armor" ? item.armorBase : ""}</td>
                                <td className="p-2 text-orange-300">{item.type === "Armor" ? item.armorThreshold : ""}</td>
                              </>
                            )}
                            <td className="p-2 text-muted-foreground">{item.company}</td>
                            {user && (
                              <td className="p-2">
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-white h-7 px-2 text-xs"
                                    onClick={(e) => { e.stopPropagation(); setPurchaseItem(item); }}
                                  >
                                    <ShoppingCart className="w-3 h-3 mr-1" />
                                    Buy
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-1 text-pink-400 hover:text-pink-300"
                                    onClick={(e) => { e.stopPropagation(); addToWishlist(item); }}
                                  >
                                    <Heart className="w-3 h-3" />
                                  </Button>
                                </div>
                              </td>
                            )}
                          </tr>
                        </HoverCardTrigger>
                        <HoverCardContent
                          side="top"
                          className="w-80 bg-gray-900 border-green-500/30 text-foreground"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Megaphone className="w-4 h-4 text-yellow-400" />
                            <p className="text-xs text-yellow-400 font-semibold">
                              Message from: {item.company}
                            </p>
                          </div>
                          <p className="text-sm text-muted-foreground italic leading-relaxed">
                            "{item.advert}"
                          </p>
                        </HoverCardContent>
                      </HoverCard>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Tablet Layout (md-lg) */}
            <div className="hidden md:block lg:hidden space-y-2">
              {filtered.map((item, idx) => {
                const Icon = getItemIcon(item);
                const tierColor = getTierColor(item.tier);
                const tierBorder = getTierBorder(item.tier);
                const isSelected = selectedItem?.name === item.name && selectedItem?.tier === item.tier;
                return (
                  <HoverCard key={`tablet-${item.name}-${idx}`} openDelay={200} closeDelay={100}>
                    <HoverCardTrigger asChild>
                      <Card
                        className={`p-3 bg-gray-900/50 border-gray-800/50 cursor-pointer transition-colors ${
                          isSelected ? "border-green-500/50 bg-green-900/20" : "hover:bg-gray-800/30"
                        }`}
                        onClick={() => setSelectedItem(isSelected ? null : item)}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <Icon className={`w-4 h-4 ${tierColor} shrink-0`} />
                          <span className={`font-medium ${tierColor}`}>{item.name}</span>
                          <Badge variant="outline" className={`text-xs ${tierBorder} ${tierColor}`}>{item.type}</Badge>
                          <span className={`text-xs ${tierColor}`}>{tierLabel(item.tier)}</span>
                          <span className="ml-auto text-green-400 text-sm whitespace-nowrap">{formatHexDenomination(item.priceUpfront)}</span>
                          {item.priceSub > 0 && (
                            <span className="text-yellow-400 text-xs whitespace-nowrap">{formatHexDenomination(item.priceSub)}/day</span>
                          )}
                        </div>
                        <p className="text-muted-foreground text-sm ml-7">{item.description}</p>
                        {item.type === "Weapon" && (
                          <div className="flex gap-4 ml-7 mt-1 text-xs text-blue-300">
                            <span>Ability: {item.ability}</span>
                            <span>Hand: {item.hand}</span>
                            <span>Range: {item.range}</span>
                            <span>Damage: {item.damage}</span>
                          </div>
                        )}
                        {item.type === "Armor" && (
                          <div className="flex gap-4 ml-7 mt-1 text-xs text-orange-300">
                            <span>Base: {item.armorBase}</span>
                            <span>Threshold: {item.armorThreshold}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between ml-7 mt-1">
                          <p className="text-xs text-muted-foreground/60">{item.company}</p>
                          {user && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white h-7 px-2 text-xs"
                                onClick={(e) => { e.stopPropagation(); setPurchaseItem(item); }}
                              >
                                <ShoppingCart className="w-3 h-3 mr-1" />
                                Buy
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 px-1 text-pink-400 hover:text-pink-300"
                                onClick={(e) => { e.stopPropagation(); addToWishlist(item); }}>
                                <Heart className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </Card>
                    </HoverCardTrigger>
                    <HoverCardContent side="top" className="w-80 bg-gray-900 border-green-500/30 text-foreground">
                      <div className="flex items-center gap-2 mb-2">
                        <Megaphone className="w-4 h-4 text-yellow-400" />
                        <p className="text-xs text-yellow-400 font-semibold">Message from: {item.company}</p>
                      </div>
                      <p className="text-sm text-muted-foreground italic leading-relaxed">"{item.advert}"</p>
                    </HoverCardContent>
                  </HoverCard>
                );
              })}
            </div>

            {/* Mobile Layout (< md) */}
            <div className="block md:hidden space-y-2">
              {filtered.map((item, idx) => {
                const Icon = getItemIcon(item);
                const tierColor = getTierColor(item.tier);
                const tierBorder = getTierBorder(item.tier);
                const isSelected = selectedItem?.name === item.name && selectedItem?.tier === item.tier;
                return (
                  <HoverCard key={`mobile-${item.name}-${idx}`} openDelay={200} closeDelay={100}>
                    <HoverCardTrigger asChild>
                      <Card
                        className={`p-3 bg-gray-900/50 border-gray-800/50 cursor-pointer transition-colors ${
                          isSelected ? "border-green-500/50 bg-green-900/20" : "hover:bg-gray-800/30"
                        }`}
                        onClick={() => setSelectedItem(isSelected ? null : item)}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className={`w-4 h-4 ${tierColor} shrink-0`} />
                          <span className={`font-medium text-sm ${tierColor}`}>{item.name}</span>
                          <Badge variant="outline" className={`text-xs ${tierBorder} ${tierColor}`}>{item.type}</Badge>
                        </div>
                        <div className="flex items-center gap-2 ml-6 mb-1">
                          <span className={`text-xs ${tierColor}`}>{tierLabel(item.tier)}</span>
                          <span className="text-green-400 text-xs">{formatHexDenomination(item.priceUpfront)}</span>
                          {item.priceSub > 0 && (
                            <span className="text-yellow-400 text-xs">{formatHexDenomination(item.priceSub)}/day</span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-muted-foreground text-xs ml-6 mb-1">{item.description}</p>
                        )}
                        {item.type === "Weapon" && (
                          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 ml-6 text-xs text-blue-300">
                            <span>Ability: {item.ability}</span>
                            <span>Hand: {item.hand}</span>
                            <span>Range: {item.range}</span>
                            <span>Damage: {item.damage}</span>
                          </div>
                        )}
                        {item.type === "Armor" && (
                          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 ml-6 text-xs text-orange-300">
                            <span>Base: {item.armorBase}</span>
                            <span>Threshold: {item.armorThreshold}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between ml-6 mt-1">
                          <p className="text-xs text-muted-foreground/60">{item.company}</p>
                          {user && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white h-7 px-2 text-xs"
                                onClick={(e) => { e.stopPropagation(); setPurchaseItem(item); }}
                              >
                                <ShoppingCart className="w-3 h-3 mr-1" />
                                Buy
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 px-1 text-pink-400 hover:text-pink-300"
                                onClick={(e) => { e.stopPropagation(); addToWishlist(item); }}>
                                <Heart className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </Card>
                    </HoverCardTrigger>
                    <HoverCardContent side="top" className="w-72 bg-gray-900 border-green-500/30 text-foreground">
                      <div className="flex items-center gap-2 mb-2">
                        <Megaphone className="w-4 h-4 text-yellow-400" />
                        <p className="text-xs text-yellow-400 font-semibold">Message from: {item.company}</p>
                      </div>
                      <p className="text-sm text-muted-foreground italic leading-relaxed">"{item.advert}"</p>
                    </HoverCardContent>
                  </HoverCard>
                );
              })}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                No items match your search.
              </div>
            )}
          </TabsContent>

          {/* Wishlist Tab */}
          {user && (
            <TabsContent value="wishlist" className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => setRequestDialogOpen(true)}
                  className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600">
                  <Plus className="w-4 h-4 mr-1" /> Request Item
                </Button>
              </div>

              {wishlist.length === 0 ? (
                <Card className="p-8 bg-gray-900/30 border-gray-700/50 text-center text-gray-400">
                  Your wishlist is empty. Browse the shop and click the ♡ icon to add items, or request something new!
                </Card>
              ) : (
                <div className="space-y-2">
                  {wishlist.map(item => (
                    <Card key={item.id} className="p-4 bg-gray-900/30 border-gray-700/50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {item.status === "requested" ? (
                              <Star className="w-4 h-4 text-amber-400" />
                            ) : (
                              <Heart className="w-4 h-4 text-pink-400" />
                            )}
                            <h4 className="text-white font-medium">{item.name}</h4>
                            <Badge className={statusColors[item.status] || "bg-gray-800 text-gray-400"}>
                              {item.status === "wished" ? "Wishlisted" : item.status === "requested" ? "Requested" : item.status === "fulfilled" ? "Available!" : item.status}
                            </Badge>
                            {item.category && (
                              <Badge variant="outline" className="text-xs text-gray-400">{item.category}</Badge>
                            )}
                          </div>
                          {item.description && <p className="text-sm text-gray-400 ml-6">{item.description}</p>}
                          {item.price != null && (
                            <p className="text-sm text-green-400 ml-6 mt-1">
                              {item.price > 0 ? formatHexDenomination(item.price) : "Price TBD"}
                            </p>
                          )}
                          {item.admin_notes && (
                            <p className="text-xs text-amber-400/70 ml-6 mt-1">Admin: {item.admin_notes}</p>
                          )}
                        </div>
                        <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300"
                          onClick={() => removeFromWishlist(item.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>

        <PurchaseDialog
          open={!!purchaseItem}
          onOpenChange={(open) => { if (!open) setPurchaseItem(null); }}
          item={purchaseItem}
          userBalance={userBalance}
          onPurchaseComplete={fetchBalance}
          targetUserId={impersonatedUser?.user_id}
        />

        {/* Request Item Dialog */}
        <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
          <DialogContent className="bg-gray-900 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">Request an Item or Service</DialogTitle>
              <DialogDescription className="text-gray-400">
                Describe what you're looking for. The admin can review and add it to the shop.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-gray-300">Item Name *</Label>
                <Input value={requestForm.name} onChange={e => setRequestForm(f => ({ ...f, name: e.target.value }))}
                  className="bg-gray-800 border-gray-600 text-white" placeholder="What do you want?" />
              </div>
              <div>
                <Label className="text-gray-300">Description</Label>
                <Textarea value={requestForm.description} onChange={e => setRequestForm(f => ({ ...f, description: e.target.value }))}
                  className="bg-gray-800 border-gray-600 text-white" placeholder="Describe what you need..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Category</Label>
                  <Select value={requestForm.category} onValueChange={v => setRequestForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="Weapon">Weapon</SelectItem>
                      <SelectItem value="Armor">Armor</SelectItem>
                      <SelectItem value="Consumable">Consumable</SelectItem>
                      <SelectItem value="Cyberwear">Cyberwear</SelectItem>
                      <SelectItem value="Item">Item</SelectItem>
                      <SelectItem value="Service">Service</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-300">Suggested Price (⏣)</Label>
                  <Input type="number" value={requestForm.price} onChange={e => setRequestForm(f => ({ ...f, price: e.target.value }))}
                    className="bg-gray-800 border-gray-600 text-white" placeholder="Optional" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setRequestDialogOpen(false)}>Cancel</Button>
              <Button onClick={requestItem} disabled={!requestForm.name}
                className="bg-gradient-to-r from-pink-500 to-rose-500">
                <Plus className="w-4 h-4 mr-1" /> Submit Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Wyrmcart;
