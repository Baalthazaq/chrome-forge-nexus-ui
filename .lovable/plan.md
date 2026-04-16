## Dice Roller Enhancements

This is a substantial set of changes to the DiceRollerRibbon component plus a new admin logging feature. Here is the breakdown:

### 1. Individual Dice Results Bar

Add a results section below the total showing each die individually (e.g., `d6:4  d20:17  H:9`). Each die is clickable to reroll just that one. Colored dice display in their assigned color.

### 2. Dice Roll Inside the Panel

Remove the full-screen canvas overlay. Instead, embed the Matter.js canvas within the panel itself, in the blank space below the buttons (~300px tall area). Walls constrain dice to that region. This fixes the mobile occlusion problem entirely.

### 3. Smaller Buttons + "Dual" Rename

- Reduce button height from `h-10` to `h-8`
- Rename "DUALITY" to "DUAL"
- Tighten padding/gaps throughout to maximize canvas space

### 4. Color Picker for Dice

Add a row of color swatches (e.g., default, cyan. red, green, purple, orange, white) above the dice buttons. Selecting one sets the "active color" for subsequent dice rolls. This color replaces the non-black stop in the normal gradient. Hope, Fear, and Dual buttons ignore the color picker and always use their default gradients. Default needs to be independent, because the normal behaviour is that negatives are red, hope is yellow, fear is red, positives are cyan, etc, whereas setting it to cyan would mean all are cyan except hope/fear.

### 5. Colored Font in Results & Equation

- In the individual results bar, non-default-colored dice show their value in their custom color
- In the equation string display, dice terms with custom colors render in that color (requires switching from a plain `<input>` to a styled display with per-term coloring, or a hybrid approach)

### 6. Close vs Toggle Behavior

- **X button**: Clears all dice, resets equation/bonus/results, closes panel
- **Tab click**: Toggles panel open/closed without clearing state. Results persist for the session.

### 7. Tab Shows Last Result

Display the last total roll value on the physical tab itself, below or beside the 🎲 icon (e.g., small number like "23" with H for Hope, F for Fear or ! for crit).

### 8. Admin Roll Log

- **New Supabase table** `dice_roll_log`: `id`, `user_id`, `equation`, `result`, `individual_dice` (jsonb), `rolled_at`
- On every roll in the ribbon, insert a log entry
- **New section on Admin page** (or a dedicated admin sub-page): Table showing all rolls with player name, equation, result, timestamp, filterable/searchable

---

### Technical Details

**Files to create/edit:**


| File                                  | Action                                                                                                      |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `src/components/DiceRollerRibbon.tsx` | Major rewrite: embed canvas in panel, add results bar, color picker, close/toggle logic, tab result display |
| `src/pages/Admin.tsx`                 | Add dice roll log section or link to dedicated page                                                         |
| Supabase migration                    | New `dice_roll_log` table with RLS (admin can read all, users can insert own)                               |


**DieData changes:**

- Add `color?: string` field to track custom color per die
- Gradient functions accept optional color override

**Color picker implementation:**

- State: `activeColor: string | null` (null = default)
- Palette: ~6 preset colors rendered as small circles
- When a color is active, new normal dice use it; Hope/Fear/Dual ignore it

**Results bar:**

- Array of `{ sides, value, sign, flavor, color }` rendered as clickable chips
- Click triggers reroll of that specific die (new random value, brief physics kick)
- Font color matches die color (default = current text color)

**Equation display:**

- Replace plain text input with a rich display when showing results (per-term `<span>` with color)
- Keep editable input for typing; switch to colored display after rolling

**Canvas relocation:**

- Canvas becomes a `<canvas>` element inside the panel div, sized to fill remaining vertical space
- Walls match canvas bounds, not viewport
- Remove the full-screen fixed canvas entirely