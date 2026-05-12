## Goal

Promote **Undead**, **Construct**, and **Aberration** from families to **Sources** (their own top-level layer), and link **Gith** to both the Aberration source and the Humanoid family so it appears as a multi-parent race.

After this, the Circle of Life renders four wheels: The Source, Aberration, Undead, Construct.

## Changes

### 1. Data — promote families to sources, re-parent Gith

One migration (schema-safe data update):

- `UPDATE evolution_nodes SET type='source' WHERE label IN ('Aberration','Undead','Construct')`. All existing children stay attached because edges reference node ids, not types.
- `DELETE FROM evolution_edges` where `parent_id = 'The Source'` AND `child_id` is one of the three (they're no longer descendants of The Source — they ARE sources).
- `INSERT INTO evolution_edges (parent_id, child_id)` linking **Humanoid (family) → Gith (race)**. Gith keeps its existing Aberration parent, gaining Humanoid as a second parent. The layout's `primaryParentOf` already handles multi-parent races by picking the deepest parent, so Gith will visually cluster under whichever is deeper (Aberration source if Humanoid stays at family depth — fine).

No schema changes — `type='source'` already exists; multi-parent edges are already supported.

### 2. Circle of Life rendering

`circle-of-life-layout.ts`:
- Add `FAMILY_COLORS` entries for the three labels at the source level (Aberration already has one, add for Undead/Construct as source-tier shades) — used by the per-wheel center color.
- Remove `Undead` from `EXCLUDED_FAMILY_LABELS` (it's now an active source layer; user explicitly wants it shown). Construct stays active. Modron stays excluded.
- `filterToSource(...)` already exists from the prior step — the page passes each source's id.

`CircleOfLifeDiagram.tsx`:
- Already accepts dynamic source label/color from the prior step. No further changes needed beyond confirming the center caption uses the source's label and color.

`pages/CircleOfLife.tsx`:
- Already queries distinct `source` nodes and renders one wheel per source in a wrapped grid. With four sources the grid (`grid-cols-1 lg:grid-cols-2`) yields a 2×2 layout. Reduce per-wheel height when more than one source is present (already in plan).

### 3. Tag/effective-tag handling

`resolveEffectiveTags` already auto-tags every non-source node with its own label. So:
- "Aberration" stops being auto-added as a tag for descendants (it's a source now). If transformations rely on the tag `Aberration`, add `Aberration` to the explicit `tags` array on the Aberration source node so it still propagates. Same for `Undead` and `Construct`.

This is a one-line per node data update included in the same migration.

### 4. Memory

Update `mem://apps/circle-of-life` to record: Aberration, Undead, Construct are sources (not families); Gith is multi-parent (Aberration + Humanoid); wheel renders one circle per source.

## Out of scope

- Reorganizing Modron (still nested under Construct as its own family — fine).
- Splitting/renaming "The Source".
- Any racegen logic changes — multi-parent already supported.

## Technical notes

```text
Before:                          After:
The Source                       The Source        Aberration   Undead     Construct
├─ Aberration (family)           ├─ Beastfolk      ├─ Beholder  ├─ Ghost   ├─ Clank
│  └─ Gith                       ├─ Draconic       ├─ Gith ◄─┐  ├─ Zombie  ├─ Golems
├─ Humanoid                      ├─ Elemental      ├─ Spider │  └─ ...     └─ Modron
│  └─ Human, Dwarf...            ├─ Elven          └─ ...    │
├─ Undead (family, hidden)       ├─ Fey                      │
└─ Construct (family)            ├─ Giant                    │
                                 ├─ Goblinoid                │
                                 ├─ Humanoid ────────────────┘ (also parents Gith)
                                 │  └─ Human, Dwarf, Halfling, Gith
                                 ├─ Planar, Plant, Reptilian, Fey...
```
