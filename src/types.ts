// GTFS Fares V2 domain model.
// Reference: https://gtfs.org/documentation/schedule/reference/#fare_mediatxt
//            https://gtfs.org/documentation/schedule/reference/#fare_productstxt

/**
 * fare_media_type enum as defined by the GTFS specification.
 * 0 - None (no fare media, e.g. cash payment)
 * 1 - Physical paper ticket
 * 2 - Physical transit card
 * 3 - cEMV (contactless Europay, Mastercard and Visa) — open-loop bank card
 * 4 - Mobile app
 */
export type FareMediaType = 0 | 1 | 2 | 3 | 4

export const FARE_MEDIA_TYPES: { value: FareMediaType; label: string }[] = [
  { value: 0, label: '0 — None (e.g. cash, no media)' },
  { value: 1, label: '1 — Physical paper ticket' },
  { value: 2, label: '2 — Physical transit card' },
  { value: 3, label: '3 — cEMV (contactless bank card)' },
  { value: 4, label: '4 — Mobile app' },
]

/** A "support" — the fare media a product can be carried on. */
export interface Support {
  /** fare_media_id (required, unique) */
  id: string
  /** fare_media_name (optional) */
  name: string
  /** fare_media_type (required) */
  type: FareMediaType
}

/** A fare product. */
export interface Product {
  /** fare_product_id (required, unique) */
  id: string
  /** fare_product_name (optional) */
  name: string
  /** amount (required) — kept as string to preserve exact decimal input */
  amount: string
  /** currency (required) — ISO 4217, e.g. EUR */
  currency: string
  /**
   * IDs of the supports this product may be used on.
   * Each selected support becomes one row in fare_products.txt.
   * An empty list means the product is media-independent (no fare_media_id).
   */
  supportIds: string[]
}

export interface AppState {
  networkName: string
  supports: Support[]
  products: Product[]
}

export const EMPTY_STATE: AppState = {
  networkName: '',
  supports: [],
  products: [],
}
