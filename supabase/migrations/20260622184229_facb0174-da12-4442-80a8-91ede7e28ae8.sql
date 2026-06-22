ALTER TABLE public.stone_participants ADD COLUMN IF NOT EXISTS alias_id uuid REFERENCES public.character_aliases(id) ON DELETE SET NULL;
ALTER TABLE public.stones ADD COLUMN IF NOT EXISTS participant_one_alias_id uuid REFERENCES public.character_aliases(id) ON DELETE SET NULL;
ALTER TABLE public.stones ADD COLUMN IF NOT EXISTS participant_two_alias_id uuid REFERENCES public.character_aliases(id) ON DELETE SET NULL;

-- Replace unique constraint to include alias_id (so same user can participate as different identities)
ALTER TABLE public.stone_participants DROP CONSTRAINT IF EXISTS stone_participants_stone_id_user_id_key;
ALTER TABLE public.stone_participants DROP CONSTRAINT IF EXISTS stone_participants_pkey_unique;
CREATE UNIQUE INDEX IF NOT EXISTS stone_participants_stone_user_alias_uniq
  ON public.stone_participants (stone_id, user_id, COALESCE(alias_id, '00000000-0000-0000-0000-000000000000'::uuid));