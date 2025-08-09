-- Add age column to profiles for manual override
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS age integer;

-- Optional: comment for clarity
COMMENT ON COLUMN public.profiles.age IS 'Manual age override for future setting (Doppleganger).';