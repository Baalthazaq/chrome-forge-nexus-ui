-- Drop foreign key constraints on equipment slots so we can store augmentation UUIDs too
ALTER TABLE public.character_sheets DROP CONSTRAINT IF EXISTS character_sheets_primary_weapon_purchase_id_fkey;
ALTER TABLE public.character_sheets DROP CONSTRAINT IF EXISTS character_sheets_secondary_weapon_purchase_id_fkey;
ALTER TABLE public.character_sheets DROP CONSTRAINT IF EXISTS character_sheets_armor_purchase_id_fkey;