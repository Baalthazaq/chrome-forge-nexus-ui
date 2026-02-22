## Timestop: In-Game Calendar System

This plan builds Timestop into a fully functional in-game calendar with a custom 364+1 day year, personal events, admin-managed universal events, and subscription billing integration tied to game ticks.

---

### The Calendar System

**Year structure:**

- 13 months of 28 days each (364 days), plus 1 special standalone day called the "Day of Frippery" (always a Sunday)
- Each month starts on Sunday and ends on Saturday (28 days = exactly 4 weeks, so every month has the same layout)
- Day of Frippery sits between the months Trade and Light. It is the middle day of the year. 

**Seasons and Months (in order):**


| #   | Season | Month       | Key Holidays                                        |
| --- | ------ | ----------- | --------------------------------------------------- |
| 1   | Shield | Oath        | Day of First Promise (1st)                          |
| 2   | Shield | Stern       | Days of Confession (All month)                      |
| 3   | Shield | Engineer    | Day of the Mind (28th)                              |
| 4   | Shield | Miner       | Day of the Body (1st)                               |
| 5   | Shield | Retribution | Day of No Mask (11th), Day of Shield and Axe (28th) |
| 6   | Axe    | Shackles    | Day of Shame (21st)                                 |
| 7   | Axe    | Trade       | Day of Therin (25th)                                |
| 8   | -      | Frippery    | Lie Day (standalone day)                            |
| 9   | Axe    | Light       | Truth Day (1st)                                     |
| 10  | Axe    | Navigator   | Finder's Day (any)                                  |
| 11  | Hammer | Tryst       | Baubledays (unofficial, any)                        |
| 12  | Hammer | Destiny     | Days of Ease (All month)                            |
| 13  | Hammer | Groveling   | Grovellerday (4th)                                  |
| 14  | Hammer | Negotiation | Therin's Reckondays (25th-28th)                     |


**Day of Frippery** is displayed as a 14th month, but with 27 out of 28 days blank, so effectively Sunday occurs twice in a row, but it does not distrub the layout. 

---

### Database Changes

**New table: `game_calendar**` (single-row config, stores the current in-game date)

- `id` (uuid, PK)
- `current_day` (integer, 1-28) -- day within the current month
- `current_month` (integer, 0-13) -- 0 = Day of Frippery, 1-13 = months
- `current_year` (integer, default 1)
- `updated_at` (timestamp)

RLS: everyone can SELECT, admin-only for UPDATE.

**New table: `calendar_events**`

- `id` (uuid, PK)
- `user_id` (uuid, nullable) -- null = universal/admin event, set = personal event
- `title` (text)
- `description` (text, nullable)
- `event_day` (integer) -- 1-28 within a month, or 1 for Frippery
- `event_month` (integer) -- 0-14
- `event_year` (integer, nullable) -- null = recurring every year
- `is_holiday` (boolean, default false) -- for built-in holidays
- `is_recurring` (boolean, default false)
- `created_at` (timestamp)

RLS: Users can CRUD their own events. Admin can CRUD all events. All authenticated users can SELECT universal events (where `user_id IS NULL`).

A migration will seed the holidays from the spreadsheet as `calendar_events` rows with `user_id = NULL`, `is_holiday = true`, and `is_recurring = true`.

---

### Subscription Billing Integration

When admin clicks "Advance Day" in Timestop Admin, the system:

1. Increments the in-game date by 1 day (wrapping months/years, handling Frippery)
2. After advancing, checks if billing should trigger based on the NEW date:
  - **Daily**: triggers every tick (calls `trigger_daily` on the existing `admin-financial` edge function)
  - **Weekly**: triggers on the 2nd, 9th, 16th, and 24th of each month (skips Frippery)
  - **Monthly**: triggers on the 14th of each month (skips Frippery)
  - **Yearly**: triggers on the 1st of month 1 (Oath 1st -- New Year)
3. Returns a summary of what was processed

This reuses the existing `admin-financial` edge function's `trigger_daily`, `trigger_weekly`, `trigger_monthly`, and `trigger_yearly` operations, so no billing logic needs to be rewritten.

**New edge function: `advance-day**`

- Admin-only
- Reads current date from `game_calendar`, increments it
- Determines which billing cycles to fire
- Calls the existing `admin-financial` function for each applicable cycle
- Returns: new date + billing summary

---

### Player-Facing UI (`/timestop`)

Replace the current placeholder with a real in-game calendar:

- **Header**: "TIMESTOP" branding, current date display (e.g. "12th of Trade, Year 1 -- Season of the Axe")
- **Month navigation**: Previous/Next month arrows to browse through the calendar
- **Calendar grid**: 7 columns (Su-Sa), 4 rows of 7 = 28 days. Current game day highlighted
- **Day of Frippery**: When navigating to it, shows as a special single-day display instead of a month grid
- **Event dots**: Days with events show small colored dots (amber for holidays, cyan for personal events)
- **Day click**: Clicking a day opens a panel showing events for that day, with ability to add/edit/delete personal events
- **Holiday info**: Clicking a holiday shows its name and description from the reference data

---

### Admin UI (`/admin/timestop`)

New admin page with:

- **Current date display** and "Advance Day" button (with confirmation showing which billing cycles will fire)
- **Multi-advance**: Option to advance multiple days at once (e.g. "Advance 7 days") with billing processing for each
- **Shared calendar view**: A calendar that shows ALL events from ALL users, color-coded by user. Clicking a day shows everyone's events for that day
- **Universal event management**: Create/edit/delete events visible to all players. Toggle recurring (yearly) vs one-time
- **Holiday management**: View seeded holidays (pre-populated from the spreadsheet data)

---

### Technical Details

**Files to create:**

- `src/lib/gameCalendar.ts` -- calendar logic: month names, season names, day calculations, date formatting, holiday seed data, billing trigger checks
- `src/pages/TimestopAdmin.tsx` -- admin calendar view
- `supabase/functions/advance-day/index.ts` -- edge function for advancing game time + triggering billing

**Files to modify:**

- `src/pages/Timestop.tsx` -- replace placeholder with real calendar
- `src/App.tsx` -- add route for `/admin/timestop`

**Database migration:**

- Create `game_calendar` table with initial row (Day 1, Month 1, Year 1)
- Create `calendar_events` table
- Seed holiday events from the spreadsheet data
- RLS policies for both tables

**NPC stuff**: Remains scoped for Doppleganger admin as requested -- not part of this implementation.