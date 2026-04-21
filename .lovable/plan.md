
## Racegen ancestry fix

### Problem to fix
The current lineage logic now forces both parents to be the child’s exact node, which removed mixed ancestry entirely. At the same time, the display still needs every lineage row to remain `Race (Variant)`.

### What to change

1. Restore mixed-ancestry partner selection in `src/lib/racegenLogic.ts`
   - Re-enable the existing walk-up mate logic instead of cloning the child node for both parents.
   - Use `pickMatePartner(...)` for the partner branch again so ancestry can climb to parent race/family/source tiers and come back down into a different compatible branch.
   - Keep `pickMatePartner` as the mechanism that produces cross-race and cross-variant ancestry.

2. Separate “display identity” from “mating source”
   - Keep every rendered lineage node formatted as `Race (Variant)`.
   - Do not force the chosen mate to become the child’s exact variant.
   - Instead, allow the mate picker to return a genuinely mixed partner, then normalize that partner into a displayable `Race (Variant)` node before rendering.

3. Preserve race quirks like variant inheritance
   - Use `variant_inheritance` on the race node to determine which parent controls the child’s final variant:
     - `random`: child variant can come from either side / default behavior
     - `mother`: child variant follows maternal side
     - `father`: child variant follows paternal side
   - This allows mixed-race ancestry while keeping cases like Spider’s father-led variant rule.

4. Make lineage generation explicit about the two parent roles
   - Parent A: the “same-line” parent anchored to the child’s line.
   - Parent B: the partner selected via walk-up mate logic.
   - The child’s final displayed identity should be resolved from those two parents plus the race quirk, not by rewriting both parents to match the child.

5. Keep DNA aggregation based on terminal lineage leaves
   - Continue aggregating DNA from leaf nodes only.
   - Because leaves remain `Race (Variant)`, the DNA bar and secondary identities will reflect real mixed ancestry again.
   - Keep the `>= 25%` secondary identity rule unchanged.

6. Update Racegen card presentation in `src/pages/Racegen.tsx`
   - Keep primary identity as the most prominent `Race + Variant`.
   - Keep secondary identities underneath for any other `Race + Variant` at or above 25%.
   - Do not display family in the header.

### Expected behavior after fix
- Mixed ancestry returns.
- A child can have one parent from their own line and another from a different variant/race/family depending on mate-up rolls.
- Every visible lineage row still shows a full `Race (Variant)` label.
- DNA percentages and secondary identities once again reflect genuine mixed lineage instead of forced purity.

## Technical details
- Main file: `src/lib/racegenLogic.ts`
- Likely affected functions:
  - `rollBirthableLineage`
  - `rollBirthableLineageInner`
  - `pickMatePartner`
  - `pickLeafDescendant`
  - identity resolution around `variant_inheritance`
- UI file to verify: `src/pages/Racegen.tsx`

## Validation
After implementation, verify with seeded rolls that:
- mixed dwarf/halfling/etc ancestry appears again,
- direct parents are not nonsensically rewritten,
- every lineage row is `Race (Variant)`,
- secondary identities match the leaf DNA breakdown.
