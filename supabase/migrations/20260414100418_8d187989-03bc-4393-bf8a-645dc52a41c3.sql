
-- Add image_url to bestiary_creatures
ALTER TABLE public.bestiary_creatures ADD COLUMN image_url text NULL;

-- Create bestiary_features table for reusable feature library
CREATE TABLE public.bestiary_features (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'Passive',
  description text NOT NULL DEFAULT '',
  tier integer NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.bestiary_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view features"
  ON public.bestiary_features FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage features"
  ON public.bestiary_features FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_bestiary_features_updated_at
  BEFORE UPDATE ON public.bestiary_features
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
