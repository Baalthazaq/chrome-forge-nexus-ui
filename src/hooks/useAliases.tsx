import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CharacterAlias {
  id: string;
  owner_user_id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  is_public: boolean;
  is_active: boolean;
  sheet_data: any;
  created_at: string;
  updated_at: string;
}

/**
 * Aliases for a given owner. The "active" alias overrides the primary identity
 * on the character sheet and on public-identity surfaces.
 */
export function useAliases(ownerUserId: string | undefined) {
  const [aliases, setAliases] = useState<CharacterAlias[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!ownerUserId) {
      setAliases([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("character_aliases")
      .select("*")
      .eq("owner_user_id", ownerUserId)
      .order("created_at", { ascending: true });
    setAliases((data || []) as CharacterAlias[]);
    setLoading(false);
  }, [ownerUserId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const activeAlias = aliases.find((a) => a.is_active) || null;

  const setActiveAlias = useCallback(
    async (aliasId: string | null) => {
      if (!ownerUserId) return;
      // Deactivate any active alias for this owner
      await supabase
        .from("character_aliases")
        .update({ is_active: false })
        .eq("owner_user_id", ownerUserId)
        .eq("is_active", true);
      if (aliasId) {
        await supabase
          .from("character_aliases")
          .update({ is_active: true })
          .eq("id", aliasId);
      }
      await refetch();
    },
    [ownerUserId, refetch]
  );

  const createAlias = useCallback(
    async (input: {
      name: string;
      avatar_url?: string | null;
      bio?: string | null;
      is_public: boolean;
      sheet_data?: any;
    }) => {
      if (!ownerUserId) return null;
      const { data, error } = await supabase
        .from("character_aliases")
        .insert({
          owner_user_id: ownerUserId,
          name: input.name,
          avatar_url: input.avatar_url ?? null,
          bio: input.bio ?? null,
          is_public: input.is_public,
          sheet_data: input.sheet_data ?? {},
        })
        .select()
        .single();
      if (error) {
        console.error("createAlias failed", error);
        return null;
      }
      await refetch();
      return data as CharacterAlias;
    },
    [ownerUserId, refetch]
  );

  const updateAlias = useCallback(
    async (id: string, updates: Partial<CharacterAlias>) => {
      const { error } = await supabase
        .from("character_aliases")
        .update(updates as any)
        .eq("id", id);
      if (error) console.error("updateAlias failed", error);
      await refetch();
    },
    [refetch]
  );

  const deleteAlias = useCallback(
    async (id: string) => {
      await supabase.from("character_aliases").delete().eq("id", id);
      await refetch();
    },
    [refetch]
  );

  return {
    aliases,
    activeAlias,
    loading,
    refetch,
    setActiveAlias,
    createAlias,
    updateAlias,
    deleteAlias,
  };
}
