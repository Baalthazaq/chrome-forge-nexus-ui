-- Create financial system tables for App of Holding

-- Create transactions table for all money movements
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  transaction_type TEXT NOT NULL, -- 'credit', 'debit', 'transfer', 'bill_payment', 'bill_received'
  amount INTEGER NOT NULL, -- amount in cents
  currency TEXT NOT NULL DEFAULT 'credits',
  from_user_id UUID, -- for transfers and bills
  to_user_id UUID, -- for transfers and bills
  reference_id UUID, -- reference to bill or recurring payment
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'completed', -- 'pending', 'completed', 'failed'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create bills table
CREATE TABLE public.bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL, -- who sent the bill (admin usually)
  to_user_id UUID NOT NULL, -- who owes the money
  amount INTEGER NOT NULL, -- amount in cents
  currency TEXT NOT NULL DEFAULT 'credits',
  description TEXT NOT NULL,
  due_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'unpaid', -- 'unpaid', 'paid', 'overdue', 'cancelled'
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurring_interval TEXT, -- 'daily', 'weekly', 'monthly', 'yearly'
  recurring_count INTEGER, -- how many times to repeat, null for infinite
  times_repeated INTEGER NOT NULL DEFAULT 0,
  next_due_date TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create recurring_payments table for admin-managed recurring payments
CREATE TABLE public.recurring_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID, -- null if from admin/system
  to_user_id UUID NOT NULL,
  amount INTEGER NOT NULL, -- amount in cents
  currency TEXT NOT NULL DEFAULT 'credits',
  description TEXT NOT NULL,
  interval_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'yearly'
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sent_at TIMESTAMPTZ,
  next_send_at TIMESTAMPTZ NOT NULL,
  total_times_sent INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add credits column to profiles if it doesn't exist already
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'credits') THEN
        ALTER TABLE public.profiles ADD COLUMN credits INTEGER DEFAULT 1000;
    END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_payments ENABLE ROW LEVEL SECURITY;

-- Create policies for transactions
CREATE POLICY "Users can view their own transactions" ON public.transactions
FOR SELECT USING (user_id = auth.uid() OR from_user_id = auth.uid() OR to_user_id = auth.uid());

CREATE POLICY "Admins can view all transactions" ON public.transactions
FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can create transactions" ON public.transactions
FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update transactions" ON public.transactions
FOR UPDATE USING (has_role(auth.uid(), 'admin'));

-- Create policies for bills
CREATE POLICY "Users can view bills sent to them" ON public.bills
FOR SELECT USING (to_user_id = auth.uid());

CREATE POLICY "Admins can view all bills" ON public.bills
FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create bills" ON public.bills
FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update bills" ON public.bills
FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can pay their bills" ON public.bills
FOR UPDATE USING (to_user_id = auth.uid() AND status = 'unpaid');

-- Create policies for recurring payments
CREATE POLICY "Users can view recurring payments sent to them" ON public.recurring_payments
FOR SELECT USING (to_user_id = auth.uid());

CREATE POLICY "Admins can manage all recurring payments" ON public.recurring_payments
FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Create triggers for updated_at columns
CREATE TRIGGER update_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bills_updated_at
BEFORE UPDATE ON public.bills
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recurring_payments_updated_at
BEFORE UPDATE ON public.recurring_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();