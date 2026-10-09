# Circle of Life — player app

## What players get
- A new **Circle of Life** tile on the main page (using the DNA.gif you uploaded), placed with the other active apps, opening `/circle-of-life`.
- A simplified, read-only page:
  - **Circle dropdown**: Source / Aberration / Construct (built from whatever source wheels exist), showing one wheel at a time.
  - **Filter** box to narrow the wheel.
  - **Transformations** button opening the existing transformations list.
  - **Export Table** button (same spreadsheet export admins have, limited to the chosen circle and filter).
  - Clicking a node still shows its read-only details panel.
- No Tree View, no editing buttons (Add Node, Save Layout, Auto-Layout, Discard, linking). Back button returns to the home page instead of Admin.
- The admin version at `/admin/circle-of-life` stays exactly as it is.

## Icon
- Upload DNA.gif into the same storage folder as the other app gifs (`icons/DNA.gif`) and reference it like the others.

## Technical details
- Add a `playerMode` prop to the existing Circle of Life page component; `/circle-of-life` route renders it with `playerMode` and `initialView="circle"`. In player mode: hide tree toggle and all `canEdit` controls, add the source `Select`, render only the selected source's `CircleOfLifeDiagram` at full height, and scope `exportTableCsv` to the selected source's subtree + filter.
- Icon upload via a short-lived edge function (same approach as the earlier avatar batch), then removed.
- Add the app entry to the `apps` array in `Index.tsx`.
