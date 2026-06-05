/**
 * GUIC-241 — `safeReturnTo` : whitelist stricte des paths internes acceptés
 * comme cible de redirection post-login.
 *
 * Pourquoi pas `new URL(url, 'http://localhost')` ?
 *   - `new URL('//evil.com', 'http://localhost')` retourne `http://evil.com/`
 *     (parsing protocol-relative correct → origin === 'http://evil.com') :
 *     le check `origin !== 'http://localhost'` attrape ce cas spécifique mais
 *     reste fragile (cf. `new URL('/\\evil.com', base)` qui dépend du
 *     navigateur côté client).
 *   - Une whitelist regex stricte est plus robuste et auditeur-friendly.
 *
 * Caractères autorisés dans le path/query :
 *   - alphanumérique (`a-zA-Z0-9`)
 *   - séparateurs path (`/`)
 *   - query string (`?`, `=`, `&`)
 *   - fragment (`#`)
 *   - encoding URL (`%`) pour les emails (`%40` = `@`) et autres caractères
 *   - ponctuation usuelle (`.`, `_`, `-`)
 *
 * Tout le reste → `null` → caller doit appliquer `roleRedirect`.
 */

const SAFE_PATH_RE = /^\/[a-zA-Z0-9._/?=&%#-]*$/

export function safeReturnTo(url: string | undefined | null): string | null {
  if (!url) return null
  if (!url.startsWith('/'))    return null
  if (url.startsWith('//'))    return null // protocol-relative → http://evil.com
  if (url.startsWith('/\\'))   return null // backslash-trick côté navigateur
  if (!SAFE_PATH_RE.test(url)) return null
  return url
}
