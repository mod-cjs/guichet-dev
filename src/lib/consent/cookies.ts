// GUIC-712 — Domaine du consentement aux cookies — module PUR, importable côté client.
//
// Aucun import serveur ici : ce module est lu par le bandeau ('use client') ET par le
// serveur qui décide s'il émet un traceur. La lecture du cookie vit dans `client.ts` et
// `server.ts` — les y laisser sépare `next/headers` (serveur seul) de `document.cookie`
// (navigateur seul), sur le modèle de `src/lib/flags/ui.ts` vs `ui-server.ts`.
//
// CONTRAT — implémentation à venir (commit GREEN).

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

export const CATALOGUE_COOKIES: readonly CategorieCookie[] = []

/** Catégories sur lesquelles l'utilisateur a réellement un choix. */
export const CATEGORIES_OPTIONNELLES: readonly CleCategorie[] = []

/** Refus global — les essentiels restent actifs, on ne peut pas les refuser. */
export function choixToutRefuse(): ChoixCookies {
  throw new Error('non implémenté')
}

/** Acceptation globale. */
export function choixToutAccepte(): ChoixCookies {
  throw new Error('non implémenté')
}

/** Emballe un choix en décision datée et versionnée. */
export function construireConsentement(_choix: ChoixCookies, _date?: Date): Consentement {
  throw new Error('non implémenté')
}

/** Sérialise pour transport dans un en-tête `Cookie`. */
export function encoderConsentement(_consentement: Consentement): string {
  throw new Error('non implémenté')
}

/** Lit une valeur de cookie. Tolérant : toute entrée illisible vaut « pas de décision ». */
export function decoderConsentement(_brut: string | null | undefined): Consentement | null {
  throw new Error('non implémenté')
}

/** Vrai si la décision doit être redemandée (absente, périmée, ou trop ancienne). */
export function consentementCaduc(_consentement: Consentement | null): boolean {
  throw new Error('non implémenté')
}

/** Vrai si cette catégorie peut être activée en l'état des décisions. */
export function categorieAcceptee(
  _consentement: Consentement | null,
  _cle: CleCategorie,
): boolean {
  throw new Error('non implémenté')
}
