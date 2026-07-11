import { useState } from 'react'
import type { RiderCategory } from '../types'
import { slugify } from '../gtfs'
import { validateAgeRange, validateId } from '../validation'
import { useT } from '../i18n'

interface Props {
  categories: RiderCategory[]
  onChange: (categories: RiderCategory[]) => void
}

interface Draft {
  id: string
  name: string
  minAge: string
  maxAge: string
  eligibilityUrl: string
  idTouched: boolean
}

const emptyDraft: Draft = {
  id: '',
  name: '',
  minAge: '',
  maxAge: '',
  eligibilityUrl: '',
  idTouched: false,
}

export default function RiderCategoriesSection({ categories, onChange }: Props) {
  const t = useT()
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const resetForm = () => {
    setDraft(emptyDraft)
    setEditingId(null)
    setError(null)
  }

  const startEdit = (c: RiderCategory) => {
    setDraft({
      id: c.id,
      name: c.name,
      minAge: c.minAge,
      maxAge: c.maxAge,
      eligibilityUrl: c.eligibilityUrl,
      idTouched: true,
    })
    setEditingId(c.id)
    setError(null)
  }

  const submit = () => {
    const id = draft.id.trim()
    const idError = validateId(id)
    if (idError) {
      setError(t(idError.key, idError.params))
      return
    }
    const ageError = validateAgeRange(draft.minAge, draft.maxAge)
    if (ageError) {
      setError(t(ageError.key, ageError.params))
      return
    }
    const clash = categories.some((c) => c.id === id && c.id !== editingId)
    if (clash) {
      setError(t('error.riderDuplicate', { id }))
      return
    }
    const next: RiderCategory = {
      id,
      name: draft.name.trim(),
      minAge: draft.minAge.trim(),
      maxAge: draft.maxAge.trim(),
      eligibilityUrl: draft.eligibilityUrl.trim(),
    }
    if (editingId) {
      onChange(categories.map((c) => (c.id === editingId ? next : c)))
    } else {
      onChange([...categories, next])
    }
    resetForm()
  }

  const remove = (id: string) => {
    onChange(categories.filter((c) => c.id !== id))
    if (editingId === id) resetForm()
  }

  const onNameChange = (name: string) => {
    setDraft((d) => ({ ...d, name, id: d.idTouched ? d.id : slugify(name) }))
  }

  const ageText = (c: RiderCategory) => {
    if (!c.minAge && !c.maxAge) return null
    return t('riders.age', {
      min: c.minAge || t('riders.ageAny'),
      max: c.maxAge || t('riders.ageAny'),
    })
  }

  const inputBase =
    'mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-slate-800">
          <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-sm text-white">
            2
          </span>
          {t('riders.title')}
        </h2>
        <p className="mt-1 text-sm text-slate-500">{t('riders.help')}</p>
      </header>

      {categories.length > 0 && (
        <ul className="mb-4 divide-y divide-slate-100 rounded-lg border border-slate-100">
          {categories.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <div className="truncate font-medium text-slate-800">
                  {c.name || <span className="italic text-slate-400">{t('common.noName')}</span>}
                </div>
                <div className="truncate text-xs text-slate-500">
                  <code>{c.id}</code>
                  {ageText(c) && <> · {ageText(c)}</>}
                  {c.eligibilityUrl && (
                    <>
                      {' · '}
                      <a
                        href={c.eligibilityUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 underline"
                      >
                        {c.eligibilityUrl}
                      </a>
                    </>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => startEdit(c)}
                  className="rounded-md px-2 py-1 text-sm text-blue-600 hover:bg-blue-50"
                >
                  {t('common.edit')}
                </button>
                <button
                  onClick={() => remove(c.id)}
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
          <span className="text-sm font-medium text-slate-700">{t('riders.name')}</span>
          <input
            value={draft.name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder={t('riders.phName')}
            className={inputBase}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">
            {t('riders.id')} <span className="text-slate-400">({t('common.unique')})</span>
          </span>
          <input
            value={draft.id}
            onChange={(e) => setDraft((d) => ({ ...d, id: e.target.value, idTouched: true }))}
            placeholder="youth"
            className={inputBase + ' font-mono'}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">
            {t('riders.minAge')} <span className="text-slate-400">({t('common.optional')})</span>
          </span>
          <input
            value={draft.minAge}
            onChange={(e) => setDraft((d) => ({ ...d, minAge: e.target.value }))}
            inputMode="numeric"
            placeholder="0"
            className={inputBase}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">
            {t('riders.maxAge')} <span className="text-slate-400">({t('common.optional')})</span>
          </span>
          <input
            value={draft.maxAge}
            onChange={(e) => setDraft((d) => ({ ...d, maxAge: e.target.value }))}
            inputMode="numeric"
            placeholder="25"
            className={inputBase}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-slate-700">
            {t('riders.eligibilityUrl')}{' '}
            <span className="text-slate-400">({t('common.optional')})</span>
          </span>
          <input
            value={draft.eligibilityUrl}
            onChange={(e) => setDraft((d) => ({ ...d, eligibilityUrl: e.target.value }))}
            inputMode="url"
            placeholder="https://…"
            className={inputBase}
          />
        </label>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button
          onClick={submit}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {editingId ? t('riders.save') : t('riders.add')}
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
