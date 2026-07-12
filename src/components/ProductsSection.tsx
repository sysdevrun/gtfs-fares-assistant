import { useState } from 'react'
import type { Product, ProductLegRules, RiderCategory, Support } from '../types'
import { slugify } from '../gtfs'
import {
  validateAmount,
  validateCurrency,
  validateDurationMinutes,
  validateId,
  validateTransferCount,
} from '../validation'
import { useT } from '../i18n'

/** Format a whole number of minutes as e.g. "1 h 30 min", "3 h", "45 min". */
function formatHM(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h && m) return `${h} h ${m} min`
  if (h) return `${h} h`
  return `${m} min`
}

interface Props {
  products: Product[]
  supports: Support[]
  riderCategories: RiderCategory[]
  onChange: (products: Product[]) => void
}

interface Draft {
  id: string
  name: string
  amount: string
  currency: string
  supportIds: string[]
  riderCategoryId: string
  idTouched: boolean
  // Optional leg & transfer rules. 'undef' = no leg rules at all.
  transferPolicy: 'undef' | 'none' | 'limited' | 'unlimited'
  transferCount: string
  durationMinutes: string
  durationLimitType: 0 | 1 | 2 | 3
}

const COMMON_CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'CAD', 'AUD', 'JPY']

const emptyDraft: Draft = {
  id: '',
  name: '',
  amount: '',
  currency: 'EUR',
  supportIds: [],
  riderCategoryId: '',
  idTouched: false,
  transferPolicy: 'undef',
  transferCount: '',
  durationMinutes: '',
  durationLimitType: 1,
}

export default function ProductsSection({ products, supports, riderCategories, onChange }: Props) {
  const t = useT()
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
      // Keep only references that still exist.
      supportIds: p.supportIds.filter((id) => supports.some((s) => s.id === id)),
      riderCategoryId: riderCategories.some((c) => c.id === p.riderCategoryId)
        ? p.riderCategoryId
        : '',
      idTouched: true,
      transferPolicy: p.legRules?.transferPolicy ?? 'undef',
      transferCount: p.legRules?.transferCount ?? '',
      durationMinutes: p.legRules?.durationMinutes ?? '',
      durationLimitType: p.legRules?.durationLimitType ?? 1,
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
    const idError = validateId(id)
    if (idError) {
      setError(t(idError.key, idError.params))
      return
    }
    const currencyError = validateCurrency(draft.currency)
    if (currencyError) {
      setError(t(currencyError.key, currencyError.params))
      return
    }
    const amountError = validateAmount(draft.amount, draft.currency)
    if (amountError) {
      setError(t(amountError.key, amountError.params))
      return
    }
    const clash = products.some((p) => p.id === id && p.id !== editingId)
    if (clash) {
      setError(t('error.productDuplicate', { id }))
      return
    }
    let legRules: ProductLegRules | undefined
    if (draft.transferPolicy !== 'undef') {
      const policy = draft.transferPolicy
      if (policy === 'limited') {
        const countError = validateTransferCount(draft.transferCount)
        if (countError) {
          setError(t(countError.key, countError.params))
          return
        }
      }
      if (policy !== 'none') {
        const durationError = validateDurationMinutes(draft.durationMinutes)
        if (durationError) {
          setError(t(durationError.key, durationError.params))
          return
        }
      }
      legRules = {
        transferPolicy: policy,
        transferCount: policy === 'limited' ? draft.transferCount.trim() : '',
        durationMinutes: policy !== 'none' ? draft.durationMinutes.trim() : '',
        durationLimitType: draft.durationLimitType,
      }
    }
    const next: Product = {
      id,
      name: draft.name.trim(),
      amount: draft.amount.trim(),
      currency: draft.currency.trim().toUpperCase(),
      supportIds: draft.supportIds,
      riderCategoryId: draft.riderCategoryId,
      ...(legRules ? { legRules } : {}),
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
  const categoryLabel = (id: string) => {
    const c = riderCategories.find((x) => x.id === id)
    return c ? c.name || c.id : id
  }
  const isDefaultCategory = (id: string) =>
    riderCategories.find((x) => x.id === id)?.isDefault ?? false

  const legRulesSummary = (lr: NonNullable<Product['legRules']>): string => {
    let s: string
    if (lr.transferPolicy === 'unlimited') s = t('legrules.summaryUnlimited')
    else if (lr.transferPolicy === 'limited')
      s = t('legrules.summaryCount', { n: lr.transferCount || '0' })
    else s = t('legrules.summaryNoTransfer')
    if (lr.transferPolicy !== 'none' && lr.durationMinutes.trim() !== '') {
      s += ' · ' + formatHM(Number(lr.durationMinutes))
    }
    return s
  }

  const inputBase =
    'mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-slate-800">
          <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-sm text-white">
            3
          </span>
          {t('products.title')}
        </h2>
        <p className="mt-1 text-sm text-slate-500">{t('products.help')}</p>
      </header>

      {products.length > 0 && (
        <ul className="mb-4 divide-y divide-slate-100 rounded-lg border border-slate-100">
          {products.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <div className="truncate font-medium text-slate-800">
                  {p.name || <span className="italic text-slate-400">{t('common.noName')}</span>}{' '}
                  <span className="text-slate-500">
                    — {p.amount} {p.currency}
                  </span>
                  {p.riderCategoryId && (
                    <span
                      className={
                        'ml-2 rounded-full px-2 py-0.5 text-xs ' +
                        (isDefaultCategory(p.riderCategoryId)
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-blue-50 text-blue-700')
                      }
                    >
                      {categoryLabel(p.riderCategoryId)}
                    </span>
                  )}
                </div>
                <div className="truncate text-xs text-slate-500">
                  <code>{p.id}</code> ·{' '}
                  {p.supportIds.length > 0 ? (
                    p.supportIds.map(supportLabel).join(', ')
                  ) : (
                    <span className="italic">{t('products.mediaIndependent')}</span>
                  )}
                </div>
                {p.legRules && (
                  <div className="truncate text-xs text-slate-400">↻ {legRulesSummary(p.legRules)}</div>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => startEdit(p)}
                  className="rounded-md px-2 py-1 text-sm text-blue-600 hover:bg-blue-50"
                >
                  {t('common.edit')}
                </button>
                <button
                  onClick={() => remove(p.id)}
                  className="rounded-md px-2 py-1 text-sm text-red-600 hover:bg-red-50"
                >
                  {t('common.delete')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">{t('products.name')}</span>
          <input
            value={draft.name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder={t('products.phName')}
            className={inputBase}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">
            {t('products.id')} <span className="text-slate-400">({t('common.unique')})</span>
          </span>
          <input
            value={draft.id}
            onChange={(e) => setDraft((d) => ({ ...d, id: e.target.value, idTouched: true }))}
            placeholder="single_ticket"
            className={inputBase + ' font-mono'}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">{t('products.amount')}</span>
          <input
            value={draft.amount}
            onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))}
            inputMode="decimal"
            placeholder={t('products.phAmount')}
            className={inputBase}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">{t('products.currency')}</span>
          <input
            value={draft.currency}
            onChange={(e) => setDraft((d) => ({ ...d, currency: e.target.value }))}
            list="currency-options"
            placeholder="EUR"
            className={inputBase + ' uppercase'}
          />
          <datalist id="currency-options">
            {COMMON_CURRENCIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>
      </div>

      {/* Rider category / constraint */}
      <div className="mt-4">
        <span className="text-sm font-medium text-slate-700">{t('products.riderCategory')}</span>
        {riderCategories.length === 0 ? (
          <p className="mt-1 text-sm italic text-slate-400">{t('products.noRiders')}</p>
        ) : (
          <select
            value={draft.riderCategoryId}
            onChange={(e) => setDraft((d) => ({ ...d, riderCategoryId: e.target.value }))}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">{t('products.riderNone')}</option>
            {riderCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name || c.id}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="mt-4">
        <span className="text-sm font-medium text-slate-700">{t('products.usableOn')}</span>
        {supports.length === 0 ? (
          <p className="mt-1 text-sm italic text-slate-400">{t('products.noSupports')}</p>
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

      {/* Optional leg & transfer rules */}
      <div className="mt-4 rounded-lg border border-slate-200 p-3">
        <div className="text-sm font-medium text-slate-700">
          {t('legrules.title')}
          <span className="block text-xs font-normal text-slate-400">{t('legrules.hint')}</span>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">{t('legrules.transfers')}</span>
            <select
              value={draft.transferPolicy}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  transferPolicy: e.target.value as Draft['transferPolicy'],
                }))
              }
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="undef">{t('legrules.transfers.undef')}</option>
              <option value="none">{t('legrules.transfers.none')}</option>
              <option value="limited">{t('legrules.transfers.limited')}</option>
              <option value="unlimited">{t('legrules.transfers.unlimited')}</option>
            </select>
          </label>

          {draft.transferPolicy === 'limited' && (
              <label className="block">
                <span className="text-sm font-medium text-slate-700">{t('legrules.count')}</span>
                <input
                  value={draft.transferCount}
                  onChange={(e) => setDraft((d) => ({ ...d, transferCount: e.target.value }))}
                  inputMode="numeric"
                  placeholder="1"
                  className={inputBase}
                />
              </label>
            )}

            {(draft.transferPolicy === 'limited' || draft.transferPolicy === 'unlimited') && (
              <>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">
                    {t('legrules.durationMinutes')}{' '}
                    <span className="text-slate-400">({t('common.optional')})</span>
                  </span>
                  <input
                    value={draft.durationMinutes}
                    onChange={(e) => setDraft((d) => ({ ...d, durationMinutes: e.target.value }))}
                    inputMode="numeric"
                    placeholder="180"
                    className={inputBase}
                  />
                  <span className="mt-1 block text-xs text-slate-400">
                    {draft.durationMinutes.trim() !== '' && /^\d+$/.test(draft.durationMinutes.trim())
                      ? formatHM(Number(draft.durationMinutes))
                      : t('legrules.noLimit')}
                  </span>
                </label>

                {draft.durationMinutes.trim() !== '' && (
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">
                      {t('legrules.durationType')}
                    </span>
                    <select
                      value={draft.durationLimitType}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          durationLimitType: Number(e.target.value) as 0 | 1 | 2 | 3,
                        }))
                      }
                      className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {[0, 1, 2, 3].map((v) => (
                        <option key={v} value={v}>
                          {t(`legrules.durationType.${v}`)}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </>
            )}
          </div>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button
          onClick={submit}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {editingId ? t('products.save') : t('products.add')}
        </button>
        {editingId && (
          <button
            onClick={resetForm}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            {t('common.cancel')}
          </button>
        )}
      </div>
    </section>
  )
}
