-- Add gold currency fields to profiles table
ALTER TABLE profiles 
ADD COLUMN gold_handfuls INTEGER DEFAULT 0,
ADD COLUMN gold_bags INTEGER DEFAULT 0,
ADD COLUMN gold_chests INTEGER DEFAULT 0;

-- Add check constraints to ensure valid gold amounts (0-9 for handfuls and bags)
ALTER TABLE profiles 
ADD CONSTRAINT check_gold_handfuls CHECK (gold_handfuls >= 0 AND gold_handfuls <= 9),
ADD CONSTRAINT check_gold_bags CHECK (gold_bags >= 0 AND gold_bags <= 9),
ADD CONSTRAINT check_gold_chests CHECK (gold_chests >= 0);