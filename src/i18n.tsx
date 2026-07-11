import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export type Lang = 'en' | 'fr'
export const LANGS: Lang[] = ['en', 'fr']

const LS_KEY = 'gtfs-fares-assistant:lang'

type Params = Record<string, string | number>

/** Detect the initial language: stored choice, else browser language, else English. */
function detectLang(): Lang {
  try {
    const stored = localStorage.getItem(LS_KEY)
    if (stored === 'en' || stored === 'fr') return stored
  } catch {
    // ignore
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language?.toLowerCase() ?? '' : ''
  return nav.startsWith('fr') ? 'fr' : 'en'
}

const dict: Record<Lang, Record<string, string>> = {
  en: {
    'common.cancel': 'Cancel',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.noName': '(no name)',
    'common.unique': 'unique',
    'common.optional': 'optional',

    'app.title': 'GTFS Fares Assistant',
    'app.subtitle':
      'Build fare_media.txt & fare_products.txt (GTFS Fares V2) — entirely in your browser.',
    'app.reset': 'Reset all',
    'app.footer': 'Frontend-only · your data stays in this browser (localStorage) · ',
    'app.footerLink': 'GTFS Fares V2 reference',
    'app.confirmReset':
      'Clear the network name and all supports, categories and products? This cannot be undone.',
    'app.confirmReplace': 'Replace the current data with the imported one?',

    'lang.label': 'Language',

    'network.label': 'Network name',
    'network.help': 'Used to name the downloaded zip, e.g. {zip}.',
    'network.placeholder': 'e.g. My City Transit',
    'network.warning': 'Define a network name so the zip filename includes your network.',

    'import.title': 'Import existing files',
    'import.help':
      'Load a GTFS zip containing fare_media.txt, fare_products.txt and/or rider_categories.txt to edit them. Unzipped in your browser — replaces the current data.',
    'import.choose': 'Choose zip…',
    'import.reading': 'Reading…',
    'import.summary':
      'Imported {supports} supports, {riders} rider categories and {products} products from {file}.',
    'import.warnings': '{count} warnings during import',
    'import.errorNoFiles': 'No fare_media.txt or fare_products.txt found in the archive.',
    'import.errorGeneric': 'Failed to read the archive.',

    'supports.title': 'Supports (fare media)',
    'supports.help':
      'The media on which a fare product can be carried — paper ticket, transit card, mobile app… Each becomes a row in fare_media.txt.',
    'supports.type': 'fare_media_type',
    'supports.selectType': '— Select a media type first —',
    'supports.typeFirstHint': 'Pick a fare media type to fill in the rest.',
    'supports.name': 'Name',
    'supports.id': 'fare_media_id',
    'supports.add': 'Add support',
    'supports.save': 'Save changes',

    'mediaType.0': '0 — None (e.g. cash, no media)',
    'mediaType.1': '1 — Physical paper ticket',
    'mediaType.2': '2 — Physical transit card',
    'mediaType.3': '3 — cEMV (contactless bank card)',
    'mediaType.4': '4 — Mobile app',
    'mediaTypeShort.0': 'None (cash)',
    'mediaTypeShort.1': 'Paper ticket',
    'mediaTypeShort.2': 'Transit card',
    'mediaTypeShort.3': 'cEMV bank card',
    'mediaTypeShort.4': 'Mobile app',
    'supports.phName.0': 'Cash',
    'supports.phName.1': 'Paper ticket',
    'supports.phName.2': 'Transit card',
    'supports.phName.3': 'Contactless bank card',
    'supports.phName.4': 'Mobile app',

    'riders.title': 'Rider categories & constraints',
    'riders.help':
      'Optional eligibility constraints (age, conditions) that a product can target — each becomes a row in rider_categories.txt.',
    'riders.name': 'Name',
    'riders.id': 'rider_category_id',
    'riders.minAge': 'Minimum age',
    'riders.maxAge': 'Maximum age',
    'riders.eligibilityUrl': 'Conditions URL (eligibility_url)',
    'riders.add': 'Add category',
    'riders.save': 'Save changes',
    'riders.phName': 'e.g. Youth',
    'riders.ageAny': 'any',
    'riders.age': 'age {min}–{max}',

    'products.title': 'Products',
    'products.help':
      'Fare products with a price, the supports they can be used on, and an optional rider category. Each product/support pair becomes a row in fare_products.txt.',
    'products.name': 'Name',
    'products.id': 'fare_product_id',
    'products.amount': 'Amount',
    'products.currency': 'Currency',
    'products.phName': 'e.g. Single ticket',
    'products.phAmount': 'e.g. 2.50',
    'products.usableOn': 'Usable on supports',
    'products.noSupports':
      'No supports defined yet — add one above first, or leave empty for a media-independent product.',
    'products.mediaIndependent': 'no support (media-independent)',
    'products.riderCategory': 'Rider category / constraint',
    'products.riderNone': 'None (all riders)',
    'products.noRiders': 'No rider categories defined — add one above to constrain a product.',
    'products.add': 'Add product',
    'products.save': 'Save changes',

    'preview.title': 'Preview & download',
    'preview.help': 'Live preview of the generated GTFS files. Download one, or all as a zip.',
    'preview.downloadAll': 'Download all ({zip})',
    'preview.zipping': 'Zipping…',
    'preview.download': 'Download {file}',

    'error.idRequired': 'An id is required.',
    'error.idInvalid': 'Id must not contain spaces, commas or quotes.',
    'error.typeRequired': 'Select a fare media type.',
    'error.amountRequired': 'An amount is required.',
    'error.amountNumber': 'Amount must be a non-negative number (e.g. 2.50).',
    'error.amountDecimals': '{currency} allows at most {max} decimals.',
    'error.currencyRequired': 'A currency is required.',
    'error.currencyInvalid': '"{code}" is not a valid ISO 4217 currency code.',
    'error.ageNumber': 'Age must be a whole number of years.',
    'error.ageRange': 'Minimum age cannot exceed maximum age.',
    'error.supportDuplicate': 'A support with id "{id}" already exists.',
    'error.productDuplicate': 'A product with id "{id}" already exists.',
    'error.riderDuplicate': 'A category with id "{id}" already exists.',

    'warn.mediaInvalidId': 'fare_media.txt line {line}: skipped — invalid or missing fare_media_id.',
    'warn.mediaDuplicate': 'fare_media.txt line {line}: skipped — duplicate fare_media_id "{id}".',
    'warn.mediaType': 'fare_media.txt line {line}: fare_media_type "{value}" is invalid; defaulted to 0.',
    'warn.mediaMissing': 'fare_media.txt not found in the archive; no supports imported.',
    'warn.riderInvalidId':
      'rider_categories.txt line {line}: skipped — invalid or missing rider_category_id.',
    'warn.riderDuplicate':
      'rider_categories.txt line {line}: skipped — duplicate rider_category_id "{id}".',
    'warn.productInvalidId':
      'fare_products.txt line {line}: skipped — invalid or missing fare_product_id.',
    'warn.productCurrency':
      'fare_products.txt line {line}: currency "{code}" is not a valid ISO 4217 code.',
    'warn.productAmount': 'fare_products.txt line {line}: amount "{amount}" is not valid for {currency}.',
    'warn.productMediaRef':
      'fare_products.txt: product "{id}" references fare_media_id "{ref}" not found in fare_media.txt.',
    'warn.productRiderRef':
      'fare_products.txt: product "{id}" references rider_category_id "{ref}" not found in rider_categories.txt.',
    'warn.productMissing': 'fare_products.txt not found in the archive; no products imported.',
  },
  fr: {
    'common.cancel': 'Annuler',
    'common.edit': 'Modifier',
    'common.delete': 'Supprimer',
    'common.noName': '(sans nom)',
    'common.unique': 'unique',
    'common.optional': 'optionnel',

    'app.title': 'Assistant tarifs GTFS',
    'app.subtitle':
      'Générez fare_media.txt et fare_products.txt (GTFS Fares V2) — entièrement dans votre navigateur.',
    'app.reset': 'Tout réinitialiser',
    'app.footer': 'Sans serveur · vos données restent dans ce navigateur (localStorage) · ',
    'app.footerLink': 'Référence GTFS Fares V2',
    'app.confirmReset':
      'Effacer le nom du réseau et tous les supports, catégories et produits ? Cette action est irréversible.',
    'app.confirmReplace': 'Remplacer les données actuelles par celles importées ?',

    'lang.label': 'Langue',

    'network.label': 'Nom du réseau',
    'network.help': 'Utilisé pour nommer le zip téléchargé, par ex. {zip}.',
    'network.placeholder': 'ex. Transports Ma Ville',
    'network.warning': 'Définissez un nom de réseau pour qu’il apparaisse dans le nom du zip.',

    'import.title': 'Importer des fichiers existants',
    'import.help':
      'Chargez un zip GTFS contenant fare_media.txt, fare_products.txt et/ou rider_categories.txt pour les modifier. Décompressé dans votre navigateur — remplace les données actuelles.',
    'import.choose': 'Choisir un zip…',
    'import.reading': 'Lecture…',
    'import.summary':
      '{supports} supports, {riders} catégories de voyageurs et {products} produits importés depuis {file}.',
    'import.warnings': '{count} avertissements lors de l’import',
    'import.errorNoFiles': 'Aucun fichier fare_media.txt ou fare_products.txt trouvé dans l’archive.',
    'import.errorGeneric': 'Échec de la lecture de l’archive.',

    'supports.title': 'Supports (médias tarifaires)',
    'supports.help':
      'Le média sur lequel un produit tarifaire peut être porté — ticket papier, carte de transport, application mobile… Chacun devient une ligne de fare_media.txt.',
    'supports.type': 'fare_media_type',
    'supports.selectType': '— Choisissez d’abord un type de média —',
    'supports.typeFirstHint': 'Choisissez un type de média tarifaire pour renseigner le reste.',
    'supports.name': 'Nom',
    'supports.id': 'fare_media_id',
    'supports.add': 'Ajouter un support',
    'supports.save': 'Enregistrer',

    'mediaType.0': '0 — Aucun (ex. espèces, sans média)',
    'mediaType.1': '1 — Ticket papier',
    'mediaType.2': '2 — Carte de transport',
    'mediaType.3': '3 — cEMV (carte bancaire sans contact)',
    'mediaType.4': '4 — Application mobile',
    'mediaTypeShort.0': 'Aucun (espèces)',
    'mediaTypeShort.1': 'Ticket papier',
    'mediaTypeShort.2': 'Carte de transport',
    'mediaTypeShort.3': 'Carte bancaire cEMV',
    'mediaTypeShort.4': 'Application mobile',
    'supports.phName.0': 'Espèces',
    'supports.phName.1': 'Ticket papier',
    'supports.phName.2': 'Carte de transport',
    'supports.phName.3': 'Carte bancaire sans contact',
    'supports.phName.4': 'Application mobile',

    'riders.title': 'Catégories de voyageurs & conditions',
    'riders.help':
      'Conditions d’éligibilité facultatives (âge, conditions) qu’un produit peut cibler — chacune devient une ligne de rider_categories.txt.',
    'riders.name': 'Nom',
    'riders.id': 'rider_category_id',
    'riders.minAge': 'Âge minimum',
    'riders.maxAge': 'Âge maximum',
    'riders.eligibilityUrl': 'URL des conditions (eligibility_url)',
    'riders.add': 'Ajouter une catégorie',
    'riders.save': 'Enregistrer',
    'riders.phName': 'ex. Jeune',
    'riders.ageAny': 'illimité',
    'riders.age': 'âge {min}–{max}',

    'products.title': 'Produits',
    'products.help':
      'Produits tarifaires avec un prix, les supports sur lesquels ils sont utilisables et une catégorie de voyageur facultative. Chaque paire produit/support devient une ligne de fare_products.txt.',
    'products.name': 'Nom',
    'products.id': 'fare_product_id',
    'products.amount': 'Montant',
    'products.currency': 'Devise',
    'products.phName': 'ex. Ticket unité',
    'products.phAmount': 'ex. 2.50',
    'products.usableOn': 'Utilisable sur les supports',
    'products.noSupports':
      'Aucun support défini — ajoutez-en un ci-dessus, ou laissez vide pour un produit indépendant du média.',
    'products.mediaIndependent': 'aucun support (indépendant du média)',
    'products.riderCategory': 'Catégorie de voyageur / condition',
    'products.riderNone': 'Aucune (tous les voyageurs)',
    'products.noRiders': 'Aucune catégorie définie — ajoutez-en une ci-dessus pour restreindre un produit.',
    'products.add': 'Ajouter un produit',
    'products.save': 'Enregistrer',

    'preview.title': 'Aperçu & téléchargement',
    'preview.help': 'Aperçu en direct des fichiers GTFS générés. Téléchargez-en un, ou tout en zip.',
    'preview.downloadAll': 'Tout télécharger ({zip})',
    'preview.zipping': 'Compression…',
    'preview.download': 'Télécharger {file}',

    'error.idRequired': 'Un identifiant est requis.',
    'error.idInvalid': 'L’identifiant ne doit pas contenir d’espaces, de virgules ni de guillemets.',
    'error.typeRequired': 'Choisissez un type de média tarifaire.',
    'error.amountRequired': 'Un montant est requis.',
    'error.amountNumber': 'Le montant doit être un nombre positif ou nul (ex. 2.50).',
    'error.amountDecimals': '{currency} n’autorise au plus que {max} décimales.',
    'error.currencyRequired': 'Une devise est requise.',
    'error.currencyInvalid': '« {code} » n’est pas un code de devise ISO 4217 valide.',
    'error.ageNumber': 'L’âge doit être un nombre entier d’années.',
    'error.ageRange': 'L’âge minimum ne peut pas dépasser l’âge maximum.',
    'error.supportDuplicate': 'Un support avec l’identifiant « {id} » existe déjà.',
    'error.productDuplicate': 'Un produit avec l’identifiant « {id} » existe déjà.',
    'error.riderDuplicate': 'Une catégorie avec l’identifiant « {id} » existe déjà.',

    'warn.mediaInvalidId':
      'fare_media.txt ligne {line} : ignorée — fare_media_id manquant ou invalide.',
    'warn.mediaDuplicate': 'fare_media.txt ligne {line} : ignorée — fare_media_id « {id} » en double.',
    'warn.mediaType':
      'fare_media.txt ligne {line} : fare_media_type « {value} » invalide ; valeur 0 par défaut.',
    'warn.mediaMissing': 'fare_media.txt absent de l’archive ; aucun support importé.',
    'warn.riderInvalidId':
      'rider_categories.txt ligne {line} : ignorée — rider_category_id manquant ou invalide.',
    'warn.riderDuplicate':
      'rider_categories.txt ligne {line} : ignorée — rider_category_id « {id} » en double.',
    'warn.productInvalidId':
      'fare_products.txt ligne {line} : ignorée — fare_product_id manquant ou invalide.',
    'warn.productCurrency':
      'fare_products.txt ligne {line} : devise « {code} » non conforme à l’ISO 4217.',
    'warn.productAmount':
      'fare_products.txt ligne {line} : montant « {amount} » invalide pour {currency}.',
    'warn.productMediaRef':
      'fare_products.txt : le produit « {id} » référence fare_media_id « {ref} » absent de fare_media.txt.',
    'warn.productRiderRef':
      'fare_products.txt : le produit « {id} » référence rider_category_id « {ref} » absent de rider_categories.txt.',
    'warn.productMissing': 'fare_products.txt absent de l’archive ; aucun produit importé.',
  },
}

function interpolate(template: string, params?: Params): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (_, k) => (k in params ? String(params[k]) : `{${k}}`))
}

export type TFunc = (key: string, params?: Params) => string

interface I18nCtx {
  lang: Lang
  setLang: (l: Lang) => void
  t: TFunc
}

const Ctx = createContext<I18nCtx | null>(null)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLang)

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, lang)
    } catch {
      // ignore
    }
    document.documentElement.lang = lang
  }, [lang])

  const setLang = useCallback((l: Lang) => setLangState(l), [])

  const t = useCallback<TFunc>(
    (key, params) => interpolate(dict[lang][key] ?? dict.en[key] ?? key, params),
    [lang],
  )

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useI18n(): I18nCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useI18n must be used within a LanguageProvider')
  return ctx
}

/** Convenience hook returning just the translator. */
export function useT(): TFunc {
  return useI18n().t
}
