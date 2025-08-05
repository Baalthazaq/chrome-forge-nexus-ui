-- Add missing character fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN ancestry TEXT,
ADD COLUMN job TEXT,
ADD COLUMN company TEXT,
ADD COLUMN alias TEXT,
ADD COLUMN charisma_score INTEGER DEFAULT 10;

-- Add soft delete functionality to contacts
ALTER TABLE public.contacts 
ADD COLUMN is_active BOOLEAN DEFAULT true;