# Downtime & Rest System Overhaul

## Summary

Remove downtime display from Vault, add it to Questseek/Timestop/Doppleganger. Add Short Rest and Long Rest dialogs to those three pages. Create a new "Downtime" tab in Timestop for activity history. Add admin downtime oversight in TimestopAdmin. Cap downtime accumulation at 100 hours.

## Database Changes (Migration)

### New `downtime_activities` table

Tracks all downtime spending: rests, work/commissions, full-time job deductions.


| Column            | Type             | Notes                                                          |
| ----------------- | ---------------- | -------------------------------------------------------------- |
| id                | uuid PK          | &nbsp;                                                         |
| user_id           | uuid NOT NULL    | &nbsp;                                                         |
| activity_type     | text NOT NULL    | 'short_rest', 'long_rest', 'commission', 'full_time_deduction' |
| hours_spent       | integer NOT NULL | &nbsp;                                                         |
| activities_chosen | jsonb            | Array of chosen moves (up to 2)                                |
| notes             | text             | Player description                                             |
| game_day          | integer          | Which in-game day                                              |
| game_month        | integer          | &nbsp;                                                         |
| game_year         | integer          | &nbsp;                                                         |
| created_at        | timestamptz      | &nbsp;                                                         |


RLS: Users see own, admins see all.

### Modify `downtime_balances`

No schema change needed, but the `advance-day` function must cap balance at 100.

## Vault Changes

- Remove the "Downtime" card from `Vault.tsx` (the income card can stay).

## Rest Dialog Component

Create `src/components/RestDialog.tsx` — shared by Doppleganger, Questseek, Timestop.

**Props**: `type: 'short' | 'long'`, `open`, `onClose`, `userId`

**UI**:

- Rest type label (Short Rest / Long Rest)
- Default hours: 1 for short, 8 for long (editable)
- Game day picker (day, month, year — defaults to current game date)
- Activity checklist: pick up to 2 from the appropriate list
  - **Short Rest**: Tend to Wounds, Clear Stress, Repair Armor, Prepare
  - **Long Rest**: Tend to All Wounds, Clear All Stress, Repair All Armor, Prepare, Work on a Project
- Notes textarea
- Submit deducts hours from `downtime_balances` and inserts into `downtime_activities`
- `If more activities are picked, allow it, but give a message indicating that more than two have been picked.` 

## Page Changes

### Doppleganger, Questseek, Timestop

- Add downtime balance display (small badge/indicator)
- Add "Short Rest" and "Long Rest" buttons that open the RestDialog
- All three share the same RestDialog component

### Timestop — New "Downtime" Tab

- Third tab alongside Monthly and Annual: "Downtime"
- Shows chronological list of all `downtime_activities` for the effective user
- Each entry shows: date, type (rest/commission/job), activities chosen, hours, notes
- Filter by type optional

### TimestopAdmin — Downtime Oversight

- New section or tab: "Player Downtime"
- Shows all players' downtime balances and recent activities
- Fetches from `downtime_activities` joined with `profiles` for character names

## Edge Function Changes

### `quest-operations` — new operation `log_rest`

- Validates hours available, deducts from `downtime_balances`, inserts `downtime_activities` record
- Accepts: `targetUserId`, `activity_type`, `hours_spent`, `activities_chosen`, `notes`, `game_day/month/year`

### `advance-day` — cap at 100

- After granting daily hours, clamp balance to `Math.min(balance + grant, 100)`

## Files to Create/Edit

- **Create**: `src/components/RestDialog.tsx`
- **Create**: migration for `downtime_activities` table
- **Edit**: `src/pages/Doppleganger.tsx` — add downtime display + rest buttons
- **Edit**: `src/pages/Questseek.tsx` — add downtime display + rest buttons
- **Edit**: `src/pages/Timestop.tsx` — add downtime display, rest buttons, Downtime tab
- **Edit**: `src/pages/TimestopAdmin.tsx` — add player downtime overview
- **Edit**: `src/pages/Vault.tsx` — remove downtime card
- **Edit**: `supabase/functions/quest-operations/index.ts` — add `log_rest` operation
- **Edit**: `supabase/functions/advance-day/index.ts` — cap balance at 100