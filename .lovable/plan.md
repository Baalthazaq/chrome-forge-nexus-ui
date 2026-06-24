## What Uji is seeing

The Questseek red dot comes from `useAppNotifications` counting `quest_acceptances` rows where `status IN ('completed','rejected')` AND `admin_notes IS NOT NULL`. For Uji there are **6 such rows**, all `completed` commissions (Gutter-Street Doc x4, Scrap collection, Lucid Dream Courier) with admin notes like "Approved. Paid 70 credits…".

Today there is no way to clear these. The "Dismiss" button at line 638 of `Questseek.tsx` only appears in the rejected-quests list; completed commissions have no acknowledge action, so the badge stays on forever once a player has completed any paid commission.

## Fix

Add an explicit acknowledgement so Uji (and anyone else) can clear the badge.

### Schema
- Migration: add `acknowledged_at timestamptz` to `public.quest_acceptances`.

### Notification query (`src/hooks/useAppNotifications.tsx`)
- Add `.is('acknowledged_at', null)` to the questseek count so only un-acknowledged completed/rejected rows trigger the badge.

### Questseek UI (`src/pages/Questseek.tsx`)
- In the "My Quests" / history section where completed acceptances are rendered (around lines 945 and 829), show a small "Dismiss" / "Acknowledge" button on each completed or rejected acceptance that still has `acknowledged_at = null`. Clicking it updates that row's `acknowledged_at = now()` and removes it from the local list (or just hides the button + clears the badge on next refresh).
- Update the existing rejected-quest "dismiss" handler at line 638 to set `acknowledged_at` instead of (or in addition to) `status = 'dismissed'`, so the same mechanism clears both cases.
- Add an "Acknowledge all" button at the top of the history section that bulk-sets `acknowledged_at = now()` for the current user's outstanding completed/rejected rows — one click clears Uji's six at once.

### How Uji clears it today (until the fix ships)
There is no in-app way. The only options right now are:
1. Wait for the fix below, then click "Acknowledge all", or
2. Have an admin run `UPDATE quest_acceptances SET admin_notes = NULL WHERE user_id = '<uji>' AND status = 'completed';` — but this loses the payout history, so I do **not** recommend it.

## Technical notes
- `quest_acceptances` already has the `dismissed` status used for rejected quests; we keep that working but layer `acknowledged_at` on top so completed rows (which must stay as `completed` to preserve `times_completed` and payment history) can also be cleared without losing data.
- No edge-function changes required — the updates are a simple authenticated `UPDATE` against the user's own row, covered by existing RLS.