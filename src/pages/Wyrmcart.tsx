
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
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import { Link } from "react-router-dom";
import { formatHexDenomination } from "@/lib/currency";
import { storeItems, type StoreItem } from "@/data/storeItems";

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

const Wyrmcart = () => {
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState<string>("All");
  const [activeTier, setActiveTier] = useState<number | null>(null);
  const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

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
              className="flex-1 bg-transparent border-none text-green-400 placeholder:text-green-400/50 focus-visible:ring-0"
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

        {/* Results count */}
        <p className="text-muted-foreground text-sm mb-4">{filtered.length} items found</p>

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
                    <p className="text-xs text-muted-foreground/60 ml-7 mt-1">{item.company}</p>
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
                    <p className="text-xs text-muted-foreground/60 ml-6 mt-1">{item.company}</p>
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
      </div>
    </div>
  );
};

export default Wyrmcart;
