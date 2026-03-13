
CREATE TABLE public.map_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  location_id uuid REFERENCES public.map_locations(id) ON DELETE CASCADE,
  area_id uuid REFERENCES public.map_areas(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT map_notes_target_check CHECK (
    (location_id IS NOT NULL AND area_id IS NULL) OR
    (location_id IS NULL AND area_id IS NOT NULL)
  ),
  UNIQUE (user_id, location_id),
  UNIQUE (user_id, area_id)
);

ALTER TABLE public.map_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notes" ON public.map_notes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own notes" ON public.map_notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notes" ON public.map_notes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notes" ON public.map_notes FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all notes" ON public.map_notes FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_map_notes_updated_at BEFORE UPDATE ON public.map_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
