ALTER TABLE public.bestiary_environments RENAME TO environments;

-- RLS policies are automatically carried over with the rename.
-- Rename the trigger to match the new table name.
ALTER TRIGGER update_bestiary_environments_updated_at ON public.environments RENAME TO update_environments_updated_at;