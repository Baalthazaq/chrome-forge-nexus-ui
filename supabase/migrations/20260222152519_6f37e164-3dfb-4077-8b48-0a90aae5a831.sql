
-- Create game_calendar table (single-row config)
CREATE TABLE public.game_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  current_day integer NOT NULL DEFAULT 1,
  current_month integer NOT NULL DEFAULT 1,
  current_year integer NOT NULL DEFAULT 1,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.game_calendar ENABLE ROW LEVEL SECURITY;

-- Everyone can read the current date
CREATE POLICY "Everyone can view game calendar"
  ON public.game_calendar FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can update
CREATE POLICY "Admins can update game calendar"
  ON public.game_calendar FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Insert initial row
INSERT INTO public.game_calendar (current_day, current_month, current_year)
VALUES (1, 1, 1);

-- Create calendar_events table
CREATE TABLE public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  title text NOT NULL,
  description text,
  event_day integer NOT NULL,
  event_month integer NOT NULL,
  event_year integer,
  is_holiday boolean NOT NULL DEFAULT false,
  is_recurring boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Everyone can see universal events (user_id IS NULL) and holidays
CREATE POLICY "Authenticated users can view universal events"
  ON public.calendar_events FOR SELECT
  TO authenticated
  USING (user_id IS NULL);

-- Users can see their own events
CREATE POLICY "Users can view their own events"
  ON public.calendar_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can see all events
CREATE POLICY "Admins can view all events"
  ON public.calendar_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Users can create their own events
CREATE POLICY "Users can create their own events"
  ON public.calendar_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own events
CREATE POLICY "Users can update their own events"
  ON public.calendar_events FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can delete their own events
CREATE POLICY "Users can delete their own events"
  ON public.calendar_events FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can manage all events
CREATE POLICY "Admins can manage all events"
  ON public.calendar_events FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Seed holidays
-- Month 1: Oath
INSERT INTO public.calendar_events (user_id, title, description, event_day, event_month, is_holiday, is_recurring)
VALUES (NULL, 'Day of First Promise', 'The first day of the new year. Oaths and promises are made.', 1, 1, true, true);

-- Month 2: Stern (all month)
INSERT INTO public.calendar_events (user_id, title, description, event_day, event_month, is_holiday, is_recurring)
VALUES (NULL, 'Days of Confession', 'The entire month of Stern is devoted to confession and atonement.', 0, 2, true, true);

-- Month 3: Engineer
INSERT INTO public.calendar_events (user_id, title, description, event_day, event_month, is_holiday, is_recurring)
VALUES (NULL, 'Day of the Mind', 'A celebration of intellect, invention, and engineering.', 28, 3, true, true);

-- Month 4: Miner
INSERT INTO public.calendar_events (user_id, title, description, event_day, event_month, is_holiday, is_recurring)
VALUES (NULL, 'Day of the Body', 'Honoring physical labor and the strength of the body.', 1, 4, true, true);

-- Month 5: Retribution
INSERT INTO public.calendar_events (user_id, title, description, event_day, event_month, is_holiday, is_recurring)
VALUES 
  (NULL, 'Day of No Mask', 'A day where all deceptions are forbidden.', 11, 5, true, true),
  (NULL, 'Day of Shield and Axe', 'The final day of the Season of the Shield. A day of martial celebration.', 28, 5, true, true);

-- Month 6: Shackles
INSERT INTO public.calendar_events (user_id, title, description, event_day, event_month, is_holiday, is_recurring)
VALUES (NULL, 'Day of Shame', 'A day of remembrance for past wrongs.', 21, 6, true, true);

-- Month 7: Trade
INSERT INTO public.calendar_events (user_id, title, description, event_day, event_month, is_holiday, is_recurring)
VALUES (NULL, 'Day of Therin', 'Honoring Therin, patron of commerce and fair dealing.', 25, 7, true, true);

-- Day of Frippery (month 8 in our system)
INSERT INTO public.calendar_events (user_id, title, description, event_day, event_month, is_holiday, is_recurring)
VALUES (NULL, 'Lie Day', 'The Day of Frippery. A day of mischief, disguise, and sanctioned deception.', 1, 8, true, true);

-- Month 9: Light
INSERT INTO public.calendar_events (user_id, title, description, event_day, event_month, is_holiday, is_recurring)
VALUES (NULL, 'Truth Day', 'The day after Lie Day. Truth is paramount.', 1, 9, true, true);

-- Month 10: Navigator
INSERT INTO public.calendar_events (user_id, title, description, event_day, event_month, is_holiday, is_recurring)
VALUES (NULL, 'Finder''s Day', 'A day for explorers and navigators. Can fall on any day of the month.', 1, 10, true, true);

-- Month 11: Tryst
INSERT INTO public.calendar_events (user_id, title, description, event_day, event_month, is_holiday, is_recurring)
VALUES (NULL, 'Baubledays', 'Unofficial holiday. Gift-giving and romantic gestures throughout the month.', 1, 11, true, true);

-- Month 12: Destiny (all month)
INSERT INTO public.calendar_events (user_id, title, description, event_day, event_month, is_holiday, is_recurring)
VALUES (NULL, 'Days of Ease', 'The entire month of Destiny is a time of relaxation and reflection.', 0, 12, true, true);

-- Month 13: Groveling
INSERT INTO public.calendar_events (user_id, title, description, event_day, event_month, is_holiday, is_recurring)
VALUES (NULL, 'Grovellerday', 'A day of supplication and humility.', 4, 13, true, true);

-- Month 14: Negotiation
INSERT INTO public.calendar_events (user_id, title, description, event_day, event_month, is_holiday, is_recurring)
VALUES (NULL, 'Therin''s Reckondays', 'The final four days of the year. Debts are settled and accounts reconciled.', 25, 14, true, true);
