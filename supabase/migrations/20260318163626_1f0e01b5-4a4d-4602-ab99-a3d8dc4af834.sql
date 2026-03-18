-- Drop old publish date RLS policy that uses real-world dates
DROP POLICY IF EXISTS "Everyone can view published articles" ON public.news_articles;

-- New policy: published articles visible to all authenticated users
-- We'll filter by game date on the client side since we need to compare against game_calendar
CREATE POLICY "Authenticated can view published articles"
  ON public.news_articles
  FOR SELECT
  TO authenticated
  USING (is_published = true);