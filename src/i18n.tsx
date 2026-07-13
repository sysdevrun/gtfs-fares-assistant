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
      'Generate your GTFS Fares v2 files with ease.',
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
    'import.dropHint': 'You can also drag and drop the zip onto this block.',
    'import.reading': 'Reading…',
    'import.summary':
      'Imported {supports} supports, {riders} rider categories and {products} products from {file}.',
    'import.warnings': '{count} warnings during import',
    'import.errorNoFiles': 'No fare_media.txt or fare_products.txt found in the archive.',
    'import.errorGeneric': 'Failed to read the archive.',

    'ai.title': 'Fill data with AI',
    'ai.help':
      'Upload PDFs, images or Excel files describing your fares and let Claude fill the supports, categories and products — then review everything below.',
    'ai.button': 'Ask AI to fill in data from my fare schedule',
    'ai.apiKey': 'Anthropic API key',
    'ai.apiKeyHint': 'Stored only in this browser (localStorage). Create one at',
    'ai.model': 'Model',
    'ai.model.sonnet': 'Claude Sonnet 5 — faster & cheaper (recommended)',
    'ai.model.opus': 'Claude Opus 4.8 — highest accuracy for hard documents',
    'ai.customPrompt': 'Add custom instructions',
    'ai.customPromptHint':
      'Optional guidance added to the default prompt to steer the extraction (e.g. focus on monthly passes, ignore school lines).',
    'ai.customPromptPlaceholder': 'e.g. Prices are in CHF; treat "abonnement" rows as monthly passes.',
    'ai.files': 'Fare documents',
    'ai.filesHint': 'PDF, images (PNG/JPG…) and Excel/CSV. You can add several files.',
    'ai.chooseFiles': 'Add files…',
    'ai.dropHint': 'or drag and drop files here',
    'ai.extract': 'Extract',
    'ai.extracting': 'Extracting…',
    'ai.reviewData': 'Review data',
    'ai.summary':
      'AI filled {supports} supports, {riders} rider categories and {products} products. Review them below.',
    'ai.warnings': '{count} notes to review',
    'ai.warn.idFixed': '{kind} "{from}" was adjusted to "{to}" to be CSV-safe.',
    'ai.warn.multipleDefault':
      'More than one default rider category was proposed; kept "{id}" as the only default.',
    'ai.warn.currencyInvalid': 'Product "{id}": currency "{code}" is not a valid ISO 4217 code — please review.',
    'ai.warn.amountInvalid': 'Product "{id}": amount "{amount}" may be invalid for {currency} — please review.',
    'ai.warn.supportRef': 'Product "{id}" references an unknown support "{ref}"; it was dropped.',
    'ai.warn.riderRef': 'Product "{id}" references an unknown rider category "{ref}"; it was dropped.',
    'ai.error.refusal': 'Claude declined to process these documents. Try different files.',
    'ai.error.noOutput': 'The model returned no usable output. Try again.',
    'ai.error.parse': 'Could not parse the model output. Try again.',
    'ai.error.empty': 'No fares could be extracted from these documents.',
    'ai.error.auth': 'The API key was rejected. Check that it is a valid Anthropic key.',
    'ai.error.rateLimit': 'Rate limited by the API. Wait a moment and try again.',
    'ai.error.network': 'Could not reach the Anthropic API. Check your connection.',
    'ai.error.generic': 'Extraction failed. Please try again.',

    'supports.title': 'Supports (fare media)',
    'supports.help':
      'The media on which a fare product can be carried — paper ticket, transit card, mobile app…',
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

    'riders.title': 'Rider categories & conditions',
    'riders.help':
      'Optional rider groups (Adult, Youth, Senior…) that a product can target. Link conditions with an eligibility URL.',
    'riders.name': 'Name',
    'riders.id': 'rider_category_id',
    'riders.isDefault': 'Default category (is_default_fare_category)',
    'riders.isDefaultHint': 'At most one category can be the default.',
    'riders.defaultBadge': 'default',
    'riders.eligibilityUrl': 'Conditions URL (eligibility_url)',
    'riders.add': 'Add category',
    'riders.save': 'Save changes',
    'riders.phName': 'e.g. Youth',

    'products.title': 'Products',
    'products.help':
      'Fare products with a price, the supports they can be used on, and an optional rider category.',
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

    'legrules.title': 'Validity duration and transfers',
    'legrules.hint':
      'No network/area — transfers apply within this product only, and are free.',
    'legrules.transfers': 'Transfers allowed',
    'legrules.transfers.undef': 'Not defined',
    'legrules.transfers.none': 'None',
    'legrules.transfers.limited': 'Limited',
    'legrules.transfers.unlimited': 'Unlimited',
    'legrules.count': 'Number of transfers',
    'legrules.durationMinutes': 'Validity limit (minutes)',
    'legrules.noLimit': 'no limit',
    'legrules.durationType': 'Window measured between',
    'legrules.durationType.0': 'departure → arrival',
    'legrules.durationType.1': 'departure → departure',
    'legrules.durationType.2': 'arrival → departure',
    'legrules.durationType.3': 'arrival → arrival',
    'legrules.summaryNoTransfer': 'leg rule, no transfer',
    'legrules.summaryUnlimited': 'unlimited transfers',
    'legrules.summaryCount': '{n} transfers',

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
    'error.transferCount': 'Number of transfers must be a positive whole number.',
    'error.durationNumber': 'Duration must be a positive whole number of minutes.',
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
    'warn.riderMultipleDefault':
      'rider_categories.txt: more than one default category; kept the first, unset "{id}".',
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
    'warn.legRulesExtraColumns':
      'fare_leg_rules.txt: network/area/timeframe columns are not supported and were ignored.',
    'warn.legRuleUnknownProduct':
      'fare_leg_rules.txt line {line}: unknown fare_product_id "{id}"; skipped.',
    'warn.transferCrossGroup':
      'fare_transfer_rules.txt: a transfer between different products (from "{from}" to "{to}") is not supported and was skipped.',
    'warn.transferUnknownGroup':
      'fare_transfer_rules.txt: leg group "{group}" has no matching fare_leg_rules row; skipped.',
    'warn.transferPaidDropped':
      'fare_transfer_rules.txt: only free transfers are modeled; the transfer fare/type on "{id}" was dropped.',
    'warn.durationRounded':
      'fare_transfer_rules.txt: duration for "{id}" was rounded to {minutes} minutes.',
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
      'Mettez vous en conformité et générez vos fichiers GTFS Fares v2 en toute simplicité.',
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
    'import.dropHint': 'Vous pouvez aussi glisser-déposer le zip sur ce bloc.',
    'import.reading': 'Lecture…',
    'import.summary':
      '{supports} supports, {riders} catégories de voyageurs et {products} produits importés depuis {file}.',
    'import.warnings': '{count} avertissements lors de l’import',
    'import.errorNoFiles': 'Aucun fichier fare_media.txt ou fare_products.txt trouvé dans l’archive.',
    'import.errorGeneric': 'Échec de la lecture de l’archive.',

    'ai.title': 'Remplir les données avec l’IA',
    'ai.help':
      'Envoyez des PDF, images ou fichiers Excel décrivant vos tarifs et laissez Claude remplir les supports, catégories et produits — puis relisez le tout ci-dessous.',
    'ai.button': 'Demander à l’IA de remplir les données depuis ma gamme tarifaire',
    'ai.apiKey': 'Clé API Anthropic',
    'ai.apiKeyHint': 'Stockée uniquement dans ce navigateur (localStorage). Créez-en une sur',
    'ai.model': 'Modèle',
    'ai.model.sonnet': 'Claude Sonnet 5 — plus rapide et économique (recommandé)',
    'ai.model.opus': 'Claude Opus 4.8 — précision maximale pour les documents difficiles',
    'ai.customPrompt': 'Ajouter des instructions personnalisées',
    'ai.customPromptHint':
      'Consignes facultatives ajoutées au prompt par défaut pour orienter l’extraction (ex. se concentrer sur les abonnements mensuels, ignorer les lignes scolaires).',
    'ai.customPromptPlaceholder':
      'ex. Les prix sont en CHF ; traiter les lignes « abonnement » comme des forfaits mensuels.',
    'ai.files': 'Documents tarifaires',
    'ai.filesHint': 'PDF, images (PNG/JPG…) et Excel/CSV. Vous pouvez ajouter plusieurs fichiers.',
    'ai.chooseFiles': 'Ajouter des fichiers…',
    'ai.dropHint': 'ou glissez-déposez vos fichiers ici',
    'ai.extract': 'Extraire',
    'ai.extracting': 'Extraction…',
    'ai.reviewData': 'Relire les données',
    'ai.summary':
      'L’IA a rempli {supports} supports, {riders} catégories de voyageurs et {products} produits. Relisez-les ci-dessous.',
    'ai.warnings': '{count} points à vérifier',
    'ai.warn.idFixed': '{kind} « {from} » a été ajusté en « {to} » pour rester compatible CSV.',
    'ai.warn.multipleDefault':
      'Plusieurs catégories par défaut proposées ; « {id} » conservée comme seule catégorie par défaut.',
    'ai.warn.currencyInvalid':
      'Produit « {id} » : la devise « {code} » n’est pas un code ISO 4217 valide — à vérifier.',
    'ai.warn.amountInvalid':
      'Produit « {id} » : le montant « {amount} » peut être invalide pour {currency} — à vérifier.',
    'ai.warn.supportRef': 'Le produit « {id} » référence un support inconnu « {ref} » ; il a été ignoré.',
    'ai.warn.riderRef':
      'Le produit « {id} » référence une catégorie inconnue « {ref} » ; elle a été ignorée.',
    'ai.error.refusal': 'Claude a refusé de traiter ces documents. Essayez d’autres fichiers.',
    'ai.error.noOutput': 'Le modèle n’a renvoyé aucun résultat exploitable. Réessayez.',
    'ai.error.parse': 'Impossible d’analyser la réponse du modèle. Réessayez.',
    'ai.error.empty': 'Aucun tarif n’a pu être extrait de ces documents.',
    'ai.error.auth': 'La clé API a été refusée. Vérifiez qu’il s’agit d’une clé Anthropic valide.',
    'ai.error.rateLimit': 'Limite de débit atteinte. Patientez un instant et réessayez.',
    'ai.error.network': 'Impossible de joindre l’API Anthropic. Vérifiez votre connexion.',
    'ai.error.generic': 'L’extraction a échoué. Veuillez réessayer.',

    'supports.title': 'Supports (médias tarifaires)',
    'supports.help':
      'Le média sur lequel un produit tarifaire peut être porté — ticket papier, carte de transport, application mobile…',
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
      'Groupes de voyageurs facultatifs (Adulte, Jeune, Senior…) qu’un produit peut cibler. Reliez les conditions via une URL.',
    'riders.name': 'Nom',
    'riders.id': 'rider_category_id',
    'riders.isDefault': 'Catégorie par défaut (is_default_fare_category)',
    'riders.isDefaultHint': 'Une seule catégorie peut être celle par défaut.',
    'riders.defaultBadge': 'défaut',
    'riders.eligibilityUrl': 'URL des conditions (eligibility_url)',
    'riders.add': 'Ajouter une catégorie',
    'riders.save': 'Enregistrer',
    'riders.phName': 'ex. Jeune',

    'products.title': 'Produits',
    'products.help':
      'Produits tarifaires avec un prix, les supports sur lesquels ils sont utilisables et une catégorie de voyageur facultative.',
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

    'legrules.title': 'Durée de validité et correspondances',
    'legrules.hint':
      'Sans réseau/zone — les correspondances ne s’appliquent qu’à ce produit, et sont gratuites.',
    'legrules.transfers': 'Correspondances autorisées',
    'legrules.transfers.undef': 'Non défini',
    'legrules.transfers.none': 'Aucune',
    'legrules.transfers.limited': 'Limité',
    'legrules.transfers.unlimited': 'Illimité',
    'legrules.count': 'Nombre de correspondances',
    'legrules.durationMinutes': 'Limite de validité (minutes)',
    'legrules.noLimit': 'sans limite',
    'legrules.durationType': 'Fenêtre mesurée entre',
    'legrules.durationType.0': 'départ → arrivée',
    'legrules.durationType.1': 'départ → départ',
    'legrules.durationType.2': 'arrivée → départ',
    'legrules.durationType.3': 'arrivée → arrivée',
    'legrules.summaryNoTransfer': 'règle de leg, sans correspondance',
    'legrules.summaryUnlimited': 'correspondances illimitées',
    'legrules.summaryCount': '{n} correspondances',

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
    'error.transferCount': 'Le nombre de correspondances doit être un entier positif.',
    'error.durationNumber': 'La durée doit être un nombre entier de minutes positif.',
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
    'warn.riderMultipleDefault':
      'rider_categories.txt : plusieurs catégories par défaut ; la première est conservée, « {id} » désactivée.',
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
    'warn.legRulesExtraColumns':
      'fare_leg_rules.txt : les colonnes réseau/zone/horaire ne sont pas prises en charge et ont été ignorées.',
    'warn.legRuleUnknownProduct':
      'fare_leg_rules.txt ligne {line} : fare_product_id « {id} » inconnu ; ignorée.',
    'warn.transferCrossGroup':
      'fare_transfer_rules.txt : une correspondance entre produits différents (de « {from} » vers « {to} ») n’est pas prise en charge et a été ignorée.',
    'warn.transferUnknownGroup':
      'fare_transfer_rules.txt : le groupe de legs « {group} » n’a pas de ligne fare_leg_rules correspondante ; ignoré.',
    'warn.transferPaidDropped':
      'fare_transfer_rules.txt : seules les correspondances gratuites sont modélisées ; le tarif/type de correspondance de « {id} » a été abandonné.',
    'warn.durationRounded':
      'fare_transfer_rules.txt : la durée de « {id} » a été arrondie à {minutes} minutes.',
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
