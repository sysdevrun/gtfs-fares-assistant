import { useEffect, useState } from 'react'
import { EMPTY_STATE, type AppState } from './types'

const STORAGE_KEY = 'gtfs-fares-assistant:v1'

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY_STATE
    const parsed = JSON.parse(raw) as Partial<AppState>
    return {
      networkName: parsed.networkName ?? '',
      supports: Array.isArray(parsed.supports) ? parsed.supports : [],
      riderCategories: Array.isArray(parsed.riderCategories) ? parsed.riderCategories : [],
      // Products from an older saved state may lack riderCategoryId.
      products: Array.isArray(parsed.products)
        ? parsed.products.map((p) => ({ ...p, riderCategoryId: p.riderCategoryId ?? '' }))
        : [],
    }
  } catch {
    return EMPTY_STATE
  }
}

/** App state persisted to localStorage on every change. */
export function usePersistentState(): [AppState, React.Dispatch<React.SetStateAction<AppState>>] {
  const [state, setState] = useState<AppState>(load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Ignore quota / private-mode write failures.
    }
  }, [state])

  return [state, setState]
}

export function clearStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
