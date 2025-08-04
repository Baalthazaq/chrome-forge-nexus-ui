-- Fix search path for the function
CREATE OR REPLACE FUNCTION public.update_stone_on_cast()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.stones 
  SET updated_at = now(), last_cast_at = now()
  WHERE id = NEW.stone_id;
  RETURN NEW;
END;
$$;