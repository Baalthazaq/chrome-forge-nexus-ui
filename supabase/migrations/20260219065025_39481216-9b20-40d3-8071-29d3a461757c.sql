
-- Add level_up_choices JSONB to track per-level upgrade choices
ALTER TABLE public.character_sheets
ADD COLUMN IF NOT EXISTS level_up_choices jsonb DEFAULT '{}'::jsonb;

-- Add domain_vault_ids JSONB to track vaulted domain cards
ALTER TABLE public.character_sheets
ADD COLUMN IF NOT EXISTS domain_vault_ids jsonb DEFAULT '[]'::jsonb;
