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
- **`fare_leg_rules.txt`** / **`fare_transfer_rules.txt`** — validity &
  transfer rules for the *ride* products only:
  - **Ticket Unitaire** and **Ticket Marmay** — one trip with free transfers
    within **3 h** (`transfer_count = -1`, `duration_limit = 10800`);
  - **Ticket Journée** and **Ticket Famille** — unlimited rides within a
    **day**, approximated as free transfers within 24 h
    (`transfer_count = -1`, `duration_limit = 86400`).
  `duration_limit_type = 1` (departure → departure), transfers free
  (`fare_transfer_type = 0`). One leg group per product.

## Modeling caveats (limits of the adopted spec)

- **Subscriptions and multi-week passes** (monthly / quarterly / annual
  passes, 1–3 week Bat'Karé, Réuni'Pass) are **not** given leg/transfer rules:
  they are passes, not per-trip fares, and their multi-week validity is not
  expressible in Fares V2. They are distinguished by **name** only. Likewise
  the **Carnet** (a 5-ride bundle) has no leg rule, since it is not a single
  validated trip.
- The **day-pass** duration (Journée / Famille) is approximated with a 24 h
  transfer window; `duration_limit_type = 1` is measured pairwise between
  consecutive legs, not anchored to the first tap.
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
