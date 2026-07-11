import { useMemo } from 'react'
import SupportsSection from './components/SupportsSection'
import ProductsSection from './components/ProductsSection'
import PreviewSection from './components/PreviewSection'
import { generateFiles, zipFilename } from './gtfs'
import { clearStorage, usePersistentState } from './storage'
import { EMPTY_STATE } from './types'

export default function App() {
  const [state, setState] = usePersistentState()

  const files = useMemo(() => generateFiles(state), [state])
  const zipName = useMemo(() => zipFilename(state.networkName), [state.networkName])

  const resetAll = () => {
    if (confirm('Clear the network name, all supports and all products? This cannot be undone.')) {
      clearStorage()
      setState(EMPTY_STATE)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-5">
          <div>
            <h1 className="text-xl font-bold text-slate-800">GTFS Fares Assistant</h1>
            <p className="text-sm text-slate-500">
              Build <code className="rounded bg-slate-100 px-1">fare_media.txt</code> &amp;{' '}
              <code className="rounded bg-slate-100 px-1">fare_products.txt</code> (GTFS Fares V2) —
              entirely in your browser.
            </p>
          </div>
          <button
            onClick={resetAll}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Reset all
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="block">
            <span className="text-sm font-semibold text-slate-800">Network name</span>
            <p className="mb-2 mt-0.5 text-sm text-slate-500">
              Used to name the downloaded zip, e.g.{' '}
              <code className="rounded bg-slate-100 px-1">{zipName}</code>.
            </p>
            <input
              value={state.networkName}
              onChange={(e) => setState((s) => ({ ...s, networkName: e.target.value }))}
              placeholder="e.g. My City Transit"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </label>
          {state.networkName.trim() === '' && (
            <p className="mt-2 text-sm text-amber-600">
              Define a network name so the zip filename includes your network.
            </p>
          )}
        </section>

        <SupportsSection
          supports={state.supports}
          onChange={(supports) => setState((s) => ({ ...s, supports }))}
        />

        <ProductsSection
          products={state.products}
          supports={state.supports}
          onChange={(products) => setState((s) => ({ ...s, products }))}
        />

        <PreviewSection files={files} zipName={zipName} />
      </main>

      <footer className="mx-auto max-w-3xl px-4 pb-10 pt-2 text-center text-xs text-slate-400">
        Frontend-only · your data stays in this browser (localStorage) ·{' '}
        <a
          href="https://gtfs.org/documentation/schedule/reference/#fare_mediatxt"
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-slate-600"
        >
          GTFS Fares V2 reference
        </a>
      </footer>
    </div>
  )
}
