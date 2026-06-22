# BHoldR impersonation fix + Doppleganger Aliases

## Part 1 — BHoldR impersonation fix (small)

In `src/pages/BHoldR.tsx`, derive an `effectiveUserId` from `useAdmin().impersonatedUser?.user_id ?? user.id` and use it everywhere a write is keyed to the actor:

- `postComment` — `user_id: effectiveUserId`
- `rateVideo` — both the `.delete()` and `.upsert()` calls
- Video upload (`user_id` field on insert into `beholdr_videos`)
- `deleteComment` ownership check on the UI side (`comment.user_id === effectiveUserId`)

Comment author name will then come from the impersonated user's profile via the existing join, so no extra work needed.

## Part 2 — Aliases (Doppleganger)

### Concept

A player has one "primary" character (their account) and zero-or-more **aliases**. Each alias is a self-contained set of stats/appearance that can be made *active*. The active alias is persistent — it sticks across apps until the player switches back, mirroring the admin impersonation flow but self-serve and constrained to that player's own aliases.

Two alias kinds:
- **Private** — wild shape, familiar, disguise. No Rol'dex entry, not searchable, invisible to other players outside of the sheet itself.
- **Public** — a separate identity. Discoverable in Rol'dex / Sending / CVNews / Succubus as its own persona.

Money, downtime, bills, inventory purchases, contacts list, tome entries, etc. remain on the **primary** user account regardless of active alias. Only the sheet and the displayed name/avatar swap.

### Data model

New table `public.character_aliases`:

- `owner_user_id` → primary `auth.users.id` (the player)
- `name`, `avatar_url`, `bio`
- `is_public` (bool) — controls Rol'dex/Sending/etc. visibility
- `sheet_data` (jsonb) — snapshot of all `character_sheets` fields *and* the profile stat fields (agility/strength/finesse/instinct/presence/knowledge, level, class, subclass, ancestry, community, job, company, etc.). Stored as a blob so we don't duplicate the schema.
- `is_active` (bool) — exactly one alias OR primary is active per owner; enforced by partial unique index
- `created_at`, `updated_at`

RLS: owner can CRUD their own aliases; `authenticated` can SELECT public aliases of others (needed for Rol'dex etc.); admins ALL. Standard GRANTs.

Primary identity is stored where it already is (`character_sheets` + `profiles`). We do **not** create a row in `character_aliases` for the primary — instead the "active alias" state is: either no alias is `is_active` (primary active) or exactly one is.

### Active alias resolution

A new hook `useActiveIdentity(userId)` returns:
```
{ identityKind: 'primary' | 'alias', aliasId?, displayName, avatarUrl, sheet, profileStats }
```

Reads of "the current character" across the app go through this hook. Behaviour by surface:

- **Doppleganger sheet** — reads/writes `character_aliases.sheet_data` when an alias is active; falls back to current behaviour for primary. Saves go to the alias blob, not to `character_sheets`/`profiles`.
- **Rol'dex listing of other players** — query `profiles` (as today) UNION public `character_aliases`.
- **Sending Stone** — message author display name + avatar come from `useActiveIdentity`. Stones can include public aliases as participants (participant row stores `alias_id` nullable alongside `user_id`).
- **CVNews / Succubus** — submissions/profiles tagged with active alias id; display uses alias name/avatar.
- **Money, downtime, bills, purchases, inventory, tome, encounters, etc.** — unchanged, always keyed to primary `user_id`.
- **Admin / Timestop player lists** — unchanged; aliases do *not* get their own downtime balance row or appear as separate players.

This keeps the blast radius small: only player-facing identity surfaces consult `useActiveIdentity`; everything financial/admin stays on `user_id`.

### Doppleganger UI

Add an **Aliases** button in the Doppleganger header row (next to Edit Mode):

- Opens an `AliasManagerDialog`:
  - List of aliases with active indicator, name, avatar, public/private badge
  - **Switch to** action per row (and "Switch to Primary")
  - **Edit** (name, avatar, bio, public toggle) and **Delete**
  - **+ New Alias** — choose Private/Public, name, optional avatar; sheet starts as a copy of whichever identity is currently active so wild-shape-style use is easy
- The header subtitle shows "Playing as: {alias name}" with a quick "Return to {primary name}" link when an alias is active, styled like the admin impersonation banner.

When an alias is active, the Doppleganger sheet edits the alias blob. Profile-sync code (`SHEET_TO_PROFILE_MAP`) is gated to only run for primary.

### Cross-app surfaces (concrete touch-points)

- `src/pages/Roldex.tsx` — extend "people" query to include public aliases; key rows by `alias_id ?? user_id` so duplicates don't collapse.
- `src/pages/Sending.tsx` + `SendingAdmin` — participant lookup and message author display use `useActiveIdentity`; participants table gains an optional `alias_id` (migration).
- `src/pages/Succubus.tsx`, `src/pages/NexusWire.tsx` (CVNews) — author/profile rows tagged with `alias_id` nullable.
- `BHoldR` — already getting impersonation fix; same `effectiveUserId` should resolve to active alias's owner (still primary `user_id`, since BHoldR is keyed to the account, not the persona). For author name it uses `useActiveIdentity` so comments show the active alias's name.

### Migrations

1. Create `character_aliases` with GRANTs + RLS + partial unique index ensuring at most one active alias per owner.
2. Add nullable `alias_id` to: `stone_participants`, `casts` (Sending messages), `news_articles` (or submissions table), `succubus_profiles` rows that represent the user (only if user-owned), `beholdr_comments`, `beholdr_videos`. Each FK → `character_aliases(id) ON DELETE SET NULL`.

(Money/downtime/bills/quests/purchases tables get nothing.)

### Out of scope (call out)

- Aliases cannot own money, downtime, or accept quests independently.
- No alias-to-alias permissions, no per-alias roles.
- Admin impersonation continues to target primary users only; once impersonating, the admin can still use the player's Alias switcher to act as one of that player's aliases.

## Technical summary

- New table `character_aliases` + 1 migration for FK columns on identity-bearing tables.
- New hook `src/hooks/useActiveIdentity.tsx` (subscribes to `character_aliases` changes for the current user).
- New component `src/components/doppleganger/AliasManagerDialog.tsx` and a button in `CharacterHeader`.
- `src/pages/Doppleganger.tsx` reads/writes through `useActiveIdentity` when an alias is active; primary path unchanged.
- `src/pages/BHoldR.tsx` switches all write `user_id`s to `impersonatedUser?.user_id ?? user.id` and comment author display uses `useActiveIdentity`.
- Rol'dex, Sending, CVNews, Succubus updated to include public aliases / author-by-active-identity.
