// GUIC-578 — Identifiant de corrélation de requête (requestId).
//
// Relie tous les logs d'une même requête, à travers l'application ET le reverse proxy. En prod,
// le proxy (nginx/Plesk) génère `x-request-id` et le transmet à l'app ; à défaut (dev, ou proxy
// non configuré) on en génère un. Le requestId voyage aussi dans l'en-tête de réponse, pour que
// le client et les logs d'accès du proxy le partagent.

/** En-tête portant le requestId (convention nginx `$request_id`). */
export const REQUEST_ID_HEADER = 'x-request-id'

/**
 * Sacs d'en-têtes acceptés : un `Headers` Web (route handlers) OU un objet simple
 * `{ [key]: string | string[] }` — c'est CE que Next passe au hook `onRequestError`
 * (NodeJS.Dict), et un `Headers.get()` planterait dessus (bug C1).
 */
export type HeaderBag = Headers | Record<string, string | string[] | undefined>

/** Lit un en-tête quelle que soit la forme du sac (Headers ou objet simple, casse ignorée). */
export function readHeader(bag: HeaderBag, name: string): string | undefined {
  if (typeof (bag as Headers).get === 'function') {
    return (bag as Headers).get(name) ?? undefined
  }
  const obj = bag as Record<string, string | string[] | undefined>
  const lower = name.toLowerCase()
  // Les clés d'un dict Node sont deja en minuscules, mais on reste tolérant.
  const value = obj[lower] ?? obj[name]
  return Array.isArray(value) ? value[0] : value
}

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
 * neuf. Un en-tête aberrant est ignoré (régénéré), jamais propagé tel quel. Accepte un `Headers`
 * ou un objet simple (forme du hook `onRequestError`).
 */
export function resolveRequestId(headers: HeaderBag): string {
  const incoming = readHeader(headers, REQUEST_ID_HEADER)
  if (incoming && isValidRequestId(incoming)) return incoming
  return crypto.randomUUID()
}
