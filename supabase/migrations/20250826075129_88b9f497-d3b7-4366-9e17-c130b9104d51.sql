-- Create shop_items table for Wyrmcart
CREATE TABLE public.shop_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL DEFAULT 0,
  category TEXT,
  specifications JSONB DEFAULT '{}',
  subscription_fee INTEGER DEFAULT 0,
  subscription_interval TEXT, -- 'daily', 'weekly', 'monthly', 'yearly'
  quantity_available INTEGER, -- NULL for unlimited
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quests table for Questseek
CREATE TABLE public.quests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  client TEXT,
  reward INTEGER NOT NULL DEFAULT 0,
  difficulty TEXT,
  time_limit TEXT,
  tags TEXT[],
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'cancelled'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quest_acceptances table to track player quest progress
CREATE TABLE public.quest_acceptances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quest_id UUID NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT DEFAULT 'accepted', -- 'accepted', 'submitted', 'completed', 'failed'
  submitted_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  final_payment INTEGER, -- actual payment after tips/penalties
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(quest_id, user_id)
);

-- Update recurring_payments table to support finite cycles
ALTER TABLE public.recurring_payments 
ADD COLUMN max_cycles INTEGER, -- NULL for indefinite
ADD COLUMN remaining_cycles INTEGER; -- decrements with each payment

-- Create purchases table to track item purchases
CREATE TABLE public.purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  shop_item_id UUID NOT NULL REFERENCES public.shop_items(id),
  quantity INTEGER DEFAULT 1,
  total_cost INTEGER NOT NULL,
  subscription_created BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quest_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shop_items
CREATE POLICY "Everyone can view active shop items" 
ON public.shop_items 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage shop items" 
ON public.shop_items 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for quests
CREATE POLICY "Everyone can view active quests" 
ON public.quests 
FOR SELECT 
USING (status = 'active');

CREATE POLICY "Admins can manage quests" 
ON public.quests 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for quest_acceptances
CREATE POLICY "Users can view their own quest acceptances" 
ON public.quest_acceptances 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own quest acceptances" 
ON public.quest_acceptances 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quest acceptances" 
ON public.quest_acceptances 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all quest acceptances" 
ON public.quest_acceptances 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update quest acceptances" 
ON public.quest_acceptances 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for purchases
CREATE POLICY "Users can view their own purchases" 
ON public.purchases 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can create purchases" 
ON public.purchases 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can view all purchases" 
ON public.purchases 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create triggers for updated_at
CREATE TRIGGER update_shop_items_updated_at
BEFORE UPDATE ON public.shop_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quests_updated_at
BEFORE UPDATE ON public.quests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quest_acceptances_updated_at
BEFORE UPDATE ON public.quest_acceptances
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();