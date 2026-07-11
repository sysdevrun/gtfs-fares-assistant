import { useState } from 'react'
import { FARE_MEDIA_TYPE_VALUES, type FareMediaType, type Support } from '../types'
import { slugify } from '../gtfs'
import { validateId } from '../validation'
import { useT } from '../i18n'

interface Props {
  supports: Support[]
  onChange: (supports: Support[]) => void
}

interface Draft {
  id: string
  name: string
  /** '' until a media type has been chosen (must be selected first). */
  type: FareMediaType | ''
  /** Whether the id was manually edited (stop auto-deriving from name). */
  idTouched: boolean
}

const emptyDraft: Draft = { id: '', name: '', type: '', idTouched: false }

/** Suggested id per media type (used as the id placeholder). Not translated. */
const ID_PLACEHOLDER: Record<FareMediaType, string> = {
  0: 'cash',
  1: 'paper_ticket',
  2: 'transit_card',
  3: 'cemv',
  4: 'mobile_app',
}

export default function SupportsSection({ supports, onChange }: Props) {
  const t = useT()
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const typeChosen = draft.type !== ''

  const resetForm = () => {
    setDraft(emptyDraft)
    setEditingId(null)
    setError(null)
  }

  const startEdit = (s: Support) => {
    setDraft({ id: s.id, name: s.name, type: s.type, idTouched: true })
    setEditingId(s.id)
    setError(null)
  }

  const submit = () => {
    if (draft.type === '') {
      setError(t('error.typeRequired'))
      return
    }
    const id = draft.id.trim()
    const idError = validateId(id)
    if (idError) {
      setError(t(idError.key, idError.params))
      return
    }
    // Uniqueness: allow keeping the same id when editing.
    const clash = supports.some((s) => s.id === id && s.id !== editingId)
    if (clash) {
      setError(t('error.supportDuplicate', { id }))
      return
    }
    const next: Support = { id, name: draft.name.trim(), type: draft.type }
    if (editingId) {
      onChange(supports.map((s) => (s.id === editingId ? next : s)))
    } else {
      onChange([...supports, next])
    }
    resetForm()
  }

  const remove = (id: string) => {
    onChange(supports.filter((s) => s.id !== id))
    if (editingId === id) resetForm()
  }

  const onNameChange = (name: string) => {
    setDraft((d) => ({
      ...d,
      name,
      // Auto-fill id from name until the user edits the id manually.
      id: d.idTouched ? d.id : slugify(name),
    }))
  }

  const inputBase =
    'mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400'

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-slate-800">
          <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-sm text-white">
            1
          </span>
          {t('supports.title')}
        </h2>
        <p className="mt-1 text-sm text-slate-500">{t('supports.help')}</p>
      </header>

      {supports.length > 0 && (
        <ul className="mb-4 divide-y divide-slate-100 rounded-lg border border-slate-100">
          {supports.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <div className="truncate font-medium text-slate-800">
                  {s.name || <span className="italic text-slate-400">{t('common.noName')}</span>}
                </div>
                <div className="truncate text-xs text-slate-500">
                  <code>{s.id}</code> · {t(`mediaTypeShort.${s.type}`)}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => startEdit(s)}
                  className="rounded-md px-2 py-1 text-sm text-blue-600 hover:bg-blue-50"
                >
                  {t('common.edit')}
                </button>
                <button
                  onClick={() => remove(s.id)}
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
        {/* Media type must be chosen first. */}
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-slate-700">{t('supports.type')}</span>
          <select
            value={draft.type === '' ? '' : String(draft.type)}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                type: e.target.value === '' ? '' : (Number(e.target.value) as FareMediaType),
              }))
            }
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">{t('supports.selectType')}</option>
            {FARE_MEDIA_TYPE_VALUES.map((v) => (
              <option key={v} value={v}>
                {t(`mediaType.${v}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">{t('supports.name')}</span>
          <input
            value={draft.name}
            onChange={(e) => onNameChange(e.target.value)}
            disabled={!typeChosen}
            placeholder={typeChosen ? t(`supports.phName.${draft.type}`) : ''}
            className={inputBase}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">
            {t('supports.id')} <span className="text-slate-400">({t('common.unique')})</span>
          </span>
          <input
            value={draft.id}
            onChange={(e) => setDraft((d) => ({ ...d, id: e.target.value, idTouched: true }))}
            disabled={!typeChosen}
            placeholder={typeChosen ? ID_PLACEHOLDER[draft.type as FareMediaType] : ''}
            className={inputBase + ' font-mono'}
          />
        </label>
      </div>

      {!typeChosen && <p className="mt-2 text-sm text-slate-400">{t('supports.typeFirstHint')}</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button
          onClick={submit}
          disabled={!typeChosen}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {editingId ? t('supports.save') : t('supports.add')}
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
