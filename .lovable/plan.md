## Goal

Add new Daggerheart adversaries (added by Demiplane after our last seed) into `bestiary_creatures`, skipping the 124 already-seeded ones.

## Blocker: source data

Demiplane's adversary pages are gated behind login and rendered client-side, so I cannot scrape them from the sandbox (the fetch returns a blank shell). I need the new creature data from you in one of these forms:

1. **Paste names + stat blocks** in chat (preferred — I'll convert them).
2. **Drop a JSON/markdown export** if Demiplane offers one.
3. **Just paste the new creature names** and I'll fill stats from the public Daggerheart SRD where available.

## Already in DB (will be skipped)

124 creatures including all base SRD adversaries (Acid Burrower → Zombie Pack), Volcanic Dragon trio, Fallen Warlords, Vault Guardians, Jagged Knife gang, Outer Realms set, oozes, demons, etc. Anything you paste matching these names by case-insensitive comparison will be ignored.

## Implementation

1. **Update `supabase/functions/seed-bestiary/index.ts`**
   - Remove the blanket `delete().eq('is_custom', false)` at the top (destructive on re-run).
   - Switch to a name-based skip: fetch existing names, then `insert` only creatures whose lowercased name isn't present.
   - Append the new creature objects to the existing array (matching the current shape: `name, tier, creature_type, description, motives_tactics, difficulty, thresholds, hp, stress, attack_modifier, weapon_name, weapon_range, damage, experience, features[], horde_value, is_custom: false`).
   - Return `{ inserted, skipped, total }` for visibility.

2. **Run the function** from `BestiaryAdmin` (existing "Seed from Source" button already invokes `seed-bestiary`).
   - I'll add a small toast that reports `inserted` vs `skipped` counts.

3. **Verify** via the bestiary admin list — new creatures should appear, existing ones untouched (including any custom ones).

## Next step

Reply with the new creature data (or a Demiplane export). Once I have it I'll update the edge function in one shot and you can hit Seed.
