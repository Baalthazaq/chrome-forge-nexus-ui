-- Update contacts RLS policies to support admin impersonation

-- Drop existing policies that need to be updated
DROP POLICY IF EXISTS "Users can create their own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can update their own contacts" ON public.contacts;

-- Recreate policies with admin impersonation support
CREATE POLICY "Users can create their own contacts or admins can create for impersonated users" 
ON public.contacts 
FOR INSERT 
WITH CHECK (
  (auth.uid() = user_id) 
  OR 
  (has_role(auth.uid(), 'admin'::app_role) AND EXISTS (
    SELECT 1 FROM admin_sessions 
    WHERE admin_user_id = auth.uid() 
    AND impersonated_user_id = user_id 
    AND expires_at > now()
  ))
);

CREATE POLICY "Users can update their own contacts or admins can update for impersonated users" 
ON public.contacts 
FOR UPDATE 
USING (
  (auth.uid() = user_id) 
  OR 
  (has_role(auth.uid(), 'admin'::app_role) AND EXISTS (
    SELECT 1 FROM admin_sessions 
    WHERE admin_user_id = auth.uid() 
    AND impersonated_user_id = user_id 
    AND expires_at > now()
  ))
);