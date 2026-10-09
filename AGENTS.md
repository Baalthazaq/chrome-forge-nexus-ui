# Architecture rules

- Keep Circle dropdown filtering in the pure `circleOptionSearch` helper, independent of the saved field value, so selection updates cannot disable the active search and branch matching can be regression-tested.