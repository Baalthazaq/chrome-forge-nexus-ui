# Race and Transformation fields in Doppleganger

## What players will see
Next to **Ancestry** in the character header, two new fields: **Race** and **Transformation**.

- **Race** opens a wide dropdown listing every race from Circle of Life, grouped under headers for each circle (Source circles such as the main one, plus **Aberration** and **Construct**). Within each circle, entries are indented by lineage so families and their sub-races read as a staggered tree.
- **Transformation** opens a wide dropdown of all transformations, grouped under **Stage** headers (matching the Transformations list).
- Typing in either field searches the existing options live (headers stay visible above their matches). If nothing matches, the typed text can be kept as a custom entry ("Use “…”").
- In view mode the chosen value just shows as text, like Ancestry.
- Works with aliases: an alias stores its own Race/Transformation.

## Technical details
- Migration: add nullable `race text` and `transformation text` to `character_sheets` (existing RLS covers them).
- New `src/components/doppleganger/CircleCombobox.tsx`: Popover + Command (cmdk) with `CommandGroup` headings, wide (`w-[520px]`), max-height scroll, indent via depth padding, free-text "Use custom" item.
- Load `evolution_nodes`, `evolution_edges`, `evolution_transformations` once; group nodes by `getSourceAncestor` (source nodes become headers), compute depth from edges.
- `CharacterHeader.tsx`: render the two comboboxes beside `AncestryCombobox`, saving via `updateSheet({ race })` / `updateSheet({ transformation })` (alias overlay handled by existing updateSheet).
