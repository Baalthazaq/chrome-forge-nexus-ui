
import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
} from "lucide-react";
import { Link } from "react-router-dom";
import { formatHexDenomination } from "@/lib/currency";
import { storeItems, type StoreItem } from "@/data/storeItems";

const typeFilters = ["All", "Weapon", "Armor", "Consumable", "Cyberwear", "Item", "Service"] as const;

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
      // Melee — check hand
      if (item.hand === "2H") return Swords;
      if (item.hand === "Sec") return Sword;
      return Axe;
    }
    default:
      return Package;
  }
}

function tierLabel(tier: number) {
  if (tier === 1) return "Tier I";
  if (tier === 2) return "Tier II";
  if (tier === 3) return "Tier III";
  return `Tier ${tier}`;
}

const tierColors: Record<number, string> = {
  1: "border-muted-foreground/30 text-muted-foreground",
  2: "border-blue-500/50 text-blue-400",
  3: "border-purple-500/50 text-purple-400",
};

const Wyrmcart = () => {
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState<string>("All");
  const [activeTier, setActiveTier] = useState<number | null>(null);
  const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null);

  const filtered = useMemo(() => {
    return storeItems.filter((item) => {
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
  }, [search, activeType, activeTier]);

  const hasWeapons = filtered.some((i) => i.type === "Weapon");
  const hasArmor = filtered.some((i) => i.type === "Armor");
  const showWeaponCols = activeType === "Weapon" || (activeType === "All" && hasWeapons);
  const showArmorCols = activeType === "Armor" || (activeType === "All" && hasArmor);

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
          <div className="w-24" />
        </div>

        {/* Search */}
        <Card className="p-4 bg-gray-900/50 border-green-500/30 mb-6">
          <div className="flex items-center space-x-4">
            <Search className="w-5 h-5 text-green-400" />
            <Input
              placeholder="Search inventory..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent border-none text-foreground placeholder:text-muted-foreground focus-visible:ring-0"
            />
          </div>
        </Card>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
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
        <div className="flex flex-wrap gap-2 mb-6">
          {[1, 2, 3].map((t) => (
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

        {/* Results count */}
        <p className="text-muted-foreground text-sm mb-4">{filtered.length} items found</p>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-green-500/20 text-left">
                <th className="p-2 text-green-400 font-medium w-8" />
                <th className="p-2 text-green-400 font-medium">Name</th>
                <th className="p-2 text-green-400 font-medium">Type</th>
                <th className="p-2 text-green-400 font-medium">Tier</th>
                <th className="p-2 text-green-400 font-medium">Price</th>
                <th className="p-2 text-green-400 font-medium max-w-[200px]">Description</th>
                {showWeaponCols && (
                  <>
                    <th className="p-2 text-blue-400 font-medium">Ability</th>
                    <th className="p-2 text-blue-400 font-medium">Hand</th>
                    <th className="p-2 text-blue-400 font-medium">Range</th>
                    <th className="p-2 text-blue-400 font-medium">Damage</th>
                  </>
                )}
                {showArmorCols && (
                  <>
                    <th className="p-2 text-orange-400 font-medium">Base</th>
                    <th className="p-2 text-orange-400 font-medium">Threshold</th>
                  </>
                )}
                <th className="p-2 text-green-400 font-medium">Company</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, idx) => {
                const Icon = getItemIcon(item);
                const totalCost = item.priceUpfront + (item.priceSub > 0 ? item.priceSub : 0);
                const isSelected = selectedItem?.name === item.name && selectedItem?.tier === item.tier;
                return (
                  <HoverCard key={`${item.name}-${idx}`} openDelay={200} closeDelay={100}>
                    <HoverCardTrigger asChild>
                      <tr
                        className={`border-b border-gray-800/50 cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-green-900/30"
                            : "hover:bg-gray-800/30"
                        }`}
                        onClick={() => setSelectedItem(isSelected ? null : item)}
                      >
                        <td className="p-2">
                          <Icon className="w-4 h-4 text-green-400" />
                        </td>
                        <td className="p-2 text-foreground font-medium">{item.name}</td>
                        <td className="p-2">
                          <Badge variant="outline" className={`text-xs ${tierColors[item.tier] || ""}`}>
                            {item.type}
                          </Badge>
                        </td>
                        <td className="p-2">
                          <span className={tierColors[item.tier]?.split(" ")[1] || "text-muted-foreground"}>
                            {tierLabel(item.tier)}
                          </span>
                        </td>
                        <td className="p-2 text-green-400 whitespace-nowrap">
                          {formatHexDenomination(item.priceUpfront)}
                          {item.priceSub > 0 && (
                            <span className="text-yellow-400 text-xs ml-1">
                              +{formatHexDenomination(item.priceSub)}/mo
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-muted-foreground max-w-[200px] truncate">
                          {item.description}
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

        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            No items match your search.
          </div>
        )}
      </div>
    </div>
  );
};

export default Wyrmcart;
