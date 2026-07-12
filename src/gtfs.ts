import type { AppState, Product, RiderCategory, Support } from './types'

/**
 * Escape a single CSV field per RFC 4180 (which GTFS follows):
 * wrap in double quotes and double any inner quote when the value
 * contains a comma, quote, or newline.
 */
function csvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return '"' + value.replace(/"/g, '""') + '"'
  }
  return value
}

function toCsv(header: string[], rows: string[][]): string {
  const lines = [header.join(',')]
  for (const row of rows) {
    lines.push(row.map(csvField).join(','))
  }
  // GTFS files are plain CSV; a trailing newline is conventional.
  return lines.join('\n') + '\n'
}

/** Build fare_media.txt content from the supports. */
export function generateFareMedia(supports: Support[]): string {
  const header = ['fare_media_id', 'fare_media_name', 'fare_media_type']
  const rows = supports.map((s) => [s.id, s.name, String(s.type)])
  return toCsv(header, rows)
}

/** Build rider_categories.txt content from the rider categories. */
export function generateRiderCategories(categories: RiderCategory[]): string {
  const header = [
    'rider_category_id',
    'rider_category_name',
    'is_default_fare_category',
    'eligibility_url',
  ]
  const rows = categories.map((c) => [c.id, c.name, c.isDefault ? '1' : '0', c.eligibilityUrl])
  return toCsv(header, rows)
}

/**
 * Build fare_products.txt content from the products.
 *
 * A product valid on several supports produces one row per support
 * (same fare_product_id, differing fare_media_id) — the standard way
 * to express multi-media validity in GTFS Fares V2. A product with no
 * support selected produces a single row with an empty fare_media_id.
 *
 * References to supports or rider categories that no longer exist are
 * dropped so the output never contains dangling ids.
 */
export function generateFareProducts(
  products: Product[],
  validSupportIds: Set<string>,
  validCategoryIds: Set<string>,
): string {
  const header = [
    'fare_product_id',
    'fare_product_name',
    'rider_category_id',
    'fare_media_id',
    'amount',
    'currency',
  ]
  const rows: string[][] = []
  for (const p of products) {
    const media = p.supportIds.filter((id) => validSupportIds.has(id))
    const mediaIds = media.length > 0 ? media : ['']
    const rider = validCategoryIds.has(p.riderCategoryId) ? p.riderCategoryId : ''
    for (const mediaId of mediaIds) {
      rows.push([p.id, p.name, rider, mediaId, p.amount, p.currency])
    }
  }
  return toCsv(header, rows)
}

/** The leg group id auto-derived for a product (one group per product). */
export function legGroupId(productId: string): string {
  return `${productId}_leg`
}

/**
 * Build fare_leg_rules.txt — one row per product that has leg rules, linking
 * the product's own leg group to the product. No network/area/timeframe
 * columns are emitted (kept deliberately simple).
 */
export function generateFareLegRules(products: Product[]): string {
  const header = ['leg_group_id', 'fare_product_id']
  const rows = products
    .filter((p) => p.legRules)
    .map((p) => [legGroupId(p.id), p.id])
  return toCsv(header, rows)
}

/**
 * Build fare_transfer_rules.txt for products that allow transfers. Each rule
 * loops a product's leg group onto itself (from == to), so transfer_count is
 * required. Transfers are always free (fare_transfer_type 0, empty product).
 */
export function generateFareTransferRules(products: Product[]): string {
  const header = [
    'from_leg_group_id',
    'to_leg_group_id',
    'transfer_count',
    'duration_limit',
    'duration_limit_type',
    'fare_transfer_type',
    'fare_product_id',
  ]
  const rows: string[][] = []
  for (const p of products) {
    const lr = p.legRules
    if (!lr || lr.transferPolicy === 'none') continue
    const g = legGroupId(p.id)
    const count = lr.transferPolicy === 'unlimited' ? '-1' : lr.transferCount.trim() || '0'
    const hasDuration = lr.durationMinutes.trim() !== ''
    const durationSec = hasDuration ? String(Number(lr.durationMinutes) * 60) : ''
    const durationType = hasDuration ? String(lr.durationLimitType) : ''
    rows.push([g, g, count, durationSec, durationType, '0', ''])
  }
  return toCsv(header, rows)
}

export interface GtfsFile {
  name: string
  content: string
}

/** The set of GTFS text files produced from the current state. */
export function generateFiles(state: AppState): GtfsFile[] {
  const supportIds = new Set(state.supports.map((s) => s.id))
  const categoryIds = new Set(state.riderCategories.map((c) => c.id))
  const files: GtfsFile[] = [
    { name: 'fare_media.txt', content: generateFareMedia(state.supports) },
  ]
  // rider_categories.txt is only emitted when at least one is defined.
  if (state.riderCategories.length > 0) {
    files.push({
      name: 'rider_categories.txt',
      content: generateRiderCategories(state.riderCategories),
    })
  }
  files.push({
    name: 'fare_products.txt',
    content: generateFareProducts(state.products, supportIds, categoryIds),
  })
  // fare_leg_rules.txt / fare_transfer_rules.txt are optional: only emitted
  // when at least one product defines them.
  if (state.products.some((p) => p.legRules)) {
    files.push({ name: 'fare_leg_rules.txt', content: generateFareLegRules(state.products) })
  }
  if (state.products.some((p) => p.legRules && p.legRules.transferPolicy !== 'none')) {
    files.push({
      name: 'fare_transfer_rules.txt',
      content: generateFareTransferRules(state.products),
    })
  }
  return files
}

/** Slugify a name into a safe id / filename fragment. */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

/** Zip filename incorporating the network name, e.g. "my_network_gtfs_fares.zip". */
export function zipFilename(networkName: string): string {
  const slug = slugify(networkName)
  return (slug ? `${slug}_` : '') + 'gtfs_fares.zip'
}
