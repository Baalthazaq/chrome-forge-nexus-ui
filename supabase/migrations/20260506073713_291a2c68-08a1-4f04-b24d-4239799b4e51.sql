ALTER TABLE public.map_locations
  ADD COLUMN IF NOT EXISTS off_map boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS off_map_direction text,
  ADD COLUMN IF NOT EXISTS off_map_distance_miles numeric;