CREATE POLICY "Stone co-participants can read aliases in shared stones"
ON public.character_aliases
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.stone_participants sp_alias
    JOIN public.stone_participants sp_me
      ON sp_me.stone_id = sp_alias.stone_id
    WHERE sp_alias.alias_id = character_aliases.id
      AND sp_me.user_id = auth.uid()
  )
);