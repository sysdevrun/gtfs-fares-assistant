# GTFS Fares Assistant

A **frontend-only** React + TypeScript + Tailwind CSS app to build GTFS
**Fares V2** files — [`fare_media.txt`](https://gtfs.org/documentation/schedule/reference/#fare_mediatxt)
and [`fare_products.txt`](https://gtfs.org/documentation/schedule/reference/#fare_productstxt) —
entirely in the browser. No backend, no data leaves your machine.

## Workflow

1. **Network name** — used to name the downloaded zip (e.g. `my_city_transit_gtfs_fares.zip`).
2. **Supports (fare media)** — define the media a product can be carried on
   (`fare_media_id`, `fare_media_name`, `fare_media_type`). The id auto-fills
   from the name but stays fully editable.
3. **Products** — define fare products (`fare_product_id`, name, `amount`,
   `currency`) and pick which supports each one is usable on.
4. **Preview & download** — live preview of each `.txt` file; download them
   individually or all together as a zip (built in-browser with JSZip).

Everything you enter is saved to **localStorage**, so you can leave and come
back to keep editing.

### How multi-support products are encoded

A product usable on several supports produces **one row per support** in
`fare_products.txt` (same `fare_product_id`, different `fare_media_id`) — the
standard GTFS Fares V2 way to express multi-media validity. A product with no
support selected produces a single row with an empty `fare_media_id`.

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
