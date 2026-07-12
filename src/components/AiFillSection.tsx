import { useEffect, useRef, useState } from 'react'
import type { ImportResult } from '../parse'
import { AI_MODELS, DEFAULT_AI_MODEL, isSupportedFile, type AiModel } from '../aiFiles'
import { useT } from '../i18n'

interface Props {
  onImport: (result: ImportResult) => boolean
}

const KEY_LS = 'gtfs-fares-assistant:anthropic-key'
const MODEL_LS = 'gtfs-fares-assistant:anthropic-model'

function loadKey(): string {
  try {
    return localStorage.getItem(KEY_LS) ?? ''
  } catch {
    return ''
  }
}

function loadModel(): AiModel {
  try {
    const m = localStorage.getItem(MODEL_LS)
    if (m && (AI_MODELS as string[]).includes(m)) return m as AiModel
  } catch {
    // ignore
  }
  return DEFAULT_AI_MODEL
}

export default function AiFillSection({ onImport }: Props) {
  const t = useT()
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [apiKey, setApiKey] = useState(loadKey)
  const [model, setModel] = useState<AiModel>(loadModel)
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])

  // Persist key & model choice to localStorage (user opted into remembering).
  useEffect(() => {
    try {
      localStorage.setItem(KEY_LS, apiKey)
    } catch {
      // ignore
    }
  }, [apiKey])
  useEffect(() => {
    try {
      localStorage.setItem(MODEL_LS, model)
    } catch {
      // ignore
    }
  }, [model])

  // Close on Escape.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, busy])

  const addFiles = (list: FileList | null) => {
    if (!list) return
    const incoming = Array.from(list).filter(isSupportedFile)
    setFiles((prev) => {
      const seen = new Set(prev.map((f) => f.name + f.size))
      return [...prev, ...incoming.filter((f) => !seen.has(f.name + f.size))]
    })
    if (inputRef.current) inputRef.current.value = ''
  }

  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx))

  const run = async () => {
    setBusy(true)
    setError(null)
    setSummary(null)
    setWarnings([])
    try {
      // Load the heavy extraction module (Anthropic SDK + SheetJS) on demand so
      // it never weighs down users who don't use this feature.
      const llm = await import('../llm')
      try {
        const result = await llm.extractFromFiles(files, apiKey.trim(), model, t)
        const applied = onImport(result)
        if (!applied) return
        setWarnings(result.warnings)
        setSummary(
          t('ai.summary', {
            supports: result.supports.length,
            riders: result.riderCategories.length,
            products: result.products.length,
          }),
        )
      } catch (e) {
        setError(llm.describeError(e, t))
      }
    } catch {
      setError(t('ai.error.generic'))
    } finally {
      setBusy(false)
    }
  }

  const canRun = !busy && apiKey.trim().length > 0 && files.length > 0

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-slate-800">{t('ai.title')}</h2>
          <p className="mt-1 text-sm text-slate-500">{t('ai.help')}</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="w-full whitespace-normal break-words rounded-md bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-blue-700 sm:w-auto"
        >
          {t('ai.button')}
        </button>
      </header>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t('ai.button')}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setOpen(false)
          }}
        >
          <div className="my-8 w-full max-w-xl rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <h3 className="min-w-0 break-words text-lg font-semibold text-slate-800">
                {t('ai.button')}
              </h3>
              <button
                onClick={() => !busy && setOpen(false)}
                className="shrink-0 text-slate-400 hover:text-slate-600"
                aria-label={t('common.cancel')}
              >
                ✕
              </button>
            </div>

            <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              {t('ai.privacy')}
            </p>

            <label className="mb-4 block">
              <span className="text-sm font-semibold text-slate-800">{t('ai.apiKey')}</span>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-…"
                autoComplete="off"
                spellCheck={false}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="mt-1 block text-xs text-slate-500">
                {t('ai.apiKeyHint')}{' '}
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-slate-700"
                >
                  console.anthropic.com
                </a>
              </span>
            </label>

            <label className="mb-4 block">
              <span className="text-sm font-semibold text-slate-800">{t('ai.model')}</span>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value as AiModel)}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="claude-sonnet-5">{t('ai.model.sonnet')}</option>
                <option value="claude-opus-4-8">{t('ai.model.opus')}</option>
              </select>
            </label>

            <div className="mb-4">
              <span className="text-sm font-semibold text-slate-800">{t('ai.files')}</span>
              <p className="mb-2 mt-0.5 text-xs text-slate-500">{t('ai.filesHint')}</p>
              <button
                onClick={() => inputRef.current?.click()}
                disabled={busy}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {t('ai.chooseFiles')}
              </button>
              <input
                ref={inputRef}
                type="file"
                multiple
                accept=".pdf,image/*,.xlsx,.xls,.xlsm,.ods,.csv,.txt,.tsv"
                className="hidden"
                onChange={(e) => addFiles(e.target.files)}
              />
              {files.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {files.map((f, i) => (
                    <li
                      key={f.name + f.size}
                      className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700"
                    >
                      <span className="truncate">{f.name}</span>
                      <button
                        onClick={() => removeFile(i)}
                        disabled={busy}
                        className="shrink-0 text-slate-400 hover:text-red-600 disabled:opacity-60"
                        aria-label={t('common.delete')}
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
            {summary && <p className="mb-3 text-sm text-emerald-700">{summary}</p>}
            {warnings.length > 0 && (
              <details className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <summary className="cursor-pointer font-medium">
                  {t('ai.warnings', { count: warnings.length })}
                </summary>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </details>
            )}

            <div className="mt-2 flex items-center justify-end gap-2">
              {summary ? (
                // Extraction succeeded: nothing to cancel, and re-running would
                // just repeat the same call — offer a single button to the editor.
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  {t('ai.reviewData')}
                </button>
              ) : (
                <>
                  <button
                    onClick={() => !busy && setOpen(false)}
                    className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                    disabled={busy}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={run}
                    disabled={!canRun}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {busy ? t('ai.extracting') : t('ai.extract')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
