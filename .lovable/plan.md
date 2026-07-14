## Plan: Host minigames at /matrix

### You do
Attach a single `.zip` in your next message containing:
- A front page (e.g. `index.html`) that links to each game
- 6 subfolders, one per game, each with its own `index.html` and assets

Ideal shape inside the zip:
```
matrix/
  index.html          (front page linking to the 6 games)
  game-1/index.html
  game-2/index.html
  ...
  game-6/index.html
```
If your folders are named differently that's fine — I'll adapt.

### I do (once the zip lands)
1. Extract into `public/matrix/` (same pattern as the existing `public/tools/` dice roller and racegen). Vite serves everything under `public/` at the literal path, so the games become reachable at `/matrix/`, `/matrix/game-1/`, etc.
2. Strip any stray `.git` or macOS `__MACOSX` folders before copying.
3. Verify no filename collisions with existing routes and no files over reasonable size (large images/audio may get pushed to CDN assets if they bloat the repo).
4. No React route needed — `public/matrix/index.html` loads directly at `/matrix/` on both dev and published hosting. No auth wrapper since you want it public.
5. Confirm each game loads (relative paths inside the games need to be relative, e.g. `./game.js`, not `/game.js`, so they work under the `/matrix/game-1/` prefix).

### Optional, tell me if you want it
- A tile on the Nexus home grid ("Matrix") linking out to `/matrix/` — off by default since you said "host within" rather than "add to the app grid."
- Keep it hidden from the app grid but still linkable directly.

### Notes / gotchas
- Any absolute paths inside the games (`/foo.png`, `/script.js`) will break — they'd resolve to the Nexus root. If your games use absolute paths I'll need to rewrite them to relative, or move shared assets into `public/matrix/shared/`.
- `.html` files in `public/` are served as-is and are **not** covered by React Router, which is what we want here.
- Zip limit is 20 MB per file. If the bundle is larger, split into multiple zips across messages or share a public URL and I'll fetch it.

Ready when you drop the zip.