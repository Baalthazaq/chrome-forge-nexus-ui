

## Fix: Filter Suggestions to Current User

### Problem
The "Your Previous Suggestions" query fetches all rows from the `suggestions` table without filtering by `user_id`. Even if RLS exists, it may be permissive for SELECT.

### Fix
In `src/pages/Suggestion.tsx`, add `.eq("user_id", user.id)` to the query:

```ts
const { data, error } = await supabase
  .from("suggestions")
  .select("*")
  .eq("user_id", user.id)
  .order("created_at", { ascending: false });
```

### Files Modified
- `src/pages/Suggestion.tsx` — one line addition to the query

