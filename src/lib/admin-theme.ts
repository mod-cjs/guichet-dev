/**
 * Thème clair/sombre de la **console d'administration** (GUIC-680).
 *
 * Portée volontairement limitée au contenu admin via l'attribut
 * `data-admin-theme` (n'impacte pas jeune/recruteur/conseiller).
 * Défaut = **clair** (= état réel actuel du contenu admin ⇒ non-breaking).
 *
 * Ce module ne contient que de la logique **pure** (testable sans DOM) :
 * le composant/provider React s'appuie dessus.
 */

export type AdminTheme = 'light' | 'dark'

/** Clé de persistance (localStorage). */
export const ADMIN_THEME_KEY = 'gj-admin-theme'
/** Attribut de scope posé sur le conteneur du contenu admin. */
export const ADMIN_THEME_ATTR = 'data-admin-theme'

/** Bascule d'un thème à l'autre. */
export function nextTheme(current: AdminTheme): AdminTheme {
  return current === 'dark' ? 'light' : 'dark'
}

/** Normalise une valeur quelconque : seul `"dark"` est sombre, sinon clair. */
export function normalizeTheme(value: string | null | undefined): AdminTheme {
  return value === 'dark' ? 'dark' : 'light'
}

type Getter = Pick<Storage, 'getItem'>
type Setter = Pick<Storage, 'setItem'>

/** Lit le thème stocké ; retombe sur `light` si absent ou storage illisible. */
export function readStoredTheme(storage?: Getter | null): AdminTheme {
  try {
    return normalizeTheme(storage?.getItem(ADMIN_THEME_KEY) ?? null)
  } catch {
    return 'light'
  }
}

/** Persiste le thème ; avale silencieusement les erreurs de storage (mode privé…). */
export function persistTheme(theme: AdminTheme, storage?: Setter | null): void {
  try {
    storage?.setItem(ADMIN_THEME_KEY, theme)
  } catch {
    /* no-op : storage indisponible */
  }
}

interface AttrTarget {
  setAttribute(name: string, value: string): void
  removeAttribute(name: string): void
}

/**
 * Applique le scope de thème : `dark` pose `data-admin-theme="dark"`,
 * `light` retire l'attribut (le clair est l'état par défaut des tokens).
 */
export function applyThemeAttr(el: AttrTarget, theme: AdminTheme): void {
  if (theme === 'dark') el.setAttribute(ADMIN_THEME_ATTR, 'dark')
  else el.removeAttribute(ADMIN_THEME_ATTR)
}
