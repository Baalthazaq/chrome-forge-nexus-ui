

## Plan: Redesign Full-Time Job Salary System

### Current State
- When a full-time job application is approved (`quest-admin` `approveApplication`), a `recurring_payment` is created that **deducts** from the employee via `admin-financial` (inverted).
- `advance-day` processes daily downtime deductions for full-time jobs but salary is handled separately via `recurring_payments`.
- `logQuestHours` in `quest-operations` lets players spend downtime on a job, but caps hours at `downtime_cost` (won't let you go over).

### New Design

**How it works:**
- `hours_logged` on `quest_acceptances` tracks cumulative hours worked toward the job.
- `downtime_cost` on `quests` = hours required per pay cycle.
- On payday (determined by `pay_interval` matching billing triggers in `advance-day`), check if `hours_logged >= downtime_cost`.
  - **Yes**: Pay the employee (credit `reward` to their profile), deduct `downtime_cost` from `hours_logged` (leaving any surplus banked for next cycle).
  - **No**: Skip payment, leave `hours_logged` as-is (keeps accumulating), and create a review notification for admin.
- Players can log hours **beyond** the `downtime_cost` limit (remove the cap in `logQuestHours`).

### Changes

**1. `supabase/functions/quest-admin/index.ts` — `approveApplication`**
- Remove the `recurring_payments` insert entirely. Salary is now handled by `advance-day`.

**2. `supabase/functions/quest-operations/index.ts` — `logQuestHours`**
- Remove the cap that prevents logging hours beyond `downtime_cost`. Allow unlimited hour banking.
- Update the `remaining` calculation and remove the "All hours already logged" error.

**3. `supabase/functions/advance-day/index.ts` — Add salary processing**
- Remove the existing full-time downtime deduction logic (the daily `Math.ceil(cost/interval)` deduction from downtime balances and the pause/unpause logic tied to it — that system is being replaced).
- After the daily downtime grant, check billing triggers for each full-time acceptance's `pay_interval`.
- When a trigger fires:
  - If `hours_logged >= downtime_cost`: credit employee's profile with `reward`, deduct `downtime_cost` from `hours_logged`, log a transaction.
  - If `hours_logged < downtime_cost`: skip payment, insert a notification entry in the admin review queue (using `quest_acceptances` admin_notes or a dedicated mechanism).

**4. Admin notification for missed payments**
- Insert a record into `quest_acceptances` with a note (update `admin_notes` with missed payment info), which will surface in the QuestseekAdmin review tab.
- Alternatively, create a simple `admin_notifications` table. Given the small user base, appending to `admin_notes` on the acceptance is simpler and already visible in the review UI.

**5. UI updates (`Questseek.tsx` and `Timestop.tsx`)**
- Remove the hour cap in the Work dialog's `max` attribute — allow logging beyond `downtime_cost`.
- Update progress bar to show overflow (e.g., 120/100h in green+gold).
- Update filter that hides "completed" work jobs — full-time jobs should always be workable.

### Files Modified
- `supabase/functions/quest-admin/index.ts` — Remove recurring_payment creation
- `supabase/functions/quest-operations/index.ts` — Remove hour cap in `logQuestHours`
- `supabase/functions/advance-day/index.ts` — Replace downtime deduction with salary-on-payday logic
- `src/pages/Questseek.tsx` — Remove hour cap in UI, update progress display
- `src/pages/Timestop.tsx` — Same UI updates for Work dialog

