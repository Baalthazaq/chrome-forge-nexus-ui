

## Make Card Descriptions Visible When Selecting Cards

### Problem
When players use the "Add Card" dropdown (Domain, Open-Domain, Other), they only see the card name/label in the Select dropdown — no description or content is shown, making it hard to choose.

### Solution
Replace the Select dropdown (for non-blank card types) with a scrollable list where each card shows its name as a header and its content/description as expandable text using a collapsible pattern.

### Changes

**File: `src/components/doppleganger/CardsSection.tsx`**

1. Add a preview area: when `selectedDomainId` is set, show the selected card's full description below the dropdown so players can read it before confirming. Additionally, replace the flat `SelectItem` list with grouped items that include a truncated description preview.

2. Alternatively (cleaner UX): replace the Select with a scrollable card list where each card is a collapsible — click the card name to expand and see its full description, click a "Select" button to pick it.

**Chosen approach**: Show a **preview panel** below the existing Select dropdown. When a card is selected in the dropdown, its full description appears below. This is the minimal change that solves the problem without replacing the existing dropdown pattern.

### Technical detail
- After the `<Select>` component (around line 352), add a conditional block: if `selectedDomainId` is set, find the card from `getListForType()` and render its `content` in a styled preview box.
- This requires no new dependencies or state — just reading from the already-selected `selectedDomainId` and the existing card data.

