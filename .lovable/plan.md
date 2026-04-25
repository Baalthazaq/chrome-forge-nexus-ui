## Commission "Work Complete" overhaul + Reviews tab

### 1. Log Hours input (Questseek front-end)

In `src/pages/Questseek.tsx`:
- Default `logHoursAmount` to empty string (already is) — keep `<Input>` blank, no `0` placeholder. Confirm `min="1"`, no `defaultValue`.
- Compute and pass a hard `max` to the input:
  - `unitHours = quest.downtime_cost`
  - `available = quest.available_quantity ?? 1` (treat null = unlimited; only cap when set)
  - `maxHours = unitHours * available - already_logged_for_unit_remainder`
  - Show helper text: `"Max ${maxHours}h (covers up to ${available} completion(s))"`.
- Client-side guard before invoking: clamp `hours` and reject if > max.

### 2. "Work Complete" = one-at-a-time completion

Today, a single submit consumes all `hours_logged` ≥ `downtime_cost` and decrements `available_quantity` by 1, but leftover banked hours can be re-used silently. Change so that pressing **Work Complete**:

- Validates `hours_logged >= downtime_cost` for the unit.
- Submits exactly **one** unit:
  - Creates a **new submitted acceptance row** (one per completion) so each shows up as a distinct review in admin / poster's review box.
  - Subtracts `downtime_cost` from `hours_logged` on the active acceptance (carry remainder forward).
  - Decrements `quests.available_quantity` by 1.
- Leaves the active acceptance in `accepted` status with the remaining banked hours so the player can press **Work Complete** again immediately if they have enough hours and slots remain.
- Disables the button when `hours_logged < downtime_cost` OR `available_quantity <= 0`.

Edge function changes in `supabase/functions/quest-operations/index.ts`:
- Refactor `submitQuest` (commission branch) to the new "split one completion off" semantics described above. Full-time path unchanged.
- Cap `logQuestHours` so a single log call cannot push `hours_logged` above `downtime_cost * available_quantity` (re-fetched live), to defend against stale UI.

### 3. Per-completion review rows

Because each completion is its own `quest_acceptances` row with `status='submitted'`:
- Admin Review box (`get_submitted_quests`) automatically lists each as a separate entry — no change needed.
- Player-poster "My Posted" view automatically lists each submission separately — no change needed.

### 4. Player-posted commission reviews → Reviews tab + default landing

In `src/pages/Questseek.tsx`:
- Compute `pendingPlayerReviews` = sum of `submitted` + `pending_approval` acceptances across `myPostedQuests`.
- Add new **Reviews** tab (value `reviews`) placed immediately after **My Jobs**:
  - Trigger label: `Reviews (${pendingPlayerReviews})`, only rendered when the user has any posted quests.
  - Content reuses the existing "Submissions" / "Applications" panels currently inside the **My Posted** tab, filtered to entries that need action.
- Keep the existing **My Posted** tab for full management of posted jobs (active/completed history).
- Default tab logic:
  - If `pendingPlayerReviews > 0` → default `reviews`.
  - Else fall back to current default `my_quests`.
- Implement via `Tabs` controlled `value` with `useState` initialized from the computed default.

### Out of scope

- Full-time job semantics (unchanged).
- Changing how downtime balance is deducted at log time (still up-front).
- Backfilling past mis-logged hours.
