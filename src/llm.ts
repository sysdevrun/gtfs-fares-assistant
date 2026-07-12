// Bring-Your-Own-Key LLM extraction: send fare documents (PDF, images, Excel,
// CSV/text) straight from the browser to the Claude API and map the structured
// response into the app model (the same ImportResult the zip importer produces).
//
// Nothing is proxied — the request goes directly from the user's browser to
// api.anthropic.com with the user's own key (dangerouslyAllowBrowser). The only
// data that leaves the machine is the files the user explicitly attaches.

import Anthropic from '@anthropic-ai/sdk'
import * as XLSX from 'xlsx'
import type { ImportResult } from './parse'
import type { FareMediaType, Product, ProductLegRules, RiderCategory, Support } from './types'
import { isValidCurrency, validateAmount } from './validation'
import { isExcel, isImage, isPdf, type AiModel } from './aiFiles'
import type { TFunc } from './i18n'

/** Image media types Claude accepts natively as image blocks. */
const IMAGE_MEDIA_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp'])

/** Shape the model is constrained to emit (mirrors the app model as plain JSON). */
interface RawExtraction {
  networkName: string
  supports: { id: string; name: string; type: number }[]
  riderCategories: { id: string; name: string; isDefault: boolean; eligibilityUrl: string }[]
  products: {
    id: string
    name: string
    amount: string
    currency: string
    supportIds: string[]
    riderCategoryId: string
    legRules: {
      transferPolicy: 'none' | 'limited' | 'unlimited'
      transferCount: string
      durationMinutes: string
      durationLimitType: number
    } | null
  }[]
}

// JSON schema enforced via structured outputs. Every object sets
// additionalProperties:false and lists all keys in `required` (a structured
// outputs requirement); nullable fields use anyOf with a null branch.
const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['networkName', 'supports', 'riderCategories', 'products'],
  properties: {
    networkName: { type: 'string' },
    supports: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'name', 'type'],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          type: { type: 'integer', enum: [0, 1, 2, 3, 4] },
        },
      },
    },
    riderCategories: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'name', 'isDefault', 'eligibilityUrl'],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          isDefault: { type: 'boolean' },
          eligibilityUrl: { type: 'string' },
        },
      },
    },
    products: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'name', 'amount', 'currency', 'supportIds', 'riderCategoryId', 'legRules'],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          amount: { type: 'string' },
          currency: { type: 'string' },
          supportIds: { type: 'array', items: { type: 'string' } },
          riderCategoryId: { type: 'string' },
          legRules: {
            anyOf: [
              { type: 'null' },
              {
                type: 'object',
                additionalProperties: false,
                required: ['transferPolicy', 'transferCount', 'durationMinutes', 'durationLimitType'],
                properties: {
                  transferPolicy: { type: 'string', enum: ['none', 'limited', 'unlimited'] },
                  transferCount: { type: 'string' },
                  durationMinutes: { type: 'string' },
                  durationLimitType: { type: 'integer', enum: [0, 1, 2, 3] },
                },
              },
            ],
          },
        },
      },
    },
  },
} as const

const SYSTEM_PROMPT = `You extract public-transport fare data (a "gamme tarifaire") from documents into GTFS Fares V2 structures. You are given PDFs, images and/or spreadsheet text describing a network's fares. Return ONLY data supported by the documents — never invent prices, media or categories.

Fill the schema as follows:

- networkName: the transit network / operator name if stated, else "".

- supports = fare media (fare_media). type: 0 = none (cash, no physical medium), 1 = paper ticket, 2 = transit card, 3 = cEMV contactless bank card, 4 = mobile app. Only list media the documents actually mention. id: short, lowercase, snake_case, unique (e.g. "paper_ticket", "transit_card"). name: human-readable label from the document. If the document never distinguishes media, emit a single reasonable support (often a paper ticket) or leave supports empty.

- riderCategories = rider groups the fares depend on (adult/full, youth, student, senior, child, reduced…). Only create categories the documents actually distinguish by price. Set isDefault:true on the standard full-fare / adult category (AT MOST ONE default; others false). eligibilityUrl: a conditions URL if one is printed, else "". If fares don't vary by rider, leave riderCategories empty.

- products = each distinct priced fare (single ticket, day pass, monthly pass, book of 10…). amount: the price as a decimal string in MAJOR currency units, e.g. "2.50", "0", "45" (no currency symbol, use "." as decimal separator). currency: ISO 4217 code inferred from the document (€ → EUR, $ → USD, £ → GBP, etc.). supportIds: ids of the supports this fare is sold on ([] if unclear). riderCategoryId: the id of the rider category it targets, or "" for all riders. If the same fare exists for several rider categories at different prices, emit one product per category.

- legRules: null unless the document states a transfer allowance or a ticket validity duration. transferPolicy: "none" (no transfers), "limited" (a fixed number → set transferCount to that number as a string) or "unlimited". durationMinutes: validity window in minutes as a string ("" if none). durationLimitType: 0 departure→arrival, 1 departure→departure, 2 arrival→departure, 3 arrival→arrival (use 1 if unsure).

Rules: ids are lowercase snake_case, unique within their list, no spaces/commas/quotes. Use "" or [] for anything the documents don't state. Prefer omitting uncertain data over guessing.`

/** Base64-encode an ArrayBuffer without newlines (chunked to avoid stack limits). */
function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

/** Turn one uploaded file into Claude content block(s). */
async function fileToBlocks(file: File): Promise<Anthropic.ContentBlockParam[]> {
  const buffer = await file.arrayBuffer()

  if (isPdf(file)) {
    return [
      { type: 'text', text: `Document: ${file.name}` },
      {
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: toBase64(buffer) },
      },
    ]
  }

  if (isImage(file)) {
    const mediaType = IMAGE_MEDIA_TYPES.has(file.type) ? file.type : 'image/png'
    return [
      { type: 'text', text: `Image: ${file.name}` },
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType as 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp',
          data: toBase64(buffer),
        },
      },
    ]
  }

  if (isExcel(file)) {
    // Claude can't read .xlsx natively — parse locally and send each sheet as CSV.
    const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' })
    const sheets = wb.SheetNames.map(
      (name) => `# Sheet: ${name}\n${XLSX.utils.sheet_to_csv(wb.Sheets[name])}`,
    ).join('\n\n')
    return [{ type: 'text', text: `Spreadsheet: ${file.name}\n${sheets}` }]
  }

  // CSV / plain text.
  const text = new TextDecoder().decode(buffer)
  return [{ type: 'text', text: `File: ${file.name}\n${text}` }]
}

/** Make a raw model-supplied id CSV-safe (lowercase, no spaces/commas/quotes). */
function sanitizeId(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/['",]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

/**
 * Turn the (schema-valid but semantically untrusted) model output into the app
 * model, sanitizing ids, dropping duplicates and collecting review warnings.
 * Mirrors the tolerant "import everything, warn about problems" approach of the
 * zip importer so the user reviews the result in the normal editor.
 */
function normalize(raw: RawExtraction, t: TFunc): ImportResult {
  const warnings: string[] = []

  // Track how each original id was rewritten so product references still resolve.
  const supports: Support[] = []
  const supportIdMap = new Map<string, string>()
  const usedSupportIds = new Set<string>()
  for (const s of raw.supports ?? []) {
    let id = sanitizeId(s.id) || sanitizeId(s.name) || `support_${supports.length + 1}`
    if (id !== s.id.trim()) warnings.push(t('ai.warn.idFixed', { kind: 'fare_media_id', from: s.id, to: id }))
    if (usedSupportIds.has(id)) {
      let n = 2
      while (usedSupportIds.has(`${id}_${n}`)) n++
      id = `${id}_${n}`
    }
    usedSupportIds.add(id)
    supportIdMap.set(s.id, id)
    const type = ([0, 1, 2, 3, 4].includes(s.type) ? s.type : 0) as FareMediaType
    supports.push({ id, name: s.name ?? '', type })
  }

  const riderCategories: RiderCategory[] = []
  const riderIdMap = new Map<string, string>()
  const usedRiderIds = new Set<string>()
  let defaultSeen = false
  for (const c of raw.riderCategories ?? []) {
    let id = sanitizeId(c.id) || sanitizeId(c.name) || `category_${riderCategories.length + 1}`
    if (id !== c.id.trim()) warnings.push(t('ai.warn.idFixed', { kind: 'rider_category_id', from: c.id, to: id }))
    if (usedRiderIds.has(id)) {
      let n = 2
      while (usedRiderIds.has(`${id}_${n}`)) n++
      id = `${id}_${n}`
    }
    usedRiderIds.add(id)
    riderIdMap.set(c.id, id)
    let isDefault = Boolean(c.isDefault)
    if (isDefault && defaultSeen) {
      warnings.push(t('ai.warn.multipleDefault', { id }))
      isDefault = false
    }
    if (isDefault) defaultSeen = true
    riderCategories.push({ id, name: c.name ?? '', isDefault, eligibilityUrl: c.eligibilityUrl ?? '' })
  }

  const products: Product[] = []
  const usedProductIds = new Set<string>()
  for (const p of raw.products ?? []) {
    let id = sanitizeId(p.id) || sanitizeId(p.name) || `product_${products.length + 1}`
    if (id !== p.id.trim()) warnings.push(t('ai.warn.idFixed', { kind: 'fare_product_id', from: p.id, to: id }))
    if (usedProductIds.has(id)) {
      let n = 2
      while (usedProductIds.has(`${id}_${n}`)) n++
      id = `${id}_${n}`
    }
    usedProductIds.add(id)

    const currency = (p.currency ?? '').trim().toUpperCase()
    if (!isValidCurrency(currency)) warnings.push(t('ai.warn.currencyInvalid', { id, code: currency }))
    else if (validateAmount(p.amount ?? '', currency)) {
      warnings.push(t('ai.warn.amountInvalid', { id, amount: p.amount ?? '', currency }))
    }

    // Remap support references through the sanitized ids; warn on unknowns.
    const supportIds: string[] = []
    for (const ref of p.supportIds ?? []) {
      const mapped = supportIdMap.get(ref) ?? (usedSupportIds.has(sanitizeId(ref)) ? sanitizeId(ref) : '')
      if (mapped && usedSupportIds.has(mapped)) {
        if (!supportIds.includes(mapped)) supportIds.push(mapped)
      } else {
        warnings.push(t('ai.warn.supportRef', { id, ref }))
      }
    }

    let riderCategoryId = ''
    if ((p.riderCategoryId ?? '').trim()) {
      const mapped =
        riderIdMap.get(p.riderCategoryId) ??
        (usedRiderIds.has(sanitizeId(p.riderCategoryId)) ? sanitizeId(p.riderCategoryId) : '')
      if (mapped && usedRiderIds.has(mapped)) riderCategoryId = mapped
      else warnings.push(t('ai.warn.riderRef', { id, ref: p.riderCategoryId }))
    }

    let legRules: ProductLegRules | undefined
    if (p.legRules) {
      const lr = p.legRules
      legRules = {
        transferPolicy: ['none', 'limited', 'unlimited'].includes(lr.transferPolicy)
          ? lr.transferPolicy
          : 'none',
        transferCount: /^\d+$/.test((lr.transferCount ?? '').trim()) ? lr.transferCount.trim() : '',
        durationMinutes: /^\d+$/.test((lr.durationMinutes ?? '').trim()) ? lr.durationMinutes.trim() : '',
        durationLimitType: ([0, 1, 2, 3].includes(lr.durationLimitType) ? lr.durationLimitType : 1) as
          | 0
          | 1
          | 2
          | 3,
      }
    }

    products.push({
      id,
      name: p.name ?? '',
      amount: (p.amount ?? '').trim(),
      currency,
      supportIds,
      riderCategoryId,
      ...(legRules ? { legRules } : {}),
    })
  }

  if (supports.length || riderCategories.length || products.length) {
    warnings.unshift(t('ai.warn.reviewReminder'))
  }

  return { networkName: raw.networkName?.trim() || undefined, supports, riderCategories, products, warnings }
}

/**
 * Run the extraction: read the files in-browser, call Claude with the user's
 * key, and return an ImportResult ready to drop into the editor.
 */
export async function extractFromFiles(
  files: File[],
  apiKey: string,
  model: AiModel,
  t: TFunc,
): Promise<ImportResult> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })

  const content: Anthropic.ContentBlockParam[] = []
  for (const file of files) {
    content.push(...(await fileToBlocks(file)))
  }
  content.push({
    type: 'text',
    text: 'Extract the fare structure from the document(s) above into the required JSON schema.',
  })

  const stream = client.messages.stream({
    model,
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content }],
    output_config: { format: { type: 'json_schema', schema: OUTPUT_SCHEMA as Record<string, unknown> } },
  })
  const message = await stream.finalMessage()

  if (message.stop_reason === 'refusal') {
    throw new Error(t('ai.error.refusal'))
  }

  const textBlock = message.content.find((b): b is Anthropic.TextBlock => b.type === 'text')
  if (!textBlock) throw new Error(t('ai.error.noOutput'))

  let raw: RawExtraction
  try {
    raw = JSON.parse(textBlock.text) as RawExtraction
  } catch {
    throw new Error(t('ai.error.parse'))
  }

  const result = normalize(raw, t)
  if (
    result.supports.length === 0 &&
    result.riderCategories.length === 0 &&
    result.products.length === 0
  ) {
    throw new Error(t('ai.error.empty'))
  }
  return result
}

/** Map SDK errors to a friendly, translated message. */
export function describeError(e: unknown, t: TFunc): string {
  if (e instanceof Anthropic.AuthenticationError) return t('ai.error.auth')
  if (e instanceof Anthropic.PermissionDeniedError) return t('ai.error.auth')
  if (e instanceof Anthropic.RateLimitError) return t('ai.error.rateLimit')
  if (e instanceof Anthropic.APIConnectionError) return t('ai.error.network')
  if (e instanceof Anthropic.APIError) return e.message
  if (e instanceof Error) return e.message
  return t('ai.error.generic')
}
