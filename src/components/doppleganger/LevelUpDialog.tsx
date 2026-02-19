import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, Star, Sparkles, Swords, Shield, Brain, Heart, BookOpen, Zap } from "lucide-react";
import type { CharacterSheet, GameCard, Experience } from "@/data/gameCardTypes";
import { STAT_SKILLS, type StatName } from "@/data/gameCardTypes";
import {
  getTier, isTierStart, getLevelsInTier, getProficiency,
  getTierUpgradeCounts, UPGRADE_LIMITS, getBoostedStatsInTier,
  hasMutualExclusionConflict, getUnlockedSubclassTiers,
  type UpgradeType, type LevelUpgrade, type LevelUpChoices,
} from "@/lib/levelUpUtils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sheet: CharacterSheet;
  updateSheet: (updates: Partial<CharacterSheet>) => Promise<void>;
  profile: any;
  onStatChange: (stat: string, value: number) => void;
  gameCards: GameCard[];
  classCards: GameCard[];
  subclassCards: GameCard[];
  domainCards: GameCard[];
  domains: string[];
  selectedSubclass: GameCard | undefined;
}

export function LevelUpDialog({
  open, onOpenChange, sheet, updateSheet,
  profile, onStatChange, gameCards, classCards, subclassCards, domainCards, domains,
  selectedSubclass,
}: Props) {
  const newLevel = sheet.level + 1;
  const tier = getTier(newLevel);
  const isStart = isTierStart(newLevel);
  const choices = (sheet.level_up_choices || {}) as LevelUpChoices;
  const tierCounts = getTierUpgradeCounts(tier, choices);
  const boostedStats = getBoostedStatsInTier(tier, choices);
  const unlockedSubTiers = getUnlockedSubclassTiers(choices);

  // Automatics state
  const [autoExpName, setAutoExpName] = useState('');
  const [autoDomainCardId, setAutoDomainCardId] = useState('');

  // Upgrades state
  const [selectedUpgrades, setSelectedUpgrades] = useState<LevelUpgrade[]>([]);

  // Sub-option state
  const [statPicks, setStatPicks] = useState<string[]>([]);
  const [expPicks, setExpPicks] = useState<number[]>([]);
  const [domainCardPick, setDomainCardPick] = useState('');
  const [mcClass, setMcClass] = useState('');
  const [mcDomain, setMcDomain] = useState('');
  const [mcSubclass, setMcSubclass] = useState('');

  const totalPoints = selectedUpgrades.reduce((sum, u) => sum + (UPGRADE_LIMITS[u.type]?.cost || 1), 0);

  const availableDomainCards = useMemo(() => {
    return domainCards.filter(c => {
      const meta = c.metadata as any;
      return domains.includes(meta?.domain || c.source) && (meta?.level || 0) <= newLevel;
    });
  }, [domainCards, domains, newLevel]);

  const allStats = Object.keys(STAT_SKILLS) as StatName[];
  const currentExperiences: Experience[] = sheet.experiences || [];

  // Multiclass: available classes (exclude current)
  const mcAvailableClasses = classCards.filter(c => c.name !== sheet.class);
  const mcSelectedClass = classCards.find(c => c.name === mcClass);
  const mcClassMeta = mcSelectedClass?.metadata as any;
  const mcDomains = mcClassMeta ? [mcClassMeta.domain1, mcClassMeta.domain2].filter(Boolean) : [];
  const mcSubclasses = subclassCards.filter(c => c.source === mcClass);

  // Check which next subclass tier is available
  const nextSubTier = unlockedSubTiers === 0 ? 'Specialization' : unlockedSubTiers === 1 ? 'Mastery' : null;

  const isUpgradeAvailable = (type: UpgradeType): boolean => {
    const limit = UPGRADE_LIMITS[type];
    if (limit.minTier && tier < limit.minTier) return false;
    if (tierCounts[type] >= limit.max) return false;
    if (hasMutualExclusionConflict(type, tier, choices, selectedUpgrades)) return false;
    if (type === 'subclass_upgrade' && !nextSubTier) return false;
    if (totalPoints + limit.cost > 2 && !selectedUpgrades.some(u => u.type === type)) return false;
    return true;
  };

  const toggleUpgrade = (type: UpgradeType) => {
    const existing = selectedUpgrades.find(u => u.type === type);
    if (existing) {
      setSelectedUpgrades(prev => prev.filter(u => u.type !== type));
      if (type === 'stat_increase') setStatPicks([]);
      if (type === 'experience_boost') setExpPicks([]);
      if (type === 'domain_card') setDomainCardPick('');
      if (type === 'multiclass') { setMcClass(''); setMcDomain(''); setMcSubclass(''); }
    } else {
      if (!isUpgradeAvailable(type)) return;
      const cost = UPGRADE_LIMITS[type].cost;
      if (totalPoints + cost > 2) return;
      setSelectedUpgrades(prev => [...prev, { type }]);
    }
  };

  const isSelected = (type: UpgradeType) => selectedUpgrades.some(u => u.type === type);

  // Validation
  const autoValid = !isStart || (autoExpName.trim() !== '' && autoDomainCardId !== '');
  const upgradesValid = totalPoints === 2;
  const subOptionsValid = selectedUpgrades.every(u => {
    if (u.type === 'stat_increase') return statPicks.length === 2;
    if (u.type === 'experience_boost') return expPicks.length === 2;
    if (u.type === 'domain_card') return domainCardPick !== '';
    if (u.type === 'multiclass') return mcClass && mcDomain && mcSubclass;
    return true;
  });
  const canConfirm = autoValid && upgradesValid && subOptionsValid;

  const handleConfirm = async () => {
    const sheetUpdates: Partial<CharacterSheet> = { level: newLevel };
    const newExperiences = [...(sheet.experiences || [])];
    const newCards = [...(sheet.selected_card_ids || [])];

    // Automatics
    if (isStart) {
      if (autoExpName.trim()) {
        newExperiences.push({ text: autoExpName.trim(), value: 2 });
      }
      if (autoDomainCardId) {
        newCards.push({ card_id: autoDomainCardId });
      }
    }

    // Build upgrade data with sub-options
    const upgradeData: LevelUpgrade[] = selectedUpgrades.map(u => {
      const upgrade: LevelUpgrade = { type: u.type };
      if (u.type === 'stat_increase') upgrade.stats = [...statPicks];
      if (u.type === 'experience_boost') upgrade.experience_indices = [...expPicks];
      if (u.type === 'domain_card') upgrade.domain_card_id = domainCardPick;
      if (u.type === 'multiclass') upgrade.multiclass_data = { class: mcClass, domain: mcDomain, subclass: mcSubclass };
      return upgrade;
    });

    // Apply upgrades to sheet
    let hpBonus = 0, stressBonus = 0, evasionBonus = 0;
    const statChanges: Record<string, number> = {};

    for (const u of upgradeData) {
      switch (u.type) {
        case 'stat_increase':
          u.stats?.forEach(s => { statChanges[s] = (profile[s] || 0) + 1; });
          break;
        case 'hp_increase': hpBonus++; break;
        case 'stress_increase': stressBonus++; break;
        case 'evasion_increase': evasionBonus++; break;
        case 'experience_boost':
          u.experience_indices?.forEach(idx => {
            if (newExperiences[idx]) {
              newExperiences[idx] = { ...newExperiences[idx], value: newExperiences[idx].value + 1 };
            }
          });
          break;
        case 'domain_card':
          if (u.domain_card_id) newCards.push({ card_id: u.domain_card_id });
          break;
        // subclass_upgrade, proficiency_increase, multiclass: tracked in choices only
      }
    }

    if (hpBonus > 0) sheetUpdates.hp_modifier = sheet.hp_modifier + hpBonus;
    if (stressBonus > 0) sheetUpdates.stress_max = sheet.stress_max + stressBonus;
    if (evasionBonus > 0) sheetUpdates.evasion_modifier = sheet.evasion_modifier + evasionBonus;
    sheetUpdates.experiences = newExperiences;
    sheetUpdates.selected_card_ids = newCards;

    // Save choices
    const updatedChoices = { ...choices };
    updatedChoices[String(newLevel)] = {
      completed: true,
      ...(isStart && { auto_experience: autoExpName.trim(), auto_domain_card_id: autoDomainCardId }),
      upgrades: upgradeData,
    };
    sheetUpdates.level_up_choices = updatedChoices as any;

    // Apply stat changes to profile
    for (const [stat, value] of Object.entries(statChanges)) {
      await onStatChange(stat, value);
    }

    await updateSheet(sheetUpdates);

    // Reset state
    setAutoExpName('');
    setAutoDomainCardId('');
    setSelectedUpgrades([]);
    setStatPicks([]);
    setExpPicks([]);
    setDomainCardPick('');
    setMcClass(''); setMcDomain(''); setMcSubclass('');
    onOpenChange(false);
  };

  // Combine boosted stats from saved choices AND current selections
  const allBoostedStats = new Set(boostedStats);
  if (isSelected('stat_increase')) {
    statPicks.forEach(s => allBoostedStats.add(s));
  }

  const newProficiency = getProficiency(newLevel, choices);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-700 text-gray-100 max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ArrowUp className="w-5 h-5 text-amber-400" />
            Level Up to Level {newLevel}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Tier {tier} — Choose your improvements
          </DialogDescription>
        </DialogHeader>

        {/* Automatics */}
        {isStart && (
          <div className="space-y-3 p-3 bg-amber-900/20 border border-amber-500/30 rounded-lg">
            <h4 className="text-amber-400 font-semibold flex items-center gap-2">
              <Star className="w-4 h-4" />
              Automatic Gains
            </h4>

            <div className="text-sm text-gray-300 flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-400" />
              Proficiency increases to <span className="font-bold text-purple-300">{newProficiency}</span>
            </div>

            <div>
              <label className="text-gray-400 text-xs block mb-1">New Experience (+2)</label>
              <Input
                value={autoExpName}
                onChange={(e) => setAutoExpName(e.target.value)}
                placeholder="Name your new experience..."
                className="bg-gray-800/50 border-gray-600 text-gray-100 text-sm"
              />
            </div>

            <div>
              <label className="text-gray-400 text-xs block mb-1">Gain Domain Card</label>
              <Select value={autoDomainCardId} onValueChange={setAutoDomainCardId}>
                <SelectTrigger className="bg-gray-800/50 border-gray-600 text-gray-100 text-sm">
                  <SelectValue placeholder="Select a domain card..." />
                </SelectTrigger>
                <SelectContent className="z-[9999] bg-gray-800 border-gray-600">
                  {availableDomainCards.map(c => {
                    const meta = c.metadata as any;
                    return (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.source} Lv{meta?.level}) — {meta?.type}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Upgrades */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-white font-semibold">Choose Upgrades</h4>
            <Badge variant={totalPoints === 2 ? 'default' : 'outline'} className={totalPoints === 2 ? 'bg-green-600' : 'border-gray-600 text-gray-400'}>
              {totalPoints}/2 points
            </Badge>
          </div>

          {(Object.keys(UPGRADE_LIMITS) as UpgradeType[]).map(type => {
            const limit = UPGRADE_LIMITS[type];
            const used = tierCounts[type];
            const available = isUpgradeAvailable(type);
            const selected = isSelected(type);
            const disabled = !available && !selected;
            const conflict = hasMutualExclusionConflict(type, tier, choices, selectedUpgrades);

            return (
              <div key={type} className={`p-3 rounded-lg border transition-colors ${
                selected ? 'bg-indigo-900/30 border-indigo-500/50' :
                disabled ? 'bg-gray-900/20 border-gray-800/50 opacity-50' :
                'bg-gray-800/30 border-gray-700/30 hover:border-gray-600'
              }`}>
                <div
                  className={`flex items-center gap-3 ${!disabled ? 'cursor-pointer' : ''}`}
                  onClick={() => !disabled && toggleUpgrade(type)}
                >
                  <Checkbox
                    checked={selected}
                    onCheckedChange={() => !disabled && toggleUpgrade(type)}
                    disabled={disabled}
                    className="shrink-0 pointer-events-none"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{limit.label}</span>
                      {limit.cost > 1 && <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-400">{limit.cost} pts</Badge>}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{limit.description}</p>
                    {conflict && <p className="text-xs text-red-400 mt-0.5">Mutually exclusive with {type === 'subclass_upgrade' ? 'Multiclass' : 'Subclass Upgrade'} this tier.</p>}
                  </div>
                  <span className="text-xs text-gray-500 shrink-0">{used}/{limit.max}</span>
                </div>

                {/* Sub-options */}
                {selected && type === 'stat_increase' && (
                  <div className="mt-2 ml-7">
                    <p className="text-xs text-gray-400 mb-1">Pick 2 traits ({statPicks.length}/2):</p>
                    <div className="flex flex-wrap gap-2">
                      {allStats.map(stat => {
                        const picked = statPicks.includes(stat);
                        const blocked = boostedStats.has(stat) && !picked;
                        const full = statPicks.length >= 2 && !picked;
                        return (
                          <button
                            key={stat}
                            onClick={() => {
                              if (picked) setStatPicks(prev => prev.filter(s => s !== stat));
                              else if (!blocked && !full) setStatPicks(prev => [...prev, stat]);
                            }}
                            disabled={blocked || (full && !picked)}
                            className={`px-2 py-1 rounded text-xs capitalize transition-colors ${
                              picked ? 'bg-indigo-600 text-white' :
                              blocked ? 'bg-gray-800 text-gray-600 line-through' :
                              'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            {stat} {blocked && '(used)'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selected && type === 'experience_boost' && (
                  <div className="mt-2 ml-7">
                    <p className="text-xs text-gray-400 mb-1">Pick 2 experiences ({expPicks.length}/2):</p>
                    <div className="flex flex-wrap gap-2">
                      {currentExperiences.map((exp, i) => {
                        const picked = expPicks.includes(i);
                        const full = expPicks.length >= 2 && !picked;
                        return (
                          <button
                            key={i}
                            onClick={() => {
                              if (picked) setExpPicks(prev => prev.filter(x => x !== i));
                              else if (!full) setExpPicks(prev => [...prev, i]);
                            }}
                            disabled={full && !picked}
                            className={`px-2 py-1 rounded text-xs transition-colors ${
                              picked ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            {exp.text} (+{exp.value})
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selected && type === 'domain_card' && (
                  <div className="mt-2 ml-7">
                    <Select value={domainCardPick} onValueChange={setDomainCardPick}>
                      <SelectTrigger className="bg-gray-800/50 border-gray-600 text-gray-100 text-sm">
                        <SelectValue placeholder="Select domain card..." />
                      </SelectTrigger>
                      <SelectContent className="z-[9999] bg-gray-800 border-gray-600">
                        {availableDomainCards.map(c => {
                          const meta = c.metadata as any;
                          return <SelectItem key={c.id} value={c.id}>{c.name} ({c.source} Lv{meta?.level})</SelectItem>;
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {selected && type === 'subclass_upgrade' && nextSubTier && (
                  <div className="mt-2 ml-7">
                    <p className="text-xs text-green-400">Will unlock: {selectedSubclass?.name} {nextSubTier}</p>
                  </div>
                )}

                {selected && type === 'multiclass' && (
                  <div className="mt-2 ml-7 space-y-2">
                    <Select value={mcClass} onValueChange={(v) => { setMcClass(v); setMcDomain(''); setMcSubclass(''); }}>
                      <SelectTrigger className="bg-gray-800/50 border-gray-600 text-gray-100 text-sm">
                        <SelectValue placeholder="Select class..." />
                      </SelectTrigger>
                        <SelectContent className="z-[9999] bg-gray-800 border-gray-600">
                        {mcAvailableClasses.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {mcClass && (
                      <Select value={mcDomain} onValueChange={setMcDomain}>
                        <SelectTrigger className="bg-gray-800/50 border-gray-600 text-gray-100 text-sm">
                          <SelectValue placeholder="Pick one domain..." />
                        </SelectTrigger>
                          <SelectContent className="z-[9999] bg-gray-800 border-gray-600">
                          {mcDomains.map((d: string) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                    {mcClass && (
                      <Select value={mcSubclass} onValueChange={setMcSubclass}>
                        <SelectTrigger className="bg-gray-800/50 border-gray-600 text-gray-100 text-sm">
                          <SelectValue placeholder="Pick subclass..." />
                        </SelectTrigger>
                        <SelectContent className="z-[9999] bg-gray-800 border-gray-600">
                          {mcSubclasses.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 border-gray-600 text-gray-300">
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!canConfirm} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
            Confirm Level Up
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
