// GUIC-578 — Identifiant de corrélation de requête (requestId).
//
// Relie tous les logs d'une même requête, à travers l'application ET le reverse proxy. En prod,
// le proxy (nginx/Plesk) génère `x-request-id` et le transmet à l'app ; à défaut (dev, ou proxy
// non configuré) on en génère un. Le requestId voyage aussi dans l'en-tête de réponse, pour que
// le client et les logs d'accès du proxy le partagent.

/** En-tête portant le requestId (convention nginx `$request_id`). */
export const REQUEST_ID_HEADER = 'x-request-id'

/**
 * Un requestId propre : caractères de token (alphanumérique, tiret, underscore), borné.
 * On REFUSE tout le reste — un en-tête client hostile ne doit pas injecter de sauts de ligne
 * ni de contenu arbitraire dans les logs (log injection).
 */
export function isValidRequestId(value: string): boolean {
  return /^[A-Za-z0-9_-]{1,128}$/.test(value)
}

/**
 * requestId de la requête : l'en-tête `x-request-id` s'il est présent ET valide, sinon un UUID
 * neuf. Un en-tête aberrant est ignoré (régénéré), jamais propagé tel quel.
 */
export function resolveRequestId(headers: Headers): string {
  const incoming = headers.get(REQUEST_ID_HEADER)
  if (incoming && isValidRequestId(incoming)) return incoming
  return crypto.randomUUID()
}
