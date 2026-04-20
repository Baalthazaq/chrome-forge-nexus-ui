## Reproduction Modes — Expanded Plan

Modeling all the special cases as a single `reproduction_mode` field on `evolution_nodes`, reusing the existing `mate_up_probability` machinery rather than inventing a parallel system.

### Modes (single `reproduction_mode` text column, default `'sexual'`)


| Mode          | Meaning                                                               | Racegen behavior                                                                                               |
| ------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `sexual`      | Standard two-parent                                                   | Existing climb-and-mix using `mate_up_probability`                                                             |
| `asexual`     | Single parent of same lineage                                         | Pick one parent at this node's tier; no mate, no climb                                                         |
| `transformed` | Originates from another race (Undead, Parasite Fungril, Blight Plant) | Roll a normal sexual lineage as the "host," then overlay this node as the result                               |
| `created`     | Built by a creator                                                    | Pick one parent (the creator) using the same weighted + climb logic as `mate_up_probability`; no second parent |


Inheritance: descendants inherit their nearest ancestor's mode unless they explicitly override.

### Why this covers everything

- **Undead** → `transformed` (host = any sexual lineage, then "becomes undead")
- **Constructs / Modron / Clank** → `created`. Re-using the `mate_up_probability` value as the "creator climb chance" means a low number keeps creators within Construct (your original 0% intent), a high number forces creators from other families. Default 33% gives a mix; you can edit per-node.
- **Fungril** → `asexual` (single parent, same race)
- **Parasite Fungril** → `transformed` (overlaid onto a host)
- **Blight Plant** → `transformed` (same as Parasite)

No need for a separate `creator_pool` column — the creator is picked using the same weighted tree + mate-up climb the standard algorithm already understands. This keeps the data model minimal and the editor simple.

### Schema change (one column only)

```sql
ALTER TABLE public.evolution_nodes
  ADD COLUMN IF NOT EXISTS reproduction_mode text NOT NULL DEFAULT 'sexual';
-- (no CHECK constraint; we validate in the UI dropdown to keep it editable)
```

Then a data seed (separate insert/update step, not a migration) sets:

- Undead family + race → `transformed`
- Construct family, Modron sub-family, Clank race → `created`
- Plant: Fungril → `asexual`; Awakened Plant stays `sexual`
- The existing variant **Parasitic** under Fungril → `transformed`
- **Blight** already exists under Plant as well and should be → `transformed` 

### UI (Circle of Life detail panel only — nothing on canvas)

Add to the editable side panel, beneath weight + mate-up:

- **Reproduction Mode** dropdown: Sexual / Asexual / Transformed / Created
- Helper text under the dropdown explaining how Racegen will treat it, including the note that `mate_up_probability` is reused as "creator climb chance" for `created` and is ignored for `asexual` and `transformed`.

### Files that will change

- New migration: add `reproduction_mode` column
- Data seed (insert tool, not migration): set modes for Undead / Construct chain / Fungril; create Parasite Fungril node + edge; handle Blight Plant per answer below
- `src/pages/CircleOfLife.tsx`: extend `editBuffer`, `updateNode`, and detail panel UI with the dropdown + helper text
- `src/integrations/supabase/types.ts`: auto-regenerated