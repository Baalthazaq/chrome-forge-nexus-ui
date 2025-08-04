-- Add columns to casts table for editing and deletion tracking
ALTER TABLE public.casts 
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE NULL,
ADD COLUMN edited_at TIMESTAMP WITH TIME ZONE NULL,
ADD COLUMN original_message TEXT NULL,
ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN is_edited BOOLEAN DEFAULT FALSE;

-- Create table for ToMe sharing
CREATE TABLE public.tome_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tome_entry_id UUID NOT NULL REFERENCES public.tome_entries(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on tome_shares
ALTER TABLE public.tome_shares ENABLE ROW LEVEL SECURITY;

-- RLS policies for tome_shares
CREATE POLICY "Users can view tome shares they sent or received" 
ON public.tome_shares 
FOR SELECT 
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can create tome shares" 
ON public.tome_shares 
FOR INSERT 
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Recipients can update tome share status" 
ON public.tome_shares 
FOR UPDATE 
USING (auth.uid() = recipient_id);

CREATE POLICY "Admins can view all tome shares" 
ON public.tome_shares 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for tome_shares updated_at
CREATE TRIGGER update_tome_shares_updated_at
BEFORE UPDATE ON public.tome_shares
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();