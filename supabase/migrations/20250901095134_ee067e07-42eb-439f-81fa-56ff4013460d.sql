-- Allow from_user_id to be null in bills table for System payments
ALTER TABLE public.bills ALTER COLUMN from_user_id DROP NOT NULL;