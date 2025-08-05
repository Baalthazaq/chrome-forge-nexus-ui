-- Check and add missing columns to profiles table (skip if they already exist)
DO $$ 
BEGIN
    -- Add job column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'job') THEN
        ALTER TABLE public.profiles ADD COLUMN job TEXT;
    END IF;
    
    -- Add company column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'company') THEN
        ALTER TABLE public.profiles ADD COLUMN company TEXT;
    END IF;
    
    -- Add alias column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'alias') THEN
        ALTER TABLE public.profiles ADD COLUMN alias TEXT;
    END IF;
    
    -- Add charisma_score column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'charisma_score') THEN
        ALTER TABLE public.profiles ADD COLUMN charisma_score INTEGER DEFAULT 10;
    END IF;
    
    -- Add is_active column to contacts if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'is_active') THEN
        ALTER TABLE public.contacts ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;