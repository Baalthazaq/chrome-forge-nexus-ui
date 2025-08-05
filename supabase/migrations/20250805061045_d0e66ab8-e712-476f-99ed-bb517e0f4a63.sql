-- Update the tome_shares INSERT policy to allow admins to create shares on behalf of impersonated users
DROP POLICY IF EXISTS "Users can create tome shares" ON tome_shares;

CREATE POLICY "Users can create tome shares or admins can create for impersonated users" 
ON tome_shares 
FOR INSERT 
WITH CHECK (
  (auth.uid() = sender_id) OR 
  (has_role(auth.uid(), 'admin'::app_role) AND EXISTS (
    SELECT 1 FROM admin_sessions 
    WHERE admin_user_id = auth.uid() 
    AND impersonated_user_id = sender_id 
    AND expires_at > now()
  ))
);