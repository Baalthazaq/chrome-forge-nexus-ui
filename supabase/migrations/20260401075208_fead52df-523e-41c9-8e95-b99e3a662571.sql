CREATE TABLE public.succubus_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  character_name text NOT NULL,
  ancestry text,
  job text,
  community text,
  age integer,
  bio text,
  avatar_url text,
  tags text[] DEFAULT '{}'::text[],
  search_purpose text DEFAULT 'General',
  compatibility integer DEFAULT 50,
  promoted_to_npc_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.succubus_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all succubus profiles"
  ON public.succubus_profiles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own saved profiles"
  ON public.succubus_profiles FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can insert their own saved profiles"
  ON public.succubus_profiles FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete their own saved profiles"
  ON public.succubus_profiles FOR DELETE
  USING (auth.uid() = created_by);

CREATE TRIGGER update_succubus_profiles_updated_at
  BEFORE UPDATE ON public.succubus_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();