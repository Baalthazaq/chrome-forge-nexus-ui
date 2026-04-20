

# Mate-Up: Walk-Up-The-Tree Algorithm

## Problems
1. **Tree shows "The Source"** as a lineage row when a wild-tier mate-up climbs to it. Should only appear in the Circle diagram, never in the lineage tree.
2. **Variants are skipped during partner selection.** Current pools only contain `type === 'race'` nodes, so a Selunite never picks another Selunite — it jumps straight to a sibling race.
3. **Mate-up tiers are coarse.** Current code does same-family / source-cousin / wild as one decision. The user wants a per-ancestor climb: at each level the `mate_up_probability` of the *current node* decides whether the partner stays here or climbs one more step up.

## New algorithm (replaces the 3-tier branch in `rollBirthableLineage`)

For a sexual subject of node `N` (a variant or race), the partner is rolled by walking *up* `N`'s ancestors:

```
level = N
loop:
  p = level.mate_up_probability
  if random() < p AND level has a parent in the graph:
      level = parent(level)
      continue
  else:
      pick a leaf-race descendant under `level` (weighted)
      break
```

Concrete examples (matching the user's spec):

- **Selunite (p=0.33)** → 67% stays at Selunite, picks a Selunite partner. 33% climbs to **Drow**.
- **Drow (p=0.20)** → 80% picks a Drow variant (weighted by `weight × mate_up_probability` of each variant). 20% climbs to **Elf**.
- **Elf (p=0.33)** → 67% picks an Elf variant. 33% climbs to **Elven**.
- **Elven (p=0.33)** → 67% picks an Elf-family race (currently only Elf). 33% climbs to **Fey**.
- **Fey** → 67% picks anything in Fey weighted, 33% climbs to **The Source**.
- **The Source** → picks anything under The Source weighted; this is the terminal level (no further climb).

Additional rules:
- The climb walks the **first parent edge** at each level (nodes have one structural parent in this graph; if multiple, prefer non-source first).
- The leaf pick at the chosen level recursively descends children: at each child layer, pick weighted by `weight × mate_up_probability` until a leaf node is reached. (For variant-having races, this naturally lands on a variant.)
- **Sexual-only filter** stays: any node in the candidate pool with `reproduction_mode !== 'sexual'` is excluded.
- **Self-exclusion**: the very first roll (staying at level `N`) excludes `N` itself only if `N` has no siblings/variants under its parent that qualify; otherwise siblings are allowed (a Selunite × Selunite is fine — they're different individuals of the same node).
- **Generational decay** stays: multiply each level's `p` by `MATE_UP_DECAY ^ ctx.depth` so deeper recursive ancestors mate-up less often.

## Identity vs. variant
Today the rolled subject's `identityLabel` is the *race*; the chosen variant is rendered as a prefix label. The first parent (P1) currently inherits the same race but **not** the same variant. We'll fix P1 to also inherit the subject's variant when the subject is a variant, so a Selunite's "same-race parent" is also a Selunite (not a generic Drow).

## Tree rendering — hide The Source
In `LineageTreeView` (`src/pages/Racegen.tsx`):
- When rendering a `LineageNode` whose underlying graph node is type `source`, skip the row and render its children only (or terminate — Source is always a terminal pick, so render it as the final race chosen *under* Source instead).
- Cleaner option: in `racegenLogic.ts`, never put a Source-typed node into the lineage. The leaf descent from Source already lands on a real race; just record that race as the partner. Source involvement is implicit (the partner is from a totally different family). No tree changes needed.

We'll go with the cleaner option: **Source never appears as a lineage node**, only as an intermediate climb step in the partner-rolling function.

## Performance
Add `effectiveWeight = weight * mate_up_probability` cached per node id in the rolling `Ctx` (built once per `rollSubject` call). Used everywhere a "weighted by w × p" pick happens. No DB changes.

## Files touched
- `src/lib/racegenLogic.ts`
  - Replace the 3-tier mate-up branch with `pickMatePartner(subjectNode, ctx)` that walks up ancestors per the algorithm above.
  - Add `effectiveWeight` cache to `Ctx`.
  - When the subject has a variant, ensure the same-race parent (P1) also picks a variant under the same race (preferring the subject's own variant by weight, but allowing siblings).
  - Remove dead code: `MAX_DEPTH` source-cousin / wild branches.
- `src/pages/Racegen.tsx`
  - No structural change needed once Source is never inserted into lineage. (If any stray Source label slips through, add a defensive `node.type === 'source'` skip in `LineageTreeView`.)
- `src/lib/evolutionGraph.ts`
  - No change; `getSourceAncestor` and `getNearestNonSourceFamily`-style helpers already exist.

## Out of scope
- DB schema or seed data changes.
- Circle of Life visual diagram (Source stays there as designed).
- Asexual / transformed / created lineages — unchanged.

## Expected outcome
- Selunite subjects produce mostly Selunite × Selunite, with rare Drow / Elf / Fey / cross-source partners following the compound probabilities (0.33 × 0.20 × 0.33 × 0.33 × ... ≈ very rare deep mixes).
- Mixed heritage drops sharply; identity and lineage will line up visually.
- "The Source" no longer appears in any lineage tree row.

