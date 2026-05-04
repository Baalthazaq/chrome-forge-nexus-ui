## Goal
Upgrade the Questseek admin "Approve" dialog so admins can pay in **credits and/or downtime hours**, apply downtime **penalties**, and get a **suggested payout** based on the player's roll vs. the job's risk DC. Suggestions are hints — admin can always override (no min/max clamp on the inputs). All suggested numbers are whole integers.

## Suggestion logic

DC by risk:
- Low Risk → 10
- Medium Risk → 13
- High Risk → 16

Inputs: `min = quest.reward_min`, `max = quest.reward`, `roll`, `DC`, `unitHours = quest.downtime_cost`.

- **Failure (roll < DC)** → suggest `min` credits, downtime adj `0`. Banner: "Failed roll — minimum payout suggested" (red).
- **Success (roll ≥ DC)** → linear ramp where `roll = DC` yields `min + 1`, `roll ≥ 30` yields `max`.
  - `suggested = Math.round(min + 1 + (roll - DC) * (max - min - 1) / (30 - DC))`
  - Clamp to `[min + 1, max]`. Guard when `max ≤ min + 1` (just use `max`).
- **Hope roll** → downtime adjustment `+1` hour.
- **Fear roll** → downtime adjustment `-1` hour.
- **Critical Success** → suggest `max` credits AND refund `Math.max(1, Math.ceil(unitHours / 2))` hours.

(No critical-failure handling — Daggerheart has no crit fail.)

All suggested values are integers via `Math.round` / `Math.ceil`. Admin inputs accept any integer (positive, negative, above max, below min).

## Admin dialog changes (`src/pages/QuestseekAdmin.tsx`)

- Add state: `downtimeAdjustment` (string, signed integer hours; positive = grant, negative = penalty).
- On opening dialog, compute suggested credits + hours from roll/risk and pre-fill both fields.
- Banner above inputs:
  - Red "Failed roll — minimum payout suggested" for failure
  - Gold "Critical Success — full payout + hours refund suggested" for crit success
  - Otherwise neutral context line: `"DC ${dc} • Rolled ${roll} (${rollType})"`
- New input row: **Downtime adjustment (hours)** with helper text "positive = grant hours, negative = penalty".
- Relabel credit field helper to: `"Suggested ⏣X • job range ⏣min – ⏣max"`.

## Edge function changes (`supabase/functions/quest-admin/index.ts`)

`complete_quest` accepts new param `downtimeAdjustment` (signed int, default 0):

1. Pay credits as today (split across participants).
2. For each participant, if `downtimeAdjustment !== 0`:
   - Upsert `downtime_balances` (`balance += downtimeAdjustment`); allow negative (no floor here).
   - Insert a `downtime_activities` row (`activity_type = 'quest_adjustment'`, `hours_spent = -downtimeAdjustment`, notes referencing quest title + roll).
3. Update `admin_notes` to include both credit and downtime info, e.g.:
   `"Approved. Paid ⏣500 + 2h downtime to Trinker. Roll: 14 (hope) vs DC 13."`
4. Return `{ participantsPaid, paymentPerParticipant, downtimeAdjustment }`.

## Notification surface

`useAppNotifications` already flags `quest_acceptances` rows with non-null `admin_notes`. The richer notes (credits + hours + roll) automatically show up in the player's My Jobs view.

## Files touched

- `src/pages/QuestseekAdmin.tsx` — dialog UI, suggestion calc, new state, send `downtimeAdjustment`
- `supabase/functions/quest-admin/index.ts` — extend `complete_quest` to apply downtime + write richer notes

No DB schema changes needed.
