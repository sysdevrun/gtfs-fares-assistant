import JSZip from 'jszip'
import type { FareMediaType, Product, Support } from './types'
import { isValidCurrency, validateAmount, validateId } from './validation'

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
  products: Product[]
  warnings: string[]
}

function parseMediaType(raw: string): FareMediaType | null {
  const n = Number(raw)
  return [0, 1, 2, 3, 4].includes(n) ? (n as FareMediaType) : null
}

function buildSupports(records: Record<string, string>[], warnings: string[]): Support[] {
  const supports: Support[] = []
  const seen = new Set<string>()
  records.forEach((rec, i) => {
    const line = i + 2 // account for header + 1-based
    const id = rec['fare_media_id'] ?? ''
    if (validateId(id)) {
      warnings.push(`fare_media.txt line ${line}: skipped — invalid or missing fare_media_id.`)
      return
    }
    if (seen.has(id)) {
      warnings.push(`fare_media.txt line ${line}: skipped — duplicate fare_media_id "${id}".`)
      return
    }
    const type = parseMediaType(rec['fare_media_type'] ?? '')
    if (type === null) {
      warnings.push(
        `fare_media.txt line ${line}: fare_media_type "${rec['fare_media_type']}" is invalid; defaulted to 0.`,
      )
    }
    seen.add(id)
    supports.push({ id, name: rec['fare_media_name'] ?? '', type: type ?? 0 })
  })
  return supports
}

function buildProducts(
  records: Record<string, string>[],
  knownSupportIds: Set<string>,
  warnings: string[],
): Product[] {
  const byId = new Map<string, Product>()
  records.forEach((rec, i) => {
    const line = i + 2
    const id = rec['fare_product_id'] ?? ''
    if (validateId(id)) {
      warnings.push(`fare_products.txt line ${line}: skipped — invalid or missing fare_product_id.`)
      return
    }
    const amount = rec['amount'] ?? ''
    const currency = (rec['currency'] ?? '').toUpperCase()
    if (!isValidCurrency(currency)) {
      warnings.push(`fare_products.txt line ${line}: currency "${currency}" is not a valid ISO 4217 code.`)
    }
    if (validateAmount(amount, currency)) {
      warnings.push(`fare_products.txt line ${line}: amount "${amount}" is not valid for ${currency}.`)
    }

    const mediaId = rec['fare_media_id'] ?? ''
    const existing = byId.get(id)
    if (existing) {
      // Same product on another support → merge the media id in.
      if (mediaId && !existing.supportIds.includes(mediaId)) existing.supportIds.push(mediaId)
    } else {
      byId.set(id, {
        id,
        name: rec['fare_product_name'] ?? '',
        amount,
        currency,
        supportIds: mediaId ? [mediaId] : [],
      })
    }
  })

  const products = [...byId.values()]
  // Warn about products referencing a support that wasn't imported.
  for (const p of products) {
    for (const sid of p.supportIds) {
      if (!knownSupportIds.has(sid)) {
        warnings.push(
          `fare_products.txt: product "${p.id}" references fare_media_id "${sid}" not found in fare_media.txt.`,
        )
      }
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

/** Load a GTFS fares zip in the browser and reconstruct the app model. */
export async function importFromZip(file: File): Promise<ImportResult> {
  const warnings: string[] = []
  const zip = await JSZip.loadAsync(file)

  const mediaEntry = findEntry(zip, 'fare_media.txt')
  const productsEntry = findEntry(zip, 'fare_products.txt')

  if (!mediaEntry && !productsEntry) {
    throw new Error('No fare_media.txt or fare_products.txt found in the archive.')
  }

  let supports: Support[] = []
  if (mediaEntry) {
    supports = buildSupports(toRecords(parseCsv(await mediaEntry.async('string'))), warnings)
  } else {
    warnings.push('fare_media.txt not found in the archive; no supports imported.')
  }

  let products: Product[] = []
  if (productsEntry) {
    const knownIds = new Set(supports.map((s) => s.id))
    products = buildProducts(toRecords(parseCsv(await productsEntry.async('string'))), knownIds, warnings)
  } else {
    warnings.push('fare_products.txt not found in the archive; no products imported.')
  }

  return { networkName: networkFromFilename(file.name), supports, products, warnings }
}
