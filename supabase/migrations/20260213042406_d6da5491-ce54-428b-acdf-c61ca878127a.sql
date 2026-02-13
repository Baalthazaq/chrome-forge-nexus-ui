
-- Create news articles table for CVNews
CREATE TABLE public.news_articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  headline TEXT NOT NULL,
  summary TEXT,
  content TEXT,
  image_url TEXT,
  tags TEXT[] DEFAULT '{}',
  is_breaking BOOLEAN DEFAULT false,
  publish_date TIMESTAMP WITH TIME ZONE,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage news articles"
  ON public.news_articles FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Everyone can view published articles whose publish_date has passed
CREATE POLICY "Everyone can view published articles"
  ON public.news_articles FOR SELECT
  USING (is_published = true AND publish_date <= now());

-- Auto-update updated_at
CREATE TRIGGER update_news_articles_updated_at
  BEFORE UPDATE ON public.news_articles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
