## Beast Shape Cards — Druid-only, filterable picker

### Part 1: Beast Shape data model

Insert ~40 Beast Shape cards into `game_cards` with:

- `card_type: 'domain'` (so existing domain card loading paths handle them)
- `source: 'Beast Shape'` (NOT Sage — this is the new "Other" category)
- `metadata: { level: <tier>, recall_cost: <tier>, category: 'Beast Shape', class_restriction: 'Druid' }`

The `class_restriction: 'Druid'` flag gates these cards so only Druid characters see them in the picker.

**Card inventory (~40):**

- Tier 1 (6): Agile Scout, Nimble Grazer, Aquatic Scout, Household Friend, Pack Predator, Stalking Arachnid
- Tier 2 (6): Armored Sentry, Mighty Strider, Pouncing Predator, Powerful Beast, Striking Serpent, Winged Beast
- Tier 3 (5 named + 6 Legendary T1 upgrades = 11): Great Predator, Great Winged Beast, Mighty Lizard, Aquatic Predator, Legendary Hybrid + Legendary versions of all T1
- Tier 4 (5 named + 6 Mythic T1 + 6 Mythic T2 = 17): Massive Behemoth, Mythic Aerial Hunter, Terrible Lizard, Epic Aquatic Beast, Mythic Hybrid + Mythic versions of all T1/T2

**Upgrade scaling:**

- Legendary (T3 upgrade): +6 dmg, +1 trait, +2 Evasion
- Mythic (T4 upgrade): +9 dmg, +2 trait, +3 Evasion, damage die +1 size

### Part 2: Filterable card picker in Doppleganger

Update `src/components/doppleganger/CardsSection.tsx` so the "Add Card" button opens a picker dialog with **three filter tabs/segments**:

```text
┌─────────────────────────────────────┐
│  [ Domain ] [ Open-Domain ] [ Other ]│
├─────────────────────────────────────┤
│  Search: [_________________]         │
│  ─────────────────────────────────  │
│  • Card 1                           │
│  • Card 2                           │
│  • Card 3                           │
└─────────────────────────────────────┘
```

**Filter logic:**

- **Domain** — cards from the character's own domains (`source` matches one of `allDomains`), level ≤ character level
- **Open-Domain** — domain cards from domains the character does NOT have (open multiclassing/sharing scenarios)
- **Other** — non-standard categories. Beast Shape cards appear here, gated by `metadata.class_restriction` matching the character's class (Druid only)

Selecting a card adds it to `selected_card_ids` as before.

### Part 3: Class-restriction gating

In the "Other" tab, filter logic:

```typescript
const otherCards = gameCards.filter(c => 
  c.source === 'Beast Shape' && 
  (!c.metadata?.class_restriction || c.metadata.class_restriction === sheet.class)
);
```

This means future "class-specific" card categories can be added the same way (e.g., Wizard spellbook cards) without touching the picker UI.

### Files touched

- **Database (insert tool)**: ~40 rows into `game_cards`
- `src/components/doppleganger/CardsSection.tsx`: refactor "Add Card" flow into filterable picker with Domain / Open-Domain / Other / Blank tabs, siilar to existing logic of existing buttons.
- No changes to `Sage` domain cards — Beast Shape is fully separate

### What the user will see

A character clicking "Add Card" sees four tabs, prefiltered by their race/level/class/domains, but those can be manually switched off each time. 