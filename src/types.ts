// GTFS Fares V2 domain model.
// Reference: https://gtfs.org/documentation/schedule/reference/#fare_mediatxt
//            https://gtfs.org/documentation/schedule/reference/#fare_productstxt
//            https://gtfs.org/documentation/schedule/reference/#rider_categoriestxt

/**
 * fare_media_type enum as defined by the GTFS specification.
 * 0 - None (no fare media, e.g. cash payment)
 * 1 - Physical paper ticket
 * 2 - Physical transit card
 * 3 - cEMV (contactless Europay, Mastercard and Visa) — open-loop bank card
 * 4 - Mobile app
 */
export type FareMediaType = 0 | 1 | 2 | 3 | 4

export const FARE_MEDIA_TYPE_VALUES: FareMediaType[] = [0, 1, 2, 3, 4]

/** A "support" — the fare media a product can be carried on. */
export interface Support {
  /** fare_media_id (required, unique) */
  id: string
  /** fare_media_name (optional) */
  name: string
  /** fare_media_type (required) */
  type: FareMediaType
}

/** A rider category — an eligibility constraint (age, conditions) a product can target. */
export interface RiderCategory {
  /** rider_category_id (required, unique) */
  id: string
  /** rider_category_name (required) */
  name: string
  /** min_age (optional) — kept as string ('' when unset) */
  minAge: string
  /** max_age (optional) */
  maxAge: string
  /** eligibility_url (optional) — a link to the conditions */
  eligibilityUrl: string
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
  /** rider_category_id this product targets ('' = no constraint, all riders). */
  riderCategoryId: string
}

export interface AppState {
  networkName: string
  supports: Support[]
  riderCategories: RiderCategory[]
  products: Product[]
}

export const EMPTY_STATE: AppState = {
  networkName: '',
  supports: [],
  riderCategories: [],
  products: [],
}
