-- Add missing columns to quick_notes table for enhanced functionality

-- Add tags column for tagging functionality
ALTER TABLE public.quick_notes 
ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Add layout_column and layout_position for manual note positioning in layout
ALTER TABLE public.quick_notes 
ADD COLUMN IF NOT EXISTS layout_column INTEGER DEFAULT 0;

ALTER TABLE public.quick_notes 
ADD COLUMN IF NOT EXISTS layout_position INTEGER DEFAULT 0;

-- Create index for better performance on tags searches
CREATE INDEX IF NOT EXISTS idx_quick_notes_tags ON public.quick_notes USING GIN(tags);

-- Create index for position ordering
CREATE INDEX IF NOT EXISTS idx_quick_notes_layout_position ON public.quick_notes (layout_column, layout_position);