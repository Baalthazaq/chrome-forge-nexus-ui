-- Update RLS policy to allow mutual contact creation
-- Drop the existing INSERT policy and create a new one that allows mutual contacts

DROP POLICY IF EXISTS "Users can create their own contacts or admins can create for im" ON public.contacts;

CREATE POLICY "Users can create their own contacts and mutual contacts" 
ON public.contacts 
FOR INSERT 
WITH CHECK (
  -- User can create their own contacts
  (auth.uid() = user_id) 
  OR 
  -- User can create mutual contacts (when someone adds them as a contact)
  (auth.uid() = contact_user_id)
  OR 
  -- Admins can create for impersonated users
  (has_role(auth.uid(), 'admin'::app_role) AND (
    EXISTS ( 
      SELECT 1
      FROM admin_sessions
      WHERE (admin_sessions.admin_user_id = auth.uid()) 
        AND (admin_sessions.impersonated_user_id = contacts.user_id) 
        AND (admin_sessions.expires_at > now())
    )
  ))
);