# Example — Car Jaune (La Réunion)

GTFS Fares V2 files generated from the Car Jaune network fare guide
(*Guide tarifaire*), as an example for the GTFS Fares Assistant. Import
`fare_media.txt` + `rider_categories.txt` + `fare_products.txt` (zipped)
into the app to edit them.

## Contents

- **`fare_media.txt`** — 4 supports: paper ticket, M-Ticket (mobile app),
  yPass card, and the regional Réuni'Pass card.
- **`rider_categories.txt`** — 12 rider categories; `tout_public` is the
  default (`is_default_fare_category = 1`).
- **`fare_products.txt`** — 25 products (34 rows, one per media). Free fares
  (children under 3, jobseekers, veterans, students, trainees, seniors,
  disability, companion) are modeled as `amount = 0`.

## Modeling caveats (limits of the adopted spec)

- **Validity durations are not encodable** in `fare_products.txt` (monthly /
  quarterly / annual passes, day pass, 1–3 week Bat'Karé, the 3-hour transfer
  window). They are distinguished by **name** only. Expressing them properly
  would need `fare_leg_rules.txt` + `fare_transfer_rules.txt`.
- **Eligibility** (ages, status, residency) is carried by the category name +
  `eligibility_url`; there is no machine-readable age field in the adopted
  `rider_categories.txt`.
- **Non-structural conditions** are omitted: the Family ticket (2 adults +
  3 children under 18, weekends/holidays/school-break only) is text only.
- **Réuni'Pass multi-network validity** (Citalis, Alternéo, Estival,
  Kar'Ouest, CARSUD) is not modeled — it would require `networks.txt` and
  `fare_leg_rules.txt`.
- There is **no per-leg pricing** here (`fare_leg_rules.txt` is absent), so
  these files are a fare *catalog*, not enough on their own to compute the
  price of a given trip.
