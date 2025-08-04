-- Create stones table for conversation threads
CREATE TABLE public.stones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_one_id UUID NOT NULL,
  participant_two_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_cast_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(participant_one_id, participant_two_id)
);

-- Create casts table for individual messages
CREATE TABLE public.casts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stone_id UUID NOT NULL REFERENCES public.stones(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.stones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.casts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stones
CREATE POLICY "Users can view stones they participate in" 
ON public.stones 
FOR SELECT 
USING (auth.uid() = participant_one_id OR auth.uid() = participant_two_id);

CREATE POLICY "Users can create stones they participate in" 
ON public.stones 
FOR INSERT 
WITH CHECK (auth.uid() = participant_one_id OR auth.uid() = participant_two_id);

CREATE POLICY "Users can update stones they participate in" 
ON public.stones 
FOR UPDATE 
USING (auth.uid() = participant_one_id OR auth.uid() = participant_two_id);

CREATE POLICY "Admins can view all stones" 
ON public.stones 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for casts
CREATE POLICY "Users can view casts in their stones" 
ON public.casts 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.stones 
    WHERE stones.id = casts.stone_id 
    AND (stones.participant_one_id = auth.uid() OR stones.participant_two_id = auth.uid())
  )
);

CREATE POLICY "Users can create casts in their stones" 
ON public.casts 
FOR INSERT 
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.stones 
    WHERE stones.id = casts.stone_id 
    AND (stones.participant_one_id = auth.uid() OR stones.participant_two_id = auth.uid())
  )
);

CREATE POLICY "Users can update casts they sent" 
ON public.casts 
FOR UPDATE 
USING (auth.uid() = sender_id);

CREATE POLICY "Admins can view all casts" 
ON public.casts 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create function to update stone's updated_at and last_cast_at
CREATE OR REPLACE FUNCTION public.update_stone_on_cast()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.stones 
  SET updated_at = now(), last_cast_at = now()
  WHERE id = NEW.stone_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic stone updates
CREATE TRIGGER update_stone_on_new_cast
AFTER INSERT ON public.casts
FOR EACH ROW
EXECUTE FUNCTION public.update_stone_on_cast();

-- Create indexes for better performance
CREATE INDEX idx_stones_participants ON public.stones(participant_one_id, participant_two_id);
CREATE INDEX idx_casts_stone_id ON public.casts(stone_id);
CREATE INDEX idx_casts_sender_id ON public.casts(sender_id);
CREATE INDEX idx_casts_created_at ON public.casts(created_at);