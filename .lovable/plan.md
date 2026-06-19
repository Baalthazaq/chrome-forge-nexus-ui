## Goal
Show "time since last short/long rest" in **in-game days** (not real-life time) on the Timestop admin Players tab.

## Good news: retroactive works
- `downtime_activities` already has `game_day`, `game_month`, `game_year` columns.
- RestDialog already writes the current game date when a rest is logged.
- All 11 existing rest records have game-date values, so historical entries will display correctly with no backfill needed.

## Changes

### `src/pages/TimestopAdmin.tsx` (`PlayerDowntimeSection`)
1. Fetch the current game date alongside the other loads: `supabase.from("game_calendar").select("*").limit(1).single()`.
2. Change the rest-history query to also select `game_day, game_month, game_year`.
3. Replace `formatSince(iso)` with `daysSinceGame(rest)` that:
   - Returns `"Never"` when there's no record.
   - Uses the calendar constant (13 months * 28 days + Day of Frippery = 365 days/year) to convert both the rest date and the current game date to an absolute day index, then returns the delta as `"X days ago"` (or `"Today"` when 0, `"1 day ago"` when 1).
4. Update the "Time Since Last Rest" grid to call the new helper. Keep the same per-player row layout with Short / Long columns.

### No DB migration required
The columns and data are already there. Going forward, every rest already captures the in-game date via `RestDialog`.

## Out of scope
- No changes to the activity-type filter dropdown.
- No changes to the NPC tab (can be added later if you want the same view there).
- No changes to short-rest spacing rules or game calendar logic.
