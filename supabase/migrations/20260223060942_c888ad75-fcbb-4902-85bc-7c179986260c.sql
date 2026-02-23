
-- Add end day for multi-day events
ALTER TABLE public.calendar_events ADD COLUMN event_day_end integer NULL;

-- Create table for sharing personal events with other players
CREATE TABLE public.calendar_event_shares (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  shared_by uuid NOT NULL,
  shared_with uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(event_id, shared_with)
);

ALTER TABLE public.calendar_event_shares ENABLE ROW LEVEL SECURITY;

-- Event owner can manage shares
CREATE POLICY "Users can create shares for their own events"
ON public.calendar_event_shares FOR INSERT
WITH CHECK (auth.uid() = shared_by);

CREATE POLICY "Users can delete shares for their own events"
ON public.calendar_event_shares FOR DELETE
USING (auth.uid() = shared_by);

-- Users can see shares they created or received
CREATE POLICY "Users can view shares they created"
ON public.calendar_event_shares FOR SELECT
USING (auth.uid() = shared_by);

CREATE POLICY "Users can view shares sent to them"
ON public.calendar_event_shares FOR SELECT
USING (auth.uid() = shared_with);

-- Admins can manage all
CREATE POLICY "Admins can manage all shares"
ON public.calendar_event_shares FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Also allow users to view events shared with them
CREATE POLICY "Users can view events shared with them"
ON public.calendar_events FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.calendar_event_shares
  WHERE calendar_event_shares.event_id = calendar_events.id
    AND calendar_event_shares.shared_with = auth.uid()
));
