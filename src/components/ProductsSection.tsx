import { useState } from 'react'
import type { Product, Support } from '../types'
import { slugify } from '../gtfs'

interface Props {
  products: Product[]
  supports: Support[]
  onChange: (products: Product[]) => void
}

interface Draft {
  id: string
  name: string
  amount: string
  currency: string
  supportIds: string[]
  idTouched: boolean
}

const COMMON_CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'CAD', 'AUD', 'JPY']

const emptyDraft: Draft = {
  id: '',
  name: '',
  amount: '',
  currency: 'EUR',
  supportIds: [],
  idTouched: false,
}

export default function ProductsSection({ products, supports, onChange }: Props) {
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const resetForm = () => {
    setDraft(emptyDraft)
    setEditingId(null)
    setError(null)
  }

  const startEdit = (p: Product) => {
    setDraft({
      id: p.id,
      name: p.name,
      amount: p.amount,
      currency: p.currency,
      // Keep only supports that still exist.
      supportIds: p.supportIds.filter((id) => supports.some((s) => s.id === id)),
      idTouched: true,
    })
    setEditingId(p.id)
    setError(null)
  }

  const toggleSupport = (id: string) => {
    setDraft((d) => ({
      ...d,
      supportIds: d.supportIds.includes(id)
        ? d.supportIds.filter((x) => x !== id)
        : [...d.supportIds, id],
    }))
  }

  const submit = () => {
    const id = draft.id.trim()
    if (!id) {
      setError('An id is required.')
      return
    }
    if (draft.amount.trim() === '' || Number.isNaN(Number(draft.amount))) {
      setError('A numeric amount is required.')
      return
    }
    if (!draft.currency.trim()) {
      setError('A currency is required.')
      return
    }
    const clash = products.some((p) => p.id === id && p.id !== editingId)
    if (clash) {
      setError(`A product with id "${id}" already exists.`)
      return
    }
    const next: Product = {
      id,
      name: draft.name.trim(),
      amount: draft.amount.trim(),
      currency: draft.currency.trim().toUpperCase(),
      supportIds: draft.supportIds,
    }
    if (editingId) {
      onChange(products.map((p) => (p.id === editingId ? next : p)))
    } else {
      onChange([...products, next])
    }
    resetForm()
  }

  const remove = (id: string) => {
    onChange(products.filter((p) => p.id !== id))
    if (editingId === id) resetForm()
  }

  const onNameChange = (name: string) => {
    setDraft((d) => ({ ...d, name, id: d.idTouched ? d.id : slugify(name) }))
  }

  const supportLabel = (id: string) => {
    const s = supports.find((x) => x.id === id)
    return s ? s.name || s.id : id
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-slate-800">
          <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-sm text-white">
            2
          </span>
          Products
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Fare products with a price, and the supports they can be used on. Each product/support
          pair becomes a row in <code className="rounded bg-slate-100 px-1">fare_products.txt</code>.
        </p>
      </header>

      {products.length > 0 && (
        <ul className="mb-4 divide-y divide-slate-100 rounded-lg border border-slate-100">
          {products.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <div className="truncate font-medium text-slate-800">
                  {p.name || <span className="italic text-slate-400">(no name)</span>}{' '}
                  <span className="text-slate-500">
                    — {p.amount} {p.currency}
                  </span>
                </div>
                <div className="truncate text-xs text-slate-500">
                  <code>{p.id}</code> ·{' '}
                  {p.supportIds.length > 0 ? (
                    p.supportIds.map(supportLabel).join(', ')
                  ) : (
                    <span className="italic">no support (media-independent)</span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => startEdit(p)}
                  className="rounded-md px-2 py-1 text-sm text-blue-600 hover:bg-blue-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => remove(p.id)}
                  className="rounded-md px-2 py-1 text-sm text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Name</span>
          <input
            value={draft.name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="e.g. Single ticket"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">
            fare_product_id <span className="text-slate-400">(unique)</span>
          </span>
          <input
            value={draft.id}
            onChange={(e) => setDraft((d) => ({ ...d, id: e.target.value, idTouched: true }))}
            placeholder="e.g. single_ticket"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Amount</span>
          <input
            value={draft.amount}
            onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))}
            inputMode="decimal"
            placeholder="e.g. 2.50"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Currency</span>
          <input
            value={draft.currency}
            onChange={(e) => setDraft((d) => ({ ...d, currency: e.target.value }))}
            list="currency-options"
            placeholder="EUR"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm uppercase focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <datalist id="currency-options">
            {COMMON_CURRENCIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>
      </div>

      <div className="mt-4">
        <span className="text-sm font-medium text-slate-700">Usable on supports</span>
        {supports.length === 0 ? (
          <p className="mt-1 text-sm italic text-slate-400">
            No supports defined yet — add one in step 1 first, or leave empty for a
            media-independent product.
          </p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {supports.map((s) => {
              const checked = draft.supportIds.includes(s.id)
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleSupport(s.id)}
                  className={
                    'rounded-full border px-3 py-1 text-sm transition ' +
                    (checked
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-300 bg-white text-slate-600 hover:border-blue-400')
                  }
                >
                  {s.name || s.id}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button
          onClick={submit}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {editingId ? 'Save changes' : 'Add product'}
        </button>
        {editingId && (
          <button
            onClick={resetForm}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
        )}
      </div>
    </section>
  )
}
