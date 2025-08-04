-- Update casts policies to allow admin impersonation
DROP POLICY IF EXISTS "Users can create casts in their stones" ON public.casts;
DROP POLICY IF EXISTS "Users can update casts they sent" ON public.casts;

-- Allow users to create casts in their stones OR allow admins to create casts for any user
CREATE POLICY "Users can create casts in their stones or admins can create for any user" 
ON public.casts 
FOR INSERT 
WITH CHECK (
  -- Normal user creating their own cast
  (auth.uid() = sender_id AND EXISTS (
    SELECT 1 FROM stones 
    WHERE stones.id = casts.stone_id 
    AND (stones.participant_one_id = auth.uid() OR stones.participant_two_id = auth.uid())
  ))
  OR
  -- Admin creating a cast for any user (for impersonation)
  has_role(auth.uid(), 'admin'::app_role)
);

-- Allow users to update their own casts OR allow admins to update any cast
CREATE POLICY "Users can update their own casts or admins can update any cast" 
ON public.casts 
FOR UPDATE 
USING (
  auth.uid() = sender_id OR has_role(auth.uid(), 'admin'::app_role)
);