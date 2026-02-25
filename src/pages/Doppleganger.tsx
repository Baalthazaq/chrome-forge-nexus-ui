import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { useCharacterSheet } from "@/hooks/useCharacterSheet";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Pencil, Eye } from "lucide-react";
import { CharacterHeader } from "@/components/doppleganger/CharacterHeader";
import { StatsGrid } from "@/components/doppleganger/StatsGrid";
import { CombatSection } from "@/components/doppleganger/CombatSection";
import { ExperiencesSection } from "@/components/doppleganger/ExperiencesSection";
import { EquipmentSection } from "@/components/doppleganger/EquipmentSection";
import { CardsSection } from "@/components/doppleganger/CardsSection";
import { DescriptionSection } from "@/components/doppleganger/DescriptionSection";
import { getProficiency, getMulticlassInfo, type LevelUpChoices } from "@/lib/levelUpUtils";

const Doppleganger = () => {
  const { user } = useAuth();
  const { impersonatedUser } = useAdmin();
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const displayUser = impersonatedUser || user;
  const userId = displayUser ? ((displayUser as any).user_id || (displayUser as any).id) : undefined;

  const {
    sheet, updateSheet, loading: sheetLoading,
    gameCards, classCards, subclassCards, filteredSubclasses, ancestryCards, communityCards, domainCards,
    selectedClass, selectedSubclass, baseEvasion, baseHP, domains,
    purchases, customItems,
  } = useCharacterSheet(userId);

  // Compute proficiency and multiclass domains
  const choices = (sheet?.level_up_choices || {}) as LevelUpChoices;
  const proficiency = sheet ? getProficiency(sheet.level, choices) : 1;
  const multiclasses = getMulticlassInfo(choices);
  const allDomains = [...domains, ...multiclasses.map(mc => mc.domain)];

  // Fetch profile
  useEffect(() => {
    if (!userId) { setProfileLoading(false); return; }
    supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle()
      .then(({ data }) => { setProfile(data); setProfileLoading(false); });
  }, [userId]);

  // SEO
  useEffect(() => {
    if (!profile) return;
    document.title = `Doppleganger – ${profile.character_name || 'Character Sheet'}`;
  }, [profile]);

  // Stat change handler (saves to profiles table)
  const handleStatChange = async (stat: string, value: number) => {
    if (!userId) return;
    setProfile((prev: any) => ({ ...prev, [stat]: value }));
    await supabase.from('profiles').update({ [stat]: value }).eq('user_id', userId);
  };

  // Profile field update handler
  const handleProfileUpdate = async (field: string, value: any) => {
    if (!userId) return;
    setProfile((prev: any) => ({ ...prev, [field]: value }));
    await supabase.from('profiles').update({ [field]: value }).eq('user_id', userId);
  };

  // Get armor base value and thresholds from equipped armor (purchase or custom item)
  const getArmorBaseValue = () => {
    if (!sheet?.armor_purchase_id) return 0;
    const armorPurchase = purchases.find(p => p.id === sheet.armor_purchase_id);
    if (armorPurchase) {
      const specs = armorPurchase?.shop_items?.specifications as any;
      return specs?.armorBase || specs?.armor_score || specs?.base_armor || 0;
    }
    // Check custom items
    const customArmor = customItems.find(c => c.id === sheet.armor_purchase_id);
    if (customArmor) {
      const specs = customArmor?.metadata?.specifications || {};
      return specs?.armorBase || specs?.armor_score || specs?.base_armor || 0;
    }
    return 0;
  };

  const getArmorThresholds = () => {
    if (!sheet?.armor_purchase_id) return '';
    const armorPurchase = purchases.find(p => p.id === sheet.armor_purchase_id);
    if (armorPurchase) {
      const specs = armorPurchase?.shop_items?.specifications as any;
      return specs?.armorThreshold || specs?.armor_threshold || '';
    }
    const customArmor = customItems.find(c => c.id === sheet.armor_purchase_id);
    if (customArmor) {
      const specs = customArmor?.metadata?.specifications || {};
      return specs?.armorThreshold || specs?.armor_threshold || '';
    }
    return '';
  };

  if (profileLoading || sheetLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Loading character sheet...</div>
      </div>
    );
  }

  if (!user || !profile || !sheet) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Please log in to access your character sheet.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-black to-purple-900/20" />

      <div className="relative z-10 container mx-auto px-4 py-6 max-w-6xl">
        {/* Edit toggle */}
        <div className="flex justify-end mb-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            className="border-gray-600 text-gray-300 hover:text-white"
          >
            {isEditing ? <Eye className="w-4 h-4 mr-1" /> : <Pencil className="w-4 h-4 mr-1" />}
            {isEditing ? 'View Mode' : 'Edit Mode'}
          </Button>
        </div>

        <CharacterHeader
          profile={profile}
          sheet={sheet}
          updateSheet={updateSheet}
          classCards={classCards}
          filteredSubclasses={filteredSubclasses}
          ancestryCards={ancestryCards}
          communityCards={communityCards}
          domains={domains}
          displayUser={displayUser}
          isEditing={isEditing}
          onProfileUpdate={handleProfileUpdate}
          onStatChange={handleStatChange}
          gameCards={gameCards}
          subclassCards={subclassCards}
          domainCards={domainCards}
          selectedSubclass={selectedSubclass}
        />

        <StatsGrid
          profile={profile}
          displayUser={displayUser}
          onStatChange={handleStatChange}
          isEditing={isEditing}
        />

        <CombatSection
          sheet={sheet}
          updateSheet={updateSheet}
          baseEvasion={baseEvasion}
          baseHP={baseHP}
          armorBaseValue={getArmorBaseValue()}
          armorThresholds={getArmorThresholds()}
          isEditing={isEditing}
          level={sheet.level}
        />

        <ExperiencesSection
          sheet={sheet}
          updateSheet={updateSheet}
          isEditing={isEditing}
        />

        <EquipmentSection
          sheet={sheet}
          updateSheet={updateSheet}
          purchases={purchases}
          customItems={customItems}
          isEditing={isEditing}
          proficiency={proficiency}
        />

        <CardsSection
          sheet={sheet}
          updateSheet={updateSheet}
          gameCards={gameCards}
          ancestryCards={ancestryCards}
          communityCards={communityCards}
          selectedSubclass={selectedSubclass}
          selectedClass={selectedClass}
          domainCards={domainCards}
          domains={allDomains}
          isEditing={isEditing}
          classCards={classCards}
        />

        <DescriptionSection
          sheet={sheet}
          updateSheet={updateSheet}
          bio={profile.bio || ''}
          job={profile.job || ''}
          company={profile.company || ''}
          isEditing={isEditing}
          onBioUpdate={(newBio) => handleProfileUpdate('bio', newBio)}
          onProfileUpdate={handleProfileUpdate}
        />
      </div>
    </div>
  );
};

export default Doppleganger;
