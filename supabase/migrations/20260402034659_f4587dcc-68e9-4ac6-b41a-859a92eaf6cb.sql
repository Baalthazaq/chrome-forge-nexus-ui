-- Fix 1: Allow tome_entries to be visible when they are part of a pending share for the recipient
CREATE POLICY "Recipients can view shared tome entries"
ON public.tome_entries
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tome_shares
    WHERE tome_shares.tome_entry_id = tome_entries.id
      AND tome_shares.recipient_id = auth.uid()
      AND tome_shares.status = 'pending'
  )
);

-- Fix 2: Allow admins to manage all quick notes (for impersonation)
CREATE POLICY "Admins can manage all quick notes"
ON public.quick_notes
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));