
-- Modify quests table: add new columns for job types
ALTER TABLE public.quests 
  ADD COLUMN job_type text NOT NULL DEFAULT 'commission',
  ADD COLUMN reward_min integer NOT NULL DEFAULT 0,
  ADD COLUMN downtime_cost integer NOT NULL DEFAULT 0,
  ADD COLUMN available_quantity integer,
  ADD COLUMN pay_interval text;

-- Rename existing reward to reward_max for clarity (keep column name as reward for backward compat)
-- Actually, let's just keep 'reward' as reward_max and add reward_min

-- Modify quest_acceptances table: add roll info and repeat tracking
ALTER TABLE public.quest_acceptances
  ADD COLUMN roll_result integer,
  ADD COLUMN roll_type text,
  ADD COLUMN times_completed integer NOT NULL DEFAULT 0;

-- Create downtime_balances table
CREATE TABLE public.downtime_balances (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  balance integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.downtime_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own downtime balance"
  ON public.downtime_balances FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all downtime balances"
  ON public.downtime_balances FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create downtime_config table (singleton)
CREATE TABLE public.downtime_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hours_per_day integer NOT NULL DEFAULT 8,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.downtime_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read downtime config"
  ON public.downtime_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can update downtime config"
  ON public.downtime_config FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed downtime_config with default
INSERT INTO public.downtime_config (hours_per_day) VALUES (8);

-- Seed downtime_balances for all existing profiles
INSERT INTO public.downtime_balances (user_id, balance)
SELECT user_id, 0 FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;
