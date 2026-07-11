# GTFS Fares Assistant

A **frontend-only** React + TypeScript + Tailwind CSS app to build GTFS
**Fares V2** files — [`fare_media.txt`](https://gtfs.org/documentation/schedule/reference/#fare_mediatxt),
[`rider_categories.txt`](https://gtfs.org/documentation/schedule/reference/#rider_categoriestxt)
and [`fare_products.txt`](https://gtfs.org/documentation/schedule/reference/#fare_productstxt) —
entirely in the browser. No backend, no data leaves your machine.

Available in **English and French** — it defaults to the browser language and
your choice is remembered.

## Workflow

1. **Network name** — used to name the downloaded zip (e.g. `my_city_transit_gtfs_fares.zip`).
2. **Import (optional)** — load an existing GTFS zip to edit; it is unzipped
   in the browser and reconstructed into the editor.
3. **Supports (fare media)** — pick the `fare_media_type` **first** (this drives
   the name/id placeholders), then name it. The id auto-fills from the name but
   stays fully editable.
4. **Rider categories & constraints** — optional eligibility constraints
   (`min_age`, `max_age`, `eligibility_url`) that a product can target →
   `rider_categories.txt`.
5. **Products** — define fare products (`fare_product_id`, name, `amount`,
   `currency`), pick which supports each is usable on, and optionally target a
   rider category.
6. **Preview & download** — live preview of each `.txt` file; download them
   individually or all together as a zip (built in-browser with JSZip).

Everything you enter is saved to **localStorage**, so you can leave and come
back to keep editing.

## Validation

- **Currency** must be an active **ISO 4217** code.
- **Amount** must be a non-negative number whose decimal places fit the
  currency's minor unit (e.g. `JPY` → 0, `BHD` → 3).
- **Ids** must be unique and CSV-safe (no spaces, commas or quotes).
- **Ages** must be whole numbers with `min ≤ max`.

### How multi-support products are encoded

A product usable on several supports produces **one row per support** in
`fare_products.txt` (same `fare_product_id`, different `fare_media_id`) — the
standard GTFS Fares V2 way to express multi-media validity. A product with no
support selected produces a single row with an empty `fare_media_id`. A
targeted rider category is written to the `rider_category_id` column on every
row of that product. References to a deleted support or category are dropped
from the output.

## Develop

```bash
npm install
npm run dev      # start Vite dev server
npm run build    # type-check + production build to dist/
npm run preview  # preview the production build
```

The Vite `base` is set to `./` (relative assets) so the build works from any
sub-path, including a GitHub Pages project site.

## Deploy (GitHub Pages)

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the app
and publishes `dist/` to GitHub Pages. Enable it once under **Settings → Pages →
Build and deployment → Source: GitHub Actions**.
