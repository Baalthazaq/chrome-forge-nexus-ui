-- Update the tome_shares UPDATE policy to allow admins to update shares on behalf of impersonated users
DROP POLICY IF EXISTS "Recipients can update tome share status" ON tome_shares;

CREATE POLICY "Recipients can update tome share status or admins can update for impersonated users" 
ON tome_shares 
FOR UPDATE 
USING (
  (auth.uid() = recipient_id) OR 
  (has_role(auth.uid(), 'admin'::app_role) AND EXISTS (
    SELECT 1 FROM admin_sessions 
    WHERE admin_user_id = auth.uid() 
    AND impersonated_user_id = recipient_id 
    AND expires_at > now()
  ))
);