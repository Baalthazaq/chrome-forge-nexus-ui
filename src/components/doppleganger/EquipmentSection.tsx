import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Swords, Shield, Crosshair, Backpack, Plus, X } from "lucide-react";
import type { CharacterSheet } from "@/data/gameCardTypes";

interface Props {
  sheet: CharacterSheet;
  updateSheet: (updates: Partial<CharacterSheet>) => Promise<void>;
  purchases: any[];
  isEditing: boolean;
}

function ItemCard({ purchase }: { purchase: any }) {
  const item = purchase?.shop_items;
  if (!item) return null;

  const specs = item.specifications as any;
  const category = item.category?.toLowerCase() || '';
  const isWeapon = category.includes('weapon') || category.includes('melee') || category.includes('ranged');
  const isArmor = category.includes('armor') || category.includes('shield');

  return (
    <div className="mt-2 p-3 bg-gray-800/40 border border-gray-700/40 rounded-lg">
      <div className="flex items-center justify-between mb-1">
        <span className="text-gray-100 text-sm font-semibold">{item.name}</span>
        {item.category && (
          <Badge variant="outline" className="text-xs border-gray-600 text-gray-400">{item.category}</Badge>
        )}
      </div>
      {item.description && (
        <p className="text-gray-400 text-xs mb-2">{item.description}</p>
      )}
      {isWeapon && specs && (
        <div className="flex flex-wrap gap-3 text-xs text-blue-300">
          {specs.ability && <span>Ability: {specs.ability}</span>}
          {specs.hand && <span>Hand: {specs.hand}</span>}
          {specs.range && <span>Range: {specs.range}</span>}
          {specs.damage && <span>Damage: {specs.damage}</span>}
        </div>
      )}
      {isArmor && specs && (
        <div className="flex flex-wrap gap-3 text-xs text-orange-300">
          {(specs.armorBase || specs.armor_score) && <span>Base: {specs.armorBase || specs.armor_score}</span>}
          {(specs.armorThreshold || specs.armor_threshold) && <span>Threshold: {specs.armorThreshold || specs.armor_threshold}</span>}
        </div>
      )}
    </div>
  );
}

export function EquipmentSection({ sheet, updateSheet, purchases, isEditing }: Props) {
  const weapons = purchases.filter(p => {
    const cat = p.shop_items?.category?.toLowerCase() || '';
    return cat.includes('weapon') || cat.includes('melee') || cat.includes('ranged');
  });

  const armors = purchases.filter(p => {
    const cat = p.shop_items?.category?.toLowerCase() || '';
    return cat.includes('armor') || cat.includes('shield');
  });

  const getEquippedPurchase = (purchaseId: string | null) => {
    if (!purchaseId) return null;
    return purchases.find(pu => pu.id === purchaseId) || null;
  };

  const slots = [
    {
      label: 'Primary Weapon',
      icon: Swords,
      color: 'text-red-400',
      field: 'primary_weapon_purchase_id' as const,
      items: weapons,
    },
    {
      label: 'Secondary Weapon',
      icon: Crosshair,
      color: 'text-orange-400',
      field: 'secondary_weapon_purchase_id' as const,
      items: weapons,
    },
    {
      label: 'Armor',
      icon: Shield,
      color: 'text-blue-400',
      field: 'armor_purchase_id' as const,
      items: armors,
    },
  ];

  return (
    <Card className="p-4 bg-gray-900/30 border-gray-700/50 mb-6">
      <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
        <Swords className="w-5 h-5 text-red-400" />
        Equipped
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {slots.map(({ label, icon: Icon, color, field, items }) => {
          const equippedPurchase = getEquippedPurchase(sheet[field]);
          return (
            <div key={field}>
              <label className="text-gray-400 text-xs mb-1 flex items-center gap-1">
                <Icon className={`w-3 h-3 ${color}`} />
                {label}
              </label>
              {isEditing ? (
                <Select
                  value={sheet[field] || '__none__'}
                  onValueChange={(v) => updateSheet({ [field]: v === '__none__' ? null : v } as any)}
                >
                  <SelectTrigger className="bg-gray-800/50 border-gray-600 text-gray-100 text-sm">
                    <SelectValue placeholder="None equipped" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {items.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.shop_items?.name || 'Unknown item'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="text-gray-100 text-sm font-medium">
                  {equippedPurchase?.shop_items?.name || 'None'}
                </div>
              )}
              {/* Show full item card underneath */}
              {equippedPurchase && <ItemCard purchase={equippedPurchase} />}
            </div>
          );
        })}
      </div>

      {purchases.length === 0 && (
        <div className="text-gray-500 text-sm text-center py-2 mt-2">
          No purchases yet. Visit Wyrmcart to buy equipment.
        </div>
      )}

      <BackpackSection
        sheet={sheet}
        updateSheet={updateSheet}
        purchases={purchases}
        isEditing={isEditing}
      />
    </Card>
  );
}

function BackpackSection({ sheet, updateSheet, purchases, isEditing }: Props) {
  const [adding, setAdding] = useState(false);

  const backpackIds: string[] = (sheet as any).backpack_ids || [];

  const backpackPurchases = backpackIds
    .map(id => purchases.find(p => p.id === id))
    .filter(Boolean);

  // Items not already equipped or in backpack
  const availableItems = purchases.filter(p => {
    const id = p.id;
    if (id === sheet.primary_weapon_purchase_id) return false;
    if (id === sheet.secondary_weapon_purchase_id) return false;
    if (id === sheet.armor_purchase_id) return false;
    if (backpackIds.includes(id)) return false;
    return true;
  });

  const addItem = (purchaseId: string) => {
    updateSheet({ backpack_ids: [...backpackIds, purchaseId] } as any);
    setAdding(false);
  };

  const removeItem = (purchaseId: string) => {
    updateSheet({ backpack_ids: backpackIds.filter(id => id !== purchaseId) } as any);
  };

  return (
    <div className="mt-4 pt-4 border-t border-gray-700/50">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-md font-semibold text-white flex items-center gap-2">
          <Backpack className="w-4 h-4 text-amber-400" />
          Backpack
        </h4>
        {isEditing && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAdding(!adding)}
            className="border-gray-600 text-gray-300 hover:text-white h-7 text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add Item
          </Button>
        )}
      </div>

      {adding && (
        <Select onValueChange={(v) => addItem(v)}>
          <SelectTrigger className="bg-gray-800/50 border-gray-600 text-gray-100 text-sm mb-3">
            <SelectValue placeholder="Select an item..." />
          </SelectTrigger>
          <SelectContent>
            {availableItems.length === 0 ? (
              <SelectItem value="__none__" disabled>No items available</SelectItem>
            ) : (
              availableItems.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.shop_items?.name || 'Unknown item'}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      )}

      {backpackPurchases.length === 0 && !adding && (
        <p className="text-gray-500 text-sm">No items in backpack.</p>
      )}

      <div className="space-y-1">
        {backpackPurchases.map((purchase: any) => (
          <div key={purchase.id} className="relative">
            <ItemCard purchase={purchase} />
            {isEditing && (
              <button
                onClick={() => removeItem(purchase.id)}
                className="absolute top-4 right-2 text-gray-500 hover:text-red-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
