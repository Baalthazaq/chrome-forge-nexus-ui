
-- Create suggestions table
CREATE TABLE public.suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'suggestion' CHECK (type IN ('issue', 'suggestion')),
  related_app TEXT,
  description TEXT NOT NULL,
  screenshot_url TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'planned', 'done', 'dismissed')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;

-- Users can create their own suggestions
CREATE POLICY "Users can create their own suggestions"
ON public.suggestions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own suggestions
CREATE POLICY "Users can view their own suggestions"
ON public.suggestions FOR SELECT
USING (auth.uid() = user_id);

-- Admins can manage all suggestions
CREATE POLICY "Admins can manage all suggestions"
ON public.suggestions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_suggestions_updated_at
BEFORE UPDATE ON public.suggestions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for suggestion screenshots
INSERT INTO storage.buckets (id, name, public) VALUES ('suggestion-screenshots', 'suggestion-screenshots', true);

-- Storage policies
CREATE POLICY "Users can upload suggestion screenshots"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'suggestion-screenshots' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view suggestion screenshots"
ON storage.objects FOR SELECT
USING (bucket_id = 'suggestion-screenshots');

CREATE POLICY "Admins can delete suggestion screenshots"
ON storage.objects FOR DELETE
USING (bucket_id = 'suggestion-screenshots' AND has_role(auth.uid(), 'admin'::app_role));
