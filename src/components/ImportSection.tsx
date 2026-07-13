import { useRef, useState } from 'react'
import { importFromZip, type ImportResult } from '../parse'
import { useT } from '../i18n'

interface Props {
  onImport: (result: ImportResult) => boolean
}

export default function ImportSection({ onImport }: Props) {
  const t = useT()
  const inputRef = useRef<HTMLInputElement>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    setError(null)
    setWarnings([])
    setSummary(null)
    try {
      const result = await importFromZip(file, t)
      const applied = onImport(result)
      if (!applied) {
        setBusy(false)
        return
      }
      setWarnings(result.warnings)
      setSummary(
        t('import.summary', {
          supports: result.supports.length,
          riders: result.riderCategories.length,
          products: result.products.length,
          file: file.name,
        }),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : t('import.errorGeneric'))
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <section
      onDragOver={(e) => {
        e.preventDefault()
        if (!busy) setDragOver(true)
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        if (!busy) handleFile(e.dataTransfer.files?.[0])
      }}
      className={`rounded-xl border bg-white p-5 shadow-sm transition-colors ${
        dragOver ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-400' : 'border-slate-200'
      }`}
    >
      <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">{t('import.title')}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {t('import.help')} {t('import.dropHint')}
          </p>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="shrink-0 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {busy ? t('import.reading') : t('import.choose')}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </header>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {summary && <p className="text-sm text-emerald-700">{summary}</p>}
      {warnings.length > 0 && (
        <details className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <summary className="cursor-pointer font-medium">
            {t('import.warnings', { count: warnings.length })}
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}
