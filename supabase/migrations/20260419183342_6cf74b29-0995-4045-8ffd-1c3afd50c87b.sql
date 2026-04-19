-- Add weight and mate-up probability columns to evolution_nodes
ALTER TABLE public.evolution_nodes
  ADD COLUMN IF NOT EXISTS weight integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS mate_up_probability numeric NOT NULL DEFAULT 0.33;

-- Seed weights from the user-provided table (case-insensitive label match)
WITH seed(label, weight) AS (VALUES
  ('Aberration',3),('Beholder',1),('Gith',1),('Mindflayer',1),('Slaad',1),('Spider',2),
  ('Beastfolk',21),('Reptilian',3),('Kobold',5),('Lizardfolk',3),('Yuan-Ti',2),
  ('Aarakocra',15),('Kenku',6),('Centaur',3),('Galapa',2),('Katari',6),('Loxodon',2),
  ('Merfolk',4),('Minotaur',2),('Ribbet',3),('Risen Beast',12),('Shifter',3),('Simiah',3),
  ('Construct',4),('Modron',4),('Clank',4),
  ('Draconic',28),('Dragon',12),('Drakona',11),
  ('Elemental',16),('Earthkin',3),('Emberkin',3),('Mephling',4),('Skykin',3),('Tidekin',3),
  ('Fey',6),('Elven',27),('Elf',26),('Drow',1),('Doppleganger',1),('Faerie',1),('Faun',1),
  ('Firbolg',1),('Gnome',11),('Svirfneblin',1),
  ('Giant',13),('Goliath',4),('Ogre',1),('Troll',2),
  ('Goblinoid',16),('Bugbear',1),('Goblin',8),('Hob',1),('Orc',7),
  ('Humanoid',45),('Dwarf',17),('Duergar',1),('Halfling',10),('Human',15),('Illumian',2),
  ('Planar',7),('Aetheris',2),('Fiend',1),('Infernis',2),
  ('Plant',3),('Awakened Plant',1),('Fungril',2),
  ('Undead',1)
)
UPDATE public.evolution_nodes en
SET weight = s.weight,
    mate_up_probability = 0.33
FROM seed s
WHERE lower(en.label) = lower(s.label);

-- Special-case the two "Giant" rows (Family + Race both labeled "Giant"): set Race weight=4
-- The above set both to 13. Race "Giant" should be 4.
UPDATE public.evolution_nodes
SET weight = 4
WHERE lower(label) = 'giant' AND type = 'race';

-- Same for "Undead" (Family=1, Race=1) — already both 1, no fix needed.