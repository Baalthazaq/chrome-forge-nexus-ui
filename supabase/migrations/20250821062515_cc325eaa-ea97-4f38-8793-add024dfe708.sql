-- Add missing level column to profiles to align with UI and edge function
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS level integer NOT NULL DEFAULT 1;