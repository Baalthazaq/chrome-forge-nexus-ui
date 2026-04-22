-- 1. Add last_edited_by to tome_entries
ALTER TABLE public.tome_entries
ADD COLUMN IF NOT EXISTS last_edited_by uuid;

-- 2. Create tome_collaborators table
CREATE TABLE IF NOT EXISTS public.tome_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tome_entry_id uuid NOT NULL REFERENCES public.tome_entries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'editor' CHECK (role IN ('owner', 'editor')),
  added_at timestamptz NOT NULL DEFAULT now(),
  added_by uuid,
  UNIQUE (tome_entry_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tome_collaborators_entry ON public.tome_collaborators(tome_entry_id);
CREATE INDEX IF NOT EXISTS idx_tome_collaborators_user ON public.tome_collaborators(user_id);

ALTER TABLE public.tome_collaborators ENABLE ROW LEVEL SECURITY;

-- 3. Create tome_versions table (immutable history)
CREATE TABLE IF NOT EXISTS public.tome_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tome_entry_id uuid NOT NULL REFERENCES public.tome_entries(id) ON DELETE CASCADE,
  title text,
  content text,
  edited_by uuid,
  editor_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tome_versions_entry_created ON public.tome_versions(tome_entry_id, created_at DESC);

ALTER TABLE public.tome_versions ENABLE ROW LEVEL SECURITY;

-- 4. Security-definer helper functions
CREATE OR REPLACE FUNCTION public.has_tome_access(_user_id uuid, _entry_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tome_collaborators
    WHERE user_id = _user_id AND tome_entry_id = _entry_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_tome_owner(_user_id uuid, _entry_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tome_collaborators
    WHERE user_id = _user_id AND tome_entry_id = _entry_id AND role = 'owner'
  )
$$;

-- 5. Trigger: auto-create owner collaborator row on entry insert
CREATE OR REPLACE FUNCTION public.tome_create_owner_collaborator()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.tome_collaborators (tome_entry_id, user_id, role, added_by)
  VALUES (NEW.id, NEW.user_id, 'owner', NEW.user_id)
  ON CONFLICT (tome_entry_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tome_create_owner ON public.tome_entries;
CREATE TRIGGER trg_tome_create_owner
AFTER INSERT ON public.tome_entries
FOR EACH ROW
EXECUTE FUNCTION public.tome_create_owner_collaborator();

-- 6. Trigger: log version on insert/update + set last_edited_by
CREATE OR REPLACE FUNCTION public.tome_log_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _editor uuid;
  _name text;
BEGIN
  _editor := auth.uid();

  IF TG_OP = 'UPDATE' THEN
    IF (NEW.title IS NOT DISTINCT FROM OLD.title)
       AND (NEW.content IS NOT DISTINCT FROM OLD.content) THEN
      RETURN NEW;
    END IF;
    NEW.last_edited_by := COALESCE(_editor, NEW.last_edited_by);
  END IF;

  SELECT character_name INTO _name FROM public.profiles WHERE user_id = COALESCE(_editor, NEW.user_id) LIMIT 1;

  INSERT INTO public.tome_versions (tome_entry_id, title, content, edited_by, editor_name)
  VALUES (NEW.id, NEW.title, NEW.content, COALESCE(_editor, NEW.user_id), COALESCE(_name, 'Unknown'));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tome_log_version_ins ON public.tome_entries;
CREATE TRIGGER trg_tome_log_version_ins
AFTER INSERT ON public.tome_entries
FOR EACH ROW
EXECUTE FUNCTION public.tome_log_version();

DROP TRIGGER IF EXISTS trg_tome_log_version_upd ON public.tome_entries;
CREATE TRIGGER trg_tome_log_version_upd
BEFORE UPDATE ON public.tome_entries
FOR EACH ROW
EXECUTE FUNCTION public.tome_log_version();

-- 7. Backfill: owner collaborator row for every existing entry
INSERT INTO public.tome_collaborators (tome_entry_id, user_id, role, added_by)
SELECT id, user_id, 'owner', user_id FROM public.tome_entries
ON CONFLICT (tome_entry_id, user_id) DO NOTHING;

-- 8. Backfill: initial version snapshot for every existing entry
INSERT INTO public.tome_versions (tome_entry_id, title, content, edited_by, editor_name, created_at)
SELECT te.id, te.title, te.content, te.user_id, COALESCE(p.character_name, 'Unknown'), te.updated_at
FROM public.tome_entries te
LEFT JOIN public.profiles p ON p.user_id = te.user_id
WHERE NOT EXISTS (SELECT 1 FROM public.tome_versions tv WHERE tv.tome_entry_id = te.id);

-- 9. RLS rewrite for tome_entries
DROP POLICY IF EXISTS "Users can view their own tome entries" ON public.tome_entries;
DROP POLICY IF EXISTS "Users can create their own tome entries" ON public.tome_entries;
DROP POLICY IF EXISTS "Users can update their own tome entries" ON public.tome_entries;
DROP POLICY IF EXISTS "Users can delete their own tome entries" ON public.tome_entries;
DROP POLICY IF EXISTS "Admins can manage all tome entries" ON public.tome_entries;
DROP POLICY IF EXISTS "Collaborators can view tome entries" ON public.tome_entries;
DROP POLICY IF EXISTS "Collaborators can update tome entries" ON public.tome_entries;
DROP POLICY IF EXISTS "Owners can delete tome entries" ON public.tome_entries;
DROP POLICY IF EXISTS "Users can create tome entries" ON public.tome_entries;

CREATE POLICY "Collaborators can view tome entries" ON public.tome_entries
FOR SELECT USING (public.has_tome_access(auth.uid(), id) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create tome entries" ON public.tome_entries
FOR INSERT WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Collaborators can update tome entries" ON public.tome_entries
FOR UPDATE USING (public.has_tome_access(auth.uid(), id) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners can delete tome entries" ON public.tome_entries
FOR DELETE USING (public.is_tome_owner(auth.uid(), id) OR public.has_role(auth.uid(), 'admin'::app_role));

-- 10. RLS for tome_collaborators
CREATE POLICY "Members can view collaborators" ON public.tome_collaborators
FOR SELECT USING (
  public.has_tome_access(auth.uid(), tome_entry_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Owner or self can insert collaborator" ON public.tome_collaborators
FOR INSERT WITH CHECK (
  public.is_tome_owner(auth.uid(), tome_entry_id)
  OR auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Owner can remove others, self can leave" ON public.tome_collaborators
FOR DELETE USING (
  (public.is_tome_owner(auth.uid(), tome_entry_id) AND role <> 'owner')
  OR (auth.uid() = user_id AND role <> 'owner')
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- 11. RLS for tome_versions
CREATE POLICY "Collaborators can view versions" ON public.tome_versions
FOR SELECT USING (
  public.has_tome_access(auth.uid(), tome_entry_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Owners can prune versions" ON public.tome_versions
FOR DELETE USING (
  public.is_tome_owner(auth.uid(), tome_entry_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);
