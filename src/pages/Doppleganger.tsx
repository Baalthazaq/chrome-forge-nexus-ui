import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { useCharacterSheet } from "@/hooks/useCharacterSheet";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Eye, Moon, Sun, Timer } from "lucide-react";
import RestDialog from "@/components/RestDialog";
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
  const [downtimeBalance, setDowntimeBalance] = useState(0);
  const [restType, setRestType] = useState<"short" | "long">("short");
  const [restOpen, setRestOpen] = useState(false);
  const [gameDate, setGameDate] = useState<{ day: number; month: number; year: number } | undefined>();

  const displayUser = impersonatedUser || user;
  const userId = displayUser ? ((displayUser as any).user_id || (displayUser as any).id) : undefined;

  const {
    sheet, updateSheet: rawUpdateSheet, loading: sheetLoading,
    gameCards, classCards, subclassCards, filteredSubclasses, ancestryCards, communityCards, domainCards,
    selectedClass, selectedSubclass, baseEvasion, baseHP, domains,
    purchases, customItems,
  } = useCharacterSheet(userId);

  // Sync sheet fields that also exist on profiles
  const SHEET_TO_PROFILE_MAP: Record<string, string> = {
    class: 'character_class',
    subclass: 'subclass',
    ancestry: 'ancestry',
    community: 'community',
    level: 'level',
  };

  const updateSheet = async (updates: Partial<typeof sheet>) => {
    await rawUpdateSheet(updates as any);
    // Sync relevant fields to profiles
    if (!userId) return;
    const profileSync: Record<string, any> = {};
    for (const [sheetKey, profileKey] of Object.entries(SHEET_TO_PROFILE_MAP)) {
      if (sheetKey in (updates as any)) {
        profileSync[profileKey] = (updates as any)[sheetKey];
      }
    }
    if (Object.keys(profileSync).length > 0) {
      setProfile((prev: any) => prev ? { ...prev, ...profileSync } : prev);
      await supabase.from('profiles').update(profileSync).eq('user_id', userId);
    }
  };

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

  // Load downtime & game date
  const loadDowntime = async () => {
    if (!userId) return;
    const { data } = await supabase.functions.invoke("quest-operations", {
      body: { operation: "get_downtime", targetUserId: impersonatedUser?.user_id },
    });
    if (data?.downtime) setDowntimeBalance(data.downtime.balance);
  };

  useEffect(() => {
    loadDowntime();
    supabase.from("game_calendar").select("*").limit(1).single().then(({ data }) => {
      if (data) setGameDate({ day: data.current_day, month: data.current_month, year: data.current_year });
    });
  }, [userId]);

  // One-time sync: ensure profile reflects sheet's authoritative fields
  const [hasSynced, setHasSynced] = useState(false);
  useEffect(() => {
    if (!profile || !sheet || !userId || hasSynced) return;
    const sync: Record<string, any> = {};
    if (sheet.level !== profile.level) sync.level = sheet.level;
    if (sheet.class && sheet.class !== profile.character_class) sync.character_class = sheet.class;
    if (sheet.ancestry && sheet.ancestry !== profile.ancestry) sync.ancestry = sheet.ancestry;
    if (sheet.community && sheet.community !== profile.community) sync.community = sheet.community;
    if (Object.keys(sync).length > 0) {
      setProfile((prev: any) => prev ? { ...prev, ...sync } : prev);
      supabase.from('profiles').update(sync).eq('user_id', userId);
    }
    setHasSynced(true);
  }, [profile, sheet, userId, hasSynced]);

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
        {/* Edit toggle + Downtime + Rest */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-cyan-500/50 text-cyan-400 text-xs">
              <Timer className="w-3 h-3 mr-1" /> {downtimeBalance}h downtime
            </Badge>
            <Button variant="outline" size="sm" className="border-amber-600 text-amber-400 hover:bg-amber-900/30 h-7 text-xs" onClick={() => { setRestType("short"); setRestOpen(true); }}>
              <Sun className="w-3 h-3 mr-1" /> Short Rest
            </Button>
            <Button variant="outline" size="sm" className="border-indigo-600 text-indigo-400 hover:bg-indigo-900/30 h-7 text-xs" onClick={() => { setRestType("long"); setRestOpen(true); }}>
              <Moon className="w-3 h-3 mr-1" /> Long Rest
            </Button>
          </div>
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

        <RestDialog
          type={restType}
          open={restOpen}
          onClose={() => setRestOpen(false)}
          userId={userId}
          impersonatedUserId={impersonatedUser?.user_id}
          currentBalance={downtimeBalance}
          gameDate={gameDate}
          onComplete={loadDowntime}
        />

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

        {/* Downtime & Rest */}
        <div className="flex items-center gap-2 mb-6">
          <Badge variant="outline" className="border-cyan-500/50 text-cyan-400 text-xs">
            <Timer className="w-3 h-3 mr-1" /> {downtimeBalance}h downtime
          </Badge>
          <Button variant="outline" size="sm" className="border-amber-600 text-amber-400 hover:bg-amber-900/30 h-7 text-xs" onClick={() => { setRestType("short"); setRestOpen(true); }}>
            <Sun className="w-3 h-3 mr-1" /> Short Rest
          </Button>
          <Button variant="outline" size="sm" className="border-indigo-600 text-indigo-400 hover:bg-indigo-900/30 h-7 text-xs" onClick={() => { setRestType("long"); setRestOpen(true); }}>
            <Moon className="w-3 h-3 mr-1" /> Long Rest
          </Button>
        </div>

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
