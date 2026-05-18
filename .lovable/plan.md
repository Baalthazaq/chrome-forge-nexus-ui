## Goal

Simplify the evolution/transformation data model. Drop dead concepts, replace the placeholder "carrier" nodes with real species references, and document exactly when carriers apply during racegen.

## What's wrong today

1. **`brood_role` (queen/drone/worker)** is set on nodes but contributes nothing to reproduction — only to a "swap sibling variant" trick that you don't need. Spider Queen vs. regular spider is already a normal variant relationship.
2. **`sex_rule`** is still useful (Spider Queen must roll female) — keep it.
3. **Placeholder carrier nodes** — `Drider Ritual`, `Spider Pheromone`, `Vampire Sire` — sit in the graph as if they were species. They're not species, they're the *mechanism* of a transformation. They should not exist as nodes.
4. The **Vampire transformation** currently points at the `Vampire Sire` placeholder. The actual donor is "an existing Vampire" — a creature carrying the Vampire tag. Same idea for Drider (donor = Spider Queen) and Fungril hijack (donor = Cap × Parasitic hybrid).
5. **Carrier is undocumented.** Below is the contract going forward.

## Carrier contract (new, simple)

> A **carrier** on a transformation is the *donor species* whose DNA is admixed into the victim when the transformation is `afflicted`. It is always a real species node (or a small set of real nodes for hybrids).
>
> - **Innate** transformations (e.g. Spider Queen, Demigod) have **no carrier** — the creature is just born with it.
> - **Afflicted** transformations have **0, 1, or N carrier species**:
>   - 0 carriers → tag-only conversion, no DNA admixture (e.g. Ghost, Zombie — the host just changes state).
>   - 1 carrier → roll one donor of that species, blend ~12.5% donor DNA into the subject (e.g. Drider ← Spider Queen).
>   - N carriers + `requires_carrier_hybrid=true` → roll a hybrid donor combining all listed species (e.g. Fungril hijack ← Cap × Parasitic).
> - Acquisition order on stacked transformations stays as we built it (acquired-order list on the subject).

## Plan

### 1. Schema cleanup (one migration)

- `evolution_nodes`: **drop `brood_role`** column. Keep `sex_rule`, keep `is_carrier`.
- `evolution_transformations`: **drop `carrier_node_id`** (the single-value legacy column). Keep `carrier_node_ids uuid[]` and `requires_carrier_hybrid` as the only carrier interface.
- **Delete the three placeholder carrier nodes** (`Drider Ritual`, `Spider Pheromone`, `Vampire Sire`) and any edges pointing at them.
- **Re-wire transformations to real species:**
  - `Drider` → `carrier_node_ids = [Spider Queen]`
  - `Vampire (afflicted)` → `carrier_node_ids = [Vampire]` (any humanoid-derived Vampire works as sire; we look it up by Vampire tag at roll time, with the listed node as the canonical example)
  - Fungril hijack → already set correctly once you create it: `[Cap Fungril, Parasitic Fungril]` + `requires_carrier_hybrid=true`
- After delete, run a sanity query to confirm no transformation references a missing node.

### 2. Code cleanup

- **`src/lib/evolutionGraph.ts`** — remove `brood_role` from `EvoNode`, delete `resolveBroodRole`. Remove `carrier_node_id` from `EvoTransformation` (use only `carrier_node_ids`).
- **`src/lib/racegenLogic.ts`** — delete `findBroodVariant` and `enforceSexForPick`'s brood-swap branch; keep the simpler sex_rule enforcement (just re-roll gender, no sibling swap). Update `applyTransformations` to read only `carrier_node_ids`.
- **`src/pages/CircleOfLife.tsx`** — remove the Brood Role dropdown from the node editor. Keep Sex Rule.
- **`src/pages/TransformationsAdmin.tsx`** — already uses the multi-select; just remove any UI remnant of the single `carrier_node_id`. Add a short inline help string explaining the carrier contract above.
- **`src/integrations/supabase/types.ts`** regenerates automatically after the migration.

### 3. Verification

- Re-roll a batch in Racegen and confirm:
  - A "Spider Queen" still always rolls female.
  - An "afflicted Drider" subject shows ~12.5% Spider Queen DNA admixed and lists "Drider via Spider Queen".
  - An "afflicted Vampire" subject shows Vampire DNA admixed and lists "Vampire via Vampire".
  - No transformation card references a deleted placeholder node.

## Technical detail

- The migration is destructive on three node rows + one column on each of two tables. Backfill is trivial (`carrier_node_ids` was already backfilled from `carrier_node_id` previously, so dropping the scalar column loses nothing).
- "Vampire carrier = Vampire" is intentionally self-referential. At roll time, `buildCarrierLineage` rolls a donor of the listed species; for Vampire this produces another Vampire (which itself was once a Humanoid), giving the sire's DNA realistic admixture.
