## Goal
Let players send/destroy Hex from App of Holding to anyone (contacts, other characters, corporations) or to a free-typed placeholder recipient that admins can later resolve.

## UX changes — Vault "Send Hex" dialog

Replace the recipient `Select` with an autocomplete combobox (Command/Popover):
- Typing filters across three grouped sources, in this order:
  1. **Your Contacts** — characters in your `contacts` table
  2. **Other Characters** — remaining profiles
  3. **Corporations** — entries from `organizations`
- A fourth group appears whenever the typed text matches no existing entry:
  - **"Send to '<typed name>'"** — creates a placeholder recipient (money leaves the player; recipient is a named holding bucket).
- Add a checkbox / extra option **"Remove from circulation"** (no recipient) for the "just destroy money" case. This routes to a special system sink.
- Amount + description fields unchanged.

## Data model

New table `placeholder_recipients`:
- `name` (text, unique, case-insensitive)
- `balance` (integer, default 0)
- `notes` (text, admin-only)
- `resolved_to_user_id` (uuid, nullable) — when admin links the placeholder to a real profile, balance is transferred and recipient is marked resolved.
- RLS: authenticated can SELECT + INSERT (so send flow works); only admins UPDATE/DELETE.

Transactions table already supports `to_user_id` nullable. Add an optional `placeholder_recipient_id` column (uuid, nullable) to `transactions` so we can link the audit trail. (Alternative: just stuff it in `description`; column is cleaner.)

## Edge function changes (`financial-operations`)

Extend `send_money`:
- Accept either `to_user_id` (existing), `placeholder_name` (new), or `destroy: true` (new).
- If `placeholder_name`: find-or-create row in `placeholder_recipients` (case-insensitive match), debit sender, credit the placeholder's `balance`, write transaction with `placeholder_recipient_id`, description prefixed `To placeholder: <name>`.
- If `destroy`: debit sender only, no credit, transaction labelled `Hex removed from circulation`.
- Keep existing user-to-user path.

## Admin: App of Holding admin page (`VaultAdmin.tsx`)

Add a **Placeholder Recipients** section:
- Table of placeholders: name, balance, created date, # of transactions, notes.
- Actions per row:
  - **Resolve to user** — pick a profile; on confirm, transfer balance to that profile, mark `resolved_to_user_id`, hide from active list.
  - **Edit name / notes**
  - **Delete** (with confirm; warns if balance > 0)
- Filter: show active / resolved / all.

## Files to touch
- `supabase/migrations/<new>.sql` — new table + column + RLS + GRANTs.
- `supabase/functions/financial-operations/index.ts` — extend `send_money`.
- `src/pages/Vault.tsx` — replace recipient Select with Command-based autocomplete; add destroy option; load contacts + organizations.
- `src/pages/VaultAdmin.tsx` — add Placeholder Recipients management section.
- `src/integrations/supabase/types.ts` — regenerated automatically post-migration.

## Open question
For the "remove money / send to holding point" wording — should the **destroy** option be a separate button ("Burn Hex") next to "Send Hex", or live inside the Send dialog as a toggle? I'll default to a toggle inside the dialog ("Remove from circulation — no recipient") unless you prefer a dedicated button.