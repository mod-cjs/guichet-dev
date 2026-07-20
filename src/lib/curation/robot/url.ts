import { createHash } from 'node:crypto'

/**
 * GUIC-597 — US-2 : URL canonique + empreinte pour la déduplication de découverte.
 * Même esprit de normalisation qu'US-1 (host minuscule, port par défaut et slash final
 * retirés) afin que l'empreinte d'un item et l'URL d'une source restent comparables.
 */
export function normaliserUrlCanonique(raw: string): string {
  const u = new URL(raw)
  u.hostname = u.hostname.toLowerCase()
  if ((u.protocol === 'http:' && u.port === '80') || (u.protocol === 'https:' && u.port === '443')) {
    u.port = ''
  }
  if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
    u.pathname = u.pathname.replace(/\/+$/, '')
  }
  u.hash = ''
  return u.toString()
}

/** sha256 hex (64 caractères) de l'URL canonique — clé de dédup URL (US-4 étendra au titre). */
export function empreinteUrl(urlCanonique: string): string {
  return createHash('sha256').update(urlCanonique).digest('hex')
}
