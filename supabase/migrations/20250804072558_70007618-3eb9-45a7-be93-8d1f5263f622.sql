-- Add a policy to allow users to view all profiles for the messaging feature
-- This is needed so users can see who they can message
CREATE POLICY "All authenticated users can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;