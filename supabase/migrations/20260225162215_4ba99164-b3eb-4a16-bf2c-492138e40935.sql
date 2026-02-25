
-- Allow admins to delete stones
CREATE POLICY "Admins can delete stones"
ON public.stones
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete casts
CREATE POLICY "Admins can delete casts"
ON public.casts
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete stone_participants
CREATE POLICY "Admins can delete stone participants"
ON public.stone_participants
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
