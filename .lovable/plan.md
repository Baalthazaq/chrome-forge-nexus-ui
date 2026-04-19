
Goal: Generate an .xlsx that lists every node from the Evolution Tree EXCEPT the final variant leaves (D3). For each listed node: a default weight, and a default "mate-up" probability of 33%.

Source of truth:
- `src/data/racegenData.ts` (RACES array — same data as racegen.html)
- `src/components/circle-of-life-layout.ts` for hierarchy rules:
  - Sub-family (D1.5): Elven under Fey, Dwarven under Giant (per prior plan — needs confirm but using as-is for now since user said proceed)
  - Sub-race (D2.5): Drow under Elf
  - Edge case: Umbragen reassigned from Elf → Drow
- D1 = Root Family, D1.5 = Sub-Family, D2 = Race, D2.5 = Sub-Race, D3 = Variant (SKIPPED)

Weight rule per user:
- Default weight = number of D3 variants that branch from that node (recursively counted)
- Examples:
  - Race "Elf" has 13 variants → weight 13
  - Sub-race "Drow" has 3 variants (Selunite, Lolth-sworn, Drider) + Umbragen reassigned → 4
  - Race "Elf" then loses Umbragen and the Drow row, so its leaf count under Elf = 13 (original variants minus Umbragen) = 12; total under Elf node = 12 + Drow's 4 = 16
  - Family "Fey" = sum of leaves under all its descendants
- Mate-up probability column: constant 0.33

Output:
- Single sheet "Tree (no variants)"
- Columns: Node, Type (Family / Sub-Family / Race / Sub-Race), Parent, Weight (leaf count), Mate-Up Probability (0.33)
- Sorted by Family → Sub-Family → Race → Sub-Race for readability
- Saved to `/mnt/documents/racegen_tree_weights.xlsx`

Algorithm:
1. Build node list from `RACES` applying the three hierarchy overrides (Elven/Dwarven sub-families, Drow sub-race, Umbragen reassignment).
2. Build parent→children map.
3. For each non-D3 node, recursively count D3 descendants → that's the weight.
4. Write rows in tree order with openpyxl, bold headers, freeze top row, auto-width.
5. Run recalculate_formulas.py (no formulas here, but verify clean file).
6. QA: convert sheet to image / read back top rows to confirm.
7. Emit `<lov-artifact>`.

Deliverable: `racegen_tree_weights.xlsx` ready for the user to edit weights before we rewrite the racegen algorithm.

After approval I'll switch to default mode and run the script.
