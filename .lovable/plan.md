## Goal

Let admins create **off-map locations** that don't render on the map but show up in the route picker. Routing to/from one walks the player to the closest edge node in the chosen direction, then adds extra travel time based on the off-map distance.

## Data model

Extend `map_locations` with three nullable columns (migration):
- `off_map` boolean default false
- `off_map_direction` text — one of `north|east|south|west` (null on regular pins)
- `off_map_distance_miles` numeric

Off-map rows ignore `x`/`y` (we'll just store 0,0). They are excluded from map rendering but included in pickers and pathfinding.

## Admin UI (`MazeAdmin.tsx`)

In the Add/Edit Location dialog, add a checkbox **"Off-map location"**. When checked:
- Hide the "place on map" requirement
- Show a Direction select (N/E/S/W) and a "Distance from map edge (miles)" number input
- Save row with `off_map=true`, no map placement step needed

List view marks off-map entries with a small chip ("Off-map · 4mi N").

## Player UI (`Maze.tsx` + `InteractiveMap.tsx`)

- `publicLocations` includes off-map rows in the route dropdowns (labelled e.g. `"Smuggler's Bay (4mi W)"`).
- `InteractiveMap` filters out `off_map` locations from the rendered pins/icons (no marker shown).
- When a route involves an off-map endpoint, draw the on-map portion as today, then draw a dashed line from the edge node out toward the map border in the chosen direction (purely visual hint, fixed short length).

## Pathfinding (`src/lib/pathfinding.ts`)

Add `RouteEndpoint` variant `{ type: 'offmap'; location: MapLocation }`.

Helper `findEdgeNode(direction, nodes)` picks the node with the min/max `y` (N/S) or `x` (E/W).

Behavior:
- Off-map → on-map: find edge node for the off-map's direction, BFS from there to destination node/area, prepend a synthetic point representing the off-map "exit" (same coord as edge node, used by Maze.tsx to know it's an off-map leg).
- On-map → off-map: BFS to edge node, append synthetic point.
- Off-map → off-map: BFS between the two edge nodes; prepend + append.

Return the path as today (array of `{x,y}`), but also expose the off-map leg miles so Maze.tsx can add time.

Cleanest: change `findRoute` to return `{ path, offMapMilesStart, offMapMilesEnd }` instead of bare array. Update the single caller in `Maze.tsx`.

## Travel time extension (`Maze.tsx`)

Total off-map miles = `offMapMilesStart + offMapMilesEnd`. Add to existing minute totals:
- Walking: +20 min/mile
- Public transit: +6 min/mile (assumes a bus/route exists out there)
- Private drive: +3 min/mile

Append the existing `walkMin`/`publicMin`/`driveMin` calc with these offsets before formatting.

## Files touched

- new migration: add 3 columns to `map_locations`
- `src/pages/MazeAdmin.tsx` — off-map fields in location dialog + list chip
- `src/hooks/useMazeData.tsx` — extend `MapLocation` interface
- `src/components/maze/InteractiveMap.tsx` — skip rendering off-map pins; draw dashed edge-exit line when route has off-map leg
- `src/lib/pathfinding.ts` — endpoint variant, edge-node finder, return shape change
- `src/pages/Maze.tsx` — include off-map in pickers, label with distance, add travel-time miles, pass off-map info to map

No RLS changes needed (existing policies cover the new columns).
