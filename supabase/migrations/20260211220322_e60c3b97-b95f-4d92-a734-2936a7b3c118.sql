
-- Add subscription status and accumulated amount to recurring_payments
ALTER TABLE public.recurring_payments 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS accumulated_amount integer NOT NULL DEFAULT 0;

-- Migrate existing data: map is_active to status
UPDATE public.recurring_payments SET status = 'cancelled' WHERE is_active = false;
