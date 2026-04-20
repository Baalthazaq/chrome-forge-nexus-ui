

# Link The Source as a Cross-Pollination Root

## Goal
Connect The Source to most families so that, very rarely, a "mate-up" roll can cross between top-level families (e.g. Mortal × Draconic, Fey × Aetheris). Tag inheritance flows through The Source naturally. Transformation logic is unaffected.

## What changes

### 1. Database edges (no schema change)
Add `evolution_edges` rows from **The Source** as parent to each of the following family/race-root nodes (whatever exists at the top of each grouping today):
- Mortal, Draconic, Fey, Plant, Elemental, Aetheris, Infernis, Mephling, Aberration, Modron
- **Excluded**: Construct, Undead

If any of those don't currently exist as standalone family nodes, the edge attaches to the next-highest node in that grouping.

### 2. Rolling logic — tiered mate-up (`src/lib/racegenLogic.ts`)

Currently, when a sexual race rolls a second parent, `mate_up_probability` (default 0.33) decides between "same family" and "different family." We extend this into three tiers:

```
Roll for parent 2:
  ~96% → same family as parent 1 (existing same-family pick)
  ~3.5% → different family, same Source ancestor
       (pick another family that shares The Source as ancestor)
  ~0.5% → unrelated (any birthable race anywhere)
```

Exact split is governed by `mate_up_probability` on the node:
- `p_same_family   = 1 - mate_up_probability`             (default 0.67 → bumped to 0.96 by your tag tuning later, or we recalibrate the default)
- `p_source_cousin = mate_up_probability * 0.875`         (~3.5% at default 0.04)
- `p_wild          = mate_up_probability * 0.125`         (~0.5% at default 0.04)

To get the "96 / 3.5 / 0.5" feel by default, we'll lower the default `mate_up_probability` from `0.33` to `0.04` for the seeded races (data update, not schema).

### 3. `getFamilyAncestor` — keep walking to The Source (per your call)
We do NOT skip The Source. It remains a valid `family`-typed ancestor. To prevent it from collapsing all races into "same family" for the *normal* mate-up step, we change the resolution to return the **nearest family ancestor that is not The Source** for "same family" picks, while still allowing The Source to be the connecting node for the "source cousin" tier.

Implementation: add a small helper `getNearestNonSourceFamily(nodeId)` used by the same-family branch; The Source itself is identified by label === "The Source" (or by type `source` if we choose to introduce it — see Technical Notes).

### 4. Tag inheritance
No code change needed. `resolveEffectiveTags` already walks all ancestors, so any tags ever placed on The Source automatically flow to all linked descendants. (The Source currently has no tags, per your earlier direction.)

### 5. DNA aggregation
No change needed. DNA aggregates by leaf race label from the lineage tree, not from graph edges. The Source never appears as a leaf.

## What's NOT changing
- Transformation host-matching (`host_required_tags`) — unaffected, still works on effective tags.
- Variant promotion to identity — unaffected.
- Asexual / created / transformed reproduction modes — unaffected.
- The Circle of Life visual editor — will simply show the new edges.

## Files touched
- **Data update** (insert tool): add `evolution_edges` rows from The Source → each linked family; lower `mate_up_probability` defaults on seeded family/race nodes to ~0.04.
- **`src/lib/evolutionGraph.ts`**: add `getNearestNonSourceFamily(nodeId, nodes, edges)` helper.
- **`src/lib/racegenLogic.ts`**: replace the binary same-family/mate-up branch with the three-tier roll described above; use the new helper for the same-family pick.

## Technical notes
- "The Source" is identified by `label === 'The Source'`. If you'd prefer a structural marker, we can add `type = 'source'` in a follow-up — purely cosmetic for the logic.
- The 96/3.5/0.5 split assumes `mate_up_probability = 0.04`. Per-node overrides still work: a race with `mate_up_probability = 0.5` would have ~50% same-family, ~44% source-cousin, ~6% wild.
- "Source cousin" picks are weighted by `subtreeWeight` across families that share The Source, so big families (Mortal) will dominate that tier.

## Out of scope
- Visual rendering tweaks in the Circle of Life diagram (edges will just appear).
- Adding tags to The Source itself.
- Changing Construct / Undead — they remain disconnected from The Source.

