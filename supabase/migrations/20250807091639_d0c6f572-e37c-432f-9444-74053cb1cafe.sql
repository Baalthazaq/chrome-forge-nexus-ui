-- Add relationship field to contacts table
ALTER TABLE public.contacts 
ADD COLUMN relationship text;