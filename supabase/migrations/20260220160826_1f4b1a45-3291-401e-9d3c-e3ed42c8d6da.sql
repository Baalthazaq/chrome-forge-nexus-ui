
-- Drop the existing INSERT policy
DROP POLICY "Users can create their own contacts and mutual contacts" ON public.contacts;

-- Create a simpler policy that allows admins to insert any contacts
CREATE POLICY "Users can create their own contacts and mutual contacts"
ON public.contacts
FOR INSERT
WITH CHECK (
  (auth.uid() = user_id)
  OR (auth.uid() = contact_user_id)
  OR has_role(auth.uid(), 'admin'::app_role)
);
