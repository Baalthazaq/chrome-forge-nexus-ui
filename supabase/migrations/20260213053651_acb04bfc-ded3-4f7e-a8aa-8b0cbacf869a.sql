
-- Add group chat columns to stones
ALTER TABLE public.stones 
  ADD COLUMN name text,
  ADD COLUMN is_group boolean NOT NULL DEFAULT false,
  ADD COLUMN created_by uuid;

-- Make participant columns nullable for group chats
ALTER TABLE public.stones 
  ALTER COLUMN participant_one_id DROP NOT NULL,
  ALTER COLUMN participant_two_id DROP NOT NULL;

-- Create stone_participants junction table
CREATE TABLE public.stone_participants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stone_id uuid NOT NULL REFERENCES public.stones(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  left_at timestamp with time zone,
  UNIQUE(stone_id, user_id)
);

-- Enable RLS
ALTER TABLE public.stone_participants ENABLE ROW LEVEL SECURITY;

-- RLS policies for stone_participants
CREATE POLICY "Users can view participants of their stones"
  ON public.stone_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.stone_participants sp
      WHERE sp.stone_id = stone_participants.stone_id
        AND sp.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all participants"
  ON public.stone_participants FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert participants into their stones"
  ON public.stone_participants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stone_participants sp
      WHERE sp.stone_id = stone_participants.stone_id
        AND sp.user_id = auth.uid()
        AND sp.left_at IS NULL
    )
    OR has_role(auth.uid(), 'admin'::app_role)
    OR (
      -- Allow the creator to add first participants (including themselves)
      EXISTS (
        SELECT 1 FROM public.stones s
        WHERE s.id = stone_participants.stone_id
          AND s.created_by = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update their own participation (leave)"
  ON public.stone_participants FOR UPDATE
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all participants"
  ON public.stone_participants FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Migrate existing 1:1 stones into stone_participants
INSERT INTO public.stone_participants (stone_id, user_id, joined_at)
SELECT id, participant_one_id, created_at FROM public.stones WHERE participant_one_id IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.stone_participants (stone_id, user_id, joined_at)
SELECT id, participant_two_id, created_at FROM public.stones WHERE participant_two_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Update existing stones RLS to also cover group chats
DROP POLICY IF EXISTS "Users can view stones they participate in" ON public.stones;
CREATE POLICY "Users can view stones they participate in"
  ON public.stones FOR SELECT
  USING (
    participant_one_id = auth.uid() 
    OR participant_two_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.stone_participants sp
      WHERE sp.stone_id = stones.id AND sp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create stones they participate in or admins can creat" ON public.stones;
CREATE POLICY "Users can create stones"
  ON public.stones FOR INSERT
  WITH CHECK (
    participant_one_id = auth.uid() 
    OR participant_two_id = auth.uid()
    OR created_by = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "Users can update stones they participate in or admins can updat" ON public.stones;
CREATE POLICY "Users can update stones they participate in"
  ON public.stones FOR UPDATE
  USING (
    participant_one_id = auth.uid() 
    OR participant_two_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.stone_participants sp
      WHERE sp.stone_id = stones.id AND sp.user_id = auth.uid() AND sp.left_at IS NULL
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Update casts policies to support group chats
DROP POLICY IF EXISTS "Users can create casts in their stones or admins can create for" ON public.casts;
CREATE POLICY "Users can create casts in their stones"
  ON public.casts FOR INSERT
  WITH CHECK (
    (auth.uid() = sender_id AND (
      EXISTS (
        SELECT 1 FROM public.stones s
        WHERE s.id = casts.stone_id 
          AND (s.participant_one_id = auth.uid() OR s.participant_two_id = auth.uid())
      )
      OR EXISTS (
        SELECT 1 FROM public.stone_participants sp
        WHERE sp.stone_id = casts.stone_id AND sp.user_id = auth.uid() AND sp.left_at IS NULL
      )
    ))
    OR has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "Users can view casts in their stones" ON public.casts;
CREATE POLICY "Users can view casts in their stones"
  ON public.casts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.stones s
      WHERE s.id = casts.stone_id 
        AND (s.participant_one_id = auth.uid() OR s.participant_two_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.stone_participants sp
      WHERE sp.stone_id = casts.stone_id AND sp.user_id = auth.uid()
    )
  );
