

## Bestiary Tokens + "Tokens for this Encounter" Button

### 1. Character Tokens page (`src/components/CharacterTokens.tsx`)

Generalise the page so it sources tokens from **two pools**:

- **Characters** — `profiles` rows with `avatar_url` (current behaviour).
- **Bestiary** — `bestiary_creatures` rows with `image_url`.

Internal model becomes a unified `TokenSubject`:

```ts
type TokenSubject = {
  key: string;          // 'profile:<user_id>' | 'creature:<id>'
  kind: 'profile' | 'creature';
  name: string;
  imageUrl: string;
  // display badges
  subtitle?: string;    // class / creature_type
  level?: number;       // characters
  tier?: number;        // creatures
};
```

All current `profiles` references inside the page (filtering, selection set, sheet rendering, downloads) switch to `TokenSubject.key` instead of `user_id`. The `Profile` interface is kept only for fetch shape.

**Data load**: in addition to `profiles` and group stones, fetch `bestiary_creatures` (id, name, image_url, tier, creature_type, is_custom). Skip rows with no `image_url`.

**Filters**:
- New **Source** filter (toggle group): `All / Characters / Bestiary`. Defaults to `All`.
- Class filter and Group filter only apply to characters; when source = Bestiary they are hidden/disabled.
- Search matches across name, class/creature_type, ancestry, and tier.

**Pre-selection via URL**: read `?select=` on mount.

- Format: comma-separated keys, e.g. `?select=profile:UUID,profile:UUID,creature:UUID,creature:UUID`.
- For each key found, add to `selectedIds` and ensure the source filter is set to `All` so they're visible.
- Auto-scroll/toast: "12 tokens pre-selected from encounter".

### 2. Encounter Builder button (`src/pages/EncounterBuilder.tsx`)

Inside each expanded encounter card's actions row (next to Edit / Duplicate / Delete), add:

```
[Tokens] → /admin/tokens?select=<keys>
```

Button is shown only when the encounter has at least one NPC with `user_id` **or** at least one creature with an image. Build the `select` param by:

- For each `npc` in `enc.npcs` with `user_id`: include `profile:<user_id>` if `thumbs.npcs[user_id]` is truthy (avatar exists).
- For each `creature` in `enc.creatures` with `id`: include `creature:<id>` if `thumbs.creatures[id]` is truthy. If `quantity > 1`, the key still appears once — selection is a set; the printable sheet will use the existing "Generate Sheet" flow (one slot per selection). If a future need arises for duplicates, it can be revisited.
- Environments are excluded (no token concept).

Click → `navigate(\`/admin/tokens?select=${encodeURIComponent(keys.join(','))}\`)`.

### 3. Sheet / PNG generation

`renderSheet` and `handleDownloadSelected` already operate on a list of "subjects with images"; they're refactored to take `TokenSubject[]` instead of `Profile[]`. Filenames use `subject.name`. No format changes to PNG/PDF output.

### Out of scope

- Tokens for environments.
- Quantity-aware multiplication of creature tokens on the sheet (one entry per selection for now).
- Persisting the last-used selection across navigations beyond the URL param.

