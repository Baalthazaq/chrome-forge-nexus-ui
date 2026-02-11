# Recommended Implementation Order

## 1. Fix ToMe Tablet Issues (Quick Win - Bug Fix)

**Why first:** This is a bug affecting usability right now. Fixing it first is a quick win that improves the experience immediately.

**What needs to happen:**

- Make the multi-column layout responsive on tablets -- currently only the first column is visible with no way to scroll or navigate to others
- Add horizontal scrolling or a column switcher for tablet viewports
- Replace or supplement the drag-and-drop (PointerSensor) with touch-friendly alternatives so notes can be rearranged on tablets
- Ensure all buttons and interactions are tappable at tablet sizes

---

## 2. WyrmCart Store Overhaul (Foundation)

**Why second:** WyrmCart is currently a static mockup with hardcoded items. Building it out with real database integration creates the foundation that @tunes subscriptions depend on.

**What needs to happen:**

- Connect WyrmCart to the existing `shop_items` table (replacing hardcoded items)
- Build a real purchase flow using the existing `shop-operations` edge function
- Add cart functionality (browse, add to cart, checkout)
- Integrate with the Vault (App of Holding) so purchases deduct Hex and show in transaction history
- Support the overdraft limit (1 bag / 600 Hex) already implemented in Vault
- Handle item categories, quantities, and subscription-bearing items

---

## 3. @tunes Subscription Management (Depends on WyrmCart)

**Why third:** Once WyrmCart purchases are working and creating subscriptions in the `recurring_payments` table, @tunes can properly display and manage them.

**What needs to happen:**

- Fix the current non-functional state of @tunes
- Ensure all subscription-bearing items purchased in WyrmCart automatically appear in @tunes
- Display active subscriptions with their billing intervals, amounts, and next charge dates
- Add ability to view subscription details and history
- Connect subscription payments to the Vault transaction history

---

## 4. Doppleganger Profile Card System (Independent)

**Why last:** This is the most architecturally complex change -- pulling data from multiple tables into "cards" on the profile. It doesn't block or depend on the other features, so it can be done last without holding anything up.

**What needs to happen:**

- Identify which existing profile elements to keep as core (character name, avatar, stats, etc.)
- Design a card system that pulls from multiple tables (augmentations, reputation tags, quest history, gear, etc.)
- Build reusable card components that render different data types
- Integrate cards into the Doppleganger profile layout
- Determine which cards are visible to others vs. private

---

## Summary

```text
Order  |  Feature              |  Reason
-------+-----------------------+----------------------------------
  1    |  ToMe tablet fix      |  Bug fix, quick win
  2    |  WyrmCart overhaul     |  Foundation for store + payments
  3    |  @tunes subscriptions  |  Depends on WyrmCart purchases
  4    |  Doppleganger cards    |  Independent, most complex design
```

This order minimizes rework: the tablet fix is isolated, WyrmCart builds the data pipeline that @tunes needs, and Doppleganger can be tackled independently at the end.  
  
Let's start with 1 before moving on to 2, because I (the user) have further constraints and some files to upload for the next 3. 