import type { NextRequest } from 'next/server'

/**
 * GUIC-644 / GUIC-657 — Base des redirections : l'URL PUBLIQUE, jamais `request.url`.
 *
 * Derrière un reverse proxy (Plesk → conteneur), `request.url` porte l'adresse INTERNE
 * (`http://0.0.0.0:3000`, le HOSTNAME du conteneur) et NON le domaine public — Next ne
 * substitue pas le header `Host` sur `request.url` dans un route handler. Une redirection
 * construite dessus renvoie l'utilisateur sur `0.0.0.0/...` (déconnexion cassée, ou
 * ERR_SSL_PROTOCOL_ERROR après login SSO).
 *
 * On s'aligne sur `sso-client.ts`, qui construit déjà le `redirect_uri` à partir de
 * `NEXTAUTH_URL` : toutes les extrémités utilisent ainsi LA MÊME origine canonique.
 * Fallback sur l'origine de `request.url` si `NEXTAUTH_URL` n'est pas défini (dev local
 * sans proxy), ce qui préserve le comportement historique.
 */
export function basePublique(request: NextRequest): string {
  return process.env.NEXTAUTH_URL || new URL(request.url).origin
}

/** Raccourci : construit une URL absolue publique pour `path`. */
export function urlPublique(path: string, request: NextRequest): URL {
  return new URL(path, basePublique(request))
}
