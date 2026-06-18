# Bulk Import: Interactive Duplicate Resolution

## Problem
When the bulk import file has rows without a `user_id` but the `character_name` matches an existing character, the `create-npc` edge function returns a 409 and the row is silently skipped. On your last import, 22 of 24 rows were skipped this way — only the 2 rows that still had `user_id` populated (Aqua Venous, Uji) actually got updated.

## Solution
Replace the silent skip with a per-row approval dialog. When a name-only row matches an existing character, pause the import and show a modal so you can decide what to do for each conflict.

## Behavior

For each row in the import:

1. Row has `user_id` → update existing character (unchanged).
2. Row has no `user_id` and no name match → create new NPC (unchanged).
3. Row has no `user_id` but name matches an existing character → **show a conflict modal** with:
   - The conflicting name and a short preview of the existing vs. incoming values (class, level, ancestry, key stats).
   - Three actions:
     - **Update existing** — apply incoming fields to the matched character (profile + character_sheet sync, same logic as the `user_id` path).
     - **Ignore** — skip this row.
     - **Create as new** — create a new NPC anyway, even though the name collides.
   - **Apply to all remaining conflicts** checkbox so you don't have to click 22 times if you want the same choice for everyone.

The import loop awaits the user's decision before moving to the next row. A running summary toast at the end reports: updated / created / ignored / failed counts (and lists names for each bucket).

## Technical Details

### `src/pages/DopplegangerAdmin.tsx`
- Pre-scan: before the loop, fetch all existing `profiles` (`user_id`, `character_name`) once into a `Map<lowercase_name, user_id>` for fast lookup.
- Rewrite the import loop as an async sequence that, on a name-only match, sets state to open a new `ImportConflictDialog` and awaits a Promise that resolves with the user's choice (`update` | `ignore` | `new`, plus an `applyToAll` flag).
- On `update`: run the same profile + character_sheet update block that the `user_id` branch uses, targeting the matched `user_id`.
- On `new`: call `create-npc` with a new flag `allow_duplicate_name: true` to bypass the 409 guard.
- On `ignore`: increment skipped count and continue.

### `src/components/ImportConflictDialog.tsx` (new)
- Small modal: shows incoming vs. existing field comparison, three action buttons, and the "apply to all remaining" checkbox.
- Pure presentational; receives `existing`, `incoming`, and an `onResolve(action, applyToAll)` callback.

### `supabase/functions/create-npc/index.ts`
- Accept new optional body field `allow_duplicate_name: boolean`. When true, skip the duplicate-name 409 guard so the "Create as new" choice works.

## Out of scope
- No schema changes.
- No changes to the single-NPC create dialog or to the per-row update path used when `user_id` is present.
- No changes to how stats default to `0` (already correct from prior fix).
