
-- Game cards catalog table (classes, subclasses, community, ancestry, domain cards)
CREATE TABLE public.game_cards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_type text NOT NULL, -- 'class', 'subclass', 'community', 'ancestry', 'domain'
  name text NOT NULL,
  source text, -- parent class for subclass, domain name for domain cards, ancestry/community source name
  content text, -- main description/feature text
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.game_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view game cards" ON public.game_cards FOR SELECT USING (true);
CREATE POLICY "Admins can manage game cards" ON public.game_cards FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_game_cards_updated_at BEFORE UPDATE ON public.game_cards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Character sheets table (per-user character state)
CREATE TABLE public.character_sheets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  class text,
  subclass text,
  community text,
  ancestry text,
  level integer NOT NULL DEFAULT 1 CHECK (level >= 1 AND level <= 10),
  evasion_modifier integer NOT NULL DEFAULT 0,
  hp_modifier integer NOT NULL DEFAULT 0,
  armor_current integer NOT NULL DEFAULT 0,
  hp_current integer NOT NULL DEFAULT 0,
  stress_current integer NOT NULL DEFAULT 0,
  hope_current integer NOT NULL DEFAULT 0,
  stress_max integer NOT NULL DEFAULT 6,
  hope_max integer NOT NULL DEFAULT 6,
  major_threshold_modifier integer NOT NULL DEFAULT 0,
  severe_threshold_modifier integer NOT NULL DEFAULT 0,
  experiences jsonb DEFAULT '[]'::jsonb,
  primary_weapon_purchase_id uuid REFERENCES public.purchases(id) ON DELETE SET NULL,
  secondary_weapon_purchase_id uuid REFERENCES public.purchases(id) ON DELETE SET NULL,
  armor_purchase_id uuid REFERENCES public.purchases(id) ON DELETE SET NULL,
  selected_card_ids jsonb DEFAULT '[]'::jsonb,
  physical_description jsonb DEFAULT '{"clothes":"","eyes":"","body":"","skin":""}'::jsonb,
  personality text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.character_sheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sheet" ON public.character_sheets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own sheet" ON public.character_sheets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own sheet" ON public.character_sheets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all sheets" ON public.character_sheets FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_character_sheets_updated_at BEFORE UPDATE ON public.character_sheets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
