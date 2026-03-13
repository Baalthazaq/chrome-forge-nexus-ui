-- Remove "From: " prefix from all contact relationships
UPDATE contacts SET relationship = REPLACE(relationship, 'From: ', '') WHERE relationship LIKE 'From: %';

-- Fix stats from 10 to 4 for Swift Justice Jury members
UPDATE profiles SET finesse = 4, presence = 4 WHERE user_id = '9f3c6a39-418f-4f01-8409-7135205c14d8';
UPDATE profiles SET finesse = 4, strength = 4 WHERE user_id = '83d99dfd-06c6-45df-afbb-035991835114';
UPDATE profiles SET agility = 4, knowledge = 4 WHERE user_id = '44939194-142c-427d-8142-1c2663da81d3';
UPDATE profiles SET finesse = 4, presence = 4 WHERE user_id = '465981b9-d208-4da2-aa5f-c3e519ffd264';
UPDATE profiles SET agility = 4, knowledge = 4 WHERE user_id = '6d02c519-3c6c-4663-9f7c-f95e8ffe1d78';
UPDATE profiles SET knowledge = 4, presence = 4 WHERE user_id = '43703634-4ccd-4397-8cb1-ad94c1f2a6aa';