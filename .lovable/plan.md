## Goal

Treat each alias as its own Sending Stone identity, so Cegorach↔Sige and Balderai↔Sige are entirely separate conversations that never collide.

## Model

An "identity" is the pair `(user_id, alias_id)` where `alias_id` is `NULL` for the primary character. Every stone, participant, and cast is tied to an identity, not just a user.

- Balderai (primary): `(balderai_user, NULL)`
- Cegorach (alias): `(balderai_user, cegorach_alias_id)`
- Sige (primary): `(sige_user, NULL)`

A 1:1 stone is uniquely defined by the **pair of identities**, not the pair of users. The active identity at conversation-start time owns that side of the stone forever.

## Inbox scoping

When viewing Sending Stone, you only see stones where the **active identity** matches. Switch from Balderai → Cegorach in Doppleganger and the inbox swaps to Cegorach's conversations. Balderai's chats with Sige are invisible while Cegorach is active, and vice-versa. This is what makes the "fake account" fiction work.

## Database changes

1. Add `alias_id uuid null` to `stone_participants` (FK → `character_aliases.id`, on delete set null).
2. Add `participant_one_alias_id`, `participant_two_alias_id` to `stones` (legacy 1:1 columns) for symmetry / migrations.
3. Add `sender_alias_id` is already on `casts` (`alias_id` column exists per code) — no change.
4. Replace the unique constraint on `stone_participants(stone_id, user_id)` with `stone_participants(stone_id, user_id, alias_id)` so the same user can join the same stone under different identities (rare, but correct).
5. Update RLS helpers (`is_stone_participant`, `is_active_stone_participant`) — no change needed, still keyed on user_id, which is fine for read access (a user can still read both their primary and alias stones via their auth.uid).

## Code changes (`src/pages/Sending.tsx`)

1. Use `useActiveIdentity()` to get the current `{ userId, aliasId }`.
2. `loadStones()` filters `stone_participants` by **both** `user_id = userId` AND `alias_id IS [NOT] DISTINCT FROM aliasId`, so only the active identity's inbox shows.
3. `createNewStone(recipientId)`:
   - Existence check matches stones where my side = `(userId, aliasId)` AND their side = `(recipientId, null)` (recipient is currently always a primary).
   - Insert `stone_participants` rows with `alias_id` populated for the sender side.
   - Drop the legacy `participant_one_id`/`participant_two_id` writes (or also stamp the alias columns) — keep them populated for backward compat but no longer rely on them for uniqueness.
4. `createGroupStone()`: same — group members are identities, member list is `(user_id, alias_id)` tuples.
5. `sendCast()` already stamps `alias_id` from active identity. Keep.
6. `addParticipant` / leave / rejoin: scope to the identity tuple.

## Backfill

Existing `stone_participants` rows have `alias_id = NULL` (primary). The Cegorach↔Sige stone currently blocked by Balderai↔Sige will now be created cleanly because the uniqueness key includes alias_id.

No need to re-shuffle history — old conversations stay attached to the primary identity, which matches what already happened.

## Out of scope (unless you want it)

- Letting players **message an alias directly** (i.e. picking "Cegorach" in the recipient list when his alias is public). Today the recipient picker shows users only. Say the word and I'll add public aliases to the picker too.
- Showing the sender's alias avatar/name in the stones list sidebar (already done in cast bubbles via `alias_id`).

## Questions before I build

1. When Sige is the recipient and Cegorach DMs him, should Sige see "Cegorach" as the conversation partner (yes — aliases exist to be believable), even though Sige's own inbox is keyed to his primary identity? **Assumption: yes.**
2. If the alias is later deleted, what happens to its conversations? **Assumption: stones remain, partner name falls back to "Unknown alias".** Let me know if you'd rather cascade-delete.
