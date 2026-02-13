
-- Fix 1: Tighten transactions INSERT policy
DROP POLICY "System can create transactions" ON public.transactions;
CREATE POLICY "Only admins can create transactions"
ON public.transactions
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Fix 2: Tighten purchases INSERT policy  
DROP POLICY "System can create purchases" ON public.purchases;
CREATE POLICY "Only admins can create purchases"
ON public.purchases
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Fix 3: Tighten user_activity INSERT policy
DROP POLICY "System can create activity records" ON public.user_activity;
CREATE POLICY "Only admins can create activity records"
ON public.user_activity
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
