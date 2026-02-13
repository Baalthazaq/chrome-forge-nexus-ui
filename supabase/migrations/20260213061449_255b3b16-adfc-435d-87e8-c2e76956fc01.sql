
-- Create security definer function to check stone participation
CREATE OR REPLACE FUNCTION public.is_stone_participant(_user_id uuid, _stone_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.stone_participants
    WHERE user_id = _user_id
      AND stone_id = _stone_id
  )
$$;

-- Also one for active participants
CREATE OR REPLACE FUNCTION public.is_active_stone_participant(_user_id uuid, _stone_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.stone_participants
    WHERE user_id = _user_id
      AND stone_id = _stone_id
      AND left_at IS NULL
  )
$$;

-- Drop the recursive policies on stone_participants
DROP POLICY IF EXISTS "Users can view participants of their stones" ON public.stone_participants;
DROP POLICY IF EXISTS "Users can insert participants into their stones" ON public.stone_participants;

-- Recreate without recursion
CREATE POLICY "Users can view participants of their stones"
ON public.stone_participants FOR SELECT
USING (public.is_stone_participant(auth.uid(), stone_id));

CREATE POLICY "Users can insert participants into their stones"
ON public.stone_participants FOR INSERT
WITH CHECK (
  public.is_active_stone_participant(auth.uid(), stone_id)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (EXISTS (SELECT 1 FROM public.stones s WHERE s.id = stone_id AND s.created_by = auth.uid()))
);

-- Also fix stones SELECT policy that references stone_participants
DROP POLICY IF EXISTS "Users can view stones they participate in" ON public.stones;
CREATE POLICY "Users can view stones they participate in"
ON public.stones FOR SELECT
USING (
  participant_one_id = auth.uid()
  OR participant_two_id = auth.uid()
  OR public.is_stone_participant(auth.uid(), id)
);

-- Fix stones UPDATE policy
DROP POLICY IF EXISTS "Users can update stones they participate in" ON public.stones;
CREATE POLICY "Users can update stones they participate in"
ON public.stones FOR UPDATE
USING (
  participant_one_id = auth.uid()
  OR participant_two_id = auth.uid()
  OR public.is_active_stone_participant(auth.uid(), id)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Fix casts SELECT policy
DROP POLICY IF EXISTS "Users can view casts in their stones" ON public.casts;
CREATE POLICY "Users can view casts in their stones"
ON public.casts FOR SELECT
USING (
  (EXISTS (SELECT 1 FROM public.stones s WHERE s.id = stone_id AND (s.participant_one_id = auth.uid() OR s.participant_two_id = auth.uid())))
  OR public.is_stone_participant(auth.uid(), stone_id)
);

-- Fix casts INSERT policy
DROP POLICY IF EXISTS "Users can create casts in their stones" ON public.casts;
CREATE POLICY "Users can create casts in their stones"
ON public.casts FOR INSERT
WITH CHECK (
  (auth.uid() = sender_id AND (
    (EXISTS (SELECT 1 FROM public.stones s WHERE s.id = stone_id AND (s.participant_one_id = auth.uid() OR s.participant_two_id = auth.uid())))
    OR public.is_active_stone_participant(auth.uid(), stone_id)
  ))
  OR has_role(auth.uid(), 'admin'::app_role)
);
