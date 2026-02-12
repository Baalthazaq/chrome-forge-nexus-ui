import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Swords, Shield, Crosshair } from "lucide-react";
import type { CharacterSheet } from "@/data/gameCardTypes";

interface Props {
  sheet: CharacterSheet;
  updateSheet: (updates: Partial<CharacterSheet>) => Promise<void>;
  purchases: any[];
}

export function EquipmentSection({ sheet, updateSheet, purchases }: Props) {
  // Filter purchases by category
  const weapons = purchases.filter(p => {
    const cat = p.shop_items?.category?.toLowerCase() || '';
    return cat.includes('weapon') || cat.includes('melee') || cat.includes('ranged');
  });

  const armors = purchases.filter(p => {
    const cat = p.shop_items?.category?.toLowerCase() || '';
    return cat.includes('armor') || cat.includes('shield');
  });

  const getItemName = (purchaseId: string | null) => {
    if (!purchaseId) return null;
    const p = purchases.find(pu => pu.id === purchaseId);
    return p?.shop_items?.name || 'Unknown';
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
        Equipment (from App of Holding)
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {slots.map(({ label, icon: Icon, color, field, items }) => (
          <div key={field}>
            <label className="text-gray-400 text-xs mb-1 flex items-center gap-1">
              <Icon className={`w-3 h-3 ${color}`} />
              {label}
            </label>
            <Select
              value={sheet[field] || '__none__'}
              onValueChange={(v) => updateSheet({ [field]: v === '__none__' ? null : v } as any)}
            >
              <SelectTrigger className="bg-gray-800/50 border-gray-600 text-sm">
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
            {sheet[field] && (
              <div className="text-xs text-gray-500 mt-1 truncate">
                Equipped: {getItemName(sheet[field])}
              </div>
            )}
          </div>
        ))}
      </div>

      {purchases.length === 0 && (
        <div className="text-gray-500 text-sm text-center py-2 mt-2">
          No purchases yet. Visit Wyrmcart to buy equipment.
        </div>
      )}
    </Card>
  );
}
