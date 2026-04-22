

## Collaborative ToMe Sharing + Version History

Builds on the prior collaborative-sharing plan and adds an immutable per-edit version log so overwritten content is never lost.

### Data model changes

**New table `tome_collaborators`** (unchanged from prior plan):

| column | type | notes |
|---|---|---|
| id | uuid PK | |
| tome_entry_id | uuid | FK → `tome_entries.id` ON DELETE CASCADE |
| user_id | uuid | the collaborator |
| role | text | `'owner'` or `'editor'` |
| added_at | timestamptz | default now() |
| added_by | uuid | who invited them |

Unique `(tome_entry_id, user_id)`. Backfill one `'owner'` row per existing `tome_entries`.

**New table `tome_versions`**:

| column | type | notes |
|---|---|---|
| id | uuid PK | |
| tome_entry_id | uuid | FK → `tome_entries.id` ON DELETE CASCADE |
| title | text | snapshot of title at save time |
| content | text | snapshot of body at save time |
| edited_by | uuid | author of this version |
| editor_name | text | denormalised character name from `profiles.character_name` at save time (so renames/deletes don't break history) |
| created_at | timestamptz | real-world UTC timestamp, default now() |

Indexes: `(tome_entry_id, created_at DESC)`.

**`tome_entries`** gets `last_edited_by uuid` (nullable).

### Versioning behaviour

- A new `tome_versions` row is inserted **on every save** of `tome_entries.content` or `title` — both first creation and subsequent edits. The current `tome_entries` row is always equal to the latest version; older rows in `tome_versions` are the recoverable history.
- Trigger `trg_tome_log_version` on `tome_entries` AFTER INSERT OR UPDATE (when `title` or `content` actually changed): inserts a snapshot into `tome_versions`, capturing `auth.uid()` as `edited_by` and looking up `character_name` from `profiles` for `editor_name`. Also sets `last_edited_by = auth.uid()` on UPDATE.
- No client-side bookkeeping required — saves go through the same update call.

### RLS

- `tome_entries` SELECT/UPDATE: `has_tome_access(auth.uid(), id)`; DELETE owner-only; INSERT unchanged. Trigger auto-creates owner collaborator row.
- `tome_collaborators`: members can SELECT roster; owner can INSERT/DELETE others; any collaborator can DELETE their own row (leave); recipient can self-insert via accept flow.
- `tome_versions`:
  - SELECT: any collaborator on the parent entry (`has_tome_access`).
  - INSERT: only the trigger (function is `SECURITY DEFINER`); no direct user inserts.
  - UPDATE/DELETE: owner of the parent entry only (for pruning if ever needed). History is otherwise immutable.

### Sharing flow (recap)

`TomeShareDialog` becomes multi-recipient (checkbox list of contacts, one `tome_shares` row per recipient). Accepting a share inserts a `tome_collaborators` row instead of cloning. `ToMe.tsx` lists every entry the user is a collaborator on.

### UI additions

On each ToMe entry:

- **Access marker**: avatar/initials row + count; crown on owner. Click → Manage Access dialog.
- **Owner badge** vs **Shared** badge.
- **Manage Access dialog**:
  - Owner: list collaborators with remove (✕) per non-owner; "Invite more" reopens share dialog.
  - Collaborator: read-only list + "Leave this ToMe".
- **Delete** button: owner → "Delete for everyone"; non-owner → "Remove from my ToMe" (deletes their collaborator row).
- **"Edited by X · 2 minutes ago"** line under the title, sourced from `last_edited_by` + `updated_at`.

**New: Version History panel** (button on each entry, e.g. clock icon "History"):

- Opens a dialog/sheet listing every `tome_versions` row for this entry, newest first.
- Each row shows: real-world date + time (local timezone), `editor_name`, and a short content preview (first ~120 chars).
- Click a version to open a side-by-side **diff view** vs the current entry (read-only). Two actions:
  - **Restore this version** — copies that version's `title`/`content` onto the current `tome_entries` row (which itself logs a new version, so nothing is lost). Available to any collaborator.
  - **Copy to clipboard** — for partial recovery without overwriting.
- Owners additionally see a "Prune older than…" control (optional, off by default).

### Files touched

- New migration: `tome_collaborators`, `tome_versions`, `last_edited_by`, helpers (`has_tome_access`, `is_tome_owner`), version-logging trigger, owner-collaborator trigger, RLS rewrite, backfill (one owner row per entry + one initial version row per entry from current content).
- `src/components/TomeShareDialog.tsx` — multi-recipient picker, no copy.
- `src/components/TomeShareNotifications.tsx` — accept inserts collaborator row.
- `src/pages/ToMe.tsx` — access-based list query, badges, delete semantics, "edited by" line, History button.
- New `src/components/TomeAccessDialog.tsx` — manage access.
- New `src/components/TomeHistoryDialog.tsx` — version list, diff view, restore.

### Out of scope

Real-time co-editing, per-paragraph locking, granular field-level diffs beyond title/content.

