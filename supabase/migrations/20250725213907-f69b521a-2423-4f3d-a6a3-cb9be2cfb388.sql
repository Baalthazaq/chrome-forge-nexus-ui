-- Create table for tome entries
CREATE TABLE public.tome_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  tags TEXT[],
  is_pinned BOOLEAN DEFAULT false,
  pages INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for quick notes
CREATE TABLE public.quick_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  color TEXT DEFAULT 'from-blue-500 to-cyan-500',
  is_pinned BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.tome_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quick_notes ENABLE ROW LEVEL SECURITY;

-- Create policies for tome_entries
CREATE POLICY "Users can view their own tome entries" 
ON public.tome_entries 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tome entries" 
ON public.tome_entries 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tome entries" 
ON public.tome_entries 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tome entries" 
ON public.tome_entries 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create policies for quick_notes
CREATE POLICY "Users can view their own quick notes" 
ON public.quick_notes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own quick notes" 
ON public.quick_notes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quick notes" 
ON public.quick_notes 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quick notes" 
ON public.quick_notes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_tome_entries_updated_at
BEFORE UPDATE ON public.tome_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quick_notes_updated_at
BEFORE UPDATE ON public.quick_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_tome_entries_user_id ON public.tome_entries(user_id);
CREATE INDEX idx_tome_entries_created_at ON public.tome_entries(created_at DESC);
CREATE INDEX idx_quick_notes_user_id ON public.quick_notes(user_id);
CREATE INDEX idx_quick_notes_sort_order ON public.quick_notes(user_id, sort_order);