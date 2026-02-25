-- Allow authenticated users to view all character sheets (small trusted RPG group)
CREATE POLICY "Authenticated users can view all sheets"
ON public.character_sheets
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Sync character_class in profiles from character_sheets where it's missing
UPDATE public.profiles p
SET character_class = cs.class
FROM public.character_sheets cs
WHERE p.user_id = cs.user_id
  AND (p.character_class IS NULL OR p.character_class = '')
  AND cs.class IS NOT NULL;