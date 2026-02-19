export interface GameCard {
  id: string;
  card_type: 'class' | 'subclass' | 'community' | 'ancestry' | 'domain';
  name: string;
  source: string | null;
  content: string | null;
  metadata: Record<string, any>;
}

export interface CharacterSheet {
  id: string;
  user_id: string;
  class: string | null;
  subclass: string | null;
  community: string | null;
  ancestry: string | null;
  level: number;
  evasion_modifier: number;
  hp_modifier: number;
  armor_current: number;
  armor_modifier: number;
  hp_current: number;
  stress_current: number;
  hope_current: number;
  stress_max: number;
  hope_max: number;
  major_threshold_modifier: number;
  severe_threshold_modifier: number;
  experiences: Experience[];
  primary_weapon_purchase_id: string | null;
  secondary_weapon_purchase_id: string | null;
  armor_purchase_id: string | null;
  selected_card_ids: SelectedCard[];
  backpack_ids: string[];
  physical_description: PhysicalDescription;
  personality: string;
  level_up_choices: Record<string, any>;
  domain_vault_ids: string[];
}

export interface Experience {
  text: string;
  value: number;
}

export interface SelectedCard {
  card_id?: string;
  custom?: boolean;
  title?: string;
  content?: string;
}

export interface PhysicalDescription {
  clothes: string;
  eyes: string;
  body: string;
  skin: string;
}

export interface ClassCardMetadata {
  domain1: string;
  domain2: string;
  evasion: number;
  starting_hp: number;
  inventory: string;
  hope_feature: string;
  class_feature: string;
}

export interface SubclassCardMetadata {
  spellcast_trait: string;
  foundation: string;
  specialization: string;
  mastery: string;
}

export interface DomainCardMetadata {
  level: number;
  type: string;
  recall_cost: number;
}

export const STAT_SKILLS = {
  agility: ['Sprint', 'Leap', 'Maneuver'],
  strength: ['Lift', 'Smash', 'Grapple'],
  finesse: ['Control', 'Hide', 'Tinker'],
  instinct: ['Perceive', 'Sense', 'Navigate'],
  presence: ['Charm', 'Perform', 'Deceive'],
  knowledge: ['Recall', 'Analyze', 'Comprehend'],
} as const;

export type StatName = keyof typeof STAT_SKILLS;
