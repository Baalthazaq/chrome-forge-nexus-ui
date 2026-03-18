
-- Create downtime_activities table
CREATE TABLE public.downtime_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  hours_spent INTEGER NOT NULL,
  activities_chosen JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  game_day INTEGER,
  game_month INTEGER,
  game_year INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.downtime_activities ENABLE ROW LEVEL SECURITY;

-- Users can view their own activities
CREATE POLICY "Users can view their own downtime activities"
  ON public.downtime_activities
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own activities
CREATE POLICY "Users can insert their own downtime activities"
  ON public.downtime_activities
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins can manage all activities
CREATE POLICY "Admins can manage all downtime activities"
  ON public.downtime_activities
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
