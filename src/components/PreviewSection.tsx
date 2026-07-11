import { useState } from 'react'
import type { GtfsFile } from '../gtfs'
import { downloadFile, downloadZip } from '../download'

interface Props {
  files: GtfsFile[]
  zipName: string
}

export default function PreviewSection({ files, zipName }: Props) {
  const [active, setActive] = useState(0)
  const [busy, setBusy] = useState(false)

  const activeFile = files[active] ?? files[0]

  const handleZip = async () => {
    setBusy(true)
    try {
      await downloadZip(files, zipName)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">
            <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-sm text-white">
              3
            </span>
            Preview &amp; download
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Live preview of the generated GTFS files. Download one, or all as a zip.
          </p>
        </div>
        <button
          onClick={handleZip}
          disabled={busy}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {busy ? 'Zipping…' : `Download all (${zipName})`}
        </button>
      </header>

      <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-slate-200">
        {files.map((f, i) => (
          <button
            key={f.name}
            onClick={() => setActive(i)}
            className={
              '-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ' +
              (i === active
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-700')
            }
          >
            {f.name}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-slate-400">{activeFile.name}</span>
        <button
          onClick={() => downloadFile(activeFile)}
          className="rounded-md border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Download {activeFile.name}
        </button>
      </div>

      <pre className="mt-2 max-h-96 overflow-auto rounded-lg bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">
        <code>{activeFile.content}</code>
      </pre>
    </section>
  )
}
