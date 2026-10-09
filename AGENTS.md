# Architecture rules

- Keep Circle dropdown filtering in the pure `circleOptionSearch` helper, independent of the saved field value, so selection updates cannot disable the active search and branch matching can be regression-tested.
- Encode multiple Circle selections as JSON arrays in the existing text fields through `circleSelections`, keeping single selections as plain text, so existing sheets and alias overlays remain compatible without schema changes.