
-- BeholdR Channels (one per user)
CREATE TABLE public.beholdr_channels (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  channel_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.beholdr_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all channels" ON public.beholdr_channels FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can create their own channel" ON public.beholdr_channels FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own channel" ON public.beholdr_channels FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own channel" ON public.beholdr_channels FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all channels" ON public.beholdr_channels FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_beholdr_channels_updated_at BEFORE UPDATE ON public.beholdr_channels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- BeholdR Videos
CREATE TABLE public.beholdr_videos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id uuid NOT NULL REFERENCES public.beholdr_channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL,
  youtube_url text NOT NULL,
  description text,
  tags text[] DEFAULT '{}'::text[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.beholdr_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all videos" ON public.beholdr_videos FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can create videos on their channel" ON public.beholdr_videos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own videos" ON public.beholdr_videos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own videos" ON public.beholdr_videos FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all videos" ON public.beholdr_videos FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_beholdr_videos_updated_at BEFORE UPDATE ON public.beholdr_videos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- BeholdR Ratings (thumbs up/down)
CREATE TABLE public.beholdr_ratings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id uuid NOT NULL REFERENCES public.beholdr_videos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  rating integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(video_id, user_id)
);

ALTER TABLE public.beholdr_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all ratings" ON public.beholdr_ratings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can create their own rating" ON public.beholdr_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own rating" ON public.beholdr_ratings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own rating" ON public.beholdr_ratings FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all ratings" ON public.beholdr_ratings FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- BeholdR Comments
CREATE TABLE public.beholdr_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id uuid NOT NULL REFERENCES public.beholdr_videos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.beholdr_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all comments" ON public.beholdr_comments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can create their own comments" ON public.beholdr_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own comments" ON public.beholdr_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comments" ON public.beholdr_comments FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all comments" ON public.beholdr_comments FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_beholdr_comments_updated_at BEFORE UPDATE ON public.beholdr_comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
