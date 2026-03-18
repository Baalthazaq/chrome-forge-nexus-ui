
CREATE TABLE public.map_location_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL REFERENCES public.map_locations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL DEFAULT 3,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.map_location_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage location reviews" ON public.map_location_reviews FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Everyone can view location reviews" ON public.map_location_reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create location reviews" ON public.map_location_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own location reviews" ON public.map_location_reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own location reviews" ON public.map_location_reviews FOR DELETE TO authenticated USING (auth.uid() = user_id);
