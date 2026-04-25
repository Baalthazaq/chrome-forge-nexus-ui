ALTER TABLE public.quests
  ADD COLUMN IF NOT EXISTS posted_game_day integer,
  ADD COLUMN IF NOT EXISTS posted_game_month integer,
  ADD COLUMN IF NOT EXISTS posted_game_year integer;

ALTER TABLE public.quest_acceptances
  ADD COLUMN IF NOT EXISTS submitted_game_day integer,
  ADD COLUMN IF NOT EXISTS submitted_game_month integer,
  ADD COLUMN IF NOT EXISTS submitted_game_year integer;