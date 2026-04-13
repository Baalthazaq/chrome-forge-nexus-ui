

## Add Missing Tier 3 Creatures to Bestiary Seed

### Problem
The seed function only contains 6 of 23 Tier 3 creatures. 17 are missing because the original page fetch was truncated (dynamic rendering).

### Plan

1. **Extract full stat blocks** for all 17 missing Tier 3 creatures from the live site using browser tools (scrolling through each creature card to capture difficulty, thresholds, HP, stress, attack, weapon, damage, experience, and features).

2. **Update `supabase/functions/seed-bestiary/index.ts`** to append all 17 missing Tier 3 creatures to the `creatures` array with complete data (stats + JSONB features).

3. **Re-deploy the edge function** so clicking "Seed from Source" in the admin UI populates all 23 Tier 3 creatures.

### Technical detail
- Each creature entry follows the existing pattern in the seed file: `{ name, tier, creature_type, description, motives_tactics, difficulty, thresholds, hp, stress, attack_modifier, weapon_name, weapon_range, damage, experience, features, horde_value }`
- Features are stored as JSONB arrays of `{ name, type, description }` objects
- The seed function uses `upsert` with `onConflict: 'name'`, so re-seeding won't create duplicates
- Multiple browser extract calls will be needed to capture all creature data from the dynamically-rendered page

