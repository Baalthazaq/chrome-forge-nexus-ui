-- Remove gold currency fields from profiles table
ALTER TABLE profiles 
DROP COLUMN IF EXISTS gold_handfuls,
DROP COLUMN IF EXISTS gold_bags,
DROP COLUMN IF EXISTS gold_chests;

-- Remove the check constraints that were added for gold
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS check_gold_handfuls,
DROP CONSTRAINT IF EXISTS check_gold_bags,
DROP CONSTRAINT IF EXISTS check_gold_chests;