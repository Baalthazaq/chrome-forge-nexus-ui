-- Update RLS policies for tome_entries to allow admins to manage entries for any user

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create their own tome entries" ON public.tome_entries;
DROP POLICY IF EXISTS "Users can view their own tome entries" ON public.tome_entries;
DROP POLICY IF EXISTS "Users can update their own tome entries" ON public.tome_entries;
DROP POLICY IF EXISTS "Users can delete their own tome entries" ON public.tome_entries;

-- Create new policies that allow both user access and admin access
CREATE POLICY "Users can create their own tome entries or admins can create for anyone" 
ON public.tome_entries 
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own tome entries or admins can view all" 
ON public.tome_entries 
FOR SELECT 
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update their own tome entries or admins can update any" 
ON public.tome_entries 
FOR UPDATE 
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete their own tome entries or admins can delete any" 
ON public.tome_entries 
FOR DELETE 
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));