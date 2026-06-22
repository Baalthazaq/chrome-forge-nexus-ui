## Root causes

Two distinct bugs in the Doppleganger character sheet when an alias (Cegorach) is active over the primary (Balderai):

### 1. Avatar upload bypasses the alias entirely
`src/components/doppleganger/CharacterHeader.tsx` → `handleAvatarUpload` writes directly to the `profiles` table:

```ts
await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('user_id', userId);
window.location.reload();
```

It never goes through `onProfileUpdate`, so the alias overlay in `Doppleganger.tsx` (which would route `avatar_url` to `updateAliasRow(activeAlias.id, { avatar_url })`) is skipped. Result: uploading a Cegorach portrait actually updates the primary Balderai profile, and the `window.location.reload()` masks the wrong-write by re-rendering with primary data.

### 2. DescriptionSection's local state is stale across alias switches
`src/components/doppleganger/DescriptionSection.tsx` initializes `localBio`, `localPersonality`, `localPd`, `localJob`, `localCompany` from props via `useState(...)` — these only seed on first mount and never re-sync when the alias changes. So:

- Edit Cegorach's bio → `localBio` = "X" → save to alias ✅
- Switch back to Balderai (primary) → component does NOT remount; `localBio` is still "X" from Cegorach
- Any subsequent blur/save writes "X" into Balderai's profile.bio

This matches the user's report that Balderai's bio was overwritten with Cegorach's content. The same staleness applies to personality, physical description, job, and company.

The same staleness exists in `CharacterHeader.tsx` for `nameValue` (initialized once via `useState(profile.character_name || '')`).

## Fixes

### A. `src/components/doppleganger/CharacterHeader.tsx`
1. Replace the direct `supabase.from('profiles').update(...)` in `handleAvatarUpload` with `onProfileUpdate('avatar_url', urlData.publicUrl)`. `Doppleganger.tsx`'s `handleProfileUpdate` already routes to alias-or-profile correctly.
2. Upload path: namespace by user (`${userId}/alias_${Date.now()}...` or similar) so collisions don't replace the primary's file in storage. Keep `upsert: true` semantics scoped per identity.
3. Remove `window.location.reload()` — rely on the alias/profile state update to re-render. (If a refetch is needed, call the alias hook's refetch via a new prop, or trust the profile setState already in `handleProfileUpdate`.)
4. Sync `nameValue` from `profile.character_name` via `useEffect` so switching alias resets the in-flight name buffer.

### B. `src/components/doppleganger/DescriptionSection.tsx`
Add `useEffect` hooks that re-sync each local buffer when its corresponding prop changes:

```ts
useEffect(() => setLocalBio(bio), [bio]);
useEffect(() => setLocalJob(job), [job]);
useEffect(() => setLocalCompany(company), [company]);
useEffect(() => setLocalPersonality(sheet.personality || ''), [sheet.personality]);
useEffect(() => setLocalPd(sheet.physical_description || { clothes:'', eyes:'', body:'', skin:'' }),
  [sheet.physical_description]);
```

This guarantees that switching aliases (which changes `effectiveProfile` and `sheet`) refreshes the editing buffers, so a stale value can never be saved into the wrong identity.

## Out of scope
- No DB migration needed.
- No changes to alias storage shape, RLS, or other apps (Sending, BHoldR, CVNews).
- Succubus skipped per prior decision.
