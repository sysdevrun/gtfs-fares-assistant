import { useRef, useState } from 'react'
import { importFromZip, type ImportResult } from '../parse'

interface Props {
  onImport: (result: ImportResult) => boolean
}

export default function ImportSection({ onImport }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    setError(null)
    setWarnings([])
    setSummary(null)
    try {
      const result = await importFromZip(file)
      const applied = onImport(result)
      if (!applied) {
        setBusy(false)
        return
      }
      setWarnings(result.warnings)
      setSummary(
        `Imported ${result.supports.length} support${result.supports.length === 1 ? '' : 's'} and ` +
          `${result.products.length} product${result.products.length === 1 ? '' : 's'} from ${file.name}.`,
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to read the archive.')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Import existing files</h2>
          <p className="mt-1 text-sm text-slate-500">
            Load a GTFS zip containing <code className="rounded bg-slate-100 px-1">fare_media.txt</code>{' '}
            and/or <code className="rounded bg-slate-100 px-1">fare_products.txt</code> to edit them.
            Unzipped in your browser — replaces the current supports and products.
          </p>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="shrink-0 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {busy ? 'Reading…' : 'Choose zip…'}
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
            {warnings.length} warning{warnings.length === 1 ? '' : 's'} during import
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
