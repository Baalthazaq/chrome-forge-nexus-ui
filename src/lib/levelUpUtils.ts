export type UpgradeType =
  | 'stat_increase'
  | 'hp_increase'
  | 'stress_increase'
  | 'experience_boost'
  | 'domain_card'
  | 'evasion_increase'
  | 'subclass_upgrade'
  | 'proficiency_increase'
  | 'multiclass';

export interface LevelUpgrade {
  type: UpgradeType;
  stats?: string[];
  experience_indices?: number[];
  domain_card_id?: string;
  multiclass_data?: {
    class: string;
    domain: string;
    subclass: string;
  };
}

export interface LevelUpData {
  completed: boolean;
  auto_experience?: string;
  auto_domain_card_id?: string;
  upgrades: LevelUpgrade[];
}

export type LevelUpChoices = Record<string, LevelUpData>;

export function getTier(level: number): number {
  if (level <= 1) return 1;
  if (level <= 4) return 2;
  if (level <= 7) return 3;
  return 4;
}

export function isTierStart(level: number): boolean {
  return [2, 5, 8].includes(level);
}

export function getLevelsInTier(tier: number): number[] {
  switch (tier) {
    case 2: return [2, 3, 4];
    case 3: return [5, 6, 7];
    case 4: return [8, 9, 10];
    default: return [];
  }
}

export function getProficiency(level: number, choices: LevelUpChoices): number {
  let prof = 1;
  if (level >= 2) prof++;
  if (level >= 5) prof++;
  if (level >= 8) prof++;
  Object.values(choices).forEach(data => {
    data.upgrades?.forEach(u => {
      if (u.type === 'proficiency_increase') prof++;
    });
  });
  return prof;
}

export function getTierUpgradeCounts(tier: number, choices: LevelUpChoices): Record<UpgradeType, number> {
  const counts: Record<UpgradeType, number> = {
    stat_increase: 0,
    hp_increase: 0,
    stress_increase: 0,
    experience_boost: 0,
    domain_card: 0,
    evasion_increase: 0,
    subclass_upgrade: 0,
    proficiency_increase: 0,
    multiclass: 0,
  };
  getLevelsInTier(tier).forEach(lv => {
    const data = choices[String(lv)];
    if (!data?.upgrades) return;
    data.upgrades.forEach(u => { counts[u.type]++; });
  });
  return counts;
}

export const UPGRADE_LIMITS: Record<UpgradeType, { max: number; cost: number; minTier?: number; label: string; description: string }> = {
  stat_increase: { max: 3, cost: 1, label: 'Increase Two Traits', description: 'Add +1 to two character traits. Those traits can\'t be increased this way again this tier.' },
  hp_increase: { max: 2, cost: 1, label: 'Add a Hit Point', description: '+1 to max HP.' },
  stress_increase: { max: 2, cost: 1, label: 'Add a Stress Slot', description: '+1 to max Stress.' },
  experience_boost: { max: 1, cost: 1, label: 'Boost Experiences', description: '+1 to two Experiences on your sheet.' },
  domain_card: { max: 1, cost: 1, label: 'Gain Domain Card', description: 'Pick an additional domain card from your domains.' },
  evasion_increase: { max: 1, cost: 1, label: 'Add +1 Evasion', description: '+1 to Evasion.' },
  subclass_upgrade: { max: 1, cost: 1, label: 'Upgrade Subclass', description: 'Take the next card for your subclass (Specialization or Mastery).' },
  proficiency_increase: { max: 1, cost: 2, label: 'Increase Proficiency', description: '+1 Proficiency. Costs 2 upgrade slots.' },
  multiclass: { max: 1, cost: 2, minTier: 3, label: 'Multiclass', description: 'Take a second class. Gain one domain, a subclass foundation, class feature, and hope feature. Costs 2 upgrade slots.' },
};

export function getUnlockedSubclassTiers(choices: LevelUpChoices): number {
  let count = 0;
  Object.values(choices).forEach(data => {
    data.upgrades?.forEach(u => {
      if (u.type === 'subclass_upgrade') count++;
    });
  });
  return count;
}

export function getBoostedStatsInTier(tier: number, choices: LevelUpChoices): Set<string> {
  const boosted = new Set<string>();
  getLevelsInTier(tier).forEach(lv => {
    const data = choices[String(lv)];
    if (!data?.upgrades) return;
    data.upgrades.forEach(u => {
      if (u.type === 'stat_increase' && u.stats) {
        u.stats.forEach(s => boosted.add(s));
      }
    });
  });
  return boosted;
}

export function getMulticlassInfo(choices: LevelUpChoices): Array<{ class: string; domain: string; subclass: string }> {
  const results: Array<{ class: string; domain: string; subclass: string }> = [];
  Object.values(choices).forEach(data => {
    data.upgrades?.forEach(u => {
      if (u.type === 'multiclass' && u.multiclass_data) {
        results.push(u.multiclass_data);
      }
    });
  });
  return results;
}

export function hasMutualExclusionConflict(
  type: UpgradeType,
  tier: number,
  choices: LevelUpChoices,
  currentSelections: LevelUpgrade[]
): boolean {
  const counts = getTierUpgradeCounts(tier, choices);
  const currentTypes = currentSelections.map(s => s.type);

  if (type === 'subclass_upgrade') {
    return counts.multiclass > 0 || currentTypes.includes('multiclass');
  }
  if (type === 'multiclass') {
    return counts.subclass_upgrade > 0 || currentTypes.includes('subclass_upgrade');
  }
  return false;
}
