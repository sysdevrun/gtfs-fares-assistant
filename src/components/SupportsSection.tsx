import { useState } from 'react'
import { FARE_MEDIA_TYPES, type FareMediaType, type Support } from '../types'
import { slugify } from '../gtfs'

interface Props {
  supports: Support[]
  onChange: (supports: Support[]) => void
}

interface Draft {
  id: string
  name: string
  type: FareMediaType
  /** Whether the id was manually edited (stop auto-deriving from name). */
  idTouched: boolean
}

const emptyDraft: Draft = { id: '', name: '', type: 1, idTouched: false }

export default function SupportsSection({ supports, onChange }: Props) {
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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
    const id = draft.id.trim()
    if (!id) {
      setError('An id is required.')
      return
    }
    // Uniqueness: allow keeping the same id when editing.
    const clash = supports.some((s) => s.id === id && s.id !== editingId)
    if (clash) {
      setError(`A support with id "${id}" already exists.`)
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

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-slate-800">
          <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-sm text-white">
            1
          </span>
          Supports (fare media)
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          The media on which a fare product can be carried — paper ticket, transit card, mobile app…
          Each becomes a row in <code className="rounded bg-slate-100 px-1">fare_media.txt</code>.
        </p>
      </header>

      {supports.length > 0 && (
        <ul className="mb-4 divide-y divide-slate-100 rounded-lg border border-slate-100">
          {supports.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <div className="truncate font-medium text-slate-800">
                  {s.name || <span className="italic text-slate-400">(no name)</span>}
                </div>
                <div className="truncate text-xs text-slate-500">
                  <code>{s.id}</code> · type {s.type} —{' '}
                  {FARE_MEDIA_TYPES.find((t) => t.value === s.type)?.label.split('—')[1]?.trim()}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => startEdit(s)}
                  className="rounded-md px-2 py-1 text-sm text-blue-600 hover:bg-blue-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => remove(s.id)}
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
            placeholder="e.g. Transit card"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">
            fare_media_id <span className="text-slate-400">(unique)</span>
          </span>
          <input
            value={draft.id}
            onChange={(e) => setDraft((d) => ({ ...d, id: e.target.value, idTouched: true }))}
            placeholder="e.g. transit_card"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-slate-700">fare_media_type</span>
          <select
            value={draft.type}
            onChange={(e) =>
              setDraft((d) => ({ ...d, type: Number(e.target.value) as FareMediaType }))
            }
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {FARE_MEDIA_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button
          onClick={submit}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {editingId ? 'Save changes' : 'Add support'}
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
