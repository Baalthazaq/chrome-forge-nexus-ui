
CREATE TABLE public.encounters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  notes TEXT,
  tier INTEGER NOT NULL DEFAULT 1,
  environments JSONB NOT NULL DEFAULT '[]'::jsonb,
  npcs JSONB NOT NULL DEFAULT '[]'::jsonb,
  creatures JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.encounters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage encounters"
ON public.encounters FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view encounters"
ON public.encounters FOR SELECT TO authenticated
USING (true);

CREATE TRIGGER update_encounters_updated_at
BEFORE UPDATE ON public.encounters
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
