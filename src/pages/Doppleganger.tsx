import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { useCharacterSheet } from "@/hooks/useCharacterSheet";
import { supabase } from "@/integrations/supabase/client";
import { CharacterHeader } from "@/components/doppleganger/CharacterHeader";
import { StatsGrid } from "@/components/doppleganger/StatsGrid";
import { CombatSection } from "@/components/doppleganger/CombatSection";
import { ExperiencesSection } from "@/components/doppleganger/ExperiencesSection";
import { EquipmentSection } from "@/components/doppleganger/EquipmentSection";
import { CardsSection } from "@/components/doppleganger/CardsSection";
import { DescriptionSection } from "@/components/doppleganger/DescriptionSection";

const Doppleganger = () => {
  const { user } = useAuth();
  const { impersonatedUser } = useAdmin();
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const displayUser = impersonatedUser || user;
  const userId = displayUser ? ((displayUser as any).user_id || (displayUser as any).id) : undefined;

  const {
    sheet, updateSheet, loading: sheetLoading,
    gameCards, classCards, filteredSubclasses, ancestryCards, communityCards, domainCards,
    selectedSubclass, baseEvasion, baseHP, domains,
    purchases,
  } = useCharacterSheet(userId);

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

  // Get armor base value from equipped armor purchase
  const getArmorBaseValue = () => {
    if (!sheet?.armor_purchase_id) return 0;
    const armorPurchase = purchases.find(p => p.id === sheet.armor_purchase_id);
    const specs = armorPurchase?.shop_items?.specifications as any;
    return specs?.armor_score || specs?.base_armor || 0;
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
        />

        <StatsGrid
          profile={profile}
          displayUser={displayUser}
          onStatChange={handleStatChange}
        />

        <CombatSection
          sheet={sheet}
          updateSheet={updateSheet}
          baseEvasion={baseEvasion}
          baseHP={baseHP}
          armorBaseValue={getArmorBaseValue()}
        />

        <ExperiencesSection
          sheet={sheet}
          updateSheet={updateSheet}
        />

        <EquipmentSection
          sheet={sheet}
          updateSheet={updateSheet}
          purchases={purchases}
        />

        <CardsSection
          sheet={sheet}
          updateSheet={updateSheet}
          gameCards={gameCards}
          ancestryCards={ancestryCards}
          communityCards={communityCards}
          selectedSubclass={selectedSubclass}
          domainCards={domainCards}
          domains={domains}
        />

        <DescriptionSection
          sheet={sheet}
          updateSheet={updateSheet}
          bio={profile.bio || ''}
        />
      </div>
    </div>
  );
};

export default Doppleganger;
