-- Allow users to create recurring payments for themselves (needed for Vault item subscriptions)
CREATE POLICY "Users can create their own recurring payments"
ON public.recurring_payments
FOR INSERT
WITH CHECK (to_user_id = auth.uid());

-- Allow users to delete their own recurring payments (needed when removing inventory items)
CREATE POLICY "Users can delete their own recurring payments"
ON public.recurring_payments
FOR DELETE
USING (to_user_id = auth.uid());