-- Create contacts table for relationships between users
CREATE TABLE public.contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  contact_user_id uuid NOT NULL,
  personal_rating integer DEFAULT 3 CHECK (personal_rating >= 1 AND personal_rating <= 5),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, contact_user_id)
);

-- Create contact_tags table for user-specific tags on contacts
CREATE TABLE public.contact_tags (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  tag text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_tags ENABLE ROW LEVEL SECURITY;

-- RLS policies for contacts
CREATE POLICY "Users can view their own contacts" 
ON public.contacts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own contacts" 
ON public.contacts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contacts" 
ON public.contacts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contacts" 
ON public.contacts 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all contacts" 
ON public.contacts 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all contacts" 
ON public.contacts 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for contact_tags
CREATE POLICY "Users can view tags on their contacts" 
ON public.contact_tags 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.contacts 
  WHERE contacts.id = contact_tags.contact_id 
  AND contacts.user_id = auth.uid()
));

CREATE POLICY "Users can create tags on their contacts" 
ON public.contact_tags 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.contacts 
  WHERE contacts.id = contact_tags.contact_id 
  AND contacts.user_id = auth.uid()
));

CREATE POLICY "Users can update tags on their contacts" 
ON public.contact_tags 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.contacts 
  WHERE contacts.id = contact_tags.contact_id 
  AND contacts.user_id = auth.uid()
));

CREATE POLICY "Users can delete tags on their contacts" 
ON public.contact_tags 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.contacts 
  WHERE contacts.id = contact_tags.contact_id 
  AND contacts.user_id = auth.uid()
));

CREATE POLICY "Admins can view all contact tags" 
ON public.contact_tags 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_contacts_updated_at
BEFORE UPDATE ON public.contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_contacts_user_id ON public.contacts(user_id);
CREATE INDEX idx_contacts_contact_user_id ON public.contacts(contact_user_id);
CREATE INDEX idx_contact_tags_contact_id ON public.contact_tags(contact_id);
CREATE INDEX idx_contact_tags_tag ON public.contact_tags(tag);