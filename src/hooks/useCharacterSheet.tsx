import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { GameCard, CharacterSheet, Experience, SelectedCard, PhysicalDescription } from '@/data/gameCardTypes';

export function useCharacterSheet(userId: string | undefined) {
  const { toast } = useToast();
  const [sheet, setSheet] = useState<CharacterSheet | null>(null);
  const [gameCards, setGameCards] = useState<GameCard[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);

    const [cardsRes, sheetRes, purchasesRes] = await Promise.all([
      supabase.from('game_cards').select('*'),
      supabase.from('character_sheets').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('purchases').select('*, shop_items(*)').eq('user_id', userId),
    ]);

    if (cardsRes.data) setGameCards(cardsRes.data as unknown as GameCard[]);
    if (purchasesRes.data) setPurchases(purchasesRes.data);

    if (sheetRes.data) {
      const d = sheetRes.data as any;
      setSheet({
        ...d,
        experiences: (d.experiences || []) as Experience[],
        selected_card_ids: (d.selected_card_ids || []) as SelectedCard[],
        backpack_ids: (d.backpack_ids || []) as string[],
        physical_description: (d.physical_description || { clothes: '', eyes: '', body: '', skin: '' }) as PhysicalDescription,
        personality: d.personality || '',
      });
    } else {
      // Create a new sheet
      const { data: newSheet, error } = await supabase
        .from('character_sheets')
        .insert({ user_id: userId })
        .select('*')
        .single();
      if (newSheet) {
        const d = newSheet as any;
        setSheet({
          ...d,
          experiences: [] as Experience[],
          selected_card_ids: [] as SelectedCard[],
          backpack_ids: [] as string[],
          physical_description: { clothes: '', eyes: '', body: '', skin: '' },
          personality: '',
        });
      }
      if (error) console.error('Failed to create character sheet:', error);
    }

    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateSheet = useCallback(async (updates: Partial<CharacterSheet>) => {
    if (!sheet) return;
    const optimistic = { ...sheet, ...updates };
    setSheet(optimistic);

    const { error } = await supabase
      .from('character_sheets')
      .update(updates as any)
      .eq('user_id', sheet.user_id);

    if (error) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
      fetchData(); // revert
    }
  }, [sheet, fetchData, toast]);

  // Derived data
  const classCards = gameCards.filter(c => c.card_type === 'class');
  const subclassCards = gameCards.filter(c => c.card_type === 'subclass');
  const communityCards = gameCards.filter(c => c.card_type === 'community');
  const ancestryCards = gameCards.filter(c => c.card_type === 'ancestry');
  const domainCards = gameCards.filter(c => c.card_type === 'domain');

  const selectedClass = classCards.find(c => c.name === sheet?.class);
  const selectedSubclass = subclassCards.find(c => c.name === sheet?.subclass && c.source === sheet?.class);
  const filteredSubclasses = subclassCards.filter(c => c.source === sheet?.class);

  // Get class metadata
  const classMeta = selectedClass?.metadata as any;
  const baseEvasion = classMeta?.evasion ?? 0;
  const baseHP = classMeta?.starting_hp ?? 0;
  const domains = classMeta ? [classMeta.domain1, classMeta.domain2] : [];

  return {
    sheet, updateSheet, loading,
    gameCards, classCards, subclassCards, communityCards, ancestryCards, domainCards,
    selectedClass, selectedSubclass, filteredSubclasses,
    classMeta, baseEvasion, baseHP, domains,
    purchases, refetch: fetchData,
  };
}
