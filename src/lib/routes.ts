/**
 * Helpers de routes — source unique pour toute URL applicative interne (GUIC-219).
 *
 * Évite la prolifération de chaînes hardcodées (`/opportunites/...`,
 * `/api/auth/login`, etc.) dans les composants : un changement de route
 * SSO ou un renommage de segment se propage ici seul.
 */

/** URL de déclenchement du flow SSO Laravel Passport. */
export function loginUrl(returnTo?: string): string {
  if (!returnTo) return '/api/auth/login'
  return `/api/auth/login?return_to=${encodeURIComponent(returnTo)}`
}

/** URL canonique d'une opportunité (page slug publique). */
export function opportuniteSlugUrl(slug: string): string {
  return `/opportunites/${slug}`
}

/** URL « postuler maintenant » — reprend la page slug + paramètre déclencheur. */
export function opportunitePostulerUrl(slug: string): string {
  return `${opportuniteSlugUrl(slug)}?postuler=1`
}

/** Liste publique des opportunités. */
export const opportunitesListUrl = '/opportunites'

/** Espace candidatures du jeune. */
export const mesCandidaturesUrl = '/jeune/candidatures'
