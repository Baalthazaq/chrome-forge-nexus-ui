-- Fix tome_collaborators self-insert privilege escalation
DROP POLICY IF EXISTS "Owner or self can insert collaborator" ON public.tome_collaborators;

CREATE POLICY "Owner or admin can insert collaborator"
ON public.tome_collaborators
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_tome_owner(auth.uid(), tome_entry_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- Fix avatar overwrite issue: remove broad authenticated update policy
DROP POLICY IF EXISTS "Authenticated users can update avatars" ON storage.objects;
