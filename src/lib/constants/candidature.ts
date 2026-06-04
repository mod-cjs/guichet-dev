/**
 * Constantes partagées « candidature » (GUIC-189 / Wave 6, ticket GUIC-217).
 *
 * Source unique pour les limites métier (upload CV, longueur lettre,
 * rate limiting, fenêtres de dates). Tout consommateur — UI, route API,
 * validation Zod, tests — DOIT importer ces constantes plutôt que de
 * dupliquer des littéraux.
 */

/** Taille max d'un CV uploadé, en octets (5 MiB). */
export const MAX_CV_BYTES = 5 * 1024 * 1024

/** Taille max d'un CV exprimée en MiB (pour libellés UI). */
export const MAX_CV_MB = 5

/** Types MIME autorisés pour le CV. */
export const ALLOWED_CV_MIME = ['application/pdf'] as const

/** Longueur minimale de la lettre de motivation (caractères). */
export const LETTRE_MIN_CHARS = 300

/**
 * Longueur maximale de la lettre de motivation (caractères).
 *
 * GUIC-232 — Relevée à 4000 caractères (depuis 1000) suite à retour PO :
 * permet aux candidats de structurer une vraie lettre (parcours, motivations,
 * projet), tout en gardant un plafond raisonnable pour les recruteurs.
 */
export const LETTRE_MAX_CHARS = 4000

/**
 * Champs minimaux requis (Utilisateur + ProfilJeune) pour candidater à une
 * opportunité (GUIC-232).
 *
 * Le CV restant facultatif (décision PO), on exige au minimum un profil de
 * base rempli pour éviter les candidatures vides. Diplômes, expériences et
 * certificats restent optionnels.
 */
export const PROFIL_REQUIS_CANDIDATURE = [
  'prenom',
  'nom',
  'email',
  'telephone',
  'region',
  'niveauEtude',
  'situationEmploi',
  'domainesInteret',
] as const

export type ChampProfilRequis = (typeof PROFIL_REQUIS_CANDIDATURE)[number]

/** Longueur maximale de l'URL de CV stockée en base. */
export const CV_URL_MAX_LEN = 500

/** Rate limit sur `POST /api/upload/cv`. */
export const RATE_LIMIT_UPLOAD = { max: 5, windowMs: 60_000 } as const

/** Rate limit sur `POST /api/candidatures`. */
export const RATE_LIMIT_CANDIDATURES_POST = { max: 10, windowMs: 60_000 } as const

/** Rate limit sur `GET /api/candidatures`. */
export const RATE_LIMIT_CANDIDATURES_GET = { max: 30, windowMs: 60_000 } as const

/** Une opportunité est marquée « urgente » sous ce seuil (jours). */
export const URGENT_DAYS_THRESHOLD = 3

/** Fenêtre d'affichage d'une deadline relative dans l'UI (jours). */
export const DEADLINE_VISIBLE_DAYS = 30

/** Nombre de millisecondes dans une journée (helper temporel). */
export const MS_PER_DAY = 86_400_000
