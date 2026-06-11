/**
 * Retourne l'URL absolue de l'application courante.
 *
 * Source : `NEXT_PUBLIC_APP_URL` (côté client + serveur, configurable par env).
 * Fallback : `https://guichetjeunesse.sn` (production canonique).
 *
 * GUIC-377 — évite les domaines codés en dur dans les composants UI (QR carte CJS,
 * QR check-in, identifiants événements .ics, etc.).
 */
export function appUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
  if (fromEnv) return fromEnv
  return 'https://guichetjeunesse.sn'
}

/** Domaine seul (sans protocole) pour affichage UI (ex : footer carte CJS). */
export function appDomain(): string {
  return appUrl().replace(/^https?:\/\//, '')
}
