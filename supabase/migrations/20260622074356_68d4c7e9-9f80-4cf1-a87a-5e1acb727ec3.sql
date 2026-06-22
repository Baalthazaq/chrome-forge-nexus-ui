CREATE TABLE public.character_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  name text NOT NULL,
  avatar_url text,
  bio text,
  is_public boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT false,
  sheet_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.character_aliases TO authenticated;
GRANT ALL ON public.character_aliases TO service_role;

ALTER TABLE public.character_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage own aliases" ON public.character_aliases
  FOR ALL USING (auth.uid() = owner_user_id) WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Authenticated can read public aliases" ON public.character_aliases
  FOR SELECT TO authenticated USING (is_public = true);

CREATE POLICY "Admins manage all aliases" ON public.character_aliases
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE UNIQUE INDEX character_aliases_one_active_per_owner
  ON public.character_aliases(owner_user_id) WHERE is_active = true;

CREATE TRIGGER character_aliases_updated_at
  BEFORE UPDATE ON public.character_aliases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Optional alias_id tagging on identity-bearing tables
ALTER TABLE public.beholdr_comments ADD COLUMN alias_id uuid REFERENCES public.character_aliases(id) ON DELETE SET NULL;
ALTER TABLE public.beholdr_videos ADD COLUMN alias_id uuid REFERENCES public.character_aliases(id) ON DELETE SET NULL;
ALTER TABLE public.casts ADD COLUMN alias_id uuid REFERENCES public.character_aliases(id) ON DELETE SET NULL;
ALTER TABLE public.stone_participants ADD COLUMN alias_id uuid REFERENCES public.character_aliases(id) ON DELETE SET NULL;
ALTER TABLE public.news_articles ADD COLUMN alias_id uuid REFERENCES public.character_aliases(id) ON DELETE SET NULL;