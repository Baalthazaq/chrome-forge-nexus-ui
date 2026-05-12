## Goal

1. Add a new top-level **Source** layer above families. Today there's an implicit `__root__` "The Source" — promote it to real, renamable, multi-instance data so families can be re-parented later.
2. Render the Circle of Life as **one wheel per Source** in a wrapped grid.
3. Pull **Transformations** out of the Circle entirely: dedicated `/transformations` player page + a "Transformations" button on `/circle-of-life` that opens a side panel. Existing wheel transformations data stays as-is for now; the Daggerheart official ones will be added later.

## Changes

### 1. Data model — add real Source nodes

Schema migration:
- Use the existing `evolution_nodes` table. Add one seed node `{ type: 'source', label: 'The Source' }` (only one for now — admins can add more later).
- Re-parent every current root family (one not already a child of a `source`) by inserting an edge `parent = The Source → child = family`.
- No new columns needed; `type='source'` already exists in the schema and `circle-of-life-layout.ts` already filters Source nodes out of label-tagging.

(Migration tool for the type/seed; insert tool for the data inserts.)

### 2. Circle of Life — multi-wheel grid

`src/components/circle-of-life-layout.ts`:
- `buildCircleLayout` currently always emits a single `__root__` "The Source" at center. Refactor to accept an optional `sourceId` filter: when given, only families descending from that source (and their subtree) are laid out, and the center node uses that source's label/color instead of the synthetic `__root__`.
- Keep `ROOT_ID` for backward compat (acts as the synthetic center when no real source exists).

`src/components/CircleOfLifeDiagram.tsx`:
- Accept `sourceLabel` / `sourceColor` props for the center caption ("The Source" → dynamic).
- No other behavioral changes.

`src/pages/CircleOfLife.tsx`:
- In circle view, query distinct `source` nodes from `nodes`. For each, render a `<CircleOfLifeDiagram>` in a responsive grid (`grid-cols-1 lg:grid-cols-2`), each filtered to that source's subtree. Single source → single full-width wheel (today's behavior).
- Tree view (admin editor) is unchanged; `source`-typed nodes show up like any other node and can be linked/edited.

### 3. Transformations split

- New player page **`/transformations`** (`src/pages/Transformations.tsx`): read-only list/grid of `evolution_transformations`, grouped by stage, showing label, description, granted tags, host requirements, acquisition, carrier. Accessible to all signed-in users.
- Add route in `src/App.tsx`.
- Add a **"Transformations"** button to the Circle of Life page header that opens a `Sheet` (right-side panel) showing the same list. Reuse a shared `TransformationsList` component between the page and the panel.
- `TransformationsAdmin` stays as the admin editor (unchanged).

### 4. Memory

Update `mem://apps/circle-of-life` (new) noting: Source is a real node type; wheel renders one circle per Source; Transformations live at `/transformations` + Circle side panel, never on the wheel.

## Out of scope (deferred)

- Importing official Daggerheart transformations — user will provide a list later.
- Splitting "The Source" into multiple named sources — schema/UI will already support it; just an admin task at that point.
- Any change to Racegen rolling logic.

## Technical notes

- `filterActiveCircleGraph` already excludes carriers and certain families; per-source filter will compose with it (run per-source filter first, then active filter).
- `circle-of-life-layout.ts` already auto-tags labels as tags except for `type='source'`, so introducing real source nodes won't pollute the tag set used by transformations.
- Wheel sizing: at one source, keep current 85vh. With multiple sources, drop each to ~50vh inside grid cells.
