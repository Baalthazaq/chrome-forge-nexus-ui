## Add standard markdown image syntax to ToMe renderer

Extend `src/lib/markdownRenderer.tsx` to support the standard `![alt](url)` markdown image syntax, while keeping the existing `Image: url` line syntax fully working.

### Changes

**File:** `src/lib/markdownRenderer.tsx`

1. **Block-level image** — before the existing `Image:` check, detect lines that are *only* an `![alt](url)` token (optionally surrounded by whitespace). Render as the same `<img>` element used today (rounded, max-w-full, max-h-64, my-3, object-cover) with `alt` populated from the markdown.

2. **Inline image** — extend `renderInline` so `![alt](url)` occurring inside a paragraph, list item, or header is rendered as an inline `<img>` (smaller: `inline-block max-h-32 align-middle mx-1 rounded`). The existing bold/italic regex is widened into a single combined matcher so images, bold, and italic can coexist on the same line without one swallowing the other.

3. **Keep `Image:` syntax** — the existing `^Image:\s*(.+)$` branch is left untouched and still matches first for backwards compatibility with existing ToMe entries.

4. No other files change. No new dependencies.

### Acceptance

- `![Cover](https://example.com/x.png)` on its own line → block image.
- `Here is a sigil ![sigil](https://…/s.png) inline.` → inline image inside the paragraph.
- `Image: https://example.com/x.png` → still renders exactly as before.
- Bold/italic on the same line as an inline image still render correctly.