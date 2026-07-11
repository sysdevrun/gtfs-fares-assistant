// Shared validation used by the forms and by the zip importer.
// Validators return a translation key (+ params) rather than a finished
// string, so the UI can render them in the current language.

/** A validation failure: a translation key and optional interpolation params. */
export interface ValError {
  key: string
  params?: Record<string, string | number>
}

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

export function validateId(id: string): ValError | null {
  const v = id.trim()
  if (!v) return { key: 'error.idRequired' }
  if (!ID_RE.test(v)) return { key: 'error.idInvalid' }
  return null
}

export function validateAmount(amount: string, currency: string): ValError | null {
  const v = amount.trim()
  if (v === '') return { key: 'error.amountRequired' }
  if (!/^\d+(\.\d+)?$/.test(v)) return { key: 'error.amountNumber' }
  const n = Number(v)
  if (!Number.isFinite(n) || n < 0) return { key: 'error.amountNumber' }
  const maxDecimals = decimalsForCurrency(currency)
  const decimals = v.includes('.') ? v.split('.')[1].length : 0
  if (decimals > maxDecimals) {
    return { key: 'error.amountDecimals', params: { currency: currency.toUpperCase(), max: maxDecimals } }
  }
  return null
}

export function validateCurrency(code: string): ValError | null {
  if (!code.trim()) return { key: 'error.currencyRequired' }
  if (!isValidCurrency(code)) return { key: 'error.currencyInvalid', params: { code: code.toUpperCase() } }
  return null
}

/** Optional whole-number age ('' is allowed = unset). */
export function validateAge(age: string): ValError | null {
  const v = age.trim()
  if (v === '') return null
  if (!/^\d+$/.test(v)) return { key: 'error.ageNumber' }
  return null
}

/** Both ages optional; when both set, min must not exceed max. */
export function validateAgeRange(minAge: string, maxAge: string): ValError | null {
  const minErr = validateAge(minAge)
  if (minErr) return minErr
  const maxErr = validateAge(maxAge)
  if (maxErr) return maxErr
  if (minAge.trim() !== '' && maxAge.trim() !== '' && Number(minAge) > Number(maxAge)) {
    return { key: 'error.ageRange' }
  }
  return null
}
