
## Unify Admin Dice Roller with Ribbon Panel

The admin dice tool (`public/tools/dice-roller.html`) and the in-app `DiceRollerRibbon.tsx` have drifted. Each fix to one requires re-implementing in the other. Let's consolidate.

### Approach: Replace the standalone HTML with the React component

Rather than maintaining two parallel implementations (HTML/vanilla JS vs React/TSX), repoint the admin "Dice Roller" button to the existing ribbon component, mounted on a dedicated page.

### Plan

1. **Create `src/pages/DiceRoller.tsx`**
   - Full-page wrapper that mounts `<DiceRollerRibbon />` in an always-open state
   - Header with "Back to Admin" button
   - Admin-gated (redirects non-admins)

2. **Add a `defaultOpen` / `embedded` prop to `DiceRollerRibbon.tsx`**
   - When `embedded=true`: panel is always open, no floating tab, fills container
   - When omitted: current floating ribbon behaviour (preserves homepage usage)

3. **Update `src/App.tsx`**
   - Add route `/admin/dice-roller` → `DiceRoller` page

4. **Update `src/pages/Admin.tsx`**
   - Change the "Dice Roller" button from `window.open('/tools/dice-roller.html')` to `navigate('/admin/dice-roller')`

5. **Retire `public/tools/dice-roller.html`**
   - Leave file in place but unreferenced (safe rollback). Can delete later once confirmed.

### Result

Single source of truth for dice logic. Every future change to the ribbon (crit matching, colors, equation parsing, gradients, etc.) automatically applies to admin. Zero duplication.

### Files touched
- `src/components/DiceRollerRibbon.tsx` — add `embedded` prop
- `src/pages/DiceRoller.tsx` — new
- `src/App.tsx` — new route
- `src/pages/Admin.tsx` — change navigation target
