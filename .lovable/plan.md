

## Fix Beast Shape Tier Filtering

Beast Shape cards store their value (1–4) in `metadata.level`, but it actually represents a **tier**, not a character level. Currently a level 3 character only sees Beast Shape "level" 1–3, when they should see tier 1–2 only (since they're a Tier 2 character).

### Tier Mapping
- Level 1 → Tier 1
- Levels 2–4 → Tier 2
- Levels 5–7 → Tier 3
- Levels 8–10 → Tier 4

A character can use Beast Shapes of their tier and lower.

### Change

In `src/components/doppleganger/CardsSection.tsx`, inside `getListForType()`'s level-filter step:

- Detect Beast Shape cards (`source === 'Beast Shape'`).
- For those cards, treat `metadata.level` as a tier and check it against the **set of tiers covered by `filterLevels`** (using a `levelToTier` helper, reusing `getTier` from `@/lib/levelUpUtils`).
- Non-Beast-Shape cards keep current behavior (direct level membership in `filterLevels`).

Pseudocode:
```text
const allowedTiers = new Set(filterLevels.map(getTier));
if (isBeastShape(c)) {
  if (typeof lvl === 'number' && !allowedTiers.has(lvl)) return false;
} else {
  if (typeof lvl === 'number' && !filterLevels.includes(lvl)) return false;
}
```

No DB changes. No UI changes to the level checkbox filter (it still selects character levels 1–10); only the matching logic for Beast Shape cards changes.

