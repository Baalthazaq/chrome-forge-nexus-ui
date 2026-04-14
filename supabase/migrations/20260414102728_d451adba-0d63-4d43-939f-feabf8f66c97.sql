
CREATE TABLE public.environment_features (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'Passive',
  description text NOT NULL DEFAULT '',
  tier integer DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.environment_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage environment features"
  ON public.environment_features FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view environment features"
  ON public.environment_features FOR SELECT TO authenticated
  USING (true);

CREATE TRIGGER update_environment_features_updated_at
  BEFORE UPDATE ON public.environment_features
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
