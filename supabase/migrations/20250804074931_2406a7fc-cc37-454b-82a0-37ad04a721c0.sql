-- Update stones policies to allow admin impersonation
DROP POLICY IF EXISTS "Users can create stones they participate in" ON public.stones;
DROP POLICY IF EXISTS "Users can update stones they participate in" ON public.stones;

-- Allow users to create stones they participate in OR allow admins to create stones for any user
CREATE POLICY "Users can create stones they participate in or admins can create for any user" 
ON public.stones 
FOR INSERT 
WITH CHECK (
  -- Normal user creating their own stone
  (auth.uid() = participant_one_id OR auth.uid() = participant_two_id)
  OR
  -- Admin creating a stone for any user (for impersonation)
  has_role(auth.uid(), 'admin'::app_role)
);

-- Allow users to update stones they participate in OR allow admins to update any stone
CREATE POLICY "Users can update stones they participate in or admins can update any stone" 
ON public.stones 
FOR UPDATE 
USING (
  (auth.uid() = participant_one_id OR auth.uid() = participant_two_id)
  OR
  has_role(auth.uid(), 'admin'::app_role)
);