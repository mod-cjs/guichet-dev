'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import {
  type AdminTheme,
  ADMIN_THEME_ATTR,
  nextTheme,
  readStoredTheme,
  persistTheme,
} from '@/lib/admin-theme'

interface AdminThemeCtx {
  theme: AdminTheme
  toggle: () => void
}

const AdminThemeContext = createContext<AdminThemeCtx | null>(null)

/** Accès au thème admin courant + bascule. À utiliser dans <AdminThemeProvider>. */
export function useAdminTheme(): AdminThemeCtx {
  const ctx = useContext(AdminThemeContext)
  if (!ctx) {
    throw new Error('useAdminTheme doit être utilisé dans <AdminThemeProvider>.')
  }
  return ctx
}

/**
 * AdminThemeProvider — détient l'état du thème clair/sombre du **contenu admin**
 * (GUIC-680) et pose le scope `data-admin-theme` sur la colonne de contenu
 * (topbar + main), PAS sur la sidebar.
 *
 * SSR-safe : rendu initial = clair (aucun attribut) côté serveur ET au premier
 * rendu client ; l'effet de montage relit le thème persisté (évite le mismatch
 * d'hydratation). La logique pure vient de `@/lib/admin-theme` (testée).
 */
export function AdminThemeProvider({ children }: { children: ReactNode }) {
  // Défaut = SOMBRE (identité admin v3 / maquette). Le clair est opt-in.
  const [theme, setTheme] = useState<AdminTheme>('dark')

  useEffect(() => {
    setTheme(readStoredTheme(typeof window !== 'undefined' ? window.localStorage : null))
  }, [])

  const toggle = useCallback(() => {
    setTheme((cur) => {
      const next = nextTheme(cur)
      persistTheme(next, typeof window !== 'undefined' ? window.localStorage : null)
      return next
    })
  }, [])

  return (
    <AdminThemeContext.Provider value={{ theme, toggle }}>
      {/* Wrapper de SCOPE : enveloppe barre mobile + sidebar + contenu pour que
          la sidebar suive aussi le thème (comme la maquette). display:contents
          => aucun impact sur le layout, mais l'attribut cascade les tokens. */}
      <div
        className="gj-admin-scope"
        style={{ display: 'contents' }}
        {...(theme === 'dark' ? { [ADMIN_THEME_ATTR]: 'dark' } : {})}
      >
        {children}
      </div>
    </AdminThemeContext.Provider>
  )
}
