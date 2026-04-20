# Racegen Logic Audit & Rebuild

## Problems found

1. **"The Source" leaks into tags.** `resolveEffectiveTags` auto-adds every ancestor's label as a tag. Source-typed nodes shouldn't auto-tag.
2. **Mate-up probability is far too high (33% per generation).** With recursion depth 6, almost every subject has 2–3 mate-up events in their tree. A mate-up at the immediate-parent level contributes the full 50% DNA share, producing the "50% Fungril" outcome you saw.
3. **Mate-up can pick incompatible reproduction modes as a partner.** Illumian (sexual) "mated up" to Fungril (asexual). A sexual subject cannot have an asexual mate — Fungril doesn't reproduce sexually with anyone, period. The cousin/wild pools currently allow any "birthable" race, including asexual ones.
4. **Asexual recursion is pointless and corrupts DNA aggregation.** When the picked partner is asexual (Fungril), the recursion just stamps Fungril all the way down with full 50% share. That's why the example shows literally "50% Fungril."
5. **Wild tier is too broad.** Even at low rates, the "climb past Source" branch lets Construct/Undead and other unrelated lines into a normal birth. That's not what cross-pollination through The Source is supposed to mean.
6. **Identity vs lineage confusion in the example.** "Male Noble Illumian" with 50% Fungril DNA is internally consistent given the bugs above, but the resulting subject reads as nonsensical because the rolled identity (Illumian/Noble) is decoupled from the mostly-Fungril ancestry the engine generated.

## Fixes

### A. Stop auto-tagging The Source (`src/lib/evolutionGraph.ts`)

- In `resolveEffectiveTags`, skip the auto-label for nodes of `type === 'source'`. Their explicit `tags` (if ever set) still propagate; just the literal label "The Source" no longer becomes a tag.

### B. Restrict mate-up partners to compatible reproduction (`src/lib/racegenLogic.ts`)

- In `rollBirthableLineage`, when picking parent 2 for a **sexual** subject, the candidate pool is filtered to `reproduction_mode === 'sexual'` only. Asexual races (Fungril, etc.) are removed from same-family, source-cousin, and wild pools.
- Asexual subjects keep their current single-parent recursion (one parent, same race).

### C. Recalibrate mate-up probability defaults

- Lower seeded `mate_up_probability` from `0.33` → `0.2` for all family/race nodes via a data migration.
- Tier split inside `rollBirthableLineage` is unchanged in shape:
  - `same family`: `1 - p`  (~95%)
  - `source-cousin`: `p * (1 - p)`  (~4.75%)
  - `wild`: `p * p`  (~0.25%)

### D. Constrain "wild" to The Source's descendants

- Replace the "any birthable race anywhere" wild pool with "any birthable race whose Source ancestor matches the subject's Source ancestor." Effectively: cross-family mating never reaches Construct/Undead (which aren't linked to The Source). Wild becomes "very distant cousin under The Source" rather than "anything in the universe."
- Subjects whose own race has no Source ancestor (e.g. Construct, Undead) get no wild tier — same family only.

### E. Limit lineage depth and decay mate-up by generation

- Reduce `MAX_DEPTH` from `6` → `3`. Beyond great-grandparents, lineage stops branching (parents become same-race terminal nodes). Keeps the lineage tree readable and prevents deep recursion from inflating exotic-DNA percentages.
- Multiply effective mate-up probability by `0.5` per generation of recursion. So if base `p = 0.05`: parent-level mate-up = 5%, grandparent-level = 2.5%, great-grandparent = 1.25%. Concentrates ancestry near the subject and makes deep-tree mate-ups rare.

### F. Variant identity sanity

- When a chosen variant has reproduction mode `sexual` (e.g. Noble Illumian), it stays as a variant label on top of the parent race — this is already correct. No change needed here, but the example was confusing because the lineage looked nothing like the identity. With fixes A–E, the lineage will overwhelmingly be Illumian/Human with small mate-up sprinkles, matching expectations.

## Files touched

- `src/lib/evolutionGraph.ts` — skip auto-tagging for `source` type.
- `src/lib/racegenLogic.ts` — sexual-only partner filter for sexual subjects, source-bounded wild pool, depth reduction, per-generation probability decay.
- **Data migration** — set `mate_up_probability = 0.05` on all `family` and `race` nodes (variants left alone).

## Out of scope

- Renaming or restructuring nodes (Plant/Fungril hierarchy).
- Changing identity/variant naming in the result card.
- Visual tweaks to the lineage tree component.

## Expected outcome (Noble Illumian re-roll, after fixes)

```
Identity: Male Noble Illumian
DNA:      ~94% Human, ~3% Elf, ~2% Dwarf, ~1% Drakona
Lineage:  Illumian × Human (or sibling humanoid race), with a
          rare humanoid cousin appearing at grandparent depth.
```

Fungril can no longer appear as a parent of a sexual subject. "The Source" no longer appears as a tag chip anywhere.