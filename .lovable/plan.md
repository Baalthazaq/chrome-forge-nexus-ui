

## Roldex Admin: Group by Sending Stone Groups

### Overview
Add a "Group by Sending Groups" mode to the Roldex Admin network view. When enabled, characters are visually clustered by their Sending Stone group chat memberships, with overlapping members (in multiple groups) handled via a layout algorithm.

### Data Fetching
- Load all **group stones** (`stones` where `is_group = true`) and their **active participants** (`stone_participants` where `left_at IS NULL`)
- No database changes needed — all data already exists

### Grouping Logic
1. Build a map: `groupId -> { name, memberUserIds[] }`
2. Build a reverse map: `userId -> groupIds[]`
3. Characters not in any group go into an "Ungrouped" bucket

### Layout & Visualization
- Add a toggle button in the header: "Group by Sending Groups"
- When enabled, use **ReactFlow group nodes** (parent nodes) to visually cluster characters:
  - Each Sending group becomes a large translucent background node (a "group box") with a label (the stone name)
  - Member nodes are positioned inside their group's bounding box
  - **Overlap handling**: Characters in multiple groups are placed in the group with fewer members (or the first group), with colored badges on the node showing all their group memberships. Edges are drawn from the character to each group box they belong to, making cross-membership visible
- Ungrouped characters are laid out separately at the bottom/right
- When grouping is off, the existing contact-based layout remains unchanged

### UI Changes (RoldexAdmin.tsx only)
1. **State**: Add `groupByStones` boolean toggle, `stones` and `stoneParticipants` data arrays
2. **Header**: Add a toggle button next to the search bar
3. **Node generation**: When `groupByStones` is true:
   - Create parent group nodes (large, semi-transparent, labeled with stone name)
   - Assign each character node a `parentId` to nest inside their primary group
   - Add multi-group badges on nodes belonging to multiple groups
   - Draw dashed edges from multi-group members to their secondary groups
4. **Layout**: Circular arrangement of members within each group box; groups arranged in a grid

### Technical Details
- ReactFlow supports parent/child node nesting via `parentId` and `extent: 'parent'` on child nodes
- Group nodes use `type: 'group'` with custom styling (colored border, translucent background, group name label)
- Saved positions in localStorage are bypassed when grouping mode is active (positions are computed)
- The existing contact-edge view and detail panel remain fully functional in grouped mode

### Files Modified
- `src/pages/RoldexAdmin.tsx` — all changes in this single file

