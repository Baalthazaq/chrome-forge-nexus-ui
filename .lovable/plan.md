

## Dice Roller as a Global Pop-out Ribbon

### What it does
A small tab/ribbon fixed to the edge of the screen (e.g., right side) that, when clicked, slides out a dice roller panel. Dice physically roll across the actual page content area (not confined to the panel). Available on every page except `/auth`.

### Architecture

**1. New component: `src/components/DiceRollerRibbon.tsx`**
- A fixed-position tab on the right edge of the screen labeled "🎲" or "DICE"
- Clicking it toggles open a compact control panel (the UI portion: equation input, bonus, dice buttons, roll/clear)
- The panel slides in from the right as a narrow sidebar (~320px)
- The dice canvas overlay covers the full viewport behind/over the page content (with `pointer-events: none` except on the dice themselves)

**2. Two layers:**
- **Control panel** (right sidebar): Contains all the buttons, equation input, bonus field, result display. Styled to match the existing cyberpunk theme. Uses the same parsing/building logic from the HTML version.
- **Dice canvas** (full-screen overlay): A transparent canvas (`position: fixed; inset: 0; z-index` high enough) where Matter.js dice are rendered. The canvas is transparent (no black background) so page content shows through. Walls are placed at viewport edges. `pointer-events: none` on the canvas, but individual dice clicks handled via a thin hit-test overlay.

**3. Integration in `App.tsx`**
- Render `<DiceRollerRibbon />` inside the providers, outside `<Routes>`, so it appears on every page
- Only render when user is authenticated (wrap in a small auth-aware check)

**4. Port from HTML to React**
- Convert the Matter.js physics, dice rendering, equation parsing into React hooks/refs
- The canvas uses `useRef` + `useEffect` for the animation loop
- Equation state managed with `useState`
- Matter.js loaded via npm package (`matter-js`) instead of CDN

### Key design decisions
- **Transparent tray**: The dice roll over page content — canvas has no background fill, just the grid lines at very low opacity (or none)
- **Collapsible**: The ribbon tab is always visible; the full panel only shows when toggled
- **Non-blocking**: The canvas overlay uses `pointer-events: none` globally, with a small JS hit-test layer so users can still click dice to re-roll them, but clicks pass through to the page otherwise
- **Z-index**: Canvas sits above page content but below modals/dialogs

### Files to create/edit
| File | Action |
|------|--------|
| `src/components/DiceRollerRibbon.tsx` | **Create** — Full component with Matter.js canvas, controls panel, ribbon tab |
| `src/App.tsx` | **Edit** — Add `<DiceRollerRibbon />` after `<Sonner />` |
| `package.json` | **Edit** — Add `matter-js` + `@types/matter-js` dependencies |

### Ribbon behavior
- **Closed state**: Small vertical tab on the right edge, ~40px wide, says "DICE" rotated vertically with a 🎲 icon
- **Open state**: 320px panel slides out from right with all controls; full-screen transparent canvas activates for dice physics
- **Close**: Click the tab again, or a close button on the panel; dice and canvas disappear

