CREATE TABLE public.placeholder_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_lower text GENERATED ALWAYS AS (lower(name)) STORED UNIQUE,
  balance integer NOT NULL DEFAULT 0,
  notes text,
  resolved_to_user_id uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.placeholder_recipients TO authenticated;
GRANT ALL ON public.placeholder_recipients TO service_role;

ALTER TABLE public.placeholder_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view placeholder recipients"
ON public.placeholder_recipients FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can create placeholder recipients"
ON public.placeholder_recipients FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admins can manage placeholder recipients"
ON public.placeholder_recipients FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_placeholder_recipients_updated_at
BEFORE UPDATE ON public.placeholder_recipients
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS placeholder_recipient_id uuid;