-- Add new fields to profiles table for NPC management
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS ancestry text,
ADD COLUMN IF NOT EXISTS credit_rating integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS is_searchable boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS has_succubus_profile boolean DEFAULT false;

-- Update existing credits column name to credit_rating if needed
-- Note: We'll keep both for now to maintain compatibility
UPDATE public.profiles SET credit_rating = credits WHERE credit_rating = 0 AND credits > 0;