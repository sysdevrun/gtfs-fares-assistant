import JSZip from 'jszip'
import type { FareMediaType, Product, RiderCategory, Support } from './types'
import { isValidCurrency, validateAmount, validateId } from './validation'
import type { TFunc } from './i18n'

/** Parse RFC 4180 CSV text into an array of rows. Handles quoted fields. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let field = ''
  let row: string[] = []
  let inQuotes = false
  // Strip a UTF-8 BOM if present.
  const s = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text

  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      // End of line; swallow the \n of a \r\n pair.
      if (c === '\r' && s[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      field = ''
      row = []
    } else {
      field += c
    }
  }
  // Flush the last field/row if the file didn't end with a newline.
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  // Drop fully-empty rows (e.g. a trailing blank line).
  return rows.filter((r) => !(r.length === 1 && r[0] === ''))
}

/** Turn parsed rows into objects keyed by the (trimmed) header names. */
function toRecords(rows: string[][]): Record<string, string>[] {
  if (rows.length === 0) return []
  const header = rows[0].map((h) => h.trim())
  return rows.slice(1).map((r) => {
    const rec: Record<string, string> = {}
    header.forEach((h, i) => {
      rec[h] = (r[i] ?? '').trim()
    })
    return rec
  })
}

export interface ImportResult {
  networkName?: string
  supports: Support[]
  riderCategories: RiderCategory[]
  products: Product[]
  warnings: string[]
}

function parseMediaType(raw: string): FareMediaType | null {
  const n = Number(raw)
  return [0, 1, 2, 3, 4].includes(n) ? (n as FareMediaType) : null
}

function buildSupports(records: Record<string, string>[], warnings: string[], t: TFunc): Support[] {
  const supports: Support[] = []
  const seen = new Set<string>()
  records.forEach((rec, i) => {
    const line = i + 2 // account for header + 1-based
    const id = rec['fare_media_id'] ?? ''
    if (validateId(id)) {
      warnings.push(t('warn.mediaInvalidId', { line }))
      return
    }
    if (seen.has(id)) {
      warnings.push(t('warn.mediaDuplicate', { line, id }))
      return
    }
    const type = parseMediaType(rec['fare_media_type'] ?? '')
    if (type === null) {
      warnings.push(t('warn.mediaType', { line, value: rec['fare_media_type'] ?? '' }))
    }
    seen.add(id)
    supports.push({ id, name: rec['fare_media_name'] ?? '', type: type ?? 0 })
  })
  return supports
}

function buildRiderCategories(
  records: Record<string, string>[],
  warnings: string[],
  t: TFunc,
): RiderCategory[] {
  const cats: RiderCategory[] = []
  const seen = new Set<string>()
  let defaultSeen = false
  records.forEach((rec, i) => {
    const line = i + 2
    const id = rec['rider_category_id'] ?? ''
    if (validateId(id)) {
      warnings.push(t('warn.riderInvalidId', { line }))
      return
    }
    if (seen.has(id)) {
      warnings.push(t('warn.riderDuplicate', { line, id }))
      return
    }
    seen.add(id)
    let isDefault = (rec['is_default_fare_category'] ?? '').trim() === '1'
    if (isDefault && defaultSeen) {
      // At most one default is kept; drop the extras.
      warnings.push(t('warn.riderMultipleDefault', { id }))
      isDefault = false
    }
    if (isDefault) defaultSeen = true
    cats.push({
      id,
      name: rec['rider_category_name'] ?? '',
      isDefault,
      eligibilityUrl: rec['eligibility_url'] ?? '',
    })
  })
  return cats
}

function buildProducts(
  records: Record<string, string>[],
  knownSupportIds: Set<string>,
  knownCategoryIds: Set<string>,
  warnings: string[],
  t: TFunc,
): Product[] {
  const byId = new Map<string, Product>()
  records.forEach((rec, i) => {
    const line = i + 2
    const id = rec['fare_product_id'] ?? ''
    if (validateId(id)) {
      warnings.push(t('warn.productInvalidId', { line }))
      return
    }
    const amount = rec['amount'] ?? ''
    const currency = (rec['currency'] ?? '').toUpperCase()
    if (!isValidCurrency(currency)) {
      warnings.push(t('warn.productCurrency', { line, code: currency }))
    }
    if (validateAmount(amount, currency)) {
      warnings.push(t('warn.productAmount', { line, amount, currency }))
    }

    const mediaId = rec['fare_media_id'] ?? ''
    const riderId = rec['rider_category_id'] ?? ''
    const existing = byId.get(id)
    if (existing) {
      // Same product on another support → merge the media id in.
      if (mediaId && !existing.supportIds.includes(mediaId)) existing.supportIds.push(mediaId)
      // Keep the first rider category seen for this product.
      if (!existing.riderCategoryId && riderId) existing.riderCategoryId = riderId
    } else {
      byId.set(id, {
        id,
        name: rec['fare_product_name'] ?? '',
        amount,
        currency,
        supportIds: mediaId ? [mediaId] : [],
        riderCategoryId: riderId,
      })
    }
  })

  const products = [...byId.values()]
  // Warn about references to supports / categories that weren't imported.
  for (const p of products) {
    for (const sid of p.supportIds) {
      if (!knownSupportIds.has(sid)) {
        warnings.push(t('warn.productMediaRef', { id: p.id, ref: sid }))
      }
    }
    if (p.riderCategoryId && !knownCategoryIds.has(p.riderCategoryId)) {
      warnings.push(t('warn.productRiderRef', { id: p.id, ref: p.riderCategoryId }))
    }
  }
  return products
}

/** Case-insensitive lookup of a file inside the zip, ignoring folder prefixes. */
function findEntry(zip: JSZip, filename: string): JSZip.JSZipObject | null {
  const target = filename.toLowerCase()
  for (const name of Object.keys(zip.files)) {
    const base = name.split('/').pop()?.toLowerCase()
    if (base === target && !zip.files[name].dir) return zip.files[name]
  }
  return null
}

function networkFromFilename(filename: string): string | undefined {
  const base = filename.replace(/\.zip$/i, '')
  const slug = base.replace(/_?gtfs_fares$/i, '').trim()
  if (!slug) return undefined
  return slug.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
}

const EXTRA_LEG_COLUMNS = [
  'network_id',
  'from_area_id',
  'to_area_id',
  'from_timeframe_group_id',
  'to_timeframe_group_id',
]

/**
 * Attach leg & transfer rules to products from fare_leg_rules.txt and
 * fare_transfer_rules.txt. Only the simple model is supported: one leg group
 * per product, self-transfers, free transfers.
 */
function applyLegAndTransferRules(
  products: Product[],
  legRecords: Record<string, string>[] | null,
  transferRecords: Record<string, string>[] | null,
  warnings: string[],
  t: TFunc,
) {
  const byProductId = new Map(products.map((p) => [p.id, p]))
  // leg_group_id -> product, built from fare_leg_rules.
  const groupToProduct = new Map<string, Product>()

  if (legRecords) {
    let extraWarned = false
    legRecords.forEach((rec, i) => {
      const line = i + 2
      if (!extraWarned && EXTRA_LEG_COLUMNS.some((c) => (rec[c] ?? '').trim() !== '')) {
        warnings.push(t('warn.legRulesExtraColumns'))
        extraWarned = true
      }
      const productId = rec['fare_product_id'] ?? ''
      const product = byProductId.get(productId)
      if (!product) {
        warnings.push(t('warn.legRuleUnknownProduct', { line, id: productId }))
        return
      }
      // Default: a leg rule with no transfers.
      product.legRules = {
        transferPolicy: 'none',
        transferCount: '',
        durationMinutes: '',
        durationLimitType: 1,
      }
      const group = (rec['leg_group_id'] ?? '').trim()
      if (group) groupToProduct.set(group, product)
    })
  }

  if (transferRecords) {
    transferRecords.forEach((rec) => {
      const from = (rec['from_leg_group_id'] ?? '').trim()
      const to = (rec['to_leg_group_id'] ?? '').trim()
      if (from !== to) {
        warnings.push(t('warn.transferCrossGroup', { from, to }))
        return
      }
      const product = groupToProduct.get(from)
      if (!product || !product.legRules) {
        warnings.push(t('warn.transferUnknownGroup', { group: from }))
        return
      }
      const ttype = (rec['fare_transfer_type'] ?? '').trim()
      const tproduct = (rec['fare_product_id'] ?? '').trim()
      if ((ttype !== '' && ttype !== '0') || tproduct !== '') {
        warnings.push(t('warn.transferPaidDropped', { id: product.id }))
      }

      const count = (rec['transfer_count'] ?? '').trim()
      let transferPolicy: 'none' | 'limited' | 'unlimited' = 'none'
      let transferCount = ''
      if (count === '-1') {
        transferPolicy = 'unlimited'
      } else if (/^\d+$/.test(count) && Number(count) > 0) {
        transferPolicy = 'limited'
        transferCount = count
      }

      let durationMinutes = ''
      let durationLimitType = product.legRules.durationLimitType
      const dl = (rec['duration_limit'] ?? '').trim()
      if (/^\d+$/.test(dl) && Number(dl) > 0) {
        const sec = Number(dl)
        if (sec % 60 === 0) {
          durationMinutes = String(sec / 60)
        } else {
          durationMinutes = String(Math.round(sec / 60))
          warnings.push(t('warn.durationRounded', { id: product.id, minutes: durationMinutes }))
        }
        const dt = Number((rec['duration_limit_type'] ?? '').trim())
        durationLimitType = [0, 1, 2, 3].includes(dt) ? (dt as 0 | 1 | 2 | 3) : 1
      }

      product.legRules = { transferPolicy, transferCount, durationMinutes, durationLimitType }
    })
  }
}

/** Load a GTFS fares zip in the browser and reconstruct the app model. */
export async function importFromZip(file: File, t: TFunc): Promise<ImportResult> {
  const warnings: string[] = []
  const zip = await JSZip.loadAsync(file)

  const mediaEntry = findEntry(zip, 'fare_media.txt')
  const riderEntry = findEntry(zip, 'rider_categories.txt')
  const productsEntry = findEntry(zip, 'fare_products.txt')
  const legEntry = findEntry(zip, 'fare_leg_rules.txt')
  const transferEntry = findEntry(zip, 'fare_transfer_rules.txt')

  if (!mediaEntry && !productsEntry) {
    throw new Error(t('import.errorNoFiles'))
  }

  let supports: Support[] = []
  if (mediaEntry) {
    supports = buildSupports(toRecords(parseCsv(await mediaEntry.async('string'))), warnings, t)
  } else {
    warnings.push(t('warn.mediaMissing'))
  }

  let riderCategories: RiderCategory[] = []
  if (riderEntry) {
    riderCategories = buildRiderCategories(
      toRecords(parseCsv(await riderEntry.async('string'))),
      warnings,
      t,
    )
  }

  let products: Product[] = []
  if (productsEntry) {
    const knownSupportIds = new Set(supports.map((s) => s.id))
    const knownCategoryIds = new Set(riderCategories.map((c) => c.id))
    products = buildProducts(
      toRecords(parseCsv(await productsEntry.async('string'))),
      knownSupportIds,
      knownCategoryIds,
      warnings,
      t,
    )
  } else {
    warnings.push(t('warn.productMissing'))
  }

  if (legEntry || transferEntry) {
    const legRecords = legEntry ? toRecords(parseCsv(await legEntry.async('string'))) : null
    const transferRecords = transferEntry
      ? toRecords(parseCsv(await transferEntry.async('string')))
      : null
    applyLegAndTransferRules(products, legRecords, transferRecords, warnings, t)
  }

  return { networkName: networkFromFilename(file.name), supports, riderCategories, products, warnings }
}
