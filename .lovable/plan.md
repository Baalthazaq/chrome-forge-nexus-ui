

## Racegen overhaul: data cleanup + new top-down lineage algorithm

### Part 1 — Data cleanup (Circle of Life graph + wheel)

Remove from active generation pool and set aside (excluded from rolls, but kept in DB for reference):
- All **Undead** family races
- All **Plant** family races (Awakened Plant, Blight, Treant, Dryad)
- All **Created** origin races (Constructs / Exotic Construct / Clank)
- All **Transformations** (no longer applied to generated subjects)

Reclassify:
- **Fungril** moves from `Plant`/current family into the **Fey** family.

Remove mechanic entirely:
- **Asexual reproduction** — every birthable race now reproduces sexually only.

Reflected in:
- `src/components/CircleOfLifeDiagram.tsx` (the wheel) — excluded families/origins no longer rendered as active; Fungril sits inside the Fey arc.
- `src/components/circle-of-life-layout.ts` — layout updated to drop excluded families and re-slot Fungril.
- `src/lib/evolutionGraph.ts` and the racegen logic — filtered node pool excludes the set-aside groups; reproduction-mode logic loses the asexual branch.

These categories are still queryable (e.g. for admin or future use), but Racegen will not roll them and the wheel/tree will not present them as active reproductive participants.

### Part 2 — New top-down lineage algorithm

Replace the current bottom-up recursive lineage with a **top-down generational walk** that starts from great-grandparents and walks down to the subject, accumulating mixed ancestry naturally.

#### Per-race "mate chance" weighting (precomputed)

For each birthable race we precompute a weighted mate distribution:

```text
mate_weight(target) = race.mate_chance(target) * target.base_weight
```

This produces, for any given race, a normalized probability table of "who they are most likely to mate with" — covering same variant, other variant, same family, cross-family. This table is computed once per generation pass.

#### Generation order (top-down, 3 generations: GGP → GP → P → Subject)

For each branch of the family tree (the subject has 2 parents, 4 grandparents, 8 great-grandparents):

1. **Pick a great-grandparent (GGP).** First GGP on the seed branch is anchored to the requested seed race (or weighted random). Each GGP is a concrete `Race (Variant)`.
2. **Pick that GGP's mate** by sampling from the GGP's precomputed mate-weight table.
3. **Roll their child (the grandparent, GP):** the child's race/variant is chosen by combining both parents — same variant if both match, else weighted between the two parents' lines, with a small chance to drift into a related branch consistent with the mate table.
4. **Pick the GP's mate** using the *higher of the GP's parents'* mate-chance values as the filter strength — i.e. the more "open" parent dominates how exotic the GP's mate can be.
5. Repeat the same child-roll + mate-roll process to produce the parent (P), then again to produce the **subject**.

Each leaf (the 8 GGPs) contributes equal DNA share. The subject's displayed identity is the result of the final child roll, but their full racial makeup is computed from the leaf composition.

#### DNA aggregation and display rules

- Aggregate leaves by `(raceId, variantId)`.
- Then group by `raceId` for display, combining variants of the same race into one line:
  - Format: `Dwarf (50% Gold, 25% Shield), Human (25% Gunner)`
- **Display threshold:** show a race in the header makeup only if it is the **subject's primary race** OR contributes **≥ 33%** of total DNA (was 25%).
- The lineage tree still lists every individual ancestor as `Race (Variant)` — no grouping there.

#### Variant inheritance quirks

`variant_inheritance` (`mother` / `father` / `random`) still applies at each child-roll step, deciding which parent's variant the child inherits when the two parents differ.

### Files to change

- `src/lib/racegenLogic.ts` — full rewrite of lineage generation around the top-down algorithm; remove asexual mode; add precomputed mate-weight tables; update DNA aggregation + 33% threshold + grouped-by-race display.
- `src/lib/evolutionGraph.ts` — filter helpers to exclude undead / plant / created / transformations from the active pool; drop asexual handling.
- `src/components/CircleOfLifeDiagram.tsx` and `src/components/circle-of-life-layout.ts` — remove set-aside families from the wheel and move Fungril into Fey.
- `src/pages/Racegen.tsx` — header makeup line uses the new grouped format and the 33% rule; lineage tree unchanged in structure.
- `src/pages/CircleOfLife.tsx` — verify it still renders cleanly with the reduced set.
- (Data) a one-time migration or admin helper to flip Fungril's family to Fey in `evolution_nodes`, and to mark undead/plant/created/transformations as inactive for generation (a boolean flag like `active_in_racegen`), so the source data is preserved.

### Validation

- The wheel shows only active families; Fungril sits inside Fey.
- No subject ever rolls as undead, plant, created, or with a transformation.
- No subject is ever asexual.
- Subjects show clean grouped makeup like `Dwarf (50% Gold, 25% Shield), Human (25% Gunner)`.
- Only the primary race or races with ≥ 33% DNA appear in the header line.
- Lineage tree shows 8 great-grandparents → 4 grandparents → 2 parents → subject, every row a full `Race (Variant)`.
- Mixed ancestry appears naturally and is driven by each race's mate-chance table, with the "more open" parent controlling the next mate filter.

