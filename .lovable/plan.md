
Goal: make the equation field and bonus field stop fighting each other by using a simple “last edited control wins” rule.

Proposed behavior
- If the user types in the equation box last, the equation is authoritative.
  - Example: typing `d%+4` sets the bonus box to `4`.
  - Typing `d%-2` sets the bonus box to `-2`.
  - Typing `d%` clears the bonus box back to `0`.
- If the user edits the bonus box last, the bonus is authoritative.
  - Example: if the equation is `d%+4` and the user changes bonus to `2`, the equation becomes `d%+2`.
  - If they change bonus to `0`, the explicit constant is removed from the equation.
- Rolling should never mutate the bonus unexpectedly. It should only roll what is currently shown.

Why the current approach breaks
- The current logic tries to preserve both:
  - the constant typed in the equation, and
  - the value in the bonus box,
- using `lastBonusApplied` math.
- That creates ambiguous states, because both controls are trying to represent the same modifier.

Implementation approach
1. Remove the `lastBonusApplied` reconciliation logic entirely.
2. Add a small “last edited” state, e.g. `lastEdited = 'equation' | 'bonus'`.
3. Equation input behavior:
   - Parse the raw equation as the user types.
   - Update the bonus box to match the parsed constant.
   - Do not rewrite/reformat the equation while the user is typing.
4. Bonus input behavior:
   - Parse the current equation.
   - Rebuild the equation from its dice terms plus the new bonus value.
   - This makes the bonus visible in the equation exactly as requested.
5. Roll behavior:
   - Parse the displayed equation and roll from that.
   - Do not auto-add, absorb, or merge constants during roll.
6. Clear behavior:
   - Reset both equation and bonus to empty/`0` consistently.

Rules to keep it predictable
- There is only one modifier source at a time.
- The two fields always sync to the same effective constant after each edit.
- “Last edit wins” applies equally to positive and negative values.

Examples after the fix
```text
Type equation: d%+4      => bonus shows 4
Then change bonus to 1   => equation becomes d%+1
Then type equation d%-3  => bonus shows -3
Then type equation d%    => bonus shows 0
```

Technical detail
- File to update: `public/tools/dice-roller.html`
- Main functions likely affected:
  - `rebuildEquation`
  - `rollFromEquation`
  - equation input handling
  - bonus input handling

Validation plan
- Test typed constants: `d%+4`, `d%-2`, `2d6+3-1`
- Test bonus edits after typed constants
- Test repeated rolls to confirm no drift
- Test button-added dice plus manual modifier edits
- Test clearing back to zero

If you approve this direction, I’ll implement the “last edited control wins” sync model and remove the current reconciliation logic entirely.
