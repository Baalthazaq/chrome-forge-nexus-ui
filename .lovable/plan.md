## Goal

Replace the rigid `family / race / variant` typing with a flat graph of generic nodes. Depth is purely structural (who points to whom). Tags, mate-compatibility, and reproduction mode all flow down from ancestors and can be suppressed by any descendant with a `!Tag` entry. Doppleganger will later read this same graph to decide which cards/qualities are "in class" for a chosen race.

## New node model

`evolution_nodes` after the change:

| Field | Meaning |
|---|---|
| `type` | Only two values: `'source'` (wheel anchor: The Source, Aberration, Undead, Construct) or `'node'` (everything else). |
| `tags` | Identity/quality tags. Inherited by descendants. `!Foo` removes `Foo` for self + descendants. |
| `mate_tags` | NEW. Tags this node can breed with. Inherited and `!`-suppressible the same way. |
| `reproduction_mode` | `'sexual' \| 'asexual' \| 'created' \| null`. `null` means inherit from nearest ancestor that sets it. Transformations stay in their own table — unchanged. |
| `host_required_tags`, `host_tag_match_mode`, `is_carrier`, `identity_overwrites_host`, `variant_inheritance`, `mate_variant_lock_tags`, `origin_mode`, `weight`, `mate_up_probability`, `color`, `x`, `y` | Kept as-is. |

Removed concepts: the strings `'family'`, `'race'`, `'variant'` no longer carry meaning. Existing rows are migrated to `'node'`.

## Inheritance rules (single shared resolver)

For any node, walk all ancestors and accumulate three sets:

1. **Effective tags** = union of `label` + `tags` from self and all ancestors, minus anything any node prefixed with `!`. (Already implemented for tags — extended to also auto-include `label` for every non-source node, which is already the case.)
2. **Effective mate tags** = union of `mate_tags`, minus `!`-suppressed entries.
3. **Effective reproduction mode** = the `reproduction_mode` of the nearest ancestor (or self) where it's non-null. `'source'` nodes don't contribute.

`'source'` ancestors contribute their explicit `tags` / `mate_tags` (so you can attach "Aberration" as a tag on the Aberration source and it propagates), but their `label` is not auto-tagged — same rule as today.

These three resolvers live next to `resolveEffectiveTags` in `src/lib/evolutionGraph.ts` and are the single source of truth used by Racegen, Circle of Life rendering, Doppleganger "in-class" lookups, and the Transformations engine.

## Visual layout (Circle of Life)

`circle-of-life-layout.ts` currently keys depth/coloring off `type === 'family' | 'race' | 'variant'`. After the change:

- **Depth** = graph distance from the wheel's source (longest path from source → node). Display radius bands: 1, 2, 3, 4+ all map onto the existing `DEPTH_TO_RADIUS` ramp; deepest leaves go to the outer ring.
- **Color** = inherited from the nearest ancestor that has an explicit `color` set, with HSL bumps per depth step (lighter/less saturated as you go out). The hard-coded `FAMILY_COLORS` table goes away — colors live on nodes in the DB.
- **Source wheels** = unchanged. Still one wheel per `type='source'` node.
- **Filtering active rolls** = `EXCLUDED_FAMILY_LABELS` becomes `EXCLUDED_NODE_LABELS` (still hides Modron). No more "exclude by family ancestor" walk.

## Racegen

`racegenLogic.ts` currently picks a family, then a race under it, then a variant. After the change:

- Roll a leaf-ish node by walking down from a chosen source, weighted by `weight` at each branch. No tier-coupling.
- Mate compatibility uses **effective mate_tags ∩ effective tags** of the candidate partner (instead of the family-level `mate_up_probability` ladder it has now). `mate_up_probability` is kept as a per-node bias for "roll up vs stay" when descending.

This isolates the family/race/variant assumption to one file; logic stays roughly the same shape.

## Doppleganger "in-class"

When Doppleganger needs the in-class card pool for a character's race node, it calls `resolveEffectiveTags(nodeId)` and the new `resolveEffectiveMateTags(nodeId)`. Any card whose `metadata.race_tags` intersects the effective tag set is in-class. No type checks. (No code in this plan — flagged so future work doesn't reintroduce family/race assumptions.)

## Transformations

No schema change. The transformation matcher already runs on `host_required_tags` + `forbidden_tags` against effective tags — it just inherits the new resolver automatically.

## Migration (schema + data, one file)

```sql
-- 1. Mate tags column
ALTER TABLE evolution_nodes
  ADD COLUMN mate_tags text[] NOT NULL DEFAULT '{}';

-- 2. Allow null repro mode = "inherit"
ALTER TABLE evolution_nodes
  ALTER COLUMN reproduction_mode DROP NOT NULL,
  ALTER COLUMN reproduction_mode DROP DEFAULT;

-- 3. Collapse types: keep 'source', everything else becomes 'node'
UPDATE evolution_nodes SET type = 'node' WHERE type <> 'source';

-- 4. Seed mate_tags from the existing implicit family rules.
--    (One UPDATE per pairing the user already established — Goblinoid↔Humanoid, etc.
--    The exact list will be confirmed against current data before running.)
```

No edges or transformations are touched.

## Admin UI

`TransformationsAdmin.tsx` and the node editor (in `EvolutionAdmin` / wherever nodes are managed) lose the type dropdown except for the `source` toggle, gain a `mate_tags` chip input, and let `reproduction_mode` be unset ("inherit"). Validation: a node with no ancestors AND no explicit reproduction mode (and not a source) is flagged as ambiguous.

## Out of scope

- Doppleganger card-pool wiring (next step once the resolver is live).
- Reorganizing the actual node tree (the user will do that after the structure exists).
- Any change to the Transformations table.

## Technical notes

```text
resolveEffectiveTags(nodeId)        -> Set<string>   (identity)
resolveEffectiveMateTags(nodeId)    -> Set<string>   (breeding)
resolveReproductionMode(nodeId)     -> 'sexual'|'asexual'|'created'|null
```

All three share one ancestor walk; cache per render.

## Memory

Update `mem://apps/circle-of-life`: node typing collapsed to `source` + `node`; depth is structural; tags, mate_tags, and reproduction_mode all inherit and support `!` suppression.
