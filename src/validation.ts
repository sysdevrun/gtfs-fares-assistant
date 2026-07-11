// Shared validation used by the forms and by the zip importer.

/**
 * Active ISO 4217 alphabetic currency codes.
 * Source: ISO 4217 published list (active codes only, no funds/metals).
 */
export const ISO_4217_CODES = new Set<string>([
  'AED', 'AFN', 'ALL', 'AMD', 'ANG', 'AOA', 'ARS', 'AUD', 'AWG', 'AZN',
  'BAM', 'BBD', 'BDT', 'BGN', 'BHD', 'BIF', 'BMD', 'BND', 'BOB', 'BRL',
  'BSD', 'BTN', 'BWP', 'BYN', 'BZD', 'CAD', 'CDF', 'CHF', 'CLP', 'CNY',
  'COP', 'CRC', 'CUP', 'CVE', 'CZK', 'DJF', 'DKK', 'DOP', 'DZD', 'EGP',
  'ERN', 'ETB', 'EUR', 'FJD', 'FKP', 'GBP', 'GEL', 'GHS', 'GIP', 'GMD',
  'GNF', 'GTQ', 'GYD', 'HKD', 'HNL', 'HTG', 'HUF', 'IDR', 'ILS', 'INR',
  'IQD', 'IRR', 'ISK', 'JMD', 'JOD', 'JPY', 'KES', 'KGS', 'KHR', 'KMF',
  'KPW', 'KRW', 'KWD', 'KYD', 'KZT', 'LAK', 'LBP', 'LKR', 'LRD', 'LSL',
  'LYD', 'MAD', 'MDL', 'MGA', 'MKD', 'MMK', 'MNT', 'MOP', 'MRU', 'MUR',
  'MVR', 'MWK', 'MXN', 'MYR', 'MZN', 'NAD', 'NGN', 'NIO', 'NOK', 'NPR',
  'NZD', 'OMR', 'PAB', 'PEN', 'PGK', 'PHP', 'PKR', 'PLN', 'PYG', 'QAR',
  'RON', 'RSD', 'RUB', 'RWF', 'SAR', 'SBD', 'SCR', 'SDG', 'SEK', 'SGD',
  'SHP', 'SLE', 'SOS', 'SRD', 'SSP', 'STN', 'SVC', 'SYP', 'SZL', 'THB',
  'TJS', 'TMT', 'TND', 'TOP', 'TRY', 'TTD', 'TWD', 'TZS', 'UAH', 'UGX',
  'USD', 'UYU', 'UZS', 'VED', 'VES', 'VND', 'VUV', 'WST', 'XAF', 'XCD',
  'XCG', 'XOF', 'XPF', 'YER', 'ZAR', 'ZMW', 'ZWG',
])

/**
 * Number of minor-unit decimal places per currency where it is not the
 * default of 2. Used to check that an amount has an appropriate precision.
 */
const CURRENCY_DECIMALS: Record<string, number> = {
  BHD: 3, BIF: 0, CLP: 0, DJF: 0, GNF: 0, IQD: 3, ISK: 0, JOD: 3, JPY: 0,
  KMF: 0, KRW: 0, KWD: 3, LYD: 3, MGA: 0, OMR: 3, PYG: 0, RWF: 0, TND: 3,
  UGX: 0, VND: 0, VUV: 0, XAF: 0, XOF: 0, XPF: 0,
}

export function decimalsForCurrency(code: string): number {
  return CURRENCY_DECIMALS[code.toUpperCase()] ?? 2
}

export function isValidCurrency(code: string): boolean {
  return ISO_4217_CODES.has(code.trim().toUpperCase())
}

/** GTFS ids: printable, no whitespace, no comma/quote (kept CSV-safe). */
const ID_RE = /^[^\s,"]+$/

export function validateId(id: string): string | null {
  const v = id.trim()
  if (!v) return 'An id is required.'
  if (!ID_RE.test(v)) return 'Id must not contain spaces, commas or quotes.'
  return null
}

/** Returns an error message, or null when the amount is valid. */
export function validateAmount(amount: string, currency: string): string | null {
  const v = amount.trim()
  if (v === '') return 'An amount is required.'
  if (!/^\d+(\.\d+)?$/.test(v)) return 'Amount must be a non-negative number (e.g. 2.50).'
  const n = Number(v)
  if (!Number.isFinite(n) || n < 0) return 'Amount must be a non-negative number.'
  const maxDecimals = decimalsForCurrency(currency)
  const decimals = v.includes('.') ? v.split('.')[1].length : 0
  if (decimals > maxDecimals) {
    return `${currency.toUpperCase()} allows at most ${maxDecimals} decimal place${
      maxDecimals === 1 ? '' : 's'
    }.`
  }
  return null
}

export function validateCurrency(code: string): string | null {
  if (!code.trim()) return 'A currency is required.'
  if (!isValidCurrency(code)) return `"${code.toUpperCase()}" is not a valid ISO 4217 currency code.`
  return null
}
