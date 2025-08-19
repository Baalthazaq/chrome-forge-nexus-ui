-- Add new fields to profiles table for enhanced character data
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS agility integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS strength integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS finesse integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS instinct integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS presence integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS knowledge integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS security_rating text DEFAULT 'C',
ADD COLUMN IF NOT EXISTS employer text,
ADD COLUMN IF NOT EXISTS education text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS aliases text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS fitness_rating numeric GENERATED ALWAYS AS (
  ((3 + agility) ^ 2 + (3 + (2 * strength)) ^ 2) + (strength::numeric / 10) + (agility::numeric / 5)
) STORED,
ADD COLUMN IF NOT EXISTS neural_rating numeric GENERATED ALWAYS AS (
  ((3 + instinct) ^ 2 + (3 + (2 * knowledge)) ^ 2) + (knowledge::numeric / 10) + (instinct::numeric / 5)
) STORED,
ADD COLUMN IF NOT EXISTS stealth_index numeric GENERATED ALWAYS AS (
  ((3 + agility) ^ 2 + (3 + (2 * finesse)) ^ 2) + (finesse::numeric / 10) + (agility::numeric / 5)
) STORED;

-- Remove level column as requested
ALTER TABLE public.profiles DROP COLUMN IF EXISTS level;

-- Update charisma_score to be calculated from presence (but allow manual override)
-- We'll keep charisma_score as is for now since it should be "fed into" later

-- Create reputation_tags table for anonymous tags from other users
CREATE TABLE IF NOT EXISTS public.reputation_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL,
  tagger_user_id uuid NOT NULL,
  tag text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(target_user_id, tagger_user_id, tag)
);

-- Enable RLS on reputation_tags
ALTER TABLE public.reputation_tags ENABLE ROW LEVEL SECURITY;

-- RLS policies for reputation_tags
CREATE POLICY "Users can view reputation tags about them"
ON public.reputation_tags
FOR SELECT
USING (target_user_id = auth.uid());

CREATE POLICY "Users can create reputation tags about others"
ON public.reputation_tags
FOR INSERT
WITH CHECK (tagger_user_id = auth.uid() AND target_user_id != auth.uid());

CREATE POLICY "Users can update their own reputation tags"
ON public.reputation_tags
FOR UPDATE
USING (tagger_user_id = auth.uid());

CREATE POLICY "Users can delete their own reputation tags"
ON public.reputation_tags
FOR DELETE
USING (tagger_user_id = auth.uid());

CREATE POLICY "Admins can manage all reputation tags"
ON public.reputation_tags
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create user_activity table for tracking recent activity
CREATE TABLE IF NOT EXISTS public.user_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  activity_type text NOT NULL,
  activity_description text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on user_activity
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_activity
CREATE POLICY "Users can view their own activity"
ON public.user_activity
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "System can create activity records"
ON public.user_activity
FOR INSERT
WITH CHECK (true); -- Allow system to create activity records

CREATE POLICY "Admins can view all activity"
ON public.user_activity
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create augmentations table for user augmentations
CREATE TABLE IF NOT EXISTS public.user_augmentations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  status text DEFAULT 'active',
  efficiency_percent integer DEFAULT 100,
  installed_at timestamp with time zone DEFAULT now(),
  last_maintenance timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'
);

-- Enable RLS on user_augmentations
ALTER TABLE public.user_augmentations ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_augmentations
CREATE POLICY "Users can view their own augmentations"
ON public.user_augmentations
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own augmentations"
ON public.user_augmentations
FOR ALL
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all augmentations"
ON public.user_augmentations
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));