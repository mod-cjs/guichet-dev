import {
  ADMIN_THEME_KEY,
  ADMIN_THEME_ATTR,
  nextTheme,
  normalizeTheme,
  readStoredTheme,
  persistTheme,
  applyThemeAttr,
} from './admin-theme'

describe('admin-theme (helper pur du thème clair/sombre admin)', () => {
  it('bascule light <-> dark', () => {
    expect(nextTheme('light')).toBe('dark')
    expect(nextTheme('dark')).toBe('light')
  })

  it('normalise : seul "light" est clair, tout le reste = SOMBRE (défaut admin)', () => {
    expect(normalizeTheme('dark')).toBe('dark')
    expect(normalizeTheme('light')).toBe('light')
    expect(normalizeTheme(null)).toBe('dark')
    expect(normalizeTheme(undefined)).toBe('dark')
    expect(normalizeTheme('nimporte')).toBe('dark')
  })

  it('lit le thème stocké et retombe sur SOMBRE si absent/illisible', () => {
    const store = new Map<string, string>()
    const storage = {
      getItem: (k: string) => store.get(k) ?? null,
    }
    expect(readStoredTheme(storage)).toBe('dark')
    store.set(ADMIN_THEME_KEY, 'light')
    expect(readStoredTheme(storage)).toBe('light')
    // storage qui throw (mode privé) -> sombre (défaut), pas de crash
    const throwing = {
      getItem: () => {
        throw new Error('SecurityError')
      },
    }
    expect(readStoredTheme(throwing)).toBe('dark')
  })

  it('persiste le thème sous la bonne clé (et avale les erreurs de storage)', () => {
    const store = new Map<string, string>()
    persistTheme('dark', { setItem: (k, v) => store.set(k, v) })
    expect(store.get(ADMIN_THEME_KEY)).toBe('dark')
    expect(() =>
      persistTheme('light', {
        setItem: () => {
          throw new Error('QuotaExceeded')
        },
      }),
    ).not.toThrow()
  })

  it('applique l\'attribut de scope : dark pose data-admin-theme, light le retire', () => {
    const calls: Array<[string, string?]> = []
    const el = {
      setAttribute: (n: string, v: string) => calls.push([n, v]),
      removeAttribute: (n: string) => calls.push([n]),
    }
    applyThemeAttr(el, 'dark')
    expect(calls).toContainEqual([ADMIN_THEME_ATTR, 'dark'])
    calls.length = 0
    applyThemeAttr(el, 'light')
    expect(calls).toContainEqual([ADMIN_THEME_ATTR])
  })
})
