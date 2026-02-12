import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Shield, Heart, Brain, Sparkles } from "lucide-react";
import type { CharacterSheet } from "@/data/gameCardTypes";

interface Props {
  sheet: CharacterSheet;
  updateSheet: (updates: Partial<CharacterSheet>) => Promise<void>;
  baseEvasion: number;
  baseHP: number;
  armorBaseValue: number;
}

function CheckboxRow({
  label,
  icon: Icon,
  iconColor,
  current,
  max,
  onChange,
  shape = 'square',
}: {
  label: string;
  icon: any;
  iconColor: string;
  current: number;
  max: number;
  onChange: (val: number) => void;
  shape?: 'square' | 'heart' | 'shield';
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className={`w-5 h-5 ${iconColor} shrink-0`} />
      <span className="text-gray-400 text-sm w-16 shrink-0">{label}</span>
      <div className="flex gap-1 flex-wrap">
        {Array.from({ length: max }, (_, i) => {
          const filled = i < current;
          const shapeClass = shape === 'heart'
            ? 'rounded-full'
            : shape === 'shield'
            ? 'rounded-sm'
            : 'rounded-sm';
          return (
            <button
              key={i}
              onClick={() => onChange(filled ? i : i + 1)}
              className={`w-6 h-6 border ${shapeClass} transition-colors ${
                filled
                  ? shape === 'heart'
                    ? 'bg-red-500 border-red-400'
                    : shape === 'shield'
                    ? 'bg-blue-500 border-blue-400'
                    : 'bg-gray-400 border-gray-300'
                  : 'bg-gray-800 border-gray-600 hover:border-gray-400'
              }`}
            />
          );
        })}
      </div>
      <span className="text-gray-500 text-xs ml-1">{current}/{max}</span>
    </div>
  );
}

export function CombatSection({ sheet, updateSheet, baseEvasion, baseHP, armorBaseValue }: Props) {
  const totalEvasion = baseEvasion + sheet.evasion_modifier;
  const totalHP = baseHP + sheet.hp_modifier;

  // Thresholds: Major = floor(maxHP/2), Severe = maxHP (before modifiers)
  const majorBase = Math.floor(totalHP / 2);
  const severeBase = totalHP;
  const majorThreshold = majorBase + sheet.major_threshold_modifier;
  const severeThreshold = severeBase + sheet.severe_threshold_modifier;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
      {/* AC Section */}
      <Card className="p-4 bg-gray-900/30 border-gray-700/50">
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-400" />
          Armor Class
        </h3>

        <div className="space-y-3">
          {/* Evasion */}
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Evasion</span>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-xs">Base {baseEvasion} +</span>
              <Input
                type="number"
                value={sheet.evasion_modifier}
                onChange={(e) => updateSheet({ evasion_modifier: Number(e.target.value) || 0 })}
                className="w-16 h-8 text-center bg-gray-800/50 border-gray-600 text-sm"
              />
              <span className="text-white font-bold text-lg">= {totalEvasion}</span>
            </div>
          </div>

          {/* Armor Slots */}
          <CheckboxRow
            label="Armor"
            icon={Shield}
            iconColor="text-blue-400"
            current={sheet.armor_current}
            max={armorBaseValue}
            onChange={(val) => updateSheet({ armor_current: val })}
            shape="shield"
          />
        </div>
      </Card>

      {/* Health Section */}
      <Card className="p-4 bg-gray-900/30 border-gray-700/50">
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-400" />
          Health
        </h3>

        <div className="space-y-3">
          {/* HP */}
          <div className="flex items-center justify-between mb-1">
            <span className="text-gray-400 text-sm">Hit Points</span>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-xs">Base {baseHP} +</span>
              <Input
                type="number"
                value={sheet.hp_modifier}
                onChange={(e) => updateSheet({ hp_modifier: Number(e.target.value) || 0 })}
                className="w-16 h-8 text-center bg-gray-800/50 border-gray-600 text-sm"
              />
              <span className="text-white font-bold">= {totalHP}</span>
            </div>
          </div>

          <CheckboxRow
            label="HP"
            icon={Heart}
            iconColor="text-red-400"
            current={sheet.hp_current}
            max={totalHP || 6}
            onChange={(val) => updateSheet({ hp_current: val })}
            shape="heart"
          />

          {/* Thresholds */}
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-1">
              <span className="text-yellow-400">Major:</span>
              <Input
                type="number"
                value={sheet.major_threshold_modifier}
                onChange={(e) => updateSheet({ major_threshold_modifier: Number(e.target.value) || 0 })}
                className="w-12 h-7 text-center bg-gray-800/50 border-gray-600 text-xs"
              />
              <span className="text-yellow-300 font-bold">= {majorThreshold}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-red-400">Severe:</span>
              <Input
                type="number"
                value={sheet.severe_threshold_modifier}
                onChange={(e) => updateSheet({ severe_threshold_modifier: Number(e.target.value) || 0 })}
                className="w-12 h-7 text-center bg-gray-800/50 border-gray-600 text-xs"
              />
              <span className="text-red-300 font-bold">= {severeThreshold}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Stress */}
      <Card className="p-4 bg-gray-900/30 border-gray-700/50">
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <Brain className="w-5 h-5 text-orange-400" />
          Stress
        </h3>
        <CheckboxRow
          label="Stress"
          icon={Brain}
          iconColor="text-orange-400"
          current={sheet.stress_current}
          max={sheet.stress_max}
          onChange={(val) => updateSheet({ stress_current: val })}
        />
        <div className="flex items-center gap-2 mt-2">
          <span className="text-gray-500 text-xs">Max:</span>
          <Input
            type="number"
            value={sheet.stress_max}
            onChange={(e) => updateSheet({ stress_max: Number(e.target.value) || 6 })}
            className="w-14 h-7 text-center bg-gray-800/50 border-gray-600 text-xs"
          />
        </div>
      </Card>

      {/* Hope */}
      <Card className="p-4 bg-gray-900/30 border-gray-700/50">
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          Hope
        </h3>
        <CheckboxRow
          label="Hope"
          icon={Sparkles}
          iconColor="text-amber-400"
          current={sheet.hope_current}
          max={sheet.hope_max}
          onChange={(val) => updateSheet({ hope_current: val })}
        />
        <div className="flex items-center gap-2 mt-2">
          <span className="text-gray-500 text-xs">Max:</span>
          <Input
            type="number"
            value={sheet.hope_max}
            onChange={(e) => updateSheet({ hope_max: Number(e.target.value) || 6 })}
            className="w-14 h-7 text-center bg-gray-800/50 border-gray-600 text-xs"
          />
        </div>
      </Card>
    </div>
  );
}
