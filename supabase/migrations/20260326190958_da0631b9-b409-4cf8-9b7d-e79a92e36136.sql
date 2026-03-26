-- Add posted_by_user_id to quests for player-posted jobs
ALTER TABLE public.quests ADD COLUMN IF NOT EXISTS posted_by_user_id uuid;

-- Allow authenticated users to view quests they posted (even if not active)
CREATE POLICY "Users can view their posted quests"
ON public.quests FOR SELECT TO authenticated
USING (posted_by_user_id = auth.uid());

-- Create wishlist table
CREATE TABLE public.wishlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  shop_item_id uuid REFERENCES public.shop_items(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  category text,
  price integer,
  specifications jsonb,
  status text NOT NULL DEFAULT 'wished',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own wishlist"
ON public.wishlist_items FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all wishlists"
ON public.wishlist_items FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));