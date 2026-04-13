
CREATE TABLE public.bestiary_creatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tier INTEGER NOT NULL DEFAULT 1,
  creature_type TEXT NOT NULL DEFAULT 'Standard',
  description TEXT,
  motives_tactics TEXT,
  difficulty INTEGER DEFAULT 10,
  thresholds JSONB DEFAULT '{"major": 0, "severe": 0}'::jsonb,
  hp INTEGER DEFAULT 1,
  stress INTEGER DEFAULT 0,
  attack_modifier INTEGER DEFAULT 0,
  weapon_name TEXT,
  weapon_range TEXT,
  damage TEXT,
  experience TEXT,
  features JSONB DEFAULT '[]'::jsonb,
  horde_value INTEGER,
  is_custom BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bestiary_creatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view creatures"
ON public.bestiary_creatures
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage creatures"
ON public.bestiary_creatures
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_bestiary_creatures_updated_at
BEFORE UPDATE ON public.bestiary_creatures
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
