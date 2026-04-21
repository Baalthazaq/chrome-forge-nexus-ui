

# Racegen Restructure: Transformations, Parasites, Quirks

## Conceptual model

Three independent things, none hardcoded to a specific race:

### 1. Origin (how the subject came into being)
Stored as `origin_mode` on each node. Drives lineage rolling.

| Mode | Meaning | Lineage behavior |
|---|---|---|
| `born` | Standard sexual/asexual reproduction | Walk-up-the-tree mate-up (current logic) |
| `created` | Made by a Creator | Single "Creator" parent rolled from a node matching `host_required_tags`; 0% DNA contribution |
| `parasitic` | Hijacks a host body, replaces identity | Roll host's full birthable lineage, keep DNA breakdown, **discard host identity & tags**, replace with parasite's own |

Transformations are **not** an origin mode. They never produce a "new race" — they are modifiers layered on an already-rolled subject.

### 2. Transformations (modifiers, not races)
New table `evolution_transformations`. Each transformation:
- `id`, `label`, `description`
- `granted_tags text[]` — tags added to the subject when the transformation applies (e.g. Drider grants `Spider`; Vampire grants `Undead`)
- `host_required_tags text[]` + `host_tag_match_mode` — what the subject must already be to receive it (Drider needs `Drow`; Queen needs `Spider`; Vampire needs `Humanoid` or similar)
- `forbidden_tags text[]` — block stacking conflicts (e.g. Vampire forbids `Construct`)
- `acquisition text` — `'innate' | 'afflicted'` (cosmetic; afflicted shows a "via carrier" chip)
- `carrier_node_id uuid` (nullable) — points at an `evolution_nodes` row representing the affliction source (Vampire sire, Drider ritual, Queen pheromone). Carriers are normal nodes flagged `is_carrier`.
- `stackable boolean` — can it stack with itself (no, in all current cases)
- `stage int` — display/apply order so chains render predictably (Drider before Queen before Vampire)

A subject can carry **multiple** transformations. They are stored on the rolled result, not the node graph. Lineage tree shows them as labeled chips above the identity row.

### 3. Per-race quirks (data-driven flags on `evolution_nodes`)
Already proposed and still correct, but **none are hardcoded to a race name**:
- `variant_inheritance` — `random | mother | father` (Spider sets `father`)
- `mate_variant_lock_tags text[]` — when picking a mate, force the mate's variant to be a sibling whose tags include all listed tags (empty = no lock). Used for transformation-driven mating constraints if needed.
- `identity_overwrites_host boolean` — only meaningful when paired with `origin_mode = 'parasitic'`

If a future race has the same quirks, you set the flags on its node — no code change.

## Spider re-modelled

- **Spider race**: `variant_inheritance = 'father'`. Variants list = orbweaver, trapdoor, tank, stalker, etc. **Queen is removed from the variant list.**
- **Queen** becomes a transformation in `evolution_transformations`:
  - `host_required_tags = ['Spider']`
  - `granted_tags = ['Spider Queen']`
  - `acquisition = 'innate'` (occurs at birth via pheromone trigger; no carrier needed unless you want one)
  - `stage = 1`
- **Drider** becomes a transformation:
  - `host_required_tags = ['Drow']` (or any tag you want it gated on)
  - `granted_tags = ['Spider']` — this is the key insight: Drider grants the Spider tag, which then makes the subject eligible for the Queen transformation.
  - `acquisition = 'afflicted'`, `carrier_node_id` → "Drider ritual" carrier node
  - `stage = 2`
- **Vampire** becomes a transformation:
  - `host_required_tags = ['Humanoid']` (or `[]` for "anything")
  - `granted_tags = ['Undead', 'Vampire']`
  - `acquisition = 'afflicted'`, `carrier_node_id` → "Vampire sire" carrier node
  - `stage = 3`

Your canonical character then resolves as:

```
Subject:        Female (rolled gender)
Identity:       Infernis × Drow lineage (rolled normally as 'born')
Transformations: Drider → Queen → Vampire
Effective tags: Infernis, Drow, Spider, Spider Queen, Undead, Vampire
```

Each transformation chip is rendered with its acquisition source ("via Drider Ritual", "via Vampire Sire").

## Parasitic Fungril (origin example)

- **Parasitic Fungril** is a node with:
  - `origin_mode = 'parasitic'`
  - `identity_overwrites_host = true`
  - `host_required_tags = ['Humanoid']` (whatever bodies it can take)
- Roller: pick a host via tags → roll the host's full birthable lineage (sexual, with mate-ups) → store the aggregated DNA → throw away host identity, family, variant, and tags → present as "Parasitic Fungril" with a `Hijacked DNA` panel listing the breakdown.

## Tree restructure

- Construct, Modron, Undead, and any other non-birthable family detach from The Source. They become independent roots in the wheel and tree.
- The Source connects only to families whose members are `origin_mode = 'born'`.
- Carrier nodes (Vampire sire, Drider ritual, Queen pheromone) live as small nodes in the graph attached to nothing structural; they're referenced only by `evolution_transformations.carrier_node_id`. They never appear in normal lineage rolls.

## Lineage subject card layout

```
┌────────────────────────────────────────┐
│ Female • Infernis × Drow              │
│ ▸ Drider (via Drider Ritual)          │
│ ▸ Queen (innate, triggered by Spider) │
│ ▸ Vampire (via Vampire Sire)          │
│ Tags: Infernis, Drow, Spider, Queen,  │
│       Undead, Vampire                 │
│ DNA:  47% Drow, 41% Infernis, ...     │
└────────────────────────────────────────┘
   Lineage tree (born portion only)
   ├── Mother: Drow (Selunite)
   └── Father: Infernis (Asmodean)
```

Transformations are surfaced as a stack above the lineage tree; they do not create extra parent rows.

## Files touched

- **DB migration**:
  - Add columns to `evolution_nodes`: `origin_mode text default 'born'`, `is_carrier boolean default false`, `variant_inheritance text default 'random'`, `mate_variant_lock_tags text[] default '{}'`, `identity_overwrites_host boolean default false`.
  - New table `evolution_transformations` (fields above) + RLS (admin manage, authenticated select).
  - Backfill: detach Construct/Modron/Undead from Source; mark Parasitic Fungril; remove Queen from Spider variants; insert Drider/Queen/Vampire transformation rows with carrier nodes.
- `src/lib/evolutionGraph.ts` — extend `EvoNode` interface; add `loadTransformations()` helper.
- `src/lib/racegenLogic.ts`:
  - `rollSubject` dispatches on `origin_mode` (`born`, `created`, `parasitic`).
  - After lineage roll, run `applyTransformations(subject)`: walks `evolution_transformations` ordered by `stage`, picks each whose host requirements match current effective tags, with a configurable per-transformation chance (default low; admin-set per row). Applies `granted_tags`, recurses to allow newly granted tags to unlock further transformations (Drider→Spider→Queen).
  - Quirks (`variant_inheritance`, `mate_variant_lock_tags`) consulted from node data — no race name in code.
- `src/pages/Racegen.tsx` — render transformation chips with carrier label; render parasitic DNA panel; never render carriers as lineage nodes.
- `src/pages/CircleOfLife.tsx` + `circle-of-life-layout.ts` — root families that aren't `origin_mode = 'born'` detach from Source ring.
- `src/pages/EvolutionAdmin.tsx` — add inputs for the new node fields and a transformations manager (CRUD on `evolution_transformations`, including carrier picker).

## Out of scope

- Auto-rolling specific named characters (your Infernis/Drider/Queen/Vampire is achievable but not auto-generated; transformation chances stay random per roll unless admin pins them).
- Rebalancing existing mate-up probabilities.
- Visual redesign of the wheel beyond detaching non-born roots.

## Expected outcome

- Transformations are first-class, data-driven modifiers — adding Werewolf, Lich, Mind-Flayer Thrall later means inserting a row, not editing code.
- Parasites correctly overwrite identity while preserving DNA.
- Quirks like "father determines variant" sit on the race row, not in the algorithm.
- Stacked transformations (Drider → Queen → Vampire) resolve in stage order with each one able to unlock the next via granted tags.

