

## Data Export Page

### What
A new admin-only page at `/admin/data-export` that lists every Supabase table in the project and lets you export each one as a CSV file.

### Approach
1. **New page `src/pages/DataExport.tsx`**:
   - Protected with `useAdmin()` hook (same pattern as other admin pages)
   - Hardcoded list of all tables (since we know them from the schema): `profiles`, `character_sheets`, `contacts`, `contact_tags`, `quests`, `quest_acceptances`, `purchases`, `bills`, `recurring_payments`, `transactions`, `stones`, `casts`, `stone_participants`, `quick_notes`, `calendar_events`, `calendar_event_shares`, `downtime_activities`, `downtime_balances`, `downtime_config`, `game_calendar`, `game_cards`, `news_articles`, `organizations`, `beholdr_channels`, `beholdr_videos`, `beholdr_comments`, `beholdr_ratings`, `map_areas`, `map_locations`, `map_notes`, `map_location_reviews`, `map_area_reviews`, `map_route_nodes`, `map_route_edges`, `admin_sessions`, `user_roles`, `reputation_tags`
   - Each table shown as a row with its name and an "Export CSV" button
   - On click, queries `supabase.from(tableName).select('*')` and converts to CSV, triggering a browser download
   - Show row count per table after initial load

2. **Admin page button**: Add a "Data Export" button to the admin grid in `Admin.tsx`, navigating to `/admin/data-export`

3. **Route**: Add `/admin/data-export` to `App.tsx`

### Technical details
- CSV conversion done client-side using a simple utility (JSON to CSV with headers from object keys)
- Uses the admin's authenticated session so RLS admin policies grant full SELECT access
- No new database tables or migrations needed

