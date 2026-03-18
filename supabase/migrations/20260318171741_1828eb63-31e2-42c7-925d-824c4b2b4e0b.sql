ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_npc boolean DEFAULT false;

UPDATE public.profiles
SET is_npc = true
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE 'npc_%@nexus.game'
);