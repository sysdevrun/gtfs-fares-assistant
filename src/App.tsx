import { useMemo } from 'react'
import SupportsSection from './components/SupportsSection'
import RiderCategoriesSection from './components/RiderCategoriesSection'
import ProductsSection from './components/ProductsSection'
import PreviewSection from './components/PreviewSection'
import ImportSection from './components/ImportSection'
import AiFillSection from './components/AiFillSection'
import { generateFiles, zipFilename } from './gtfs'
import { clearStorage, usePersistentState } from './storage'
import { EMPTY_STATE } from './types'
import type { ImportResult } from './parse'
import { LANGS, useI18n } from './i18n'

export default function App() {
  const { t, lang, setLang } = useI18n()
  const [state, setState] = usePersistentState()

  const files = useMemo(() => generateFiles(state), [state])
  const zipName = useMemo(() => zipFilename(state.networkName), [state.networkName])

  const resetAll = () => {
    if (confirm(t('app.confirmReset'))) {
      clearStorage()
      setState(EMPTY_STATE)
    }
  }

  const applyImport = (result: ImportResult): boolean => {
    const hasData =
      state.supports.length > 0 || state.products.length > 0 || state.riderCategories.length > 0
    if (hasData && !confirm(t('app.confirmReplace'))) {
      return false
    }
    setState((s) => ({
      // Keep the current network name if set; otherwise use the one derived
      // from the imported zip filename.
      networkName: s.networkName.trim() ? s.networkName : result.networkName ?? '',
      supports: result.supports,
      riderCategories: result.riderCategories,
      products: result.products,
    }))
    return true
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-5">
          <div>
            <h1 className="text-xl font-bold text-slate-800">{t('app.title')}</h1>
            <p className="text-sm text-slate-500">{t('app.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-sm text-slate-500">
              <span className="sr-only sm:not-sr-only">{t('lang.label')}</span>
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as (typeof LANGS)[number])}
                aria-label={t('lang.label')}
                className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="en">English</option>
                <option value="fr">Français</option>
              </select>
            </label>
            <button
              onClick={resetAll}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              {t('app.reset')}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="block">
            <span className="text-sm font-semibold text-slate-800">{t('network.label')}</span>
            <p className="mb-2 mt-0.5 text-sm text-slate-500">
              {t('network.help', { zip: zipName })}
            </p>
            <input
              value={state.networkName}
              onChange={(e) => setState((s) => ({ ...s, networkName: e.target.value }))}
              placeholder={t('network.placeholder')}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </label>
          {state.networkName.trim() === '' && (
            <p className="mt-2 text-sm text-amber-600">{t('network.warning')}</p>
          )}
        </section>

        <ImportSection onImport={applyImport} />

        <AiFillSection onImport={applyImport} />

        <SupportsSection
          supports={state.supports}
          onChange={(supports) => setState((s) => ({ ...s, supports }))}
        />

        <RiderCategoriesSection
          categories={state.riderCategories}
          onChange={(riderCategories) => setState((s) => ({ ...s, riderCategories }))}
        />

        <ProductsSection
          products={state.products}
          supports={state.supports}
          riderCategories={state.riderCategories}
          onChange={(products) => setState((s) => ({ ...s, products }))}
        />

        <PreviewSection files={files} zipName={zipName} />
      </main>

      <footer className="mx-auto max-w-3xl px-4 pb-10 pt-2 text-center text-xs text-slate-400">
        {t('app.footer')}
        <a
          href="https://gtfs.org/documentation/schedule/reference/#fare_mediatxt"
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-slate-600"
        >
          {t('app.footerLink')}
        </a>
      </footer>
    </div>
  )
}
