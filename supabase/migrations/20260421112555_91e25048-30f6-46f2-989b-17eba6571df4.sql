-- Move Fungril from Plant family to Fey family
UPDATE public.evolution_edges
SET parent_id = 'cf178378-9b14-4ba8-b4e8-4fa026c6421b'  -- Fey
WHERE child_id = '70fc65f7-84c0-476d-afc1-1b2bb26a71dd'  -- Fungril
  AND parent_id = '29db1dee-dda4-44c4-9637-f1652b1613ed';  -- Plant