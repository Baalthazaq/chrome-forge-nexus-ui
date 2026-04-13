CREATE TABLE public.bestiary_environments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  tier integer NOT NULL DEFAULT 1,
  environment_type text NOT NULL DEFAULT 'Standard',
  difficulty text,
  impulses text[] DEFAULT '{}',
  potential_adversaries text,
  features jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.bestiary_environments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage environments"
ON public.bestiary_environments
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view environments"
ON public.bestiary_environments
FOR SELECT
TO authenticated
USING (true);

CREATE TRIGGER update_bestiary_environments_updated_at
BEFORE UPDATE ON public.bestiary_environments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();