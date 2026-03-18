-- Add in-game calendar date columns to news_articles
ALTER TABLE public.news_articles
  ADD COLUMN publish_day integer,
  ADD COLUMN publish_month integer,
  ADD COLUMN publish_year integer,
  ADD COLUMN user_id uuid;

-- Allow authenticated users to insert their own articles
CREATE POLICY "Authenticated users can create articles"
  ON public.news_articles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own articles
CREATE POLICY "Users can update their own articles"
  ON public.news_articles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow users to delete their own articles
CREATE POLICY "Users can delete their own articles"
  ON public.news_articles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);