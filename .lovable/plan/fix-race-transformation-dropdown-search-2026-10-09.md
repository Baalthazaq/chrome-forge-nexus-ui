# Fix Race/Transformation dropdown search

Typing "Air" should show only:

```text
SOURCE HEADING
  Gnome
    └ Air
```

## Why it shows almost everything now
- If a circle's heading contains the typed text anywhere, the whole circle is kept, all of it.
- Matching looks for the text anywhere inside a word, so "air" also matches words like "F**air**y" or "H**air**", and pulls in their parents too.
- Kept entries are tracked by name, so if a parent's name appears more than once, every copy of it stays.

## Changes
- A circle heading no longer keeps its whole list just because it matches. The heading only shows when something under it matches.
- Matching works on the start of words ("Air" matches "Air" and "Air Genasi", not "Fairy").
- Only the matching entries and their own parent chain stay, in tree order with their indents.
- Kept entries are tracked by their exact spot in the list, not by name, so only the right parents stay.

## Technical details
- `CircleCombobox.tsx`: record each item's ancestor indices during the walk (instead of labels), filter by index set, and use a word-start regex (`(^|[\s\-(])` + escaped query).
