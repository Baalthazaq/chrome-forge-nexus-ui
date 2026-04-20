# Racegen Rebuild + Node Tag System

## Part 1: Tag System (foundation for everything else)

### Schema change

Add a `tags` column to `evolution_nodes`:

```sql
ALTER TABLE public.evolution_nodes
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
```

### How tags work

- Every node has a `tags` array (e.g. `['Soul']`, `['Blood']`, `['Biological']`).
- **Inheritance is computed at read time, not stored.** A node's *effective* tags = its own tags ∪ all ancestor tags, walking up the evolution graph through The Source.
- A node can **add** tags its ancestors don't have.
- A node can **remove** an inherited tag by prefixing with `!` (e.g. `!Biological` on Construct strips the inherited bio tag). Stored as plain strings; the resolver handles the `!` prefix.
- Tags are free-form text, but the Circle of Life editor offers a quick-pick list of known tags (`Soul`, `Blood`, `Biological`, `Mineral`, `Arcane`, `Elemental`) plus a free-text field for new ones.

### Seed data (initial tag assignments)

- **The Source** → `['Biological']` (default for everything mortal)
- **Construct family** → `['!Biological', 'Mineral']` (overrides the inherited bio tag)
- **Undead family** → no change at family level; specific races below add what they need
- **Aetheris, Mephling, Infernis, Elemental families** → add `Arcane` or `Elemental` as appropriate

### UI in Circle of Life detail panel

- New **Tags** field (chip input) below the existing fields.
- Helper text: "Tags are inherited from parents. Prefix with `!` to remove an inherited tag."
- A read-only **Effective Tags** line shows the resolved set (helpful when editing).

---

## Part 2: Reproduction Modes — now driven by tag requirements

The four modes (`sexual`, `asexual`, `transformed`, `created`) work as previously planned, **but `transformed` gains an optional `host_required_tags` filter**.

### New optional column on `evolution_nodes`

```sql
ALTER TABLE public.evolution_nodes
  ADD COLUMN IF NOT EXISTS host_required_tags text[] NOT NULL DEFAULT '{}';
```

When the generator rolls a `transformed` node:

1. Look at the node's parent in the tree.
2. **If the parent is a real birthable race** (its own mode is `sexual` or `asexual`), use it as the host directly. → Drider uses Drow.
3. **If the parent is itself `transformed` or a category root with no birthable form** (Undead, Construct), climb to The Source and roll a sexual lineage from any other family **whose effective tags include all of `host_required_tags**`.

### Seed data for transformed races

- **Vampire / Vampire Spawn** → `host_required_tags = ['Blood']` (excludes Constructs which removed Biological → no Blood-bearing flesh; includes mortals)
- **Ghost / Banshee / Wraith / Poltergeist / Will-o'-Wisp** → `host_required_tags = ['Soul']`
- **Zombie / Skeleton / Flaming Skeleton / Crawling Claw / Mummy / Ghoul / Revenant** → `host_required_tags = ['Biological']`
- **Dracolich** → `host_required_tags = ['Soul', 'Biological']` and we further narrow to Draconic family in code (handled below)
- **Drider** → no tags needed; parent (Drow) is birthable, branch 1 fires
- **Blight Plant, Parasite Fungril** → `host_required_tags = ['Biological']`

### Narrowing beyond tags (rare cases)

For a couple of races (Dracolich) the host needs a specific *family*, not just a tag. We can handle this by including Families and Race names in the tags by default. This will allow transformations to work on specific races/variants/and families if needed.   
  
We also need a mechanism for a transformation to require ALL tags, or ANY tag. 

### Gender inheritance

- `transformed` subjects **inherit gender from the host roll** (per your answer for Drider). Result card shows the host's gender; no separate gender roll for the transformed identity.
- This applies uniformly: Vampire inherits from the rolled mortal, Drider inherits from the rolled Drow, etc.

---

## Part 3: Worked examples with the new system

**Drider:**

1. Mode = `transformed`, parent = Drow (mode `sexual`, birthable). Branch 1.
2. Roll a normal Drow lineage with mate-up checks. Get e.g. female Lolth-sworn Drow with Selunite × Lolth-sworn parents.
3. Identity = Drider, gender = female (inherited).

**Vampire:**

1. Mode = `transformed`, parent = Undead (no birthable form). Branch 2.
2. `host_required_tags = ['Blood']`. Filter all families: Constructs out (they removed Biological, so no Blood inheritance), Mephling/Aetheris out unless they carry Blood, mortals in. Weighted roll picks e.g. Human.
3. Roll a full sexual Human lineage. Get e.g. male Alaethean Human, Tomber × Alaethean parents.
4. Identity = Vampire, gender = male (inherited).

**Ghost:**

1. Same as Vampire but with `host_required_tags = ['Soul']`. Soul is on The Source by default, so most families qualify; Constructs are excluded only if they explicitly remove Soul (we'll seed `!Soul` on Construct too).

---

## Part 4: Racegen page (unchanged from prior plan, plus tag awareness)

Same scope as before:

- New `/admin/racegen` page replacing the static HTML tool.
- Pulls live from `evolution_nodes` + `evolution_edges`.
- Pure functions in `src/lib/racegenLogic.ts` for rolling, tag resolution, host filtering, DNA accounting.
- Lineage tree displays effective tags as small chips on each node, plus the `[A]`/`[T]`/`[C]` mode badges.
- Adding a new race/family/tag in Circle of Life immediately changes Racegen output — no code edits needed.

## Files

- **Migration**: add `tags`, `host_required_tags`, `host_family_filter` columns to `evolution_nodes`.
- **Data seed (insert tool)**: assign initial tags to The Source, Construct, Undead races, transformed races' host requirements.
- `**src/pages/CircleOfLife.tsx**`: add Tags chip input and Effective Tags readout to the detail panel.
- `**src/pages/Racegen.tsx**`: new page.
- `**src/lib/racegenLogic.ts**`: new module — `resolveEffectiveTags`, `pickHost`, `rollLineage`, `rollSubject`, etc.
- `**src/lib/evolutionGraph.ts**` (new helper): tag resolution + ancestor walking, shared between CircleOfLife and Racegen.
- `**src/data/traits.ts**`: extracted trait word lists.
- `**src/App.tsx**` + `**src/pages/Admin.tsx**`: route + nav link.

## Out of scope

- Editing nodes from Racegen.
- Persisting generated subjects.
- Auto-suggesting tags based on race name (you set them manually in the editor).