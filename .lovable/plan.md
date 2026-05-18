## Coverage analysis of the two scenarios

### Scenario 1 — Tiefling + Drow + Drider (Queen) → Vampire

| Aspect | Covered? | Why / why not |
|---|---|---|
| Tiefling × Drow mixed ancestry | ✅ Yes | The lineage roller already produces cross-race great-grandparents and aggregates DNA. |
| Drider as a "fusion" of humanoid + spider sub-type | ⚠️ Partial | `evolution_transformations` has `carrier_node_id` + `granted_tags` + `host_required_tags`, but it points to a **single** carrier node — there's no way to record "the spider half is specifically a Queen". |
| "All spiders are born from a Queen; the rest are male" | ❌ No | The graph has no concept of **sex-restricted reproduction roles**. Gender is rolled 50/50 per node and mate selection treats every node as M/F-symmetric. There's no "one F broodmother → many M offspring" model. |
| Vampire applied **after** Drider, in order, stacking | ⚠️ Partial | The transformation table has `stage` + `stackable`, but `rollSubject` explicitly skips transformations (`void options?.transformations; // transformations are no longer applied`). There is no per-subject chain of applied transformations persisted anywhere. |

### Scenario 2 — Wood Elf hijacked by Cap Fungril × Parasitic Fungril hybrid

| Aspect | Covered? | Why / why not |
|---|---|---|
| Wood Elf base ancestry | ✅ Yes | Standard born flow. |
| Hijack / afflicted transformation on a host | ⚠️ Partial | `acquisition='afflicted'` + `host_required_tags` exists, but Racegen never applies transformations, and the UI has no "Hijacked Host" representation beyond the `LineageNode.isHost` flag (which is defined but never set anywhere I can find). |
| Carrier is itself a **hybrid of two species** (Cap × Parasitic Fungril) | ❌ No | `carrier_node_id` is a single FK. There's no way to express "the carrier was itself the product of a mini-racegen roll between two parent species". |

### Other structural gaps surfaced by these cases

1. **Reproduction model is too coarse.** `reproduction_mode` is just `sexual | asexual | created`. It can't express:
   - Queen-restricted broods (Spiders, possibly Bees, Drow matrons…)
   - Parthenogenesis with sex-skew (always-male spider drones)
   - Hybrid-only species (Mules) that don't breed true
2. **Transformations are inert.** They live in the DB and have rich metadata, but `rollSubject` doesn't apply them. Subjects never carry an ordered chain like `[Drider(Queen), Vampire]`.
3. **No carrier composition.** A carrier is one node id, so any "the parasite was itself a crossbreed" case is unrepresentable.
4. **Host info is half-wired.** `LineageNode.isHost` exists on the type but nothing sets it; there is no `hijackedDna` populated even though `RolledSubject` declares the field.

---

## Proposed structural plan

### 1. Extend `evolution_nodes` with a sex/brood model

Add two nullable columns:

- `sex_rule` text — one of `null` (default M/F 50/50), `'queen_only_female'`, `'always_male'`, `'always_female'`, `'hermaphrodite'`.
- `brood_role` text — `null`, `'queen'`, `'drone'`, `'worker'`. Lets a node declare "this is the broodmother variant" vs "these are the drones" so Racegen can roll one queen + N drones per family.

Inheritance: walk ancestors like `reproduction_mode` does — nearest non-null wins.

### 2. Extend `evolution_transformations` to support composite carriers

Add:

- `carrier_node_ids uuid[]` — multiple carrier ids. When >1, Racegen rolls a *mini-lineage* between them (treating them as the two GGPs) to produce the actual carrier organism that infects the host. Keep `carrier_node_id` for backwards compatibility (single-element case).
- `requires_carrier_hybrid boolean` — explicit flag for "this transformation can only arise from a crossbreed carrier" (the Fungril case).

### 3. Persist applied transformations on the rolled subject

Already-declared but unused fields get wired up:

- `RolledSubject.transformations: AppliedTransformation[]` — populate it.
- Add `appliedOrder: number` and `sourceVariantId?: string` per applied transformation, so "Drider(**Queen**) then Vampire" round-trips faithfully.
- New helper `applyTransformations(subject, transformations, ctx)` that:
  1. Filters transformations whose `host_required_tags` match the subject's `effectiveTags` (respecting `host_tag_match_mode`).
  2. Rolls `chance`; honors `stage` ordering and `stackable`.
  3. For composite carriers, runs a mini `rollLineage` over `carrier_node_ids` to produce the carrier organism, stored on the applied transformation as `carrierLineage: LineageNode`.
  4. Unions `granted_tags` into `effectiveTags`.
  5. For `acquisition='afflicted'`, marks the subject's prior lineage root with `isHost=true` and copies its DNA into `hijackedDna` (then the subject's primary identity becomes the transformation).

### 4. Update mate / brood selection for queen-restricted families

In `pickMateFor` / `buildMateTable`:

- If a candidate's resolved `brood_role` is `'queen'`, treat it as the only valid F producer for that family. Drones (`'always_male'`) can never be the mother slot.
- If the seed race is a drone-type, its mother slot is forced to the family's queen variant.

This is the only way Scenario 1's "Spider Queen mother of a Drider" rolls correctly.

### 5. UI surface in `Racegen.tsx` / `SubjectCard`

- Render an "Applied transformations" strip below the DNA bar, in order, each showing label + (for composite) the rolled carrier organism summary.
- When `lineage.isHost` is true, prefix the lineage tree with a "Former host" badge and show `hijackedDna` as a muted secondary bar.

### 6. Admin UI in `CircleOfLife.tsx` / Transformations editor

- Sex-rule + brood-role dropdowns on the node editor.
- Multi-select carrier picker on the transformation editor + the `requires_carrier_hybrid` toggle.

---

## What I need from you before I build this

1. **Sex-rule taxonomy** — is `queen_only_female / always_male / always_female / hermaphrodite / null` enough, or are there other modes (e.g. sequential hermaphrodites, sex-by-environment)?
2. **Transformation stacking order** — should it be deterministic by `stage`, or rolled in the order the player acquired them (which would mean storing player-authored chains, not generator chains)?
3. **Composite carriers** — always exactly 2 parents (like real hybridisation), or allow N? Fungril × Fungril is 2; do you foresee 3-way?
4. **Scope of this change** — do you want Racegen-only (rolls richer NPCs), or also wire it into the player character flow on the Doppleganger sheet so PC ancestries can carry the same Drider/Vampire stack?

Once you answer these, I'll know whether to write one migration covering everything or split it into "schema first, UI next".