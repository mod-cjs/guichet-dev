// GUIC-578 — Nettoyage CDP des données journalisées.
//
// Les logs ne doivent JAMAIS contenir de PII en clair. Deux vecteurs identifies au challenge :
//   - le CHEMIN d'une route peut embarquer un identifiant (ex. /api/admin/utilisateurs/<cjs_uid>) ;
//   - un MESSAGE d'erreur peut contenir un email / un telephone (ex. contrainte Prisma).

/** UUID v4 (cjs_uid) — remplacé par `:id` dans les chemins. */
const RE_UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi
/** Long segment hex/alphanumérique (token, id opaque ≥ 16). */
const RE_LONG_ID = /\b[0-9a-f]{16,}\b/gi
const RE_EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
/** Téléphone E.164 sénégalais (+221XXXXXXXXX) et variantes proches. */
const RE_PHONE = /\+?\d[\d\s.-]{7,}\d/g

/**
 * Remplace les identifiants dans un CHEMIN de route par `:id` (les cjs_uid ne doivent pas
 * apparaître dans les logs). Ex. `/api/admin/utilisateurs/00116efd-…` → `/api/admin/utilisateurs/:id`.
 */
export function scrubPath(path: string): string {
  return path.replace(RE_UUID, ':id').replace(RE_LONG_ID, ':id')
}

/**
 * Caviarde la PII évidente d'un texte libre (message d'erreur) : emails et téléphones → `[redacted]`.
 * Ne prétend PAS être exhaustif — c'est un filet, pas une garantie. Le message reste utile au debug.
 */
export function scrubMessage(text: string): string {
  return text.replace(RE_EMAIL, '[email]').replace(RE_PHONE, '[phone]')
}
