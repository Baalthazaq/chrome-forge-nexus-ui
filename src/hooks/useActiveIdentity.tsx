import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useAdmin } from "./useAdmin";

export interface ActiveIdentity {
  userId: string | undefined;
  aliasId: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

/**
 * Resolves the effective identity for the currently signed-in (or impersonated) user.
 * If the user has a `character_aliases` row with `is_active = true`, that alias is used.
 * Otherwise falls back to the primary profile.
 *
 * Used by Sending Stone, CVNews, BHoldR comments, Succubus, etc. so that posting
 * "as an alias" is consistent across the app.
 */
export function useActiveIdentity(): ActiveIdentity & { loading: boolean; refetch: () => Promise<void> } {
  const { user } = useAuth();
  const { impersonatedUser } = useAdmin();
  const userId = impersonatedUser?.user_id || user?.id;

  const [state, setState] = useState<ActiveIdentity>({
    userId,
    aliasId: null,
    displayName: null,
    avatarUrl: null,
  });
  const [loading, setLoading] = useState(true);

  const refetch = async () => {
    if (!userId) {
      setState({ userId: undefined, aliasId: null, displayName: null, avatarUrl: null });
      setLoading(false);
      return;
    }
    setLoading(true);
    const [{ data: alias }, { data: profile }] = await Promise.all([
      supabase
        .from("character_aliases")
        .select("id,name,avatar_url")
        .eq("owner_user_id", userId)
        .eq("is_active", true)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("character_name,avatar_url")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    if (alias) {
      setState({
        userId,
        aliasId: alias.id,
        displayName: alias.name,
        avatarUrl: alias.avatar_url || profile?.avatar_url || null,
      });
    } else {
      setState({
        userId,
        aliasId: null,
        displayName: profile?.character_name || null,
        avatarUrl: profile?.avatar_url || null,
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return { ...state, loading, refetch };
}

/**
 * Helper: given a list of records with optional `alias_id` + `user_id` (or
 * `sender_id`/`author_id` etc), fetch the alias rows in bulk so callers can
 * resolve display names/avatars without N+1 queries.
 */
export async function fetchAliasMap(aliasIds: (string | null | undefined)[]) {
  const unique = Array.from(new Set(aliasIds.filter(Boolean))) as string[];
  if (unique.length === 0) return new Map<string, { name: string; avatar_url: string | null }>();
  const { data } = await supabase
    .from("character_aliases")
    .select("id,name,avatar_url")
    .in("id", unique);
  return new Map((data || []).map((a) => [a.id, { name: a.name, avatar_url: a.avatar_url }]));
}
