
-- Allow users to view their own dice rolls
CREATE POLICY "Users can view their own rolls"
ON public.dice_roll_log
FOR SELECT
USING (auth.uid() = user_id);

-- Allow senders of recurring payments to view them
CREATE POLICY "Senders can view their recurring payments"
ON public.recurring_payments
FOR SELECT
USING (from_user_id = auth.uid());

-- Restrict writes on 'icons' and 'Map' buckets to admins (reads remain public via existing public bucket behavior)
CREATE POLICY "Admins can upload to icons bucket"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'icons' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update icons bucket"
ON storage.objects FOR UPDATE
USING (bucket_id = 'icons' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete from icons bucket"
ON storage.objects FOR DELETE
USING (bucket_id = 'icons' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can read icons bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'icons');

CREATE POLICY "Admins can upload to Map bucket"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'Map' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update Map bucket"
ON storage.objects FOR UPDATE
USING (bucket_id = 'Map' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete from Map bucket"
ON storage.objects FOR DELETE
USING (bucket_id = 'Map' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can read Map bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'Map');
