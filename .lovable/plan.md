# Questseek Overhaul Plan

## Summary

Rebuild Questseek from a static placeholder into a full job board with three job types (one-off, repeatable, full-time), a downtime resource system, submission with roll details, admin approval, and income integration with the App of Holding.

## Job Types

1. **Commissions**: Player marks complete with roll info. Admin approves and pays. May be done multiple times. Admin sets available quantity, which depletes per completion and can be replenished.
2. **Full-time**: Subscription-style income. Pays on each day advance (like recurring payments). Automatically consumes downtime hours daily.

All commissions have a **downtime cost** (in hours). Full-time jobs consume downtime continuously.  
  
Jobs may also be Low Risk, Medium Risk, High Risk, and Illegal. 

## New Resource: Downtime

- Players gain downtime hours per advanced day (default 8, admin-configurable next to the advance day button).
- Full-time jobs auto-deduct downtime and stop paying if downtime goes negative (debt).
- One-off/repeatable jobs deduct downtime on completion.

## Database Changes (Migration)

### Modify `quests` table

- Add `job_type` text (one_off, repeatable, full_time) default 'one_off'
- Add `reward_min` integer (rename/repurpose existing `reward` as `reward_max`)
- Add `downtime_cost` integer default 0 (hours)
- Add `available_quantity` integer nullable (for repeatable jobs)
- Add `pay_interval` text nullable (for full_time: daily/weekly/monthly)

### Modify `quest_acceptances` table

- Add `roll_result` integer nullable
- Add `roll_type` text nullable (hope/fear/crit)
- Add `times_completed` integer default 0 (for repeatable tracking)

### New `downtime_balances` table

- `id` uuid PK
- `user_id` uuid NOT NULL (unique)
- `balance` integer default 0 (hours)
- `updated_at` timestamptz
- RLS: users see own, admins manage all

### New `downtime_config` table (singleton like game_calendar)

- `id` uuid PK
- `hours_per_day` integer default 8
- `updated_at` timestamptz
- RLS: everyone reads, admins update

### Modify `recurring_payments` usage

Full-time jobs will create a recurring_payment entry with metadata linking to the quest, so they integrate with the existing billing/advance-day system.

## Edge Function Changes

### `quest-operations/index.ts`

- **accept_quest**: Check downtime for one-off/repeatable. For full-time, create recurring payment + deduct ongoing downtime.
- **submit_quest**: Add `roll_result` and `roll_type` params. For repeatable, increment `times_completed` and decrement `available_quantity`.
- **resign_quest**: New operation to quit a full-time job (removes recurring payment, frees downtime).

### `quest-admin/index.ts`

- **create_quest**: Support new fields (job_type, reward_min, downtime_cost, available_quantity, pay_interval).
- **complete_quest**: Support reward range (admin picks final amount, and can be outside the range specified). Record roll info.
- **replenish_quest**: New operation to add quantity back to repeatable jobs.
- **get_submitted_quests**: Include roll_result and roll_type in response.

### `advance-day/index.ts`

- After billing, grant downtime hours to all players from `downtime_config.hours_per_day`.
- For full-time job holders: deduct downtime cost. If balance is not enough to cover the downtime cost of the full time job, do not pay the recurring payment, and do not deduct the downtime. Balance should not be able to go into negatives. 

## Frontend Changes

### `src/pages/Questseek.tsx` (Full Rebuild)

- Fetch real quests from DB instead of hardcoded data.
- Three tabs/filters: One-off, Repeatable, Full-time.
- Each job card shows: title, client, reward range (min-max), difficulty, tags, downtime cost, available qty (repeatable).
- "Accept" button for one-off/repeatable; "Apply" for full-time.
- "My Jobs" section showing accepted/active jobs with submit button.
- Submit dialog: roll result input, hope/fear/crit selector, optional notes.
- Downtime balance display at the top.
- Impersonation support via `useAdmin`.

### Questseek Admin (new page or section in Admin hub)

- Create/edit quests with all new fields.
- View submissions with roll details.
- Approve with adjustable payment (within reward range), tip/penalty.
- Replenish repeatable job quantities.
- Configure downtime hours per day.

### `src/pages/Vault.tsx`

- Add an "Income" summary card showing full-time job income (from recurring payments with quest metadata).
- Show downtime balance.

## Integration with Advance Day

When admin advances a day in Timestop:

1. All players receive `hours_per_day` downtime hours added to their balance.
2. For each active full-time job holder, deduct the job's daily downtime cost from their balance.
3. If a player's downtime balance is insufficient, pause their full-time job recurring payments (no income until balance recovers) and do not deduct downtime.
4. Process recurring payments as normal (existing billing logic handles the actual payment).

## Technical Details

- Downtime balance is stored per-user in `downtime_balances` table.
- Full-time jobs create entries in `recurring_payments` with `metadata.quest_id` to link them.
- The `advance-day` function is extended to handle downtime grants and full-time job deductions before processing billing.
- Roll types: "hope", "fear", "critical_success", "critical_failure".