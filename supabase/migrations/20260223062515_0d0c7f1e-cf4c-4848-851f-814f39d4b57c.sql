-- Allow recipients to remove shared events from their own calendar
CREATE POLICY "Users can remove shares sent to them"
ON public.calendar_event_shares
FOR DELETE
USING (auth.uid() = shared_with);