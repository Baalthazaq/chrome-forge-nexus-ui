DO $$
DECLARE
  parent_id uuid := 'b8e39df1-0b5e-45b9-aad6-3f934a151924';
  parent_color text := 'hsl(110 60% 45%)';
  parent_x int := 520;
  parent_y int := 13896;
  base_x int := 760;
  start_y int;
  step int := 78;
  labels text[] := ARRAY['Tree','Shrub','Vine','Succulent','Flower','Vegetable','Grass'];
  lbl text;
  i int := 0;
  new_id uuid;
BEGIN
  start_y := parent_y - ((array_length(labels,1) - 1) * step) / 2;
  FOREACH lbl IN ARRAY labels LOOP
    INSERT INTO public.evolution_nodes (label, type, x, y, color)
    VALUES (lbl, 'variant', base_x, start_y + i * step, parent_color)
    RETURNING id INTO new_id;
    INSERT INTO public.evolution_edges (parent_id, child_id) VALUES (parent_id, new_id);
    i := i + 1;
  END LOOP;
END $$;