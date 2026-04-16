
CREATE TABLE public.dice_roll_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  equation text NOT NULL DEFAULT '',
  result integer NOT NULL DEFAULT 0,
  individual_dice jsonb NOT NULL DEFAULT '[]'::jsonb,
  rolled_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.dice_roll_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own rolls"
ON public.dice_roll_log
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all rolls"
ON public.dice_roll_log
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_dice_roll_log_user_id ON public.dice_roll_log(user_id);
CREATE INDEX idx_dice_roll_log_rolled_at ON public.dice_roll_log(rolled_at DESC);
