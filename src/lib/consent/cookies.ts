// GUIC-712 — Domaine du consentement aux cookies — module PUR, importable côté client.
//
// Aucun import serveur ici : ce module est lu par le bandeau ('use client') ET par le
// serveur qui décide s'il émet un traceur. La lecture du cookie vit dans `client.ts` et
// `server.ts` — les y laisser sépare `next/headers` (serveur seul) de `document.cookie`
// (navigateur seul), sur le modèle de `src/lib/flags/ui.ts` vs `ui-server.ts`.

/** Clé technique d'une catégorie de cookies. */
export type CleCategorie = 'essentiels' | 'mesure_audience'

export interface CategorieCookie {
  cle: CleCategorie
  /** Intitulé affiché dans le panneau de préférences. */
  titre: string
  /** Ce que la catégorie fait réellement — un intitulé seul n'éclaire aucun choix. */
  description: string
  /** Nécessaire au fonctionnement : rendue en état verrouillé, jamais en case à cocher. */
  obligatoire: boolean
  /** Noms des cookies réellement déposés, pour que la page cookies fasse foi. */
  cookies: readonly string[]
}

/** Décision de l'utilisateur, catégorie par catégorie. */
export type ChoixCookies = Record<CleCategorie, boolean>

export interface Consentement {
  /** Version du texte au moment de la décision — un accord ne vaut que pour ce qu'il a lu. */
  version: string
  /** Horodatage ISO 8601 de la décision. */
  date: string
  choix: ChoixCookies
}

/** Nom du cookie qui porte la décision. */
export const COOKIE_CONSENTEMENT = 'cjs_consent'

/** Version du texte de consentement. La changer fait réapparaître le bandeau. */
export const VERSION_CONSENTEMENT = '2026-08'

/** Durée de validité d'une décision, en jours. Plafond Article 7 : 13 mois. */
export const DUREE_CONSENTEMENT_JOURS = 182

const MS_PAR_JOUR = 86_400_000

/**
 * Le catalogue est la source unique : le panneau de préférences, la page `/legal/cookies`
 * et la garde des traceurs le lisent tous les trois. Ajouter une catégorie ici suffit à
 * l'exposer partout — et, le cookie ne la contenant pas encore, elle démarre refusée.
 */
export const CATALOGUE_COOKIES: readonly CategorieCookie[] = [
  {
    cle: 'essentiels',
    titre: 'Cookies essentiels',
    description:
      'Nécessaires au fonctionnement du site : ils maintiennent votre session ouverte '
      + 'et sécurisent votre connexion. Sans eux, vous ne pouvez pas vous connecter.',
    obligatoire: true,
    cookies: ['cjs_session', 'centre_staff_session', COOKIE_CONSENTEMENT],
  },
  {
    cle: 'mesure_audience',
    titre: 'Mesure d’audience',
    description:
      'Nous aident à comprendre quelles pages sont consultées, pour améliorer le service. '
      + 'Aucun outil de mesure n’est installé à ce jour : cette catégorie reste sans effet '
      + 'tant que ce n’est pas le cas.',
    obligatoire: false,
    cookies: [],
  },
]

/** Catégories sur lesquelles l'utilisateur a réellement un choix. */
export const CATEGORIES_OPTIONNELLES: readonly CleCategorie[] = CATALOGUE_COOKIES.filter(
  (categorie) => !categorie.obligatoire,
).map((categorie) => categorie.cle)

function construireChoix(valeurOptionnelles: boolean): ChoixCookies {
  const choix = {} as ChoixCookies
  for (const categorie of CATALOGUE_COOKIES) {
    // Les obligatoires ne suivent pas la valeur demandée : elles sont toujours actives.
    choix[categorie.cle] = categorie.obligatoire ? true : valeurOptionnelles
  }
  return choix
}

/** Refus global — les essentiels restent actifs, on ne peut pas les refuser. */
export function choixToutRefuse(): ChoixCookies {
  return construireChoix(false)
}

/** Acceptation globale. */
export function choixToutAccepte(): ChoixCookies {
  return construireChoix(true)
}

/** Emballe un choix en décision datée et versionnée. */
export function construireConsentement(choix: ChoixCookies, date: Date = new Date()): Consentement {
  return {
    version: VERSION_CONSENTEMENT,
    date: date.toISOString(),
    choix: normaliserChoix(choix),
  }
}

/**
 * Ramène un choix quelconque au catalogue courant : les obligatoires sont forcées à
 * actif, les catégories inconnues sont écartées, les catégories absentes valent refus.
 */
function normaliserChoix(brut: Partial<Record<string, unknown>>): ChoixCookies {
  const choix = {} as ChoixCookies
  for (const categorie of CATALOGUE_COOKIES) {
    choix[categorie.cle] = categorie.obligatoire ? true : brut[categorie.cle] === true
  }
  return choix
}

/**
 * Sérialise pour transport dans un en-tête `Cookie`.
 *
 * `encodeURIComponent` n'est pas cosmétique : un point-virgule ou une virgule laissés
 * bruts couperaient la valeur du cookie à la lecture.
 */
export function encoderConsentement(consentement: Consentement): string {
  return encodeURIComponent(JSON.stringify(consentement))
}

/** Lit une valeur de cookie. Tolérant : toute entrée illisible vaut « pas de décision ». */
export function decoderConsentement(brut: string | null | undefined): Consentement | null {
  if (!brut) return null

  let charge: unknown
  try {
    charge = JSON.parse(decodeURIComponent(brut))
  } catch {
    // Cookie tronqué, réécrit par une extension, ou vestige d'un format antérieur :
    // aucune de ces situations n'est une décision de l'utilisateur.
    return null
  }

  if (typeof charge !== 'object' || charge === null || Array.isArray(charge)) return null

  const { version, date, choix } = charge as Record<string, unknown>
  if (typeof version !== 'string' || typeof date !== 'string') return null

  return {
    version,
    date,
    choix: normaliserChoix(
      typeof choix === 'object' && choix !== null ? (choix as Record<string, unknown>) : {},
    ),
  }
}

/** Vrai si la décision doit être redemandée (absente, périmée, ou trop ancienne). */
export function consentementCaduc(consentement: Consentement | null): boolean {
  if (!consentement) return true
  if (consentement.version !== VERSION_CONSENTEMENT) return true

  const donneeLe = Date.parse(consentement.date)
  if (Number.isNaN(donneeLe)) return true

  return Date.now() - donneeLe > DUREE_CONSENTEMENT_JOURS * MS_PAR_JOUR
}

/**
 * Vrai si cette catégorie peut être activée en l'état des décisions.
 *
 * Les essentiels passent même sans décision : le site doit fonctionner avant le premier
 * clic sur le bandeau. Tout le reste est refusé par défaut — c'est la définition d'un
 * opt-in.
 */
export function categorieAcceptee(
  consentement: Consentement | null,
  cle: CleCategorie,
): boolean {
  const categorie = CATALOGUE_COOKIES.find((c) => c.cle === cle)
  if (categorie?.obligatoire) return true
  if (consentementCaduc(consentement)) return false
  return consentement!.choix[cle] === true
}
